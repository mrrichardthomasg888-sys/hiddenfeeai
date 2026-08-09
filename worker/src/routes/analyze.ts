import { Hono } from "hono";
import type { Env, AuditReport, Finding, VerifiedFinding } from "../types.js";
import { getJob, updateJob } from "../jobStore.js";
import { runAudit as runAuditLegacy } from "../services/ai.legacy.js";
import { AIAnalyzer } from "../services/aiAnalyzer.js";
import { generateEnhancedPdf, type EnhancedReportData } from "../services/enhancedReport.js";
import * as errors from "../utils/errors.js";
import { generateExecutiveSummary } from "../intelligence/executiveSummary.js";
import { prioritizeFindings } from "../intelligence/prioritizationEngine.js";
import type { TrustScore } from "../trust/trustScore.js";
import { generateNegotiationAdvice } from "../intelligence/negotiationEngine.js";
import { generateEducationTopics } from "../education/consumerEducation.js";
import { generateActionPlan } from "../intelligence/actionPlanEngine.js";
import { estimateSavings } from "../intelligence/savingsEstimator.js";
import { auditPreparedFile } from "../services/geminiDirectAudit.js";
import { buildPremiumReport, normalizeConfidence } from "../services/premiumReport.js";
import { recordFunnelEvent } from "../attribution.js";

export const analyzeRoute = new Hono<{ Bindings: Env }>();

function verifiedFindings(findings: Finding[]): VerifiedFinding[] {
  return findings.map((finding) => ({
    id: finding.id,
    title: finding.title,
    category: finding.category,
    severity: finding.severity,
    confidenceScore: finding.confidence_score,
    confidenceTier: finding.confidence_score >= 85 ? "verified" : finding.confidence_score >= 70 ? "high" : finding.confidence_score >= 50 ? "moderate" : "low",
    amount: finding.amount,
    page: finding.page,
    sectionHeading: null,
    evidenceQuote: finding.evidence,
    explanation: finding.explanation,
    whyItMatters: finding.why_it_matters,
    recommendedAction: finding.recommended_action,
    negotiationMessage: finding.negotiation_message,
    negotiationStrategy: finding.negotiation_strategy,
    sourceAnalyzer: "gemini-3.5-flash-lite",
    evidencePresent: Boolean(finding.evidence),
    evidenceMatchScore: finding.evidence ? finding.confidence_score / 100 : 0,
    verificationNotes: finding.evidence ? "Evidence excerpt included in the report." : "No source excerpt was returned.",
    suppressed: false,
  }));
}

