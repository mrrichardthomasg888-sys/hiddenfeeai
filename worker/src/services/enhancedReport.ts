import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { AuditReport, Finding } from "../types.js";
import type { EnhancedExecutiveSummary } from "../intelligence/executiveSummary.js";
import type { PrioritizedFinding } from "../intelligence/prioritizationEngine.js";
import type { TrustScore } from "../trust/trustScore.js";
import type { NegotiationAdvice } from "../intelligence/negotiationEngine.js";
import type { EducationTopic } from "../education/consumerEducation.js";
import type { ActionPlan } from "../intelligence/actionPlanEngine.js";
import type { SavingsEstimate } from "../intelligence/savingsEstimator.js";

export interface EnhancedReportData {
  auditReport: AuditReport;
  executiveSummary?: EnhancedExecutiveSummary;
  prioritizedFindings?: PrioritizedFinding[];
  trustScore?: TrustScore;
  negotiationAdvice?: Map<string, NegotiationAdvice>;
  educationTopics?: EducationTopic[];
  actionPlan?: ActionPlan;
  savingsEstimates?: SavingsEstimate[];
}

type Color = [number, number, number];
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 42;
const TOP = 58;
const BOTTOM = 52;
const WIDTH = PAGE_W - MARGIN * 2;
const BODY: Color = [0.16, 0.2, 0.27];
const MUTED: Color = [0.4, 0.45, 0.52];
const NAVY: Color = [0.035, 0.07, 0.13];
const BLUE: Color = [0.16, 0.43, 0.82];
const GOLD: Color = [0.86, 0.64, 0.12];
const RED: Color = [0.78, 0.18, 0.18];
const ORANGE: Color = [0.88, 0.42, 0.1];
const GREEN: Color = [0.08, 0.55, 0.34];
const BORDER: Color = [0.86, 0.89, 0.93];
const PAPER: Color = [0.985, 0.99, 1];

const clean = (value: unknown): string => String(value ?? "")
  .replace(/[\u{1F000}-\u{1FAFF}]/gu, "")
  .replace(/[\u2010-\u2015]/g, "-")
  .replace(/[“”„‟]/g, '"')
  .replace(/[‘’‚‛]/g, "'")
  .replace(/\u2026/g, "...")
  .replace(/\u2022/g, "-")
  .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const money = (value: number | null | undefined) => value == null
  ? "Not stated"
  : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

class Flow {
  private page!: PDFPage;
  private y = PAGE_H - TOP;
  private pageNumber = 0;

