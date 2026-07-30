import { Hono } from "hono";
import type { AnalysisProgress, Env } from "../types.js";
import { createJob, updateJob } from "../jobStore.js";
import { isAcceptedExtension } from "../router/documentRouter.js";
import { auditFileDirectly } from "../services/geminiDirectAudit.js";
import * as errors from "../utils/errors.js";
import { validateUpload } from "../middleware/inputValidation.js";

export const uploadRoute = new Hono<{ Bindings: Env }>();

function progress(stage: AnalysisProgress["stage"], file: File, patch: Partial<AnalysisProgress> = {}): AnalysisProgress {
  return { stage, originalFileType: file.type || "unknown", originalFileSize: file.size, totalPages: 0, processedPages: 0, totalImages: 0, processedImages: 0, totalWorksheets: 0, processedWorksheets: 0, failedUnits: [], retryAttempts: 0, geminiRequestStatus: "not_started", geminiResponseStatus: "not_started", complete: false, ...patch };
}

uploadRoute.post("/", async (c) => {
  const maxMb = Number(c.env.MAX_UPLOAD_SIZE_MB || 25);
  const formData = await c.req.formData().catch(() => null);
  if (!formData) throw errors.badFile("The upload body could not be read.");
  const file = formData.get("file") as File | null;
  if (!file) throw errors.badFile("No file was received.");
  console.log(`[PIPELINE] stage=upload_received fileName="${file.name}" bytes=${file.size} mime=${file.type || "unknown"}`);
  if (!file.size) throw errors.badFile("The uploaded file is empty.");
  const validation = validateUpload(file.name, file.size, file.type);
  if (!validation.valid) throw file.size > maxMb * 1024 * 1024 ? errors.tooLarge(maxMb) : errors.badFile(validation.error);
  if (!isAcceptedExtension(validation.sanitizedFileName)) throw errors.unsupportedType(`.${validation.sanitizedFileName.split(".").pop() || "unknown"}`);
  if (file.size > maxMb * 1024 * 1024) throw errors.tooLarge(maxMb);
  console.log(`[PIPELINE] stage=file_validation_completed fileName="${validation.sanitizedFileName}" bytes=${file.size}`);

  const auditId = crypto.randomUUID();
  await createJob(auditId, validation.sanitizedFileName);
  await updateJob(auditId, { status: "extracting", progress: progress("analyzing", file, { geminiRequestStatus: "running" }) });
  try {
    const report = await auditFileDirectly(file, c.env, auditId);
    console.log(`[PIPELINE] auditId=${auditId} stage=report_generation_started findings=${report.findings.length}`);
    await updateJob(auditId, { status: "extracted", report, resultState: report.findings.length ? "findings_found" : "no_findings_complete", progress: progress("reporting", file, { totalPages: report.document_meta.pages_reviewed, processedPages: report.document_meta.pages_reviewed, geminiRequestStatus: "succeeded", geminiResponseStatus: "valid", complete: true }) });
    return c.json({ auditId, status: "extracted", fileName: validation.sanitizedFileName, fileSize: file.size }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document analysis failed.";
    console.error(`[PIPELINE] auditId=${auditId} stage=failed error="${message.replace(/"/g, "'")}"`);
    await updateJob(auditId, { status: "error", error: message, resultState: "unreadable", progress: progress("failed", file, { failedUnits: ["complete file"], retryAttempts: 3, geminiRequestStatus: "failed", geminiResponseStatus: "failed" }) });
    return c.json({ auditId, status: "error", error: message }, 422);
  }
});
