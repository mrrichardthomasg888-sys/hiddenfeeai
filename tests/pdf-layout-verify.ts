import { mkdir, writeFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { generateEnhancedPdf } from "../worker/src/services/enhancedReport.js";
import type { AuditReport, Finding } from "../worker/src/types.js";

const long = "This is deliberately long dynamic report content used to verify wrapping, measured pagination, footer reservation, and preservation of complete evidence. ".repeat(12);
const findings: Finding[] = Array.from({ length: 14 }, (_, index) => ({
  id: `finding-${index}`,
  title: `Extremely long fee title ${index + 1} with identifier ${"ACCOUNT_REFERENCE_".repeat(8)}`,
  category: index % 3 === 0 ? "Hidden Fee" : index % 3 === 1 ? "Contract Risk" : "Billing Error",
  severity: index % 4 === 0 ? "Critical" : index % 4 === 1 ? "High" : index % 4 === 2 ? "Medium" : "Low",
  status: "confirmed",
  confidence_score: 92,
  amount: 1234.56 + index,
  page: index + 1,
  evidence: long,
  explanation: long,
  why_it_matters: long,
  recommended_action: long,
  negotiation_message: long,
  negotiation_strategy: { difficulty: "Medium", steps: [long, long, long], script: long, key_points: [long, long] },
}));

const report: AuditReport = {
  document_meta: { document_type: "Multi-page Test Contract", issuer: "Test Issuer", payer: "Test Customer", analysis_date: new Date().toISOString(), pages_reviewed: 42, line_items_reviewed: 700, report_id: "layout-verification-report" },
  risk_score: 82,
  risk_level: "High",
  potential_savings: 4321.99,
  confidence_level: 92,
  financial_impact: { original_total: 10000, questionable_charges_total: 4321.99, corrected_total: 5678.01 },
  findings,
  math_errors: findings.filter((item) => item.category === "Billing Error"),
  duplicate_charges: [],
  hidden_fees: findings.filter((item) => item.category === "Hidden Fee"),
  contract_risks: findings.filter((item) => item.category === "Contract Risk"),
  clean_document_summary: null,
};

const pdfBytes = await generateEnhancedPdf({ auditReport: report });
await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/hiddenfeeai-layout-verification.pdf", pdfBytes);
const reopened = await PDFDocument.load(pdfBytes);
if (reopened.getPageCount() < 10) throw new Error(`Expected multi-page output, got ${reopened.getPageCount()} pages`);
if (pdfBytes.byteLength < 20_000) throw new Error(`PDF unexpectedly small: ${pdfBytes.byteLength} bytes`);
console.log(JSON.stringify({ pages: reopened.getPageCount(), bytes: pdfBytes.byteLength, findings: findings.length }));
