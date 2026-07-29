import { Hono } from "hono";
import type { Env } from "../types.js";
import { getJob, updateJob } from "../jobStore.js";
import { runAudit as runAuditLegacy } from "../services/ai.legacy.js";
import { AIAnalyzer } from "../services/aiAnalyzer.js";
import { generateEnhancedPdf, type EnhancedReportData } from "../services/enhancedReport.js";
import * as errors from "../utils/errors.js";
import { generateExecutiveSummary } from "../intelligence/executiveSummary.js";
import { prioritizeFindings } from "../intelligence/prioritizationEngine.js";
import { calculateTrustScore } from "../trust/trustScore.js";
import { generateNegotiationAdvice } from "../intelligence/negotiationEngine.js";
import { generateEducationTopics } from "../education/consumerEducation.js";
import { generateActionPlan } from "../intelligence/actionPlanEngine.js";
import { estimateSavings } from "../intelligence/savingsEstimator.js";

export const analyzeRoute = new Hono<{ Bindings: Env }>();

/**
 * GET /api/analyze/:auditId
 * Returns the current job state and report if complete.
 */
analyzeRoute.get("/:auditId", async (c) => {
  const { auditId } = c.req.param();
  const job = await getJob(auditId);

  if (!job) throw errors.jobNotFound();

  // ── KV consistency guard: never expose complete without report ──
  // Cloudflare KV is eventually consistent. When a different Worker isolate
  // reads the job, it might see status="complete" written before the report
  // field has propagated. This guard prevents the frontend from receiving
  // a broken "complete + no report" state that causes a blank page.
  let safeStatus = job.status;
  if (job.status === "complete" && !job.report) {
    safeStatus = "analyzing";
    console.log(`[Analyze] KV_GUARD: masking complete→analyzing for ${auditId} (report not yet propagated)`);
  }

  // Don't expose extracted text or full document structure to the client
  const { extractedText, extractedDocument, ...safeJob } = job;
  return c.json({ ...safeJob, status: safeStatus });
});

/**
 * POST /api/analyze/:auditId/start
 * Triggers the AI audit. Must be in "extracted" status and paid.
 */
analyzeRoute.post("/:auditId/start", async (c) => {
  const { auditId } = c.req.param();
  const job = await getJob(auditId);

  if (!job) throw errors.jobNotFound();

  if (job.status !== "extracted" && job.status !== "paid") {
    throw errors.badFile("We couldn't start the analysis. Make sure your document is uploaded and payment is confirmed.");
  }

  // ── Payment verification: trust status="paid" AND paid flag ──
  // Cloudflare KV is eventually consistent across Worker isolates.
  // A different isolate may see status="paid" (from updateJob) before
  // the paid=true flag propagates. Accept either signal as payment proof.
  const isPaid = job.paid || job.status === "paid";
  if (!isPaid) {
    throw errors.notPaid();
  }

  if (!job.extractedText) {
    throw errors.badFile();
  }

  // ── Race condition guard: prevent concurrent analyses ──
  if (job.status === "analyzing") {
    return c.json({
      auditId,
      status: "analyzing",
      message: "Analysis already in progress. Please wait for it to complete.",
    }, 202);
  }

  const useNew = c.env.USE_NEW_PIPELINE === "true";

  // Update status to analyzing (atomic check in production KV store)
  await updateJob(auditId, { status: "analyzing" });
  console.log(`[JobLifecycle] ANALYSIS_STARTED auditId=${auditId} pipeline=${useNew ? "new" : "legacy"} pages=${job.documentContext?.pages ?? "unknown"}`);

  // Run audit asynchronously
  c.executionCtx.waitUntil(
    (async () => {
      const startTime = Date.now();
      try {
        let report;
        if (useNew && job.extractedDocument) {
          // ── NEW PIPELINE ──
          const analyzer = new AIAnalyzer(c.env);
          report = await analyzer.runAudit(job.extractedDocument);
        } else if (useNew && !job.extractedDocument) {
          // New pipeline enabled but we only have legacy extractedText —
          // fall back to legacy audit since we don't have structured data
          console.log("[Analyze] New pipeline enabled but no structured document data — using legacy audit");
          report = await runAuditLegacy(
            {
              text: job.extractedText!,
              fileName: job.fileName ?? "document",
              fileType: job.documentContext?.fileType ?? "unknown",
              pages: job.documentContext?.pages ?? 1,
              lineItems: job.documentContext?.lineItems ?? 0,
            },
            c.env
          );
        } else {
          // ── LEGACY PIPELINE ──
          report = await runAuditLegacy(
            {
              text: job.extractedText!,
              fileName: job.fileName ?? "document",
              fileType: job.documentContext?.fileType ?? "unknown",
              pages: job.documentContext?.pages ?? 1,
              lineItems: job.documentContext?.lineItems ?? 0,
            },
            c.env
          );
        }
        const durationMs = Date.now() - startTime;
        await updateJob(auditId, { status: "complete", report });
        console.log(`[JobLifecycle] ANALYSIS_COMPLETED auditId=${auditId} durationMs=${durationMs} findings=${report.findings.length} riskScore=${report.risk_score} hasReport=${!!report}`);
      } catch (auditError) {
        const durationMs = Date.now() - startTime;
        console.error(`[JobLifecycle] ANALYSIS_FAILED auditId=${auditId} durationMs=${durationMs} error="${auditError instanceof Error ? auditError.message : "unknown"}"`);
        await updateJob(auditId, {
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
  const job = await getJob(auditId);

  if (!job) throw errors.jobNotFound();

  if (job.status !== "complete" || !job.report) {
    throw errors.badFile("The report is not ready yet. Please wait for the analysis to complete.");
  }

  // Define a timeout for PDF generation to prevent Worker CPU limit issues
  const PDF_GENERATION_TIMEOUT_MS = 25_000; // 25 seconds, well within typical Worker limits

  try {
    // ── Assemble Full, Premium Report Data ──
    // This is where we call all the intelligence modules to create a rich dataset
    // for the premium PDF report, ensuring it's complete and impressive.
    const enhancedData: EnhancedReportData = {
      auditReport: job.report,
      // Generate all the rich components for a professional report
      executiveSummary: generateExecutiveSummary(job.report),
      prioritizedFindings: prioritizeFindings(job.report.findings),
      trustScore: calculateTrustScore(job.report),
      negotiationAdvice: generateNegotiationAdvice(job.report.findings),
      educationTopics: generateEducationTopics(job.report.findings),
      actionPlan: generateActionPlan(job.report.findings),
      savingsEstimates: estimateSavings(job.report.findings),
      // The 'explanations' map can be added here if that engine is developed
    };

    const pdfGenerationPromise = generateEnhancedPdf(enhancedData);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("PDF_GENERATION_TIMEOUT"));
      }, PDF_GENERATION_TIMEOUT_MS);
    });
    const pdfBytes = await Promise.race([pdfGenerationPromise, timeoutPromise]);

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="hiddenfeeai-audit-${auditId.slice(0, 8)}.pdf"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "PDF_GENERATION_TIMEOUT") {
      console.error(`[PDF] Generation timed out for auditId=${auditId}`);
      throw errors.generic("PDF generation took too long. Please try again later or contact support.");
    }
    console.error("[PDF] Generation failed:", err);
    throw errors.generic("Failed to generate PDF report.");
  }
});