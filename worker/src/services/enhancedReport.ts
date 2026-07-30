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
const BODY: Color = [0.95, 0.97, 1];
const MUTED: Color = [0.68, 0.76, 0.88];
const NAVY: Color = [0.035, 0.07, 0.13];
const BLUE: Color = [0.16, 0.43, 0.82];
const GOLD: Color = [0.86, 0.64, 0.12];
const RED: Color = [0.78, 0.18, 0.18];
const ORANGE: Color = [0.88, 0.42, 0.1];
const GREEN: Color = [0.08, 0.55, 0.34];
const BORDER: Color = [0.22, 0.36, 0.55];
const PAPER: Color = [0.035, 0.07, 0.13];

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

function drawBrandMark(page: PDFPage, x: number, y: number, scale = 1): void {
  const ray = 17 * scale;
  const inner = 12 * scale;
  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI * 2 * index) / 8;
    page.drawLine({
      start: { x: x + Math.cos(angle) * inner, y: y + Math.sin(angle) * inner },
      end: { x: x + Math.cos(angle) * ray, y: y + Math.sin(angle) * ray },
      thickness: 1.5 * scale,
      color: rgb(...GOLD),
    });
  }
  page.drawCircle({ x, y, size: 11 * scale, color: rgb(1, 0.84, 0.28), borderColor: rgb(...GOLD), borderWidth: 1.2 * scale });
  [-4, 0, 4].forEach((offset, index) => {
    page.drawLine({
      start: { x: x - 5 * scale, y: y + offset * scale },
      end: { x: x + (index === 1 ? 2 : 5) * scale, y: y + offset * scale },
      thickness: index === 2 ? 1.8 * scale : 1.3 * scale,
      color: index === 2 ? rgb(0.05, 0.56, 0.85) : rgb(0.07, 0.2, 0.36),
    });
  });
}

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
    this.page.drawRectangle({ x: 0, y: PAGE_H - 46, width: PAGE_W, height: 46, color: rgb(0.02, 0.04, 0.08) });
    this.page.drawRectangle({ x: 0, y: PAGE_H - 47, width: PAGE_W, height: 1, color: rgb(...GOLD) });
    drawBrandMark(this.page, MARGIN + 12, PAGE_H - 23, 0.7);
    this.page.drawText("HIDDEN", { x: MARGIN + 31, y: PAGE_H - 28, size: 10, font: this.bold, color: rgb(1, 1, 1) });
    this.page.drawText("FEE", { x: MARGIN + 70, y: PAGE_H - 28, size: 10, font: this.bold, color: rgb(...GOLD) });
    this.page.drawText("AI", { x: MARGIN + 94, y: PAGE_H - 27, size: 6, font: this.bold, color: rgb(...GOLD) });
    this.page.drawText("Professional Audit Report", { x: PAGE_W - MARGIN - 101, y: PAGE_H - 27, size: 8, font: this.regular, color: rgb(0.8, 0.86, 0.93) });
  }

  cover(report: AuditReport): void {
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(...NAVY) });
    this.page.drawCircle({ x: PAGE_W - 24, y: PAGE_H - 20, size: 176, color: rgb(...BLUE), opacity: 0.15 });
    this.page.drawCircle({ x: PAGE_W - 25, y: 100, size: 168, color: rgb(...GOLD), opacity: 0.1 });
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: rgb(0.02, 0.04, 0.08), opacity: 0.18 });
    this.page.drawRectangle({ x: 0, y: 0, width: 13, height: PAGE_H, color: rgb(...GOLD) });
    drawBrandMark(this.page, MARGIN + 32, PAGE_H - 83, 1.35);
    this.page.drawText("HIDDEN", { x: MARGIN + 60, y: PAGE_H - 90, size: 18, font: this.bold, color: rgb(1, 1, 1) });
    this.page.drawText("FEE", { x: MARGIN + 134, y: PAGE_H - 90, size: 18, font: this.bold, color: rgb(...GOLD) });
    this.page.drawText("AI", { x: MARGIN + 179, y: PAGE_H - 88, size: 8, font: this.bold, color: rgb(...GOLD) });
    this.page.drawText("PRIVATE FINANCIAL AUDIT", { x: MARGIN + 28, y: PAGE_H - 145, size: 10, font: this.bold, color: rgb(0.49, 0.76, 1) });
    const titleLines = this.wrap(clean(report.document_meta.document_type || "Professional document review"), this.bold, 48, WIDTH - 56).slice(0, 2);
    titleLines.forEach((line, index) => this.page.drawText(line, { x: MARGIN + 28, y: PAGE_H - 207 - index * 54, size: 48, font: this.bold, color: rgb(1, 1, 1) }));
    const titleDepth = titleLines.length * 54;
    this.page.drawText("Executive assessment of costs, risks, and your strongest next steps.", { x: MARGIN + 28, y: PAGE_H - 220 - titleDepth, size: 14, font: this.regular, color: rgb(0.82, 0.88, 0.95) });

    // Primary value card: the customer should understand the financial value immediately.
    const heroY = 292;
    this.page.drawRectangle({ x: MARGIN + 28, y: heroY, width: WIDTH - 56, height: 162, color: rgb(0.07, 0.16, 0.29), borderColor: rgb(0.36, 0.61, 0.91), borderWidth: 0.8 });
    this.page.drawRectangle({ x: MARGIN + 28, y: heroY, width: 7, height: 162, color: rgb(...GOLD) });
    this.page.drawText("POTENTIAL SAVINGS IDENTIFIED", { x: MARGIN + 52, y: heroY + 130, size: 11, font: this.bold, color: rgb(0.58, 0.8, 1) });
    const savings = clean(money(report.potential_savings));
    const savingsSize = Math.max(36, Math.min(58, (WIDTH - 155) / Math.max(this.bold.widthOfTextAtSize(savings, 1), 1)));
    this.page.drawText(savings, { x: MARGIN + 50, y: heroY + 57, size: savingsSize, font: this.bold, color: rgb(1, 0.86, 0.34) });
    this.page.drawText("Estimated opportunity from the items reviewed", { x: MARGIN + 52, y: heroY + 31, size: 11, font: this.regular, color: rgb(0.75, 0.84, 0.95) });
    const riskColor = report.risk_score >= 70 ? RED : report.risk_score >= 40 ? ORANGE : GREEN;
    this.page.drawText("AUDIT RISK", { x: PAGE_W - MARGIN - 150, y: heroY + 128, size: 9, font: this.bold, color: rgb(...MUTED) });
    this.page.drawText(clean(report.risk_level), { x: PAGE_W - MARGIN - 150, y: heroY + 96, size: 22, font: this.bold, color: rgb(...riskColor) });
    this.page.drawText(`${report.risk_score}/100`, { x: PAGE_W - MARGIN - 150, y: heroY + 67, size: 16, font: this.bold, color: rgb(1, 1, 1) });

    const stats = [
      ["FINDINGS", String(report.findings.length), BLUE],
      ["EVIDENCE CONFIDENCE", `${report.confidence_level}%`, GREEN],
      ["PAGES REVIEWED", String(report.document_meta.pages_reviewed || "N/A"), GOLD],
    ] as const;
    stats.forEach(([label, value, color], index) => {
      const x = MARGIN + 28 + index * 166;
      this.page.drawRectangle({ x, y: 190, width: 154, height: 72, color: rgb(0.06, 0.13, 0.23), borderColor: rgb(...BORDER), borderWidth: 0.7 });
      this.page.drawRectangle({ x, y: 190, width: 154, height: 3, color: rgb(...color) });
      this.page.drawText(label, { x: x + 13, y: 238, size: 8, font: this.bold, color: rgb(...MUTED) });
      this.page.drawText(clean(value), { x: x + 13, y: 208, size: 22, font: this.bold, color: rgb(1, 1, 1) });
    });
    this.page.drawText("Prepared by HiddenFeeAI", { x: MARGIN + 28, y: 133, size: 10, font: this.bold, color: rgb(...GOLD) });
    this.page.drawText("Evidence-based review for a clearer, more confident decision.", { x: MARGIN + 28, y: 112, size: 10, font: this.regular, color: rgb(0.67, 0.75, 0.85) });
    this.y = 0;
  }

  index(): void {
    this.section("Report Index", "A guided view of every category in your professional audit");
    const entries = [
      ["01", "Audit at a Glance", "Your document, risk score, savings, and coverage."],
      ["02", "Report Deliverables", "The decision tools included in your audit."],
      ["03", "Executive Summary", "The key issues and what they mean."],
      ["04", "Financial Impact", "Totals, questionable charges, and possible savings."],
      ["05", "All Findings", "Evidence, explanations, and recommended actions."],
      ["06", "Action Plan", "The highest-value next steps to take."],
      ["07", "Questions to Ask", "Focused questions for your provider or counterpart."],
      ["08", "Negotiation Guidance", "Questions, talking points, and scripts."],
      ["09", "Evidence and Reliability", "Confidence, source support, and limitations."],
    ];
    entries.forEach(([number, title, description], index) => {
      this.ensure(43);
      const y = this.y - 36;
      this.page.drawRectangle({ x: MARGIN, y, width: WIDTH, height: 36, color: rgb(0.07, 0.14, 0.25), borderColor: rgb(...BORDER), borderWidth: 0.5 });
      this.page.drawRectangle({ x: MARGIN, y, width: 42, height: 36, color: index % 2 === 0 ? rgb(...BLUE) : rgb(...GOLD) });
      this.page.drawText(number, { x: MARGIN + 11, y: y + 13, size: 9, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText(title, { x: MARGIN + 54, y: y + 20, size: 11.5, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText(description, { x: MARGIN + 54, y: y + 8, size: 7.8, font: this.regular, color: rgb(...MUTED) });
      this.y -= 42;
    });
    this.y -= 8;
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
    const size = options.size ?? 12;
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
    const height = subtitle ? 54 : 38;
    this.ensure(height);
    this.y -= 3;
    this.page.drawRectangle({ x: MARGIN, y: this.y - 30, width: WIDTH, height: 30, color: rgb(0.07, 0.18, 0.34), borderColor: rgb(0.22, 0.45, 0.76), borderWidth: 0.5 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 28, width: 6, height: 28, color: rgb(...BLUE) });
    this.page.drawText(clean(title), { x: MARGIN + 16, y: this.y - 21, size: 19, font: this.bold, color: rgb(1, 1, 1) });
    this.y -= 34;
    if (subtitle) this.text(subtitle, { size: 11, color: MUTED, gap: 10 }); else this.y -= 8;
  }

  label(label: string, value: unknown): void {
    if (value == null || clean(value) === "") return;
    this.text(`${label}: ${clean(value)}`, { size: 11.5, gap: 5 });
  }

  metric(label: string, value: string, color: Color = BLUE): void {
    this.ensure(44);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 37, width: WIDTH, height: 37, color: rgb(0.06, 0.13, 0.23), borderColor: rgb(...BORDER), borderWidth: 0.6 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 37, width: 4, height: 37, color: rgb(...color) });
    this.page.drawText(clean(label), { x: MARGIN + 14, y: this.y - 14, size: 10.4, font: this.regular, color: rgb(...MUTED) });
    const safeValue = clean(value);
    this.page.drawText(safeValue, { x: PAGE_W - MARGIN - 10 - this.bold.widthOfTextAtSize(safeValue, 15), y: this.y - 18, size: 15, font: this.bold, color: rgb(...color) });
    this.y -= 44;
  }

  private scriptLines(value: string, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of String(value ?? "").replace(/\r/g, "").split("\n")) {
      if (!paragraph.trim()) {
        if (lines[lines.length - 1] !== "") lines.push("");
        continue;
      }
      lines.push(...this.wrap(paragraph, this.regular, 10.5, width));
    }
    return lines.length ? lines : ["No script was generated for this item."];
  }

  private drawScriptHeader(continued: boolean): void {
    this.ensure(43);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 31, width: WIDTH, height: 31, color: rgb(0.11, 0.17, 0.28), borderColor: rgb(...GOLD), borderWidth: 0.7 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 31, width: 6, height: 31, color: rgb(...GOLD) });
    this.page.drawText(`YOUR ACTION SCRIPTS${continued ? " - CONTINUED" : ""}`, { x: MARGIN + 16, y: this.y - 21, size: 15, font: this.bold, color: rgb(1, 1, 1) });
    this.y -= 39;
  }

  actionScripts(advice: NegotiationAdvice): void {
    const gap = 12;
    const columnWidth = (WIDTH - gap) / 2;
    const innerWidth = columnWidth - 28;
    const phone = this.scriptLines(advice.phoneScript, innerWidth);
    const email = this.scriptLines(advice.emailTemplate, innerWidth);
    let offset = 0;
    const totalLines = Math.max(phone.length, email.length);

    while (offset < totalLines) {
      this.ensure(100);
      this.drawScriptHeader(offset > 0);
      const labelHeight = 30;
      const lineHeight = 14.2;
      const available = this.y - BOTTOM - labelHeight - 14;
      const count = Math.max(1, Math.min(totalLines - offset, Math.floor(available / lineHeight)));
      const cardHeight = labelHeight + count * lineHeight + 14;
      const y = this.y - cardHeight;
      const leftX = MARGIN;
      const rightX = MARGIN + columnWidth + gap;

      [leftX, rightX].forEach((x, column) => {
        this.page.drawRectangle({ x, y, width: columnWidth, height: cardHeight, color: rgb(0.055, 0.12, 0.22), borderColor: rgb(0.28, 0.42, 0.62), borderWidth: 0.7 });
        this.page.drawRectangle({ x, y: y + cardHeight - labelHeight, width: columnWidth, height: labelHeight, color: column === 0 ? rgb(0.08, 0.22, 0.4) : rgb(0.18, 0.15, 0.09) });
        this.page.drawRectangle({ x, y, width: 3, height: cardHeight, color: column === 0 ? rgb(...BLUE) : rgb(...GOLD) });
        this.page.drawText(column === 0 ? "PHONE SCRIPT" : "EMAIL TEMPLATE", { x: x + 13, y: y + cardHeight - 20, size: 9.4, font: this.bold, color: column === 0 ? rgb(0.58, 0.8, 1) : rgb(1, 0.84, 0.32) });
      });

      [phone, email].forEach((script, column) => {
        const x = column === 0 ? leftX : rightX;
        for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
          const line = script[offset + lineIndex] ?? "";
          if (line) this.page.drawText(line, { x: x + 13, y: y + cardHeight - labelHeight - 16 - lineIndex * lineHeight, size: 10.5, font: this.regular, color: rgb(0.95, 0.97, 1) });
        }
      });
      this.y = y - 12;
      offset += count;
    }
  }

  finding(finding: Finding, index: number, advice?: NegotiationAdvice): void {
    const severityColor = finding.severity === "Critical" ? RED : finding.severity === "High" ? ORANGE : finding.severity === "Medium" ? GOLD : GREEN;
    this.ensure(40);
    this.text(`${index + 1}. ${finding.title}`, { size: 15, bold: true, color: severityColor, gap: 4 });
    this.text(`${finding.severity} | ${finding.confidence_score}% confidence | ${finding.amount == null ? "Amount not stated" : money(finding.amount)}${finding.page ? ` | Page ${finding.page}` : ""}`, { size: 10.5, color: MUTED, gap: 7 });
    if (advice) this.actionScripts(advice);
    this.label("Evidence", finding.evidence);
    this.label("Explanation", finding.explanation);
    this.label("Why it matters", finding.why_it_matters);
    this.label("Recommended action", finding.recommended_action);
    this.label("Negotiation message", finding.negotiation_message);
    if (finding.negotiation_strategy) {
      this.label("Difficulty", finding.negotiation_strategy.difficulty);
      finding.negotiation_strategy.steps?.forEach((step, i) => this.text(`Step ${i + 1}: ${step}`, { indent: 10, size: 11, gap: 3 }));
      this.label("Script", finding.negotiation_strategy.script);
      finding.negotiation_strategy.key_points?.forEach((point) => this.text(`- ${point}`, { indent: 10, size: 11, gap: 3 }));
    }
    this.ensure(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 0.6, color: rgb(...BORDER) });
    this.y -= 10;
  }

  finalize(): void {
    const count = this.pdf.getPageCount();
    this.pdf.getPages().forEach((page, index) => {
      const footer = `Page ${index + 1} of ${count}`;
      // Redraw the non-cover masthead last so it remains intact on every
      // continuation page, even when a long section paginates at the boundary.
      if (index > 0) {
        page.drawRectangle({ x: 0, y: PAGE_H - 46, width: PAGE_W, height: 46, color: rgb(0.02, 0.04, 0.08) });
        page.drawRectangle({ x: 0, y: PAGE_H - 47, width: PAGE_W, height: 1, color: rgb(...GOLD) });
        drawBrandMark(page, MARGIN + 12, PAGE_H - 23, 0.7);
        page.drawText("HIDDEN", { x: MARGIN + 31, y: PAGE_H - 28, size: 10, font: this.bold, color: rgb(1, 1, 1) });
        page.drawText("FEE", { x: MARGIN + 70, y: PAGE_H - 28, size: 10, font: this.bold, color: rgb(...GOLD) });
        page.drawText("AI", { x: MARGIN + 94, y: PAGE_H - 27, size: 6, font: this.bold, color: rgb(...GOLD) });
        page.drawText("Professional Audit Report", { x: PAGE_W - MARGIN - 101, y: PAGE_H - 27, size: 8, font: this.regular, color: rgb(0.8, 0.86, 0.93) });
      }
      page.drawLine({ start: { x: MARGIN, y: 42 }, end: { x: PAGE_W - MARGIN, y: 42 }, thickness: 0.5, color: rgb(...BORDER) });
      page.drawText("HiddenFeeAI - Hidden Cost Review", { x: MARGIN, y: 27, size: 7.5, font: this.regular, color: rgb(...MUTED) });
      page.drawText(footer, { x: PAGE_W - MARGIN - this.regular.widthOfTextAtSize(footer, 8), y: 27, size: 8, font: this.regular, color: rgb(...MUTED) });
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
  flow.cover(report);
  flow.addPage();
  flow.index();
  flow.section("Audit at a Glance", "Complete findings, evidence, financial impact, and next steps");
  flow.label("Issuer", report.document_meta.issuer);
  flow.label("Payer", report.document_meta.payer);
  flow.label("Analysis date", report.document_meta.analysis_date);
  flow.label("Report ID", report.document_meta.report_id);
  flow.metric("Risk score", `${report.risk_score}/100 - ${report.risk_level}`, report.risk_score >= 70 ? RED : report.risk_score >= 40 ? ORANGE : GREEN);
  flow.metric("Potential savings", money(report.potential_savings), GREEN);
  flow.metric("Evidence confidence", `${report.confidence_level}%`, BLUE);
  flow.metric("Document coverage", `${report.document_meta.pages_reviewed} pages / ${report.document_meta.line_items_reviewed} line items`, BLUE);

  flow.section("Report Deliverables", "The same decision tools included in your online report");
  flow.text(`${report.findings.filter((finding) => Boolean(finding.evidence)).length} evidence-linked finding${report.findings.filter((finding) => Boolean(finding.evidence)).length === 1 ? "" : "s"} with the source context, why it matters, and a recommended action.`);
  flow.text(`${report.findings.filter((finding) => Boolean(finding.negotiation_message || finding.negotiation_strategy)).length} finding${report.findings.filter((finding) => Boolean(finding.negotiation_message || finding.negotiation_strategy)).length === 1 ? "" : "s"} with negotiation language, talking points, or an escalation path.`);
  flow.text("A complete action plan, questions to ask, document insights, and evidence-confidence details are included in the sections that follow.");

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
    flow.text(estimate.basis, { size: 10.5, gap: 3 });
    flow.text(estimate.disclaimer, { size: 10, color: MUTED, gap: 6 });
  });

  if (data.prioritizedFindings?.length) {
    flow.section("Priority Order", "All ranked issues, not only the first three");
    data.prioritizedFindings.forEach((priority) => {
      flow.text(`${priority.rank}. ${clean(priority.priorityLabel)} - ${priority.finding.title}`, { bold: true, gap: 2 });
      flow.text(priority.reason, { size: 10.5, color: MUTED, gap: 3 });
      flow.text(priority.recommendedAction, { size: 11, gap: 6 });
    });
  }

  flow.section(`All Findings (${report.findings.length})`, "Every finding, source excerpt, explanation, risk detail, and recommendation");
  if (!report.findings.length) flow.text("No major findings were identified in the available document.");
  report.findings.forEach((finding, index) => flow.finding(finding, index, data.negotiationAdvice?.get(finding.id)));

  if (data.actionPlan) {
    flow.section("Action Plan", "A practical sequence for review, negotiation, and follow-through");
    data.actionPlan.checklist?.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { gap: 3 }));
    const phases = [
      ["Before You Commit", data.actionPlan.beforeSigning],
      ["During Negotiation", data.actionPlan.negotiationSteps],
      ["After You Commit", data.actionPlan.afterSigning],
      ["Ongoing Monitoring", data.actionPlan.ongoingMonitoring],
    ] as const;
    phases.forEach(([title, items]) => {
      if (!items?.length) return;
      flow.text(title, { size: 14, bold: true, color: GOLD, gap: 4 });
      items.forEach((item, index) => {
        flow.text(`${index + 1}. ${item.step} (${clean(item.urgency).replace(/_/g, " ")})`, { bold: true, gap: 2 });
        flow.text(item.detail, { size: 10.5, color: MUTED, gap: 5 });
      });
    });
  }

  const questions = Array.from(new Set([
    ...(report.clean_document_summary?.questions_to_ask ?? []),
    ...report.findings.map((finding) => `Why is "${clean(finding.title)}" included, and can it be reduced, removed, or documented in writing?`),
  ].filter(Boolean)));
  if (questions.length) {
    flow.section("Questions to Ask", "Bring these focused questions to your provider or counterpart");
    questions.forEach((question, index) => flow.text(`${index + 1}. ${question}`, { gap: 4 }));
  }

  if (data.negotiationAdvice?.size) {
    flow.section("Negotiation Guidance", "Complete scripts and talking points for every applicable finding");
    Array.from(data.negotiationAdvice.values()).forEach((advice, index) => {
      flow.text(`${index + 1}. ${advice.findingTitle} (${advice.difficulty})`, { size: 12, bold: true, color: BLUE, gap: 3 });
      advice.questions.forEach((question) => flow.text(`Question: ${question}`, { indent: 10, gap: 2 }));
      advice.talkingPoints.forEach((point) => flow.text(`- ${point}`, { indent: 10, gap: 2 }));
      flow.text("The phone and email scripts for this item appear directly beneath its finding.", { size: 10.5, color: MUTED, gap: 4 });
      advice.alternativeActions.forEach((action) => flow.text(`Alternative: ${action}`, { indent: 10, gap: 2 }));
      flow.label("Expected outcome", advice.expectedOutcome);
    });
  }

  if (data.educationTopics?.length) {
    flow.section("Consumer Education");
    data.educationTopics.forEach((topic) => {
      flow.text(topic.topic, { size: 13, bold: true, color: BLUE, gap: 3 });
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
    flow.text(data.trustScore.disclaimer, { size: 10, color: MUTED });
  }

  flow.section("Important Notice");
  flow.text("This report is based on information visible in the submitted document. Verify important findings against the original and seek qualified advice when appropriate. This report is not legal, financial, tax, or accounting advice.", { size: 10, color: MUTED });
  flow.finalize();
  return pdf.save();
}
