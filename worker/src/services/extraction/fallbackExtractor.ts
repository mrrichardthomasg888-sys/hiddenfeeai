/**
 * Fallback Extractor — TXT, CSV, and last-resort raw text extraction
 *
 * Handles plain text formats and serves as the final fallback
 * for any format that failed all other extractors.
 *
 * DOCX/XLSX are handled by officeExtractor.ts
 * PDF is handled by pdfExtractor.ts
 * Images are handled by imageExtractor.ts
 */

import type { Env, DocumentRouteResult } from "../../types.js";
import {
  type UnifiedExtractionResult,
  type ExtractionProvider,
  LIMITS,
} from "./extractionTypes.js";

const PROVIDER: ExtractionProvider = "txt-direct";

// ─── TXT / CSV / MD direct extraction ───

function extractPlainText(buffer: ArrayBuffer): string | null {
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(buffer).trim();
  return text.length > LIMITS.minTextLength ? text : null;
}

// ─── Main fallback extraction function ───

export async function extractFallback(
  buffer: ArrayBuffer,
  fileName: string,
  route: DocumentRouteResult,
  env: Env,
): Promise<UnifiedExtractionResult | null> {
  const format = route.fileFormat;
  console.log(`[FALLBACK_START] filename="${fileName}" format=${format} size=${buffer.byteLength}`);

  let text: string | null = null;
  let fileType = format;
  let confidence = 90;

  switch (format) {
    case "txt":
    case "md":
    case "csv":
    case "tsv":
    case "html":
    case "xml":
    case "json":
    case "rtf":
      console.log("[FALLBACK_STARTED] provider=txt-direct");
      text = extractPlainText(buffer);
      fileType = format === "csv" || format === "tsv" ? "spreadsheet" : "txt";
      confidence = 95;
      break;

    default:
      // Last resort: try plain text decode on any format
      console.log("[FALLBACK_STARTED] provider=raw-text");
      text = extractPlainText(buffer);
      fileType = "txt";
      confidence = 50;
      break;
  }

  if (!text) {
    console.log(`[FALLBACK_FAILURE] format=${format} reason=no_text_extracted`);
    return null;
  }

  const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
  const pages = Math.max(1, Math.ceil(text.length / 2500));

  console.log(`[FALLBACK_SUCCESS] provider=${PROVIDER} textLength=${text.length} lineItems=${lineItems}`);

  return {
    text,
    context: {
      pages,
      lineItems,
      fileType,
      extractionMethod: "direct",
      confidenceScore: confidence,
    },
    provider: PROVIDER,
    success: true,
  };
}

// ─── Export for router use ───

export const fallbackExtractor = {
  name: PROVIDER,
  canHandle(_route: DocumentRouteResult): boolean {
    // Fallback handles everything — it's the last resort
    return true;
  },
  extract: extractFallback,
};
