import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, PDFName } from "pdf-lib";
import { buildPremiumReport } from "../worker/src/services/premiumReport.js";
import { generateEnhancedPdf } from "../worker/src/services/enhancedReport.js";
import type { AuditReport, Finding } from "../worker/src/types.js";

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const finding = (id: string, title: string, severity: Finding["severity"], amount: number | null, page: number, category = "Hidden Fee"): Finding => ({
  id, title, category, severity, status: "confirmed", confidence_score: id === "one" ? 0.99 : 92, amount, page,
  source_reference: `Page ${page}, Section ${page}.2`, evidence: `${title} appears in the submitted document.`, explanation: `${title} changes the customer's cost or obligations.`, why_it_matters: "The full financial or contract effect should be understood before agreement.", recommended_action: `Request written clarification and revision of ${title}.`, charge_timing: /renew/i.test(title) ? "recurring" : "one-time",
  questions_to_ask: [`How is ${title} calculated?`], negotiability_assessment: "Request removal first, then a documented cap.", alternative_language: `${title} applies only with advance written consent.`, financial_impact: amount == null ? "The amount is not stated." : `$${amount.toFixed(2)} per stated occurrence.`,
});

const findings = [
  finding("one", "Termination Administration Fee", "Critical", 5000, 12),
  finding("two", "Platform Access Surcharge", "High", 14.95, 3),
  finding("three", "Automatic Renewal Notice Window", "High", null, 8, "Contract Risk"),
  finding("four", "Payment Processing Assessment", "Medium", 1.85, 4),
  finding("five", "Price Changes at Renewal", "Medium", null, 9, "Contract Risk"),
  finding("six", "Inactivity Maintenance Fee", "Low", 19, 5),
];

const report: AuditReport = {
  document_meta: { document_type: "Master Digital Services", issuer: "Northstar Meridian Systems", payer: "Example Customer", analysis_date: "2026-07-30T22:10:27.149Z", pages_reviewed: 50, line_items_reviewed: 192, report_id: "premium-regression" },
  risk_score: 98.5, risk_level: "High", potential_savings: 5000, confidence_level: 0.99,
  financial_impact: { original_total: 10000, questionable_charges_total: 5035.8, corrected_total: 4964.2 },
  findings, hidden_fees: findings.filter((item) => item.category === "Hidden Fee"), contract_risks: findings.filter((item) => item.category === "Contract Risk"), math_errors: [], duplicate_charges: [], clean_document_summary: null,
};

const cleanReport: AuditReport = {
  document_meta: { document_type: "Clean Service Agreement", issuer: "Example Provider", payer: "Example Customer", analysis_date: "2026-07-30T22:10:27.149Z", pages_reviewed: 8, line_items_reviewed: 74, report_id: "clean-regression" },
  risk_score: 12, risk_level: "Low", potential_savings: 0, confidence_level: 96,
  financial_impact: { original_total: 1200, questionable_charges_total: 0, corrected_total: 1200 }, findings: [], hidden_fees: [], contract_risks: [], math_errors: [], duplicate_charges: [],
  clean_document_summary: { spending_breakdown: [{ category: "Base service", amount: 1200 }], cost_categories: ["Service"], key_terms: ["Fixed annual price"], negotiation_opportunities: ["Ask for a renewal cap"], questions_to_ask: ["How is renewal pricing set?"], money_saving_suggestions: ["Compare the renewal quote before the notice window closes."] },
};

async function textOf(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const document = await getDocument({ data: bytes.slice() }).promise;
  const pages: string[] = [];
  for (let number = 1; number <= document.numPages; number += 1) {
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => "str" in item ? item.str : "").join("\n"));
  }
  return { text: pages.join("\n"), pages: document.numPages };
}

const premium = buildPremiumReport(report);
assert(premium.executiveOverview.confidence === 99, "0.99 confidence must render as 99%");
assert(premium.negotiationPlaybook.phoneScript.length > 50, "Negotiation Playbook must always contain a complete phone script");
assert(premium.findings.every((item) => item.evidenceQuote && item.location && item.talkingPoint), "Every finding must link evidence and a concise talking point");
assert(premium.executiveOverview.potentialSavings === 5000, "Canonical savings must match the source report");
assert(premium.sectionOrder.length === 16, "Canonical report must define the complete premium section order");
assert(premium.executiveDashboard.metrics.length === 7, "Executive dashboard must contain all seven required hero metrics");
assert(premium.executiveDashboard.deliverables.length === 4, "Existing report deliverables must remain visible in the canonical model");
assert(premium.executiveDashboard.negotiationSuccessReadiness <= 95, "Negotiation readiness must not imply guaranteed success");
assert(premium.visualizations.contractScorecard.length >= 5 && premium.visualizations.industryBenchmark.length >= 5, "Scorecard and benchmark comparison must be complete");
assert(Object.values(premium.checklists).every((items) => items.length >= 4), "Every professional checklist must contain actionable controls");

