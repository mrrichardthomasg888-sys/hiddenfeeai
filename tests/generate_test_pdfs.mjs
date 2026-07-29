// ── Test PDF Generator ──
// Generates two test PDFs to verify the conditional financial summary fix

import { generatePdf } from "../server/src/services/pdfGenerator.ts";
import { writeFileSync } from "fs";

// ── Scenario B: Contract risks with N/A amounts ──
const reportWithContractRisks = {
  documentMetadata: {
    documentType: "Service Contract",
    issuer: "Example Corp",
    analysisDate: new Date().toISOString(),
    pagesReviewed: 15,
    lineItemsReviewed: 42,
    reportId: "test-contract-risks-001",
  },
  overallRiskScore: 95,
  riskCategory: "High",
  estimatedSavings: {
    conservative: 0,
    mostLikely: 0,
    optimistic: 0,
    description: "No direct dollar savings detected.",
  },
  confidence: 92,
  financialImpact: {
    originalTotal: 0,
    questionableChargesTotal: 0,
    correctedTotal: 0,
    potentialOvercharge: 0,
    description: "",
  },
  executiveSummary: {
    headline: "Critical Contractual Risks Identified",
    overview: "We reviewed the contract and found dynamic pricing terms.",
    criticalFindings: "Price updates can be unilateral.",
    immediateActions: "Negotiate fixed price locks.",
    totalFindings: 2,
  },
  hiddenFees: [],
  questionableCharges: [],
  contractRisks: [
    {
      id: "finding-1",
      title: "Dynamic Fee Schedule - Unilateral Price Changes",
      severity: "Critical",
      status: "confirmed",
      confidenceScore: 95,
      amount: null,
      pageNumber: 7,
      lineReference: "Section 4.3",
      evidence: "The contract allows price changes at any time without notice.",
      explanation: "This clause allows unilateral pricing changes.",
      whyItMatters: "You could be charged more at any time.",
      recommendedAction: "Request a price lock guarantee.",
      negotiationMessage: "Can we add a notice requirement?",
      negotiationStrategy: { difficulty: "Hard", successProbability: 50, steps: ["Request removal"], script: "I'm concerned.", keyPoints: ["Unpredictable costs"] },
    },
    {
      id: "finding-2",
      title: "Auto-Renewal With Price Escalation",
      severity: "High",
      status: "confirmed",
      confidenceScore: 88,
      amount: null,
      pageNumber: 12,
      evidence: "Auto-renews with 15% increase each term.",
      explanation: "Costs increase 15% yearly automatically.",
      whyItMatters: "Your costs escalate without renegotiation.",
      recommendedAction: "Negotiate a fixed renewal rate.",
    },
  ],
  mathematicalErrors: [],
  negotiationLeverage: [],
  recommendedActions: [],
  questionsToAsk: [],
  phoneNegotiationScript: [],
  emailNegotiationTemplate: [],
  consumerRights: [],
};

// ── Scenario A: Measurable dollar amounts exist ──
const reportWithAmounts = {
  documentMetadata: {
    documentType: "Invoice",
    issuer: "PhoneCo Wireless",
    analysisDate: new Date().toISOString(),
    pagesReviewed: 3,
    lineItemsReviewed: 28,
    reportId: "test-amounts-002",
  },
  overallRiskScore: 65,
  riskCategory: "Elevated",
  estimatedSavings: {
    conservative: 100,
    mostLikely: 245.50,
    optimistic: 300,
    description: "Undisclosed overcharges identified.",
  },
  confidence: 90,
  financialImpact: {
    originalTotal: 1250.00,
    questionableChargesTotal: 245.50,
    correctedTotal: 1004.50,
    potentialOvercharge: 245.50,
    description: "",
  },
  executiveSummary: {
    headline: "Incorrect Fees Found in Invoice",
    overview: "We found multiple administrative and hidden charges.",
    criticalFindings: "Duplicate billing detected.",
    immediateActions: "Request refunds immediately.",
    totalFindings: 2,
  },
  hiddenFees: [
    {
      id: "finding-1",
      title: "Duplicate Administrative Fee",
      severity: "High",
      status: "confirmed",
      confidenceScore: 98,
      amount: 45.00,
      pageNumber: 2,
      evidence: "Administrative fee of $45 appears twice.",
      explanation: "You were charged twice for the same fee.",
      whyItMatters: "This is a clear overcharge of $45.",
      recommendedAction: "Request a refund for the duplicate charge.",
    },
    {
      id: "finding-2",
      title: "Hidden Regulatory Recovery Fee",
      severity: "Medium",
      status: "confirmed",
      confidenceScore: 85,
      amount: 200.50,
      pageNumber: 3,
      evidence: "Fee of $200.50 listed in fine print.",
      explanation: "This fee was not disclosed in pricing.",
      whyItMatters: "You're paying an undisclosed fee.",
      recommendedAction: "Request removal of the undisclosed fee.",
    },
  ],
  questionableCharges: [],
  contractRisks: [],
  mathematicalErrors: [],
  negotiationLeverage: [],
  recommendedActions: [],
  questionsToAsk: [],
  phoneNegotiationScript: [],
  emailNegotiationTemplate: [],
  consumerRights: [],
};

async function main() {
  const { existsSync } = await import("fs");
  console.log("\n=== Generating Test PDFs ===\n");

  console.log("Generating report 1 (Contract Risks)...");
  const pdf1 = await generatePdf(reportWithContractRisks);
  writeFileSync("test_contract_risks.pdf", Buffer.from(pdf1));
  console.log("  Generated test_contract_risks.pdf (" + (pdf1.length / 1024).toFixed(1) + " KB)");

  console.log("\nGenerating report 2 (Amounts)...");
  const pdf2 = await generatePdf(reportWithAmounts);
  writeFileSync("test_with_amounts.pdf", Buffer.from(pdf2));
  console.log("  Generated test_with_amounts.pdf (" + (pdf2.length / 1024).toFixed(1) + " KB)");

  console.log("\n=== SUMMARY ===");
  console.log("Scenario B (Contract Risks): Success");
  console.log("Scenario A (Amounts): Success");
  console.log("");
  console.log("Files written to root workspace: test_contract_risks.pdf, test_with_amounts.pdf");
}

main().catch(console.error);
