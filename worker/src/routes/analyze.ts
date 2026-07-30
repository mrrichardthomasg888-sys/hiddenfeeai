import { Hono } from "hono";
import type { Env, AuditReport, Finding } from "../types.js";
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
  // Normalize legacy snake_case report to camelCase frontend format
  const report = safeJob.report ? normalizeReportForFrontend(safeJob.report) : undefined;
  return c.json({ ...safeJob, report, status: safeStatus });
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
    // Safely generate intelligence modules — each is optional for PDF
    let executiveSummary, prioritizedFindings, trustScore, negotiationAdvice, educationTopics, actionPlan, savingsEstimates;
    try { executiveSummary = generateExecutiveSummary(job.report); } catch { console.warn("[PDF] failed to generate executiveSummary"); }
    try { prioritizedFindings = prioritizeFindings(job.report.findings); } catch { console.warn("[PDF] failed to generate prioritizedFindings"); }
    try { trustScore = calculateTrustScore(job.report); } catch { console.warn("[PDF] failed to generate trustScore"); }
    try { negotiationAdvice = generateNegotiationAdvice(job.report.findings); } catch { console.warn("[PDF] failed to generate negotiationAdvice"); }
    try { educationTopics = generateEducationTopics(job.report.findings); } catch { console.warn("[PDF] failed to generate educationTopics"); }
    try { actionPlan = generateActionPlan(job.report.findings); } catch { console.warn("[PDF] failed to generate actionPlan"); }
    try { savingsEstimates = estimateSavings(job.report.findings); } catch { console.warn("[PDF] failed to generate savingsEstimates"); }

    const enhancedData: EnhancedReportData = {
      auditReport: job.report,
      executiveSummary,
      prioritizedFindings,
      trustScore,
      negotiationAdvice,
      educationTopics,
      actionPlan,
      savingsEstimates,
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

function buildEmailTemplate(r: AuditReport): string[] {
  const findings = r.findings ?? [];
  if (findings.length === 0) return [];
  const top = findings.slice(0, 3).map((f: Finding) => f.title).join(", ");
  return [
    `Subject: Request for Fee Clarification — ${r.document_meta?.document_type || "Document"} Review`,
    ``,
    `Dear Customer Service,`,
    ``,
    `I recently reviewed my ${(r.document_meta?.document_type || "document").toLowerCase()} and noticed several charges I'd like clarified: ${top}.`,
    ``,
    `I request a detailed explanation of these charges and ask if any can be reduced or waived. Please respond in writing within 5 business days.`,
    ``,
    `Thank you for your prompt attention.`,
  ];
}

// ── Report normalization: convert legacy snake_case to frontend camelCase ──
function normalizeReportForFrontend(r: AuditReport): any {
  const findings = r.findings ?? [];
  const hiddenFees = r.hidden_fees ?? [];
  const mathErrors = r.math_errors ?? [];
  const contractRisks = r.contract_risks ?? [];

  return {
    documentMetadata: {
      documentType: r.document_meta.document_type ?? "Other",
      issuer: r.document_meta.issuer,
      payer: r.document_meta.payer,
      analysisDate: r.document_meta.analysis_date ?? new Date().toISOString(),
      pagesReviewed: r.document_meta.pages_reviewed ?? 0,
      lineItemsReviewed: r.document_meta.line_items_reviewed ?? 0,
      reportId: r.document_meta.report_id ?? "",
    },
    executiveSummary: {
      headline: r.risk_level ?? "Review Recommended",
      overview: `This document contains ${findings.length} findings with a risk score of ${r.risk_score ?? 0}/100.`,
      criticalFindings: findings.filter((f:Finding) => f.severity === "Critical").map((f:Finding) => f.title).join("; ") || "None",
      immediateActions: findings.slice(0, 3).map((f:Finding) => f.recommended_action).join("; ") || "Review findings carefully.",
      totalFindings: findings.length,
    },
    overallRiskScore: r.risk_score ?? 0,
    riskCategory: r.risk_level ?? "Low",
    financialImpact: {
      originalTotal: r.financial_impact.original_total ?? 0,
      questionableChargesTotal: r.financial_impact.questionable_charges_total ?? 0,
      correctedTotal: r.financial_impact.corrected_total ?? 0,
      potentialOvercharge: r.financial_impact.questionable_charges_total ?? 0,
      description: "Based on identified hidden fees and questionable charges.",
    },
    estimatedSavings: {
      conservative: Math.round((r.potential_savings ?? 0) * 0.5),
      optimistic: Math.round((r.potential_savings ?? 0) * 1.5),
      mostLikely: r.potential_savings ?? 0,
      description: "Potential savings from addressing flagged charges.",
    },
    hiddenFees: hiddenFees.map((f: Finding) => ({
      id: f.id, title: f.title, severity: f.severity, status: f.status ?? "confirmed",
      confidenceScore: f.confidence_score ?? 0, amount: f.amount, pageNumber: f.page,
      lineReference: f.line_reference, evidence: f.evidence, explanation: f.explanation,
      whyItMatters: f.why_it_matters, recommendedAction: f.recommended_action,
      negotiationMessage: f.negotiation_message,
      negotiationStrategy: f.negotiation_strategy ? {
        difficulty: f.negotiation_strategy.difficulty ?? "Medium", successProbability: 60,
        priority: "High", estimatedSavings: f.amount ?? 0,
        steps: f.negotiation_strategy.steps ?? [], script: f.negotiation_strategy.script ?? "",
        keyPoints: f.negotiation_strategy.key_points ?? [],
      } : undefined,
    })),
    questionableCharges: findings.filter((f: Finding) => f.category === "Hidden Fee").map((f: Finding) => ({
      id: f.id, title: f.title, severity: f.severity, status: f.status ?? "confirmed",
      confidenceScore: f.confidence_score ?? 0, amount: f.amount, pageNumber: f.page,
      lineReference: f.line_reference, evidence: f.evidence, explanation: f.explanation,
      whyItMatters: f.why_it_matters, recommendedAction: f.recommended_action,
    })),
    lineItemFindings: [],
    contractRisks: contractRisks.map((f: Finding) => ({
      id: f.id, title: f.title, severity: f.severity, status: f.status ?? "confirmed",
      confidenceScore: f.confidence_score ?? 0, pageNumber: f.page,
      clauseText: f.evidence, evidence: f.evidence,
      explanation: f.explanation, whyItMatters: f.why_it_matters, recommendedAction: f.recommended_action,
    })),
    mathematicalErrors: mathErrors.map((f: Finding) => ({
      id: f.id, title: f.title, severity: f.severity,
      pageNumber: f.page, expectedValue: null, actualValue: f.amount, discrepancy: null,
      evidence: f.evidence, explanation: f.explanation, recommendedAction: f.recommended_action,
    })),
    negotiationLeverage: [],
    consumerRights: [],
    recommendedActions: findings.slice(0, 5).map((f: Finding, i: number) => ({
      id: `action-${i}`, priority: i + 1, action: f.recommended_action,
      timeframe: "This Week" as const, estimatedSavings: f.amount ?? 0,
      difficulty: "Easy" as const, phase: "Before Contact" as const, details: f.explanation,
    })),
    questionsToAsk: findings.map((f: Finding) => `Why is this "${f.title}" fee being charged? Is it negotiable?`),
    phoneNegotiationScript: findings
      .filter((f: Finding) => f.negotiation_message)
      .map((f: Finding) => f.negotiation_message!)
      .slice(0, 5),
    emailNegotiationTemplate: buildEmailTemplate(r),
    confidence: r.confidence_level ?? 0,
    allFindings: findings.map((f: Finding) => ({
      id: f.id, title: f.title, severity: f.severity, status: f.status ?? "confirmed",
      confidenceScore: f.confidence_score ?? 0, amount: f.amount, pageNumber: f.page,
      lineReference: f.line_reference, evidence: f.evidence, explanation: f.explanation,
      whyItMatters: f.why_it_matters, recommendedAction: f.recommended_action,
    })),
  };
}
