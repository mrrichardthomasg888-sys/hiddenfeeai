// ── Test PDF Generator ──
// Generates two test PDFs to verify the conditional financial summary fix

import { generatePdf } from "../server/src/services/pdfGenerator.ts";
import { writeFileSync } from "fs";

// ── Scenario B: Contract risks with N/A amounts ──
const reportWithContractRisks = {
  document_meta: {
    document_type: "Service Contract",
    issuer: "Example Corp",
    analysis_date: new Date().toISOString(),
    pages_reviewed: 15,
    line_items_reviewed: 42,
    report_id: "test-contract-risks-001",
  },
  risk_score: 95,
  risk_level: "High",
  potential_savings: 0,
  confidence_level: 92,
  financial_impact: {
    original_total: 0,
    questionable_charges_total: 0,
    corrected_total: 0,
  },
  findings: [
    {
      id: "finding-1",
      title: "Dynamic Fee Schedule - Unilateral Price Changes",
      category: "Contract Risk",
      severity: "Critical",
      status: "confirmed",
      confidence_score: 95,
      amount: null,
      page: 7,
      line_reference: "Section 4.3",
      evidence: "The contract allows price changes at any time without notice.",
      explanation: "This clause allows unilateral pricing changes.",
      why_it_matters: "You could be charged more at any time.",
      recommended_action: "Request a price lock guarantee.",
      negotiation_message: "Can we add a notice requirement?",
      negotiation_strategy: { difficulty: "Hard", steps: ["Request removal"], script: "I'm concerned.", key_points: ["Unpredictable costs"] },
    },
    {
      id: "finding-2",
      title: "Auto-Renewal With Price Escalation",
      category: "Contract Risk",
      severity: "High",
      status: "confirmed",
      confidence_score: 88,
      amount: null,
      page: 12,
      evidence: "Auto-renews with 15% increase each term.",
      explanation: "Costs increase 15% yearly automatically.",
      why_it_matters: "Your costs escalate without renegotiation.",
      recommended_action: "Negotiate a fixed renewal rate.",
    },
  ],
  math_errors: [],
  duplicate_charges: [],
  hidden_fees: [],
  contract_risks: [],
  clean_document_summary: null,
};

// ── Scenario A: Measurable dollar amounts exist ──
const reportWithAmounts = {
  document_meta: {
    document_type: "Invoice",
    issuer: "PhoneCo Wireless",
    analysis_date: new Date().toISOString(),
    pages_reviewed: 3,
    line_items_reviewed: 28,
    report_id: "test-amounts-002",
  },
  risk_score: 65,
  risk_level: "Elevated",
  potential_savings: 245.50,
  confidence_level: 90,
  financial_impact: {
    original_total: 1250.00,
    questionable_charges_total: 245.50,
    corrected_total: 1004.50,
  },
  findings: [
    {
      id: "finding-1",
      title: "Duplicate Administrative Fee",
      category: "Duplicate Charge",
      severity: "High",
      status: "confirmed",
      confidence_score: 98,
      amount: 45.00,
      page: 2,
      evidence: "Administrative fee of $45 appears twice.",
      explanation: "You were charged twice for the same fee.",
      why_it_matters: "This is a clear overcharge of $45.",
      recommended_action: "Request a refund for the duplicate charge.",
    },
    {
      id: "finding-2",
      title: "Hidden Regulatory Recovery Fee",
      category: "Hidden Fee",
      severity: "Medium",
      status: "confirmed",
      confidence_score: 85,
      amount: 200.50,
      page: 3,
      evidence: "Fee of $200.50 listed in fine print.",
      explanation: "This fee was not disclosed in pricing.",
      why_it_matters: "You're paying an undisclosed fee.",
      recommended_action: "Request removal of the undisclosed fee.",
    },
  ],
  math_errors: [],
  duplicate_charges: [],
  hidden_fees: [],
  contract_risks: [],
  clean_document_summary: null,
};

async function main() {
  const { existsSync } = await import("fs");
  console.log("\n=== Generating Test PDFs ===\n");

  // Scenario B
  console.log("SCENARIO B: Contract risks with N/A amounts (risk 95/100)");
  console.log("  Findings:", reportWithContractRisks.findings.length);
  console.log("  hasMeasurableAmounts:", reportWithContractRisks.findings.some(f => f.amount != null && f.amount > 0));
  console.log("  Expected: IMPACT SUMMARY (not $0 financial table)");

  const pdf1 = await generatePdf(reportWithContractRisks);
  writeFileSync("test_contract_risks.pdf", Buffer.from(pdf1));
  console.log("  Generated test_contract_risks.pdf (" + (pdf1.length / 1024).toFixed(1) + " KB)");

  const text1 = Buffer.from(pdf1).toString("utf-8");
  const hasImpactSummary = text1.includes("Impact Summary");
  const hasFinancialImpactHeader = text1.includes("Financial Impact");
  const hasZero = text1.includes("$0");
  console.log("  PDF contains 'Impact Summary':", hasImpactSummary);
  console.log("  PDF contains 'Financial Impact':", hasFinancialImpactHeader);
  console.log("  PDF contains $0:", hasZero);
  const pass1 = hasImpactSummary && !hasFinancialImpactHeader && !hasZero;
  console.log("  RESULT:", pass1 ? "PASS \u2713" : "FAIL \u2717");

  console.log("");

  // Scenario A
  console.log("SCENARIO A: Measurable dollar amounts exist");
  console.log("  Findings:", reportWithAmounts.findings.length);
  console.log("  hasMeasurableAmounts:", reportWithAmounts.findings.some(f => f.amount != null && f.amount > 0));
  console.log("  Expected: FINANCIAL IMPACT table with $1,250.00");

  const pdf2 = await generatePdf(reportWithAmounts);
  writeFileSync("test_with_amounts.pdf", Buffer.from(pdf2));
  console.log("  Generated test_with_amounts.pdf (" + (pdf2.length / 1024).toFixed(1) + " KB)");

  const text2 = Buffer.from(pdf2).toString("utf-8");
  const hasFinancialImpact2 = text2.includes("Financial Impact");
  const hasOriginal1250 = text2.includes("1,250.00");
  console.log("  PDF contains 'Financial Impact':", hasFinancialImpact2);
  console.log("  PDF contains $1,250.00:", hasOriginal1250);
  const pass2 = hasFinancialImpact2 && hasOriginal1250;
  console.log("  RESULT:", pass2 ? "PASS \u2713" : "FAIL \u2717");

  console.log("");
  console.log("=== SUMMARY ===");
  console.log("Scenario B: " + (pass1 ? "PASS" : "FAIL"));
  console.log("Scenario A: " + (pass2 ? "PASS" : "FAIL"));
  console.log("");
  console.log("Files: test_contract_risks.pdf, test_with_amounts.pdf");
}

main().catch(console.error);
