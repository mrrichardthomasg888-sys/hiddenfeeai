import { Router } from "express";
import { getJob, updateJob } from "@/services/jobStore.js";
import { runAudit } from "@/services/auditor.js";
import { AppError, Errors } from "@/utils/AppError.js";

export const analyzeRouter = Router();

/**
 * GET /api/analyze/:auditId
 * Returns the current job state and report if complete.
 */
analyzeRouter.get("/:auditId", (req, res, next) => {
  const { auditId } = req.params;
  const job = getJob(auditId);

  if (!job) {
    return next(Errors.jobNotFound());
  }

  // Don't expose extracted text to the client
  const { extractedText, filePath, ...safeJob } = job;

  res.json(safeJob);
});

/**
 * POST /api/analyze/:auditId/start
 * Triggers the AI audit. Must be in "extracted" status and paid (or test mode).
 */
analyzeRouter.post("/:auditId/start", async (req, res, next) => {
  const { auditId } = req.params;
  const job = getJob(auditId);

  if (!job) {
    return next(Errors.jobNotFound());
  }

  if (job.status !== "extracted" && job.status !== "paid") {
    return next(
      new AppError(
        400,
        "We couldn't start the analysis. Make sure your document is uploaded and payment is confirmed."
      )
    );
  }

  if (!job.paid) {
    return next(Errors.notPaid());
  }

  if (!job.extractedText) {
    return next(Errors.badFile());
  }

  // Update status to analyzing
  updateJob(auditId, { status: "analyzing" });
  res.status(202).json({ auditId, status: "analyzing" });

  // Run audit asynchronously
  try {
    const report = await runAudit({
      text: job.extractedText,
      fileName: job.fileName ?? "document",
      fileType: (job.documentContext?.fileType as string) ?? "unknown",
      pages: (job.documentContext?.pages as number) ?? 1,
      lineItems: (job.documentContext?.lineItems as number) ?? 0,
    });

    updateJob(auditId, {
      status: "complete",
      report,
    });
  } catch (auditError) {
    updateJob(auditId, {
      status: "error",
      error:
        auditError instanceof Error
          ? auditError.message
          : "AI audit analysis failed",
    });
  }
});

/**
 * GET /api/analyze/:auditId/pdf
 * Downloads a PDF version of the audit report.
 */
analyzeRouter.get("/:auditId/pdf", async (req, res, next) => {
  const { auditId } = req.params;
  const job = getJob(auditId);

  if (!job) {
    return next(Errors.jobNotFound());
  }

  if (job.status !== "complete" || !job.report) {
    return next(
      new AppError(400, "The report is not ready yet. Please wait for the analysis to complete.")
    );
  }

  try {
    const { generatePdf } = await import("@/services/pdfGenerator.js");
    const pdfBuffer = await generatePdf(job.report);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="hiddenfeeai-audit-${auditId.slice(0, 8)}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[PDF] Generation failed:", err);
    return next(new AppError(500, "Failed to generate PDF. Please try again."));
  }
});

export default analyzeRouter;
