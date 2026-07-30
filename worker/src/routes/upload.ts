import { Hono } from "hono";
import type { Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { isAcceptedExtension } from "../router/documentRouter.js";
import { routeExtraction } from "../services/extraction/extractionRouter.js";
import * as errors from "../utils/errors.js";
import { validateUpload } from "../middleware/inputValidation.js";

export const uploadRoute = new Hono<{ Bindings: Env }>();

// ── Safety timeout: extraction must complete within 90 seconds ──
// Multi-batch documents legitimately take several Gemini requests. The old
// 90-second cap aborted complete-file processing mid-document.
const EXTRACTION_SAFETY_TIMEOUT_MS = 15 * 60_000;

uploadRoute.post("/", async (c) => {
  const maxMb = Number(c.env.MAX_UPLOAD_SIZE_MB || 25);

  const formData = await c.req.formData().catch(() => null);
  if (!formData) throw errors.badFile();

  const file = formData.get("file") as File | null;
  if (!file) throw errors.badFile();

  if (file.size === 0) {
    throw errors.badFile("The uploaded file is empty. Please select a valid document.");
  }

  const validation = validateUpload(file.name, file.size, file.type);
  if (!validation.valid) {
    if (file.size > maxMb * 1024 * 1024) throw errors.tooLarge(maxMb);
    throw errors.badFile(validation.error);
  }

  const fileName = validation.sanitizedFileName;
  if (!isAcceptedExtension(fileName)) {
    const ext = fileName.split(".").pop() ?? "";
    throw errors.unsupportedType("." + ext);
  }

  if (file.size > maxMb * 1024 * 1024) {
    throw errors.tooLarge(maxMb);
  }

  const auditId = crypto.randomUUID();
  const fileMimeType = file.type || "unknown";
  const job = await createJob(auditId, fileName);
  await updateJob(auditId, { progress: { stage: "uploading", originalFileType: fileMimeType || "unknown", originalFileSize: file.size, totalPages: 0, processedPages: 0, totalImages: 0, processedImages: 0, totalWorksheets: 0, processedWorksheets: 0, failedUnits: [], retryAttempts: 0, geminiRequestStatus: "not_started", geminiResponseStatus: "not_started", complete: false } });
  console.log(`[JOB_CREATED] auditId=${auditId} fileName="${fileName}" fileSize=${file.size} status=uploading`);

  const buffer = await file.arrayBuffer();

  c.executionCtx.waitUntil(
    (async () => {
      const extractionStartTime = Date.now();
      try {
        await updateJob(auditId, { status: "extracting", progress: { stage: "preparing", originalFileType: fileMimeType || "unknown", originalFileSize: file.size, totalPages: 0, processedPages: 0, totalImages: 0, processedImages: 0, totalWorksheets: 0, processedWorksheets: 0, failedUnits: [], retryAttempts: 0, geminiRequestStatus: "running", geminiResponseStatus: "not_started", complete: false } });
        console.log(`[EXTRACTION_START] auditId=${auditId} filename="${fileName}" mime="${fileMimeType}" size=${file.size}`);

        const extractionPromise = routeExtraction(buffer, fileName, c.env);
        const safetyTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new Error("EXTRACTION_SAFETY_TIMEOUT"));
          }, EXTRACTION_SAFETY_TIMEOUT_MS);
        });

        const result = await Promise.race([extractionPromise, safetyTimeoutPromise]);

        if (result.success && result.text.length > 0) {
          const durationMs = Date.now() - extractionStartTime;
          console.log(`[EXTRACTION_RESULT] auditId=${auditId} textLength=${result.text.length} pages=${result.context.pages} tables=${result.structured?.tables?.length ?? 0} confidence=${result.context.confidenceScore} provider=${result.provider} durationMs=${durationMs}`);

          await updateJob(auditId, {
            status: "extracted",
            extractedText: result.text,
            extractedDocument: result.structured as any,
            documentContext: result.context,
            progress: { stage: "preparing", originalFileType: result.context.fileType, originalFileSize: file.size, totalPages: result.coverage?.totalPages ?? result.context.pages, processedPages: result.coverage?.processedPages ?? result.context.pages, totalImages: result.coverage?.totalImages ?? 0, processedImages: result.coverage?.processedImages ?? 0, totalWorksheets: result.coverage?.totalWorksheets ?? 0, processedWorksheets: result.coverage?.processedWorksheets ?? 0, failedUnits: result.coverage?.failedUnits ?? [], retryAttempts: result.coverage?.retryAttempts ?? 0, geminiRequestStatus: "succeeded", geminiResponseStatus: "valid", complete: false },
          });
          console.log(`[KV_UPDATE] auditId=${auditId} newStatus=extracted`);
          console.log(`[ANALYSIS_TRIGGER] auditId=${auditId} hasText=${result.text.length > 0} hasStructured=${!!result.structured}`);
        } else {
          const customerMessage = result.customerMessage || "We couldn't read this document. Please try uploading a clearer copy.";
          console.error(`[EXTRACTION_FAILED] auditId=${auditId} safeReason="${customerMessage}"`);
          await updateJob(auditId, {
            status: "error",
            error: customerMessage,
            resultState: "unreadable",
          });
          console.log(`[KV_UPDATE] auditId=${auditId} newStatus=error`);
        }
      } catch (extractError) {
        const isTimeout = extractError instanceof Error && extractError.message === "EXTRACTION_SAFETY_TIMEOUT";
        const safeReason = isTimeout
          ? "Document reading timed out. Try a smaller file, fewer pages, or a clearer image."
          : extractError instanceof Error && extractError.message.includes("Gemini")
            ? "Gemini could not analyze this file. The file may be damaged, unsupported, or temporarily unavailable."
            : "We couldn't read this document. It may be damaged or unclear; try a clearer copy.";
        console.error(`[EXTRACTION_FAILED] auditId=${auditId} safeReason="${safeReason}" isTimeout=${isTimeout}`);
        await updateJob(auditId, {
          status: "error",
          error: safeReason,
          resultState: isTimeout || safeReason.includes("partially") ? "partial_analysis" : "unreadable",
        });
        console.log(`[KV_UPDATE] auditId=${auditId} newStatus=error`);
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
