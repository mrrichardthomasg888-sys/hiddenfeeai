import { Router } from "express";
import { getJob, updateJob } from "../services/jobStore.js";
import { analyzeWithGemini } from "../services/geminiEngine.js";
import { AppError, Errors } from "../utils/AppError.js";

export const analyzeRouter = Router();

/**
 * GET /api/analyze/:auditId
 * Returns current job state and report if complete.
 */
analyzeRouter.get("/:auditId", (req, res, next) => {
  const { auditId } = req.params;
  const job = getJob(auditId);

  if (!job) {
    return next(Errors.jobNotFound());
  }

  // Never expose file paths to the client
  const { filePath, fileMimeType, ...safeJob } = job;

  res.json(safeJob);
});

/**
 * POST /api/analyze/:auditId/start
 * Triggers the Gemini analysis. Must be in "extracted" or "paid" status and paid.
 *
 * Pipeline:
 *   paid → reading → processing → building_report → complete
 */
analyzeRouter.post("/:auditId/start", async (req, res, next) => {
  const { auditId } = req.params;
  const job = getJob(auditId);

  if (!job) {
    return next(Errors.jobNotFound());
  }

  if (!["extracted", "paid"].includes(job.status)) {
    return next(
      new AppError(
        400,
        "Your document is not ready for analysis yet. Please ensure your file is uploaded and payment is confirmed."
      )
    );
  }

  if (!job.paid) {
    return next(Errors.notPaid());
  }

  if (!job.filePath) {
    return next(Errors.badFile());
  }

  // Respond immediately — analysis runs asynchronously
  updateJob(auditId, { status: "reading" });
  res.status(202).json({ auditId, status: "reading" });

  // ── Async Gemini analysis pipeline ──────────────────────────────────────
  (async () => {
    try {
      // Stage 1: Reading
      updateJob(auditId, { status: "reading" });
      await new Promise((r) => setTimeout(r, 800)); // brief pause for UI

      // Stage 2: Processing (Gemini call begins)
      updateJob(auditId, { status: "processing" });

      const report = await analyzeWithGemini(
        job.filePath!,
        job.fileName ?? "document"
      );

      // Stage 3: Building report
      updateJob(auditId, { status: "building_report" });
      await new Promise((r) => setTimeout(r, 500)); // brief pause for UI

      // Stage 4: Complete
      updateJob(auditId, {
        status: "complete",
        report,
      });
    } catch (analysisError) {
      console.error("[Gemini Analysis Error]:", analysisError instanceof Error ? analysisError.message : analysisError);

      // Never expose internal error details to the client
      updateJob(auditId, {
        status: "error",
        error:
          "We encountered an issue analyzing your document. Please try uploading again. If the problem persists, try a different file format.",
      });
    }
  })();
});

/**
 * GET /api/analyze/:auditId/pdf
 * Generates and downloads a premium PDF executive report.
 */
analyzeRouter.get("/:auditId/pdf", async (req, res, next) => {
  const { auditId } = req.params;
  const job = getJob(auditId);

  if (!job) {
    return next(Errors.jobNotFound());
  }

  if (job.status !== "complete" || !job.report) {
    return next(
      new AppError(400, "Your report is not ready yet. Please wait for the analysis to complete.")
    );
  }

  try {
    const { generatePdf } = await import("../services/pdfGenerator.js");
    const pdfBuffer = await generatePdf(job.report);

    const safeId = auditId.slice(0, 8);
    const docType = (job.report.documentMetadata.documentType ?? "document")
      .toLowerCase()
      .replace(/\s+/g, "-");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="hiddenfeeai-audit-${docType}-${safeId}.pdf"`
    );
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error("[PDF Generation Error]:", err);
    return next(new AppError(500, "Unable to generate your PDF report. Please try again."));
  }
});

export default analyzeRouter;
