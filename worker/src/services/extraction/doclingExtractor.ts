/**
 * IBM Docling Extractor — PRIMARY extraction engine
 *
 * Sends documents to the Docling microservice for structured parsing.
 * Handles PDF, DOCX, XLSX, images, and text formats.
 *
 * Features:
 * - Size-aware timeouts (60s / 120s / 180s)
 * - Retry with exponential backoff for transient failures
 * - Structured logging at every stage
 * - Graceful null return on soft failure (triggers fallback)
 */

import type { Env, DocumentRouteResult, StructuredDocument } from "../../types.js";
import { parseWithDocling, shouldUseDocling } from "../doclingClient.js";
import type { DoclingError, DoclingResult } from "../doclingClient.js";
import {
  type UnifiedExtractionResult,
  type ExtractionProvider,
  type ExtractionError,
  RETRIES,
  LIMITS,
  timeoutForSize,
  CUSTOMER_MESSAGES,
} from "./extractionTypes.js";

const PROVIDER: ExtractionProvider = "docling";

/**
 * Docling extractor — the primary engine for all structured formats.
 * Returns null on soft failure so the router can fall back.
 */
export async function extractWithDocling(
  buffer: ArrayBuffer,
  fileName: string,
  route: DocumentRouteResult,
  env: Env,
): Promise<UnifiedExtractionResult | null> {
  // ── Guard: service not configured ──
  if (!env.DOCLING_SERVICE_URL) {
    console.log("[DOCLING_SKIP] reason=not_configured willFallback=true");
    return null;
  }

  // ── Guard: format not compatible ──
  if (!shouldUseDocling(route)) {
    console.log(
      `[DOCLING_SKIP] reason=format_not_supported format=${route.fileFormat} willFallback=true`,
    );
    return null;
  }

  // ── Guard: file too large ──
  if (buffer.byteLength > LIMITS.doclingMaxBytes) {
    console.log(
      `[DOCLING_SKIP] reason=too_large size=${buffer.byteLength} max=${LIMITS.doclingMaxBytes} willFallback=true`,
    );
    return null;
  }

  const timeoutMs = timeoutForSize(buffer.byteLength);
  const maxAttempts = RETRIES.docling;

  console.log(
    `[DOCLING_START] filename="${fileName}" format=${route.fileFormat} ` +
      `size=${buffer.byteLength} timeoutMs=${timeoutMs} maxAttempts=${maxAttempts}`,
  );

  let lastError: ExtractionError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const startTs = Date.now();

    try {
      console.log(
        `[DOCLING_REQUEST] attempt=${attempt}/${maxAttempts} ` +
          `url="${env.DOCLING_SERVICE_URL}/parse" bytes=${buffer.byteLength}`,
      );

      const result = await callDoclingWithTimeout(
        buffer,
        fileName,
        route,
        env,
        timeoutMs,
      );

      const durationMs = Date.now() - startTs;
      const sd: StructuredDocument = result.structuredDocument;

      console.log(
        `[DOCLING_RESPONSE]
success=true
durationMs=${durationMs}
pages=${sd.pageCount}
textLength=${sd.markdown.length}
tables=${sd.tables.length}
confidence=${sd.extractionConfidence.toFixed(2)}
qualityLabel=${result.metadata.qualityLabel}
isScanned=${result.metadata.isScanned}
ocrUsed=${result.metadata.ocrUsed}`,
      );

      // ── Validate we got meaningful content ──
      if (!sd.markdown || sd.markdown.trim().length < LIMITS.minTextLength) {
        console.log(
          `[DOCLING_FAILURE] reason=empty_result textLength=${sd.markdown?.length ?? 0} willFallback=true`,
        );
        lastError = {
          code: "empty_result",
          message: "Docling returned empty content",
          retryable: false,
          provider: PROVIDER,
        };
        continue;
      }

      // ── Circuit breaker: very low confidence ──
      if (sd.extractionConfidence < 0.2) {
        console.log(
          `[DOCLING_FAILURE] reason=low_confidence confidence=${sd.extractionConfidence.toFixed(2)} willFallback=true`,
        );
        lastError = {
          code: "bad_response",
          message: `Low confidence: ${sd.extractionConfidence}`,
          retryable: false,
          provider: PROVIDER,
        };
        continue;
      }

      // ── Success ──
      const lineItems = sd.markdown
        .split("\n")
        .filter((l) => l.trim().length > 0).length;

      return {
        text: sd.markdown,
        context: {
          pages: sd.pageCount,
          lineItems,
          fileType: sd.fileFormat,
          extractionMethod: "docling",
          confidenceScore: Math.round(sd.extractionConfidence * 100),
        },
        structured: sd,
        provider: PROVIDER,
        success: true,
      };
    } catch (err) {
      const durationMs = Date.now() - startTs;
      const dErr = err as DoclingError;
      const code = dErr?.code ?? "unknown";
      const message = dErr?.error ?? (err instanceof Error ? err.message : String(err));
      const retryable = dErr?.retryable ?? false;

      console.error(
        `[DOCLING_FAILURE]
attempt=${attempt}/${maxAttempts}
durationMs=${durationMs}
code=${code}
message="${message}"
retryable=${retryable}
reason=${code}`,
      );

      lastError = {
        code: code as any,
        message,
        retryable,
        provider: PROVIDER,
      };

      // ── Retry only if retryable and we have attempts left ──
      if (retryable && attempt < maxAttempts) {
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`[DOCLING_RETRY] waiting ${backoffMs}ms before attempt ${attempt + 1}`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Non-retryable or out of attempts — break to fallback
      break;
    }
  }

  // ── All attempts exhausted ──
  console.error(
    `[DOCLING_FAILURE] reason=all_attempts_exhausted ` +
      `lastCode=${lastError?.code ?? "unknown"} lastMessage="${lastError?.message ?? "none"}" willFallback=true`,
  );

  return null;
}

// ─── Internal: call Docling with explicit timeout ───

async function callDoclingWithTimeout(
  buffer: ArrayBuffer,
  fileName: string,
  route: DocumentRouteResult,
  env: Env,
  timeoutMs: number,
): Promise<DoclingResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // parseWithDocling has its own timeout, but we add an outer guard
    // to ensure we never hang indefinitely even if the inner timeout fails.
    const resultPromise = parseWithDocling(buffer, fileName, route, env);

    // Race the promise against the abort
    const result = await Promise.race([
      resultPromise,
      new Promise<never>((_, reject) => {
        controller.signal.addEventListener("abort", () => {
          reject({
            error: `Docling request timed out after ${timeoutMs / 1000}s`,
            code: "timeout",
            retryable: true,
          } as DoclingError);
        });
      }),
    ]);

    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Export for router use ───

export const doclingExtractor = {
  name: PROVIDER,
  canHandle(route: DocumentRouteResult): boolean {
    return shouldUseDocling(route);
  },
  extract: extractWithDocling,
};