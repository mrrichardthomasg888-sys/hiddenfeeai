import { Hono } from "hono";
import type { Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { isAcceptedExtension } from "../router/documentRouter.js";
import { routeExtraction } from "../services/extraction/extractionRouter.js";
import * as errors from "../utils/errors.js";

export const uploadRoute = new Hono<{ Bindings: Env }>();

// ── Safety timeout: extraction must complete within 5 minutes ──
// This prevents jobs from being stuck in "extracting" forever.
const EXTRACTION_SAFETY_TIMEOUT_MS = 5 * 60 * 1000;

uploadRoute.post("/", async (c) => {
  const maxMb = Number(c.env.MAX_UPLOAD_SIZE_MB || 25);

  const formData = await c.req.formData().catch(() => null);
  if (!formData) throw errors.badFile();

  const file = formData.get("file") as File | null;
  if (!file) throw errors.badFile();

  // Reject empty files before any processing
  if (file.size === 0) {
    throw errors.badFile("The uploaded file is empty. Please select a valid document.");
  }

  // Validate extension
  const fileName = file.name;
  if (!isAcceptedExtension(fileName)) {
    const ext = fileName.split(".").pop() ?? "";
    throw errors.unsupportedType("." + ext);
  }

  // Validate size
  if (file.size > maxMb * 1024 * 1024) {
    throw errors.tooLarge(maxMb);
  }

  const auditId = crypto.randomUUID();
  const job = await createJob(auditId, fileName);
  console.log(`[JobLifecycle] JOB_CREATED auditId=${auditId} fileName="${fileName}" fileSize=${file.size} status=uploading`);

  // Read file buffer
  const buffer = await file.arrayBuffer();

  // ── File diagnostics logging ──
  const fileMimeType = file.type || "unknown";

  // Start extraction (async) — all extraction logic flows through routeExtraction
  c.executionCtx.waitUntil(
    (async () => {
      const extractionStartTime = Date.now();
      try {
        // ── State transition: uploading → extracting (processing) ──
        await updateJob(auditId, { status: "extracting" });
        console.log(`[JobLifecycle] EXTRACTION_STARTED auditId=${auditId} status=extracting`);

        // ── [EXTRACTION_START] ──
        console.log(`[EXTRACTION_START]
filename="${fileName}"
mime="${fileMimeType}"
size=${file.size}`);

        // ── UNIFIED EXTRACTION PIPELINE ──
        // routeExtraction handles: Docling (primary) → format-specific fallback → general fallback → fail
        // Wrap in a safety timeout to prevent stuck jobs
        const extractionPromise = routeExtraction(buffer, fileName, c.env);
        const safetyTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("EXTRACTION_SAFETY_TIMEOUT"));
          }, EXTRACTION_SAFETY_TIMEOUT_MS);
        });

        const result = await Promise.race([extractionPromise, safetyTimeoutPromise]);

        if (result.success && result.text.length > 0) {
          // ── State transition: extracting → extracted (complete) ──
          const durationMs = Date.now() - extractionStartTime;
          console.log(`[EXTRACTION_COMPLETE]
auditId=${auditId}
provider=${result.provider}
method=${result.context.extractionMethod}
confidence=${result.context.confidenceScore}
textLength=${result.text.length}
durationMs=${durationMs}`);

          await updateJob(auditId, {
            status: "extracted",
            extractedText: result.text,
            extractedDocument: result.structured as any,
            documentContext: result.context,
          });
          console.log(`[JobLifecycle] EXTRACTION_COMPLETE auditId=${auditId} status=extracted method=${result.context.extractionMethod} provider=${result.provider}`);
        } else {
          // ── State transition: extracting → error (failed) ──
          // All extraction failed — use sanitized customer message
          const customerMessage = result.customerMessage || "We couldn't read this document. Please try uploading a clearer copy.";
          console.error(`[EXTRACTION_FAILED]
auditId=${auditId}
provider=${result.provider}
safeReason="${customerMessage}"`);
          await updateJob(auditId, {
            status: "error",
            error: customerMessage,
          });
          console.log(`[JobLifecycle] EXTRACTION_FAILED auditId=${auditId} status=error`);
        }
      } catch (extractError) {
        // ── State transition: extracting → error (failed) ──
        // Unexpected error or safety timeout — never expose internals to customer
        const isTimeout = extractError instanceof Error && extractError.message === "EXTRACTION_SAFETY_TIMEOUT";
        const safeReason = isTimeout
          ? "We couldn't read this document. Please try uploading a clearer copy."
          : "We couldn't read this document. Please try uploading a clearer copy.";

        console.error(`[EXTRACTION_FAILED]
auditId=${auditId}
safeReason="${safeReason}"
isTimeout=${isTimeout}`);

        await updateJob(auditId, {
          status: "error",
          error: safeReason,
        });
        console.log(`[JobLifecycle] EXTRACTION_FAILED auditId=${auditId} status=error isTimeout=${isTimeout}`);
      }
    })(),
  );

  return c.json({
    auditId,
    status: "uploading",
    fileName,
    fileSize: file.size,
  }, 202);
});
