import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generatePdf } from "../services/pdfGenerator.js";
import type { AuditReport, HiddenFee } from "../types/audit.js";

const finding: HiddenFee = {
  id: "sample-1", title: "Administrative Processing Fee", severity: "High", status: "confirmed",
  confidenceScore: 96, amount: 795, pageNumber: 2, lineReference: "Line 14",
  evidence: "Administrative Processing Fee - $795.00",
  explanation: "This fee appears separately from government registration costs.",
  whyItMatters: "The charge may be negotiable and materially increases the agreement total.",
  recommendedAction: "Ask the provider to identify the service performed and request removal or reduction.",
  negotiationMessage: "Please explain the basis for this separate $795 fee and whether it can be removed.",
};

const report: AuditReport = {
  documentMetadata: { documentType: "Service Agreement", issuer: "Sample Provider", analysisDate: "July 29, 2026", pagesReviewed: 7, lineItemsReviewed: 24, reportId: "HFA-SAMPLE-001", fileName: "Sample_Service_Agreement.pdf", fileType: "PDF" },
  executiveSummary: { headline: "Review recommended before accepting the final amount", overview: "The audit identified a separately listed administrative fee with meaningful savings potential.", criticalFindings: "One high-priority fee should be clarified and negotiated.", immediateActions: "Request an itemized explanation before payment.", totalFindings: 1 },
  overallRiskScore: 68, riskCategory: "Elevated",
  financialImpact: { originalTotal: 12495, questionableChargesTotal: 795, correctedTotal: 11700, potentialOvercharge: 795, description: "Potential reduction if the administrative charge is removed." },
  estimatedSavings: { conservative: 250, optimistic: 795, mostLikely: 500, description: "Estimated negotiation range based on the flagged charge." },
  hiddenFees: [finding], questionableCharges: [], lineItemFindings: [], contractRisks: [], mathematicalErrors: [],
  negotiationLeverage: [], consumerRights: [],
  recommendedActions: [{ id: "action-1", priority: 1, action: "Request written fee justification", timeframe: "Immediate", estimatedSavings: 500, difficulty: "Easy", phase: "Before Contact", details: "Ask for the fee policy and an itemized description of services." }],
  questionsToAsk: ["What service does the $795 fee cover?", "Can this charge be removed or reduced?"],
  phoneNegotiationScript: ["I am reviewing the separate administrative fee and would like an itemized explanation before proceeding."],
  emailNegotiationTemplate: ["Please provide the policy and itemized basis for the $795 administrative fee."],
  confidence: 96, allFindings: [finding],
};

const outputDir = resolve(process.cwd(), "output", "pdf");
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "hiddenfeeai-brand-audit-sample.pdf"), await generatePdf(report));