  constructor(
    private readonly pdf: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {}

  addPage(): void {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.pageNumber += 1;
    this.y = PAGE_H - TOP;
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(...PAPER) });
    this.page.drawText("HiddenFeeAI Professional Audit Report", { x: MARGIN, y: PAGE_H - 30, size: 8, font: this.regular, color: rgb(...MUTED) });
    this.page.drawLine({ start: { x: MARGIN, y: PAGE_H - 38 }, end: { x: PAGE_W - MARGIN, y: PAGE_H - 38 }, thickness: 0.6, color: rgb(...BORDER) });
  }

  private ensure(height: number): void {
    if (!this.page || this.y - height < BOTTOM) this.addPage();
  }

  private splitWord(word: string, font: PDFFont, size: number, width: number): string[] {
    const pieces: string[] = [];
    let part = "";
    for (const char of word) {
      if (part && font.widthOfTextAtSize(part + char, size) > width) { pieces.push(part); part = char; }
      else part += char;
    }
    if (part) pieces.push(part);
    return pieces;
  }

  wrap(value: unknown, font: PDFFont, size: number, width: number): string[] {
    const paragraphs = String(value ?? "").replace(/\r/g, "").split("\n");
    const output: string[] = [];
    for (const paragraph of paragraphs) {
      const words = clean(paragraph).split(" ").filter(Boolean).flatMap((word) =>
        font.widthOfTextAtSize(word, size) > width ? this.splitWord(word, font, size, width) : [word]
      );
      if (!words.length) { output.push(""); continue; }
      let line = "";
      for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (line && font.widthOfTextAtSize(next, size) > width) { output.push(line); line = word; }
        else line = next;
      }
      if (line) output.push(line);
    }
    return output;
  }

  text(value: unknown, options: { size?: number; bold?: boolean; color?: Color; indent?: number; width?: number; gap?: number } = {}): void {
    const size = options.size ?? 9.5;
    const font = options.bold ? this.bold : this.regular;
    const indent = options.indent ?? 0;
    const width = options.width ?? WIDTH - indent;
    const lineHeight = size * 1.34;
    const lines = this.wrap(value, font, size, width);
    for (const line of lines) {
      this.ensure(lineHeight);
      if (line) this.page.drawText(line, { x: MARGIN + indent, y: this.y - size, size, font, color: rgb(...(options.color ?? BODY)) });
      this.y -= lineHeight;
    }
    this.y -= options.gap ?? 4;
  }

  section(title: string, subtitle?: string): void {
    const height = subtitle ? 47 : 31;
    this.ensure(height);
    this.y -= 3;
    this.page.drawRectangle({ x: MARGIN, y: this.y - 22, width: 4, height: 23, color: rgb(...BLUE) });
    this.page.drawText(clean(title), { x: MARGIN + 12, y: this.y - 17, size: 17, font: this.bold, color: rgb(...NAVY) });
    this.y -= 27;
    if (subtitle) this.text(subtitle, { size: 8.5, color: MUTED, gap: 8 }); else this.y -= 7;
  }

  label(label: string, value: unknown): void {
    if (value == null || clean(value) === "") return;
    this.text(`${label}: ${clean(value)}`, { size: 9.2, gap: 3 });
  }

  metric(label: string, value: string, color: Color = BLUE): void {
    this.ensure(44);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 37, width: WIDTH, height: 37, color: rgb(0.95, 0.97, 0.99), borderColor: rgb(...BORDER), borderWidth: 0.6 });
    this.page.drawText(clean(label), { x: MARGIN + 10, y: this.y - 14, size: 8.5, font: this.regular, color: rgb(...MUTED) });
    const safeValue = clean(value);
    this.page.drawText(safeValue, { x: PAGE_W - MARGIN - 10 - this.bold.widthOfTextAtSize(safeValue, 12), y: this.y - 16, size: 12, font: this.bold, color: rgb(...color) });
    this.y -= 44;
  }

  finding(finding: Finding, index: number): void {
    const severityColor = finding.severity === "Critical" ? RED : finding.severity === "High" ? ORANGE : finding.severity === "Medium" ? GOLD : GREEN;
    this.ensure(40);
    this.text(`${index + 1}. ${finding.title}`, { size: 12, bold: true, color: severityColor, gap: 2 });
    this.text(`${finding.severity} | ${finding.confidence_score}% confidence | ${finding.amount == null ? "Amount not stated" : money(finding.amount)}${finding.page ? ` | Page ${finding.page}` : ""}`, { size: 8.2, color: MUTED, gap: 5 });
    this.label("Evidence", finding.evidence);
    this.label("Explanation", finding.explanation);
    this.label("Why it matters", finding.why_it_matters);
    this.label("Recommended action", finding.recommended_action);
    this.label("Negotiation message", finding.negotiation_message);
    if (finding.negotiation_strategy) {
      this.label("Difficulty", finding.negotiation_strategy.difficulty);
      finding.negotiation_strategy.steps?.forEach((step, i) => this.text(`Step ${i + 1}: ${step}`, { indent: 10, size: 9, gap: 2 }));
      this.label("Script", finding.negotiation_strategy.script);
      finding.negotiation_strategy.key_points?.forEach((point) => this.text(`- ${point}`, { indent: 10, size: 9, gap: 2 }));
    }
    this.ensure(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 0.6, color: rgb(...BORDER) });
    this.y -= 10;
  }

  finalize(): void {
    const count = this.pdf.getPageCount();
    this.pdf.getPages().forEach((page, index) => {
      const footer = `Page ${index + 1} of ${count}`;
      page.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_W - MARGIN, y: 42 }, thickness: 0.5, color: rgb(...BORDER) });
      page.drawText(footer, { x: PAGE_W / 2 - this.regular.widthOfTextAtSize(footer, 8) / 2, y: 27, size: 8, font: this.regular, color: rgb(...MUTED) });
    });
  }
}

