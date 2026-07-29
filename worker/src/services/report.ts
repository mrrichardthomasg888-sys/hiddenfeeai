/**
 * @deprecated This legacy PDF generator is deprecated. It now acts as a shim to the new enhancedReport.ts generator.
 * All call sites should be updated to use `generateEnhancedPdf` from `enhancedReport.ts` directly.
 */

import type { AuditReport, Finding } from "../types.js";
import { generateEnhancedPdf, type EnhancedReportData } from "./enhancedReport.js";

// Import intelligence modules to assemble the required data
import { generateExecutiveSummary } from "../intelligence/executiveSummary.js";
import { prioritizeFindings } from "../intelligence/prioritizationEngine.js";
import { calculateTrustScore } from "../trust/trustScore.js";
import { generateNegotiationAdvice } from "../intelligence/negotiationEngine.js";
import { generateEducationTopics } from "../education/consumerEducation.js";
import { generateActionPlan } from "../intelligence/actionPlanEngine.js";
import { estimateSavings } from "../intelligence/savingsEstimator.js";

export async function generatePdf(report: AuditReport, title: string): Promise<Uint8Array> {
  console.warn(`[DEPRECATION] The legacy 'generatePdf' function in report.ts was called. This function is deprecated and now shims to the new enhanced PDF generator. Please update all call sites to use 'generateEnhancedPdf' from 'enhancedReport.ts' directly.`);

  // Assemble the full, rich data required by the enhanced generator.
  // This ensures that even if old code calls this function, the premium report is generated.
  const enhancedData: EnhancedReportData = {
    auditReport: report,
    executiveSummary: generateExecutiveSummary(report),
    prioritizedFindings: prioritizeFindings(report.findings),
    trustScore: calculateTrustScore(report),
    negotiationAdvice: generateNegotiationAdvice(report.findings),
    educationTopics: generateEducationTopics(report.findings),
    actionPlan: generateActionPlan(report.findings),
    savingsEstimates: estimateSavings(report.findings),
  };

  // Call the new, premium PDF generator.
  return generateEnhancedPdf(enhancedData);
}