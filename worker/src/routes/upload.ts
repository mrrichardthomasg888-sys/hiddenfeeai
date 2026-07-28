import { Hono } from "hono";
import type { Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { isAcceptedExtension } from "../router/documentRouter.js";
import { routeExtraction } from "../services/extraction/extractionRouter.js";
import * as errors from "../utils/errors.js";

export const uploadRoute = new Hono<{ Bindings: Env }>();

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
  const fileMimeType = file.type || 'unknown';
  console.log(`[Upload Diagnostics] fileName="${fileName}" mimeType="${fileMimeType}" fileSize=${file.size} bytes`);

  // Start extraction (async) — all extraction logic flows through routeExtraction
  c.executionCtx.waitUntil(
    (async () => {
      try {
        await updateJob(auditId, { status: "extracting" });

        // ── [EXTRACTION_START] ──
        console.log(`[EXTRACTION_START]
filename="${fileName}"
mime="${fileMimeType}"
size=${file.size}`);

        // ── UNIFIED EXTRACTION PIPELINE ──
        // routeExtraction handles: Docling (primary) → format-specific fallback → general fallback → fail
        const result = await routeExtraction(buffer, fileName, c.env);

        if (result.success && result.text.length > 0) {
          console.log(`[JOB_UPDATE] auditId=${auditId} status=extracted method=${result.context.extractionMethod}`);
          await updateJob(auditId, {
            status: "extracted",
            extractedText: result.text,
            extractedDocument: result.structured as any,
            documentContext: result.context,
          });
          console.log(`[EXTRACTION_COMPLETE] auditId=${auditId} status=extracted method=${result.context.extractionMethod} provider=${result.provider} textLength=${result.text.length}`);
        } else {
          // All extraction failed — use sanitized customer message
          const customerMessage = result.customerMessage || "We couldn't read this document. Please try uploading a clearer copy.";
          console.error(`[EXTRACTION_FAILED] auditId=${auditId} provider=${result.provider} customerMessage="${customerMessage}"`);
          await updateJob(auditId, {
            status: "error",
            error: customerMessage,
          });
        }
      } catch (extractError) {
        // Unexpected error — never expose internals to customer
        const errMsg = extractError instanceof Error ? extractError.message : 'unknown';
        console.error(`[EXTRACTION_FAILED] auditId=${auditId} unexpected error="${errMsg}"`);
        await updateJob(auditId, {
          status: "error",
          error: "We couldn't read this document. Please try uploading a clearer copy.",
        });
      }
    })()
  );

  return c.json({
    auditId,
    status: "uploading",
    fileName,
    fileSize: file.size,
  }, 202);
});