export async function generateEnhancedPdf(data: EnhancedReportData): Promise<Uint8Array> {
  const source = data.auditReport ?? ({} as AuditReport);
  const report = {
    ...source,
    risk_score: Number.isFinite(source.risk_score) ? source.risk_score : 0,
    risk_level: source.risk_level || "Review Recommended",
    potential_savings: Number.isFinite(source.potential_savings) ? source.potential_savings : 0,
    confidence_level: Number.isFinite(source.confidence_level) ? source.confidence_level : 0,
    document_meta: {
      document_type: "Document",
      issuer: "",
      payer: "",
      analysis_date: new Date().toISOString(),
      pages_reviewed: 0,
      line_items_reviewed: 0,
      report_id: "",
      ...(source.document_meta ?? {}),
    },
    financial_impact: {
      original_total: 0,
      questionable_charges_total: 0,
      corrected_total: 0,
      ...(source.financial_impact ?? {}),
    },
    findings: Array.isArray(source.findings) ? source.findings : [],
    math_errors: Array.isArray(source.math_errors) ? source.math_errors : [],
    duplicate_charges: Array.isArray(source.duplicate_charges) ? source.duplicate_charges : [],
    hidden_fees: Array.isArray(source.hidden_fees) ? source.hidden_fees : [],
    contract_risks: Array.isArray(source.contract_risks) ? source.contract_risks : [],
  } as AuditReport;
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const flow = new Flow(pdf, regular, bold);

  flow.addPage();
  flow.section("Professional Audit Report", "Complete findings, evidence, financial impact, and next steps");
  flow.text(report.document_meta.document_type || "Document Analysis", { size: 24, bold: true, color: NAVY, gap: 12 });
  flow.label("Issuer", report.document_meta.issuer);
  flow.label("Payer", report.document_meta.payer);
  flow.label("Analysis date", report.document_meta.analysis_date);
  flow.label("Report ID", report.document_meta.report_id);
  flow.metric("Risk score", `${report.risk_score}/100 - ${report.risk_level}`, report.risk_score >= 70 ? RED : report.risk_score >= 40 ? ORANGE : GREEN);
  flow.metric("Potential savings", money(report.potential_savings), GREEN);
  flow.metric("Evidence confidence", `${report.confidence_level}%`, BLUE);
  flow.metric("Document coverage", `${report.document_meta.pages_reviewed} pages / ${report.document_meta.line_items_reviewed} line items`, BLUE);

  flow.section("Executive Summary");
  if (data.executiveSummary) {
    flow.text(data.executiveSummary.riskSummary);
    data.executiveSummary.keyTakeaways?.forEach((item) => flow.text(`- ${item}`, { indent: 10, gap: 2 }));
    data.executiveSummary.recommendedNextSteps?.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { indent: 10, gap: 2 }));
  } else flow.text(`The audit identified ${report.findings.length} findings with a ${report.risk_level.toLowerCase()} overall risk level.`);

  flow.section("Financial Impact");
  flow.metric("Original total", money(report.financial_impact.original_total));
  flow.metric("Questionable charges", money(report.financial_impact.questionable_charges_total), ORANGE);
  flow.metric("Corrected total", money(report.financial_impact.corrected_total), GREEN);
  data.savingsEstimates?.forEach((estimate) => {
    flow.text(`${estimate.feeName}: ${estimate.rangeLabel}`, { bold: true, gap: 2 });
    flow.text(estimate.basis, { size: 8.8, gap: 2 });
    flow.text(estimate.disclaimer, { size: 7.8, color: MUTED, gap: 5 });
  });

  if (data.prioritizedFindings?.length) {
    flow.section("Priority Order", "All ranked issues, not only the first three");
    data.prioritizedFindings.forEach((priority) => {
      flow.text(`${priority.rank}. ${clean(priority.priorityLabel)} - ${priority.finding.title}`, { bold: true, gap: 2 });
      flow.text(priority.reason, { size: 8.8, color: MUTED, gap: 2 });
      flow.text(priority.recommendedAction, { size: 9, gap: 5 });
    });
  }

  flow.section(`All Findings (${report.findings.length})`, "Every finding, source excerpt, explanation, risk detail, and recommendation");
  if (!report.findings.length) flow.text("No major findings were identified in the available document.");
  report.findings.forEach((finding, index) => flow.finding(finding, index));

  if (data.actionPlan) {
    flow.section("Action Plan");
    data.actionPlan.checklist?.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { gap: 3 }));
    Object.entries(data.actionPlan).forEach(([key, value]) => {
      if (key === "checklist" || value == null || typeof value === "object") return;
      flow.label(clean(key.replace(/([A-Z])/g, " $1")), value);
    });
  }

  if (data.negotiationAdvice?.size) {
    flow.section("Negotiation Guidance", "Complete scripts and talking points for every applicable finding");
    Array.from(data.negotiationAdvice.values()).forEach((advice, index) => {
      flow.text(`${index + 1}. ${advice.findingTitle} (${advice.difficulty})`, { size: 12, bold: true, color: BLUE, gap: 3 });
      advice.questions.forEach((question) => flow.text(`Question: ${question}`, { indent: 10, gap: 2 }));
      advice.talkingPoints.forEach((point) => flow.text(`- ${point}`, { indent: 10, gap: 2 }));
      flow.label("Phone script", advice.phoneScript);
      flow.label("Email template", advice.emailTemplate);
      advice.alternativeActions.forEach((action) => flow.text(`Alternative: ${action}`, { indent: 10, gap: 2 }));
      flow.label("Expected outcome", advice.expectedOutcome);
    });
  }

  if (data.educationTopics?.length) {
    flow.section("Consumer Education");
    data.educationTopics.forEach((topic) => {
      flow.text(topic.topic, { size: 12, bold: true, color: NAVY, gap: 2 });
      flow.label("What it is", topic.whatIsIt);
      flow.label("Why it matters", topic.whyItMatters);
      topic.questionsToAsk.forEach((question) => flow.text(`- ${question}`, { indent: 10, gap: 2 }));
      flow.label("Learn more", topic.learnMore);
    });
  }

  if (report.clean_document_summary) {
    flow.section("Clean Document Details");
    report.clean_document_summary.spending_breakdown?.forEach((item) => flow.text(`${item.category}: ${money(item.amount)}`, { gap: 2 }));
    report.clean_document_summary.key_terms?.forEach((item) => flow.text(`Key term: ${item}`, { gap: 2 }));
    report.clean_document_summary.negotiation_opportunities?.forEach((item) => flow.text(`Opportunity: ${item}`, { gap: 2 }));
    report.clean_document_summary.questions_to_ask?.forEach((item) => flow.text(`Question: ${item}`, { gap: 2 }));
    report.clean_document_summary.money_saving_suggestions?.forEach((item) => flow.text(`Suggestion: ${item}`, { gap: 2 }));
  }

  if (data.trustScore) {
    flow.section("Evidence and Reliability");
    flow.metric("Trust score", `${data.trustScore.score}/100 - ${data.trustScore.rating}`);
    flow.text(data.trustScore.summary);
    data.trustScore.factors.forEach((factor) => flow.text(`${factor.name}: ${factor.score}/100 - ${factor.detail}`, { gap: 3 }));
    flow.text(data.trustScore.disclaimer, { size: 8, color: MUTED });
  }

  flow.section("Important Notice");
  flow.text("This report is based on information visible in the submitted document. Verify important findings against the original and seek qualified advice when appropriate. This report is not legal, financial, tax, or accounting advice.", { size: 8.5, color: MUTED });
  flow.finalize();
  return pdf.save();
}