function buildTrustScore(report: AuditReport): TrustScore {
  const score = normalizeConfidence(report.confidence_level);
  const rating = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 55 ? "Fair" : score >= 35 ? "Limited" : "Poor";
  return {
    score,
    rating,
    ratingLabel: `${rating} evidence confidence`,
    factors: [{ name: "Gemini evidence confidence", score, weight: 1, label: rating, detail: `${report.findings.filter((finding) => finding.evidence).length}/${report.findings.length} findings include source evidence.` }],
    summary: `The report's evidence confidence is ${score}/100 (${rating}).`,
    disclaimer: "This score measures support in the submitted document, not whether a company is trustworthy.",
  };
}

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
  const { extractedText, extractedDocument, geminiFile, ...safeJob } = job;
  // Normalize legacy snake_case report to camelCase frontend format
  const report = safeStatus === "complete" && safeJob.report ? normalizeReportForFrontend(safeJob.report) : undefined;
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

  if (job.status !== "extracted" && job.status !== "paid" && !(job.status === "error" && job.geminiFile && job.paid)) {
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

  // Current flow: only the file upload happens before payment. The paid start
  // request stays open while the audit runs, so the frontend remains on its
  // processing screen and no inference is purchased for unpaid uploads.
  if (job.geminiFile) {
    const startedAt = Date.now();
    await updateJob(auditId, { status: "analyzing", progress: job.progress ? { ...job.progress, stage: "analyzing", geminiRequestStatus: "running", geminiResponseStatus: "not_started", complete: false } : undefined });
    await recordFunnelEvent(c.env, { eventName: "analysis_started", eventId: `analysis:${auditId}`, auditId, attribution: job.attribution });
    try {
      const report = await auditPreparedFile(job.geminiFile, c.env, auditId);
      await updateJob(auditId, { status: "complete", report, geminiFile: undefined, resultState: report.findings.length ? "findings_found" : "no_findings_complete", progress: job.progress ? { ...job.progress, stage: "complete", geminiRequestStatus: "succeeded", geminiResponseStatus: "valid", complete: true } : undefined });
      await recordFunnelEvent(c.env, { eventName: "analysis_completed", eventId: `analysis:${auditId}`, auditId, attribution: job.attribution });
      console.log(`[PIPELINE] auditId=${auditId} stage=report_displayed durationMs=${Date.now() - startedAt} findings=${report.findings.length}`);
      return c.json({ auditId, status: "complete" }, 200);
    } catch (error) {
      const internalMessage = error instanceof Error ? error.message : "Document analysis failed.";
      const customerMessage = "We couldn't complete your audit. Please retry the analysis or contact support.";
      console.error(`[PIPELINE] auditId=${auditId} stage=paid_analysis_failed error="${internalMessage.replace(/"/g, "'")}"`);
      await updateJob(auditId, { status: "error", error: customerMessage, resultState: "unreadable", progress: job.progress ? { ...job.progress, stage: "failed", geminiRequestStatus: "failed", geminiResponseStatus: "failed", complete: false } : undefined });
      return c.json({ auditId, status: "error", error: customerMessage }, 422);
    }
  }
  if (!job.extractedText) throw errors.badFile("The document analysis is unavailable. Please upload the file again.");

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
  await updateJob(auditId, { status: "analyzing", progress: job.progress ? { ...job.progress, stage: "analyzing", geminiRequestStatus: "running", complete: false } : undefined });
  await recordFunnelEvent(c.env, { eventName: "analysis_started", eventId: `analysis:${auditId}`, auditId, attribution: job.attribution });
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
        // The finished report is all the customer needs. Do not retain the
        // extracted source text or structured document after review completion.
        if (!report || !Array.isArray(report.findings)) throw new Error("Gemini response failed report schema validation");
        await updateJob(auditId, { status: "reviewing_findings", progress: job.progress ? { ...job.progress, stage: "reviewing", geminiRequestStatus: "succeeded", geminiResponseStatus: "valid", complete: false } : undefined });
        await updateJob(auditId, {
          status: "complete",
          report,
          resultState: report.findings.length ? "findings_found" : "no_findings_complete",
          progress: job.progress ? { ...job.progress, stage: "complete", geminiRequestStatus: "succeeded", geminiResponseStatus: "valid", complete: true } : undefined,
          extractedText: undefined,
          extractedDocument: undefined,
        });
        await recordFunnelEvent(c.env, { eventName: "analysis_completed", eventId: `analysis:${auditId}`, auditId, attribution: job.attribution });
        console.log(`[JobLifecycle] ANALYSIS_COMPLETED auditId=${auditId} durationMs=${durationMs} findings=${report.findings.length} riskScore=${report.risk_score} hasReport=${!!report}`);
      } catch (auditError) {
        const durationMs = Date.now() - startTime;
        console.error(`[JobLifecycle] ANALYSIS_FAILED auditId=${auditId} durationMs=${durationMs} error="${auditError instanceof Error ? auditError.message : "unknown"}"`);
        await updateJob(auditId, {
          status: "error",
          error: auditError instanceof Error ? auditError.message : "AI audit analysis failed",
          resultState: "unreadable",
          progress: job.progress ? { ...job.progress, stage: "failed", geminiRequestStatus: "failed", geminiResponseStatus: "failed", complete: false } : undefined,
          extractedText: undefined,
          extractedDocument: undefined,
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
  const fetchMode = c.req.header("Sec-Fetch-Mode") || "";
  const fetchDest = c.req.header("Sec-Fetch-Dest") || "";
  if (fetchMode === "navigate" || ["document", "frame", "iframe"].includes(fetchDest)) {
    return c.redirect(`https://hiddenfeeai.com/download/${encodeURIComponent(auditId)}`, 302);
  }
  const job = await getJob(auditId);

  if (!job) throw errors.jobNotFound();

  if (job.status !== "complete" || !job.report) {
    throw errors.badFile("The report is not ready yet. Please wait for the analysis to complete.");
  }

  // Define a timeout for PDF generation to prevent Worker CPU limit issues
  const PDF_GENERATION_TIMEOUT_MS = 25_000; // 25 seconds, well within typical Worker limits

  try {
    const sourceReport = job.report;
    const pdfReport = {
      ...sourceReport,
      document_meta: {
        document_type: "Document",
        issuer: "",
        payer: "",
        analysis_date: new Date().toISOString(),
        pages_reviewed: 0,
        line_items_reviewed: 0,
        report_id: auditId,
        ...(sourceReport.document_meta ?? {}),
      },
      financial_impact: {
        original_total: 0,
        questionable_charges_total: 0,
        corrected_total: 0,
        ...(sourceReport.financial_impact ?? {}),
      },
      findings: Array.isArray(sourceReport.findings) ? sourceReport.findings : [],
      math_errors: Array.isArray(sourceReport.math_errors) ? sourceReport.math_errors : [],
      duplicate_charges: Array.isArray(sourceReport.duplicate_charges) ? sourceReport.duplicate_charges : [],
      hidden_fees: Array.isArray(sourceReport.hidden_fees) ? sourceReport.hidden_fees : [],
      contract_risks: Array.isArray(sourceReport.contract_risks) ? sourceReport.contract_risks : [],
    } as AuditReport;

    // ── Assemble Full, Premium Report Data ──
    // This is where we call all the intelligence modules to create a rich dataset
    // for the premium PDF report, ensuring it's complete and impressive.
    // Safely generate intelligence modules — each is optional for PDF
    let executiveSummary, prioritizedFindings, trustScore, negotiationAdvice, educationTopics, actionPlan, savingsEstimates;
    try { executiveSummary = generateExecutiveSummary(pdfReport); } catch { console.warn("[PDF] failed to generate executiveSummary"); }
    const verified = verifiedFindings(pdfReport.findings);
    try { prioritizedFindings = prioritizeFindings(verified); } catch { console.warn("[PDF] failed to generate prioritizedFindings"); }
    try { trustScore = buildTrustScore(pdfReport); } catch { console.warn("[PDF] failed to generate trustScore"); }
    try { negotiationAdvice = new Map(verified.map((finding) => [finding.id, generateNegotiationAdvice(finding)])); } catch { console.warn("[PDF] failed to generate negotiationAdvice"); }
    try { educationTopics = generateEducationTopics(pdfReport.findings); } catch { console.warn("[PDF] failed to generate educationTopics"); }
    try { actionPlan = generateActionPlan(verified, pdfReport.document_meta.document_type); } catch { console.warn("[PDF] failed to generate actionPlan"); }
    try { savingsEstimates = estimateSavings(verified); } catch { console.warn("[PDF] failed to generate savingsEstimates"); }

    const enhancedData: EnhancedReportData = {
      auditReport: pdfReport,
      premiumReport: buildPremiumReport(pdfReport),
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
  const metadata: Partial<AuditReport["document_meta"]> = r.document_meta ?? {};
  const financialImpact: Partial<AuditReport["financial_impact"]> = r.financial_impact ?? {};
  const findings = Array.isArray(r.findings) ? r.findings : [];
  const hiddenFees = Array.isArray(r.hidden_fees) ? r.hidden_fees : [];
  const mathErrors = Array.isArray(r.math_errors) ? r.math_errors : [];
  const contractRisks = Array.isArray(r.contract_risks) ? r.contract_risks : [];

  return {
    premiumReport: buildPremiumReport(r),
    documentMetadata: {
      documentType: metadata.document_type ?? "Other",
      issuer: metadata.issuer ?? "",
      payer: metadata.payer ?? "",
      analysisDate: metadata.analysis_date ?? new Date().toISOString(),
      pagesReviewed: metadata.pages_reviewed ?? 0,
      lineItemsReviewed: metadata.line_items_reviewed ?? 0,
      reportId: metadata.report_id ?? "",
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
      originalTotal: financialImpact.original_total ?? 0,
      questionableChargesTotal: financialImpact.questionable_charges_total ?? 0,
      correctedTotal: financialImpact.corrected_total ?? 0,
      potentialOvercharge: financialImpact.questionable_charges_total ?? 0,
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
    confidence: normalizeConfidence(r.confidence_level),
    allFindings: findings.map((f: Finding) => ({
      id: f.id, title: f.title, severity: f.severity, status: f.status ?? "confirmed",
      confidenceScore: f.confidence_score ?? 0, amount: f.amount, pageNumber: f.page,
      lineReference: f.line_reference, evidence: f.evidence, explanation: f.explanation,
      whyItMatters: f.why_it_matters, recommendedAction: f.recommended_action,
    })),
  };
}