const cleanPremium = buildPremiumReport(cleanReport);
assert(cleanPremium.negotiationPlaybook.phoneScript.length > 50, "Clean contracts must still include negotiation guidance");
assert(cleanPremium.positiveTerms.length > 0 && cleanPremium.missingProtections.length > 0 && cleanPremium.watchLater.length > 0, "Clean Contract Health Reports must remain valuable");
assert(cleanPremium.sectionOrder.map((item) => item.key).join("|") === premium.sectionOrder.map((item) => item.key).join("|"), "Clean and finding-rich reports must use the same section architecture");

const pdf = await generateEnhancedPdf({ auditReport: report, premiumReport: premium });
const cleanPdf = await generateEnhancedPdf({ auditReport: cleanReport, premiumReport: cleanPremium });
const parsedPdf = await PDFDocument.load(pdf);
assert(Boolean(parsedPdf.catalog.get(PDFName.of("Outlines"))), "PDF must include navigation bookmarks");
const tocLinkCount = parsedPdf.getPages().reduce((sum, page) => sum + (page.node.Annots()?.size() ?? 0), 0);
assert(tocLinkCount >= premium.sectionOrder.length, "PDF table of contents must link every canonical section");
const rendered = await textOf(pdf);
const cleanRendered = await textOf(cleanPdf);
const normalizedText = rendered.text.replace(/\s+/g, " ");
let previousSectionPosition = -1;
for (const section of premium.sectionOrder) {
  assert(rendered.text.includes(section.title), `PDF missing canonical section: ${section.title}`);
  assert(normalizedText.includes(section.description), `PDF wording drifted for section description: ${section.title}`);
  const sectionPosition = rendered.text.lastIndexOf(section.title);
  assert(sectionPosition > previousSectionPosition, `PDF section order drifted at: ${section.title}`);
  previousSectionPosition = sectionPosition;
}
for (const heading of ["Executive Dashboard", "AI Executive Insights", "Financial Impact and Cost Forecast", "Risk, Health, and Benchmark Scorecard", "Professional Review Checklists", "Industry Benchmark Comparison", "Cost Forecast", "Savings Timeline", "Priority Matrix", "Procurement Checklist", "Attorney Review Checklist", "Negotiation Checklist", "Renewal Readiness", "Invoice Monitoring Checklist"]) assert(rendered.text.includes(heading), `PDF missing premium value section: ${heading}`);
assert(!rendered.text.includes("Your Action Scripts"), "Legacy per-finding script section must not render");
assert(!rendered.text.includes("0 findings with negotiation language"), "PDF must not claim negotiation guidance is missing");
assert((rendered.text.match(/PERSONALIZED PHONE SCRIPT/g) ?? []).length === 1, "Full phone script must render once for normal content");
assert((rendered.text.match(/SHORT EXECUTIVE EMAIL/g) ?? []).length === 1, "Short email must render once for normal content");
assert((rendered.text.match(/DETAILED NEGOTIATION EMAIL/g) ?? []).length === 1, "Detailed email must render once for normal content");
assert(rendered.text.includes("99%"), "PDF confidence must display 99%, not 0.99%");
assert(!rendered.text.includes("0.99%"), "PDF must not display fractional confidence as a percent");
assert(rendered.text.includes("$5,000.00"), "PDF possible savings must match canonical web data");
for (const metric of premium.executiveDashboard.metrics) assert(rendered.text.includes(metric.displayValue), `PDF and web dashboard value drifted: ${metric.label}`);
for (const metric of premium.executiveDashboard.metrics) assert(normalizedText.includes(metric.supportingText), `PDF omitted canonical dashboard context: ${metric.label}`);
for (const item of premium.executiveDashboard.deliverables) assert(rendered.text.includes(item.label), `PDF omitted existing report deliverable: ${item.label}`);
assert(rendered.text.includes("Original total") && rendered.text.includes("Corrected total"), "PDF must preserve original and corrected financial calculations");
assert(rendered.text.length > 5000, "PDF text must be searchable and complete");
assert(cleanRendered.text.includes("No major hidden fee was confirmed") && cleanRendered.text.includes("Positive Terms and Protections") && cleanRendered.text.includes("What to Watch Later"), "Clean PDF must be a complete Contract Health Report");
for (const section of cleanPremium.sectionOrder) assert(cleanRendered.text.includes(section.title), `Clean PDF missing canonical section: ${section.title}`);

const webRenderer = await readFile("client/src/components/report/PremiumReportSections.tsx", "utf8");
assert(webRenderer.includes("report.sectionOrder.map"), "Web renderer must iterate the canonical section order");
assert(webRenderer.includes("report.executiveDashboard.metrics.map"), "Web dashboard must render canonical metrics without recalculation drift");

await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/premium-report-regression.pdf", pdf);
await writeFile("tmp/pdfs/clean-contract-health-report.pdf", cleanPdf);
console.log(JSON.stringify({ findings: premium.findings.length, confidence: premium.executiveOverview.confidence, pages: rendered.pages, cleanPages: cleanRendered.pages, scripts: 1, searchableCharacters: rendered.text.length }));
