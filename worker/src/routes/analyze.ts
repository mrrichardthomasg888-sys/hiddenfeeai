import { Hono } from "hono";
import type { Env } from "../types.js";
import { getJob, updateJob } from "../jobStore.js";
import { runAudit } from "../services/ai.js";
import { generatePdf } from "../services/report.js";
import * as errors from "../utils/errors.js";

export const analyzeRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /api/analyze/:auditId
 * Returns the current job state and report if complete.
 */
analyzeRoute.get("/:auditId", (c) => {
  const { auditId } = c.req.param();
  const job = getJob(auditId);

  if (!job) throw errors.jobNotFound();

  // Don't expose extracted text to the client
  const { extractedText, ...safeJob } = job;
  return c.json(safeJob);
});

/**
 * POST /api/analyze/:auditId/start
 * Triggers the AI audit. Must be in "extracted" status and paid.
 */
analyzeRoute.post("/:auditId/start", async (c) => {
  const { auditId } = c.req.param();
  const job = getJob(auditId);

  if (!job) throw errors.jobNotFound();

  if (job.status !== "extracted" && job.status !== "paid") {
    throw errors.badFile("We couldn't start the analysis. Make sure your document is uploaded and payment is confirmed.");
  }

  if (!job.paid) {
    throw errors.notPaid();
  }

  if (!job.extractedText) {
    throw errors.badFile();
  }

  // Update status to analyzing
  updateJob(auditId, { status: "analyzing" });

  // Run audit asynchronously
  c.executionCtx.waitUntil(
    (async () => {
      try {
        const report = await runAudit({
          text: job.extractedText!,
          fileName: job.fileName ?? "document",
          fileType: job.documentContext?.fileType ?? "unknown",
          pages: job.documentContext?.pages ?? 1,
          lineItems: job.documentContext?.lineItems ?? 0,
        }, c.env);

        updateJob(auditId, { status: "complete", report });
      } catch (auditError) {
        updateJob(auditId, {
          status: "error",
          error: auditError instanceof Error ? auditError.message : "AI audit analysis failed",
        });
      }
    })()
  );

  return c.json({ auditId, status: "analyzing" }, 202);
});

/**
 * GET /api/analyze/:auditId/pdf
 * Downloads a PDF version of the audit report.
 */
analyzeRoute.get("/:auditId/pdf", async (c) => {
  const { auditId } = c.req.param();
  const job = getJob(auditId);

  if (!job) throw errors.jobNotFound();

  if (job.status !== "complete" || !job.report) {
    throw errors.badFile("The report is not ready yet. Please wait for the analysis to complete.");
  }

  try {
    const pdfBytes = await generatePdf(job.report);

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hiddenfeeai-audit-${auditId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[PDF] Generation failed:", err);
    throw errors.generic();
  }
});