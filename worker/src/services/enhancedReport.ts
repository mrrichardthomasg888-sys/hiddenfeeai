import { PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { AuditReport, Finding } from "../types.js";
import type { EnhancedExecutiveSummary } from "../intelligence/executiveSummary.js";
import type { PrioritizedFinding } from "../intelligence/prioritizationEngine.js";
import type { TrustScore } from "../trust/trustScore.js";
import type { NegotiationAdvice } from "../intelligence/negotiationEngine.js";
import type { EducationTopic } from "../education/consumerEducation.js";
import type { ActionPlan } from "../intelligence/actionPlanEngine.js";
import type { SavingsEstimate } from "../intelligence/savingsEstimator.js";
import { buildPremiumReport, normalizeConfidence, type PremiumFinding, type PremiumReport, type PremiumReportSection } from "./premiumReport.js";

export interface EnhancedReportData {
  auditReport: AuditReport;
  premiumReport?: PremiumReport;
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
const MARGIN = 48;
const TOP = 66;
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
  private readonly sectionDestinations = new Map<string, { pageIndex: number; y: number }>();
  private readonly indexLinks: Array<{ pageIndex: number; y: number; target: string; title: string }> = [];

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

  index(sections: PremiumReportSection[]): void {
    this.section("Report Index", "A guided view of every category in your professional audit");
    sections.forEach((entry, index) => {
      this.ensure(36);
      const y = this.y - 32;
      this.indexLinks.push({ pageIndex: this.pageNumber - 1, y, target: entry.title, title: entry.title });
      this.page.drawRectangle({ x: MARGIN, y, width: WIDTH, height: 32, color: rgb(0.07, 0.14, 0.25), borderColor: rgb(...BORDER), borderWidth: 0.5 });
      this.page.drawRectangle({ x: MARGIN, y, width: 40, height: 32, color: index % 2 === 0 ? rgb(...BLUE) : rgb(...GOLD) });
      this.page.drawText(String(index + 1).padStart(2, "0"), { x: MARGIN + 10, y: y + 11, size: 9, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText(clean(entry.title), { x: MARGIN + 50, y: y + 18, size: 10.5, font: this.bold, color: rgb(1, 1, 1) });
      const description = this.wrap(entry.description, this.regular, 6.6, WIDTH - 62)[0] ?? "";
      this.page.drawText(description, { x: MARGIN + 50, y: y + 6, size: 6.6, font: this.regular, color: rgb(...MUTED) });
      this.y -= 36;
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
    const size = options.size ?? 15;
    const font = options.bold ? this.bold : this.regular;
    const indent = options.indent ?? 0;
    const width = options.width ?? WIDTH - indent;
    const lineHeight = size * 1.45;
    const lines = this.wrap(value, font, size, width);
    for (const line of lines) {
      this.ensure(lineHeight);
      if (line) this.page.drawText(line, { x: MARGIN + indent, y: this.y - size, size, font, color: rgb(...(options.color ?? BODY)) });
      this.y -= lineHeight;
    }
    this.y -= options.gap ?? 7;
  }

  section(title: string, subtitle?: string): void {
    const height = subtitle ? 68 : 48;
    this.ensure(height);
    this.y -= 3;
    if (!this.sectionDestinations.has(title)) this.sectionDestinations.set(title, { pageIndex: this.pageNumber - 1, y: this.y + 8 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 38, width: WIDTH, height: 38, color: rgb(0.07, 0.18, 0.34), borderColor: rgb(0.22, 0.45, 0.76), borderWidth: 0.6 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 38, width: 7, height: 38, color: rgb(...BLUE) });
    this.page.drawText(clean(title), { x: MARGIN + 18, y: this.y - 27, size: 21, font: this.bold, color: rgb(1, 1, 1) });
    this.y -= 46;
    if (subtitle) this.text(subtitle, { size: 13.5, color: MUTED, gap: 14 }); else this.y -= 12;
  }

  beginSection(title: string, subtitle?: string): void {
    if (!this.page || this.y < 310) this.addPage();
    else this.y -= 14;
    this.section(title, subtitle);
  }

  label(label: string, value: unknown): void {
    if (value == null || clean(value) === "") return;
    this.text(`${label}: ${clean(value)}`, { size: 14, gap: 8 });
  }

  metric(label: string, value: string, color: Color = BLUE): void {
    this.ensure(48);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 42, width: WIDTH, height: 42, color: rgb(0.06, 0.13, 0.23), borderColor: rgb(...BORDER), borderWidth: 0.6 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 42, width: 5, height: 42, color: rgb(...color) });
    this.page.drawText(clean(label), { x: MARGIN + 16, y: this.y - 17, size: 11.5, font: this.regular, color: rgb(...MUTED) });
    const safeValue = clean(value);
    this.page.drawText(safeValue, { x: PAGE_W - MARGIN - 12 - this.bold.widthOfTextAtSize(safeValue, 15), y: this.y - 19, size: 15, font: this.bold, color: rgb(...color) });
    this.y -= 49;
  }

  metricWithSupport(label: string, value: string, support: string, color: Color = BLUE): void {
    this.ensure(50);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 44, width: WIDTH, height: 44, color: rgb(0.06, 0.13, 0.23), borderColor: rgb(...BORDER), borderWidth: 0.6 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 44, width: 5, height: 44, color: rgb(...color) });
    this.page.drawText(clean(label), { x: MARGIN + 16, y: this.y - 15, size: 10.5, font: this.regular, color: rgb(...MUTED) });
    const safeValue = clean(value);
    this.page.drawText(safeValue, { x: PAGE_W - MARGIN - 12 - this.bold.widthOfTextAtSize(safeValue, 13.5), y: this.y - 17, size: 13.5, font: this.bold, color: rgb(...color) });
    const supportLine = this.wrap(support, this.regular, 7.4, WIDTH - 32)[0] ?? "";
    this.page.drawText(supportLine, { x: MARGIN + 16, y: this.y - 34, size: 7.4, font: this.regular, color: rgb(...MUTED) });
    this.y -= 51;
  }

  score(label: string, value: number, detail: string, color: Color = BLUE): void {
    this.ensure(70);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 62, width: WIDTH, height: 62, color: rgb(0.06, 0.13, 0.23), borderColor: rgb(...BORDER), borderWidth: 0.6 });
    this.page.drawText(clean(label), { x: MARGIN + 16, y: this.y - 18, size: 12.5, font: this.bold, color: rgb(1, 1, 1) });
    this.page.drawText(`${Math.round(value)}/100`, { x: PAGE_W - MARGIN - 68, y: this.y - 18, size: 13, font: this.bold, color: rgb(...color) });
    this.page.drawRectangle({ x: MARGIN + 16, y: this.y - 34, width: WIDTH - 32, height: 6, color: rgb(0.14, 0.18, 0.25) });
    this.page.drawRectangle({ x: MARGIN + 16, y: this.y - 34, width: Math.max(0, Math.min(WIDTH - 32, (WIDTH - 32) * value / 100)), height: 6, color: rgb(...color) });
    const detailLine = this.wrap(detail, this.regular, 8.4, WIDTH - 32)[0] ?? "";
    this.page.drawText(detailLine, { x: MARGIN + 16, y: this.y - 50, size: 8.4, font: this.regular, color: rgb(...MUTED) });
    this.y -= 70;
  }

  bar(label: string, value: number | null, max: number, displayValue: string, detail: string, color: Color = BLUE): void {
    this.ensure(58);
    this.page.drawText(clean(label), { x: MARGIN, y: this.y - 14, size: 12.5, font: this.bold, color: rgb(1, 1, 1) });
    const safeDisplay = clean(displayValue);
    this.page.drawText(safeDisplay, { x: PAGE_W - MARGIN - this.bold.widthOfTextAtSize(safeDisplay, 12.5), y: this.y - 14, size: 12.5, font: this.bold, color: rgb(...color) });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 31, width: WIDTH, height: 8, color: rgb(0.14, 0.18, 0.25) });
    if (value != null && value > 0) this.page.drawRectangle({ x: MARGIN, y: this.y - 31, width: Math.max(3, WIDTH * value / Math.max(1, max)), height: 8, color: rgb(...color) });
    const detailLine = this.wrap(detail, this.regular, 9.5, WIDTH)[0] ?? "";
    this.page.drawText(detailLine, { x: MARGIN, y: this.y - 47, size: 8.8, font: this.regular, color: rgb(...MUTED) });
    this.y -= 55;
  }

  private scriptLines(value: string, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of String(value ?? "").replace(/\r/g, "").split("\n")) {
      if (!paragraph.trim()) {
        if (lines[lines.length - 1] !== "") lines.push("");
        continue;
      }
      lines.push(...this.wrap(paragraph, this.regular, 13.5, width));
    }
    return lines.length ? lines : ["No script was generated for this item."];
  }

  private scriptCard(label: string, value: string, accent: Color): void {
    const innerWidth = WIDTH - 34;
    const lines = this.scriptLines(value, innerWidth);
    const lineHeight = 19.5;
    const labelHeight = 38;
    const fullCardHeight = labelHeight + lines.length * lineHeight + 20;
    const printableHeight = PAGE_H - TOP - BOTTOM;
    // Keep a complete script/email together whenever it fits on one page. Long
    // scripts still paginate, but ordinary content never gets an avoidable
    // "continued" page merely because the previous section used the space.
    if (fullCardHeight <= printableHeight && this.y - fullCardHeight < BOTTOM) this.addPage();
    let offset = 0;

    while (offset < lines.length) {
      this.ensure(120);
      const available = this.y - BOTTOM - labelHeight - 20;
      const count = Math.max(1, Math.min(lines.length - offset, Math.floor(available / lineHeight)));
      const cardHeight = labelHeight + count * lineHeight + 20;
      const y = this.y - cardHeight;
      this.page.drawRectangle({ x: MARGIN, y, width: WIDTH, height: cardHeight, color: rgb(0.055, 0.12, 0.22), borderColor: rgb(...BORDER), borderWidth: 0.8 });
      this.page.drawRectangle({ x: MARGIN, y: y + cardHeight - labelHeight, width: WIDTH, height: labelHeight, color: rgb(0.1, 0.17, 0.28) });
      this.page.drawRectangle({ x: MARGIN, y, width: 5, height: cardHeight, color: rgb(...accent) });
      this.page.drawText(`${label}${offset > 0 ? " - CONTINUED" : ""}`, { x: MARGIN + 17, y: y + cardHeight - 26, size: 12, font: this.bold, color: rgb(...accent) });
      for (let lineIndex = 0; lineIndex < count; lineIndex += 1) {
        const line = lines[offset + lineIndex] ?? "";
        if (line) this.page.drawText(line, { x: MARGIN + 17, y: y + cardHeight - labelHeight - 20 - lineIndex * lineHeight, size: 13.5, font: this.regular, color: rgb(...BODY) });
      }
      this.y = y - 16;
      offset += count;
    }
  }

  actionScripts(advice: NegotiationAdvice, index: number): void {
    this.ensure(100);
    this.text(`${index + 1}. ${advice.findingTitle}`, { size: 17, bold: true, color: GOLD, gap: 4 });
    this.text(`${advice.difficulty} negotiation difficulty`, { size: 12.5, color: MUTED, gap: 10 });
    this.scriptCard("PHONE SCRIPT", advice.phoneScript, [0.49, 0.76, 1]);
    this.scriptCard("EMAIL TEMPLATE", advice.emailTemplate, [1, 0.82, 0.3]);
    this.y -= 8;
  }

  playbook(report: PremiumReport): void {
    const playbook = report.negotiationPlaybook;
    this.label("Negotiation objective", playbook.objective);
    this.label("Estimated achievable savings", playbook.estimatedSavingsRange);
    this.text("Customer leverage points", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.leveragePoints.forEach((item) => this.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
    this.text("Priority items to challenge", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.priorityItems.forEach((item, index) => this.text(`${index + 1}. ${item}`, { indent: 12, size: 13.5, gap: 6 }));
    this.label("What to say first", playbook.openingStatement);
    this.text("Likely objections and your responses", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.likelyObjections.forEach((item) => {
      this.text(`Provider: ${item.objection}`, { indent: 12, bold: true, size: 13.5, gap: 2 });
      this.text(`You: ${item.response}`, { indent: 12, size: 13.5, gap: 7 });
    });
    this.text("Concessions you can offer", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.concessions.forEach((item) => this.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
    this.text("Terms not to accept", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.unacceptableTerms.forEach((item) => this.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
    this.text("Escalation path", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.escalationPath.forEach((item, index) => this.text(`${index + 1}. ${item}`, { indent: 12, size: 13.5, gap: 5 }));
    this.label("Walk-away threshold", playbook.walkAwayThreshold);
    this.text("Follow-up schedule", { size: 17, bold: true, color: GOLD, gap: 7 });
    playbook.followUpSchedule.forEach((item) => this.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
    this.scriptCard("PERSONALIZED PHONE SCRIPT", playbook.phoneScript, [0.49, 0.76, 1]);
    this.scriptCard("SHORT EXECUTIVE EMAIL", playbook.shortEmail, [1, 0.82, 0.3]);
    this.scriptCard("DETAILED NEGOTIATION EMAIL", playbook.detailedEmail, [1, 0.82, 0.3]);
    if (playbook.renewalScript) this.scriptCard("RENEWAL NEGOTIATION SCRIPT", playbook.renewalScript, [0.49, 0.76, 1]);
    if (playbook.cancellationScript) this.scriptCard("CANCELLATION OR OPT-OUT SCRIPT", playbook.cancellationScript, [0.49, 0.76, 1]);
  }

  premiumFinding(finding: PremiumFinding, index: number): void {
    const severityColor = finding.severity === "Critical" ? RED : finding.severity === "High" ? ORANGE : finding.severity === "Medium" ? GOLD : GREEN;
    const estimateLines = [finding.evidenceQuote, finding.explanation, finding.whyItMatters, finding.financialImpact, finding.recommendedAction, finding.talkingPoint, finding.negotiability, finding.betterAlternativeLanguage, ...finding.questionsToAsk]
      .reduce((count, value) => count + this.wrap(value, this.regular, 14, WIDTH).length, 0);
    const estimatedHeight = 92 + estimateLines * 20.3 + finding.questionsToAsk.length * 6;
    if (estimatedHeight <= PAGE_H - TOP - BOTTOM && this.y - estimatedHeight < BOTTOM) this.addPage();
    this.ensure(70);
    this.text(`${index + 1}. ${finding.title}`, { size: 18, bold: true, color: severityColor, gap: 5 });
    this.text(`${finding.severity} | ${finding.confidence}% confidence | ${finding.category} | ${finding.amount == null ? "Amount not stated" : money(finding.amount)} | ${finding.location}`, { size: 12.5, color: MUTED, gap: 9 });
    this.label("Exact evidence quote", finding.evidenceQuote);
    this.label("Plain-English explanation", finding.explanation);
    this.label("Why it matters", finding.whyItMatters);
    this.label("Possible financial impact", finding.financialImpact);
    this.label("Recommended action", finding.recommendedAction);
    this.label("Finding-specific talking point", finding.talkingPoint);
    finding.questionsToAsk.forEach((question) => this.text(`Question: ${question}`, { indent: 12, size: 13.5, gap: 5 }));
    this.label("Negotiability assessment", finding.negotiability);
    this.label("Better alternative language", finding.betterAlternativeLanguage);
    this.ensure(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 0.6, color: rgb(...BORDER) });
    this.y -= 18;
  }

  evidence(finding: PremiumFinding, index: number): void {
    this.ensure(76);
    this.text(`${index + 1}. ${finding.title}`, { size: 17, bold: true, color: BLUE, gap: 4 });
    this.label("Exact source location", finding.location);
    this.label("Evidence quote", finding.evidenceQuote);
    this.text(`Confidence: ${finding.confidence}% - confirm the quote and context in the original document before relying on it.`, { size: 12.5, color: MUTED, gap: 12 });
  }

  finding(finding: Finding, index: number): void {
    const severityColor = finding.severity === "Critical" ? RED : finding.severity === "High" ? ORANGE : finding.severity === "Medium" ? GOLD : GREEN;
    this.ensure(40);
    this.text(`${index + 1}. ${finding.title}`, { size: 18, bold: true, color: severityColor, gap: 6 });
    this.text(`${finding.severity} | ${finding.confidence_score}% confidence | ${finding.amount == null ? "Amount not stated" : money(finding.amount)}${finding.page ? ` | Page ${finding.page}` : ""}`, { size: 13, color: MUTED, gap: 11 });
    this.label("Evidence", finding.evidence);
    this.label("Explanation", finding.explanation);
    this.label("Why it matters", finding.why_it_matters);
    this.label("Recommended action", finding.recommended_action);
    this.label("Negotiation message", finding.negotiation_message);
    if (finding.negotiation_strategy) {
      this.label("Difficulty", finding.negotiation_strategy.difficulty);
      finding.negotiation_strategy.steps?.forEach((step, i) => this.text(`Step ${i + 1}: ${step}`, { indent: 12, size: 13.5, gap: 6 }));
      this.label("Script", finding.negotiation_strategy.script);
      finding.negotiation_strategy.key_points?.forEach((point) => this.text(`- ${point}`, { indent: 12, size: 13.5, gap: 6 }));
    }
    this.ensure(10);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_W - MARGIN, y: this.y }, thickness: 0.6, color: rgb(...BORDER) });
    this.y -= 18;
  }

  finalize(): void {
    this.addNavigation();
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

  private addNavigation(): void {
    const context = this.pdf.context;
    const pages = this.pdf.getPages();
    const resolved = this.indexLinks.map((link) => {
      const exact = this.sectionDestinations.get(link.target);
      const fuzzy = exact ?? Array.from(this.sectionDestinations.entries()).find(([title]) => title.startsWith(link.target))?.[1];
      return fuzzy ? { ...link, destination: fuzzy } : null;
    }).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    if (!resolved.length) return;

    const outlineRef = context.nextRef();
    const itemRefs = resolved.map(() => context.nextRef());
    context.assign(outlineRef, context.obj({ Type: "Outlines", First: itemRefs[0], Last: itemRefs[itemRefs.length - 1], Count: itemRefs.length }));
    resolved.forEach((entry, index) => {
      const destinationPage = pages[entry.destination.pageIndex];
      const destination = context.obj([destinationPage.ref, PDFName.of("XYZ"), null, PDFNumber.of(entry.destination.y), null]);
      const outlineItem: Record<string, unknown> = { Title: PDFHexString.fromText(entry.title), Parent: outlineRef, Dest: destination };
      if (index > 0) outlineItem.Prev = itemRefs[index - 1];
      if (index < itemRefs.length - 1) outlineItem.Next = itemRefs[index + 1];
      context.assign(itemRefs[index], context.obj(outlineItem as any));

      const annotation = context.register(context.obj({
        Type: "Annot", Subtype: "Link", Rect: [MARGIN, entry.y, MARGIN + WIDTH, entry.y + 32], Border: [0, 0, 0], Dest: destination,
      }));
      pages[entry.pageIndex].node.addAnnot(annotation);
    });
    this.pdf.catalog.set(PDFName.of("Outlines"), outlineRef);
    this.pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
    this.pdf.catalog.set(PDFName.of("Lang"), PDFString.of("en-US"));
  }
}

export async function generateEnhancedPdf(data: EnhancedReportData): Promise<Uint8Array> {
  const source = data.auditReport ?? ({} as AuditReport);
  const report = {
    ...source,
    risk_score: Number.isFinite(source.risk_score) ? source.risk_score : 0,
    risk_level: source.risk_level || "Review Recommended",
    potential_savings: Number.isFinite(source.potential_savings) ? source.potential_savings : 0,
    confidence_level: normalizeConfidence(source.confidence_level),
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
  const premium = data.premiumReport ?? buildPremiumReport(report);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${premium.documentType} - HiddenFeeAI Professional Audit Report`);
  pdf.setAuthor("HiddenFeeAI");
  pdf.setSubject("Evidence-linked document audit, financial impact, negotiation playbook, and action plan");
  pdf.setKeywords(["document audit", "hidden fees", "contract review", "negotiation playbook"]);
  pdf.setProducer("HiddenFeeAI Professional Reports");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const flow = new Flow(pdf, regular, bold);

  flow.addPage();
  flow.cover(report);
  flow.addPage();
  flow.index(premium.sectionOrder);

  const renderInsightItems = (items: PremiumReport["positiveTerms"], accent: Color, actionLabel: string) => items.forEach((item) => {
    flow.text(item.title, { size: 17, bold: true, color: accent, gap: 4 });
    flow.text(item.explanation, { size: 13.5, gap: 4 });
    if (item.evidence) flow.label("Evidence", item.evidence);
    if (item.source_reference) flow.label("Source", item.source_reference);
    flow.label(actionLabel, item.recommended_action);
  });

  premium.sectionOrder.forEach((section) => {
    if (section.key === "methodology") {
      flow.addPage();
      flow.section(section.title, section.description);
    } else {
      flow.beginSection(section.title, section.description);
    }
    switch (section.key) {
      case "executive-dashboard": {
        premium.executiveDashboard.metrics.forEach((item) => flow.metricWithSupport(item.label, item.displayValue, item.supportingText, item.tone === "red" ? RED : item.tone === "green" ? GREEN : item.tone === "gold" ? GOLD : BLUE));
        flow.score("Attention Score", premium.executiveDashboard.attentionScore, "Higher means more urgent review is warranted.", premium.executiveDashboard.attentionScore >= 70 ? RED : GOLD);
        flow.score("Contract Health", premium.executiveDashboard.contractHealthScore, "Inverse of the report attention score.", GREEN);
        flow.score("Negotiation Success Readiness", premium.executiveDashboard.negotiationSuccessReadiness, premium.executiveDashboard.negotiationReadinessExplanation, BLUE);
        flow.text("Report deliverables", { size: 17, bold: true, color: GOLD, gap: 6 });
        premium.executiveDashboard.deliverables.forEach((item) => flow.label(item.label, item.displayValue));
        break;
      }
      case "executive-decision":
        flow.label("Final decision", premium.executiveOverview.decision);
        flow.text(premium.executiveOverview.decisionReasoning, { bold: true });
        flow.text(premium.executiveOverview.documentSummary, { color: MUTED });
        flow.metric("Decision signal", `${premium.executiveOverview.riskScore}/100 - ${premium.executiveOverview.riskLevel}`, premium.executiveOverview.riskScore >= 70 ? RED : premium.executiveOverview.riskScore >= 40 ? ORANGE : GREEN);
        flow.text("Top three urgent actions", { size: 17, bold: true, color: GOLD, gap: 7 });
        premium.executiveOverview.urgentActions.slice(0, 3).forEach((item, index) => flow.text(`${index + 1}. ${item}`, { bold: true, gap: 7 }));
        break;
      case "negotiation-playbook":
        flow.playbook(premium);
        break;
      case "executive-insights":
        premium.executiveInsights.insights.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { bold: true, gap: 8 }));
        flow.text("What surprised the AI most", { size: 17, bold: true, color: GOLD, gap: 5 });
        flow.label(premium.executiveInsights.surprise.title, premium.executiveInsights.surprise.explanation);
        flow.text("Quick Wins", { size: 17, bold: true, color: GREEN, gap: 6 });
        premium.executiveInsights.quickWins.forEach((item) => flow.text(`- ${item}`, { indent: 12, gap: 5 }));
        flow.text("Risk if Ignored", { size: 17, bold: true, color: RED, gap: 6 });
        premium.executiveInsights.riskIfIgnored.forEach((item) => flow.text(`- ${item}`, { indent: 12, gap: 5 }));
        flow.label("Long-Term Cost Projection", premium.executiveInsights.longTermCostProjection);
        flow.label("Industry Benchmark Comparison", premium.executiveInsights.industryBenchmarkSummary);
        break;
      case "financial-impact": {
        flow.metric("Original total", money(premium.financialImpact.originalTotal), BLUE);
        flow.metric("Confirmed charges", money(premium.financialImpact.confirmedCharges), ORANGE);
        flow.metric("Monthly recurring", money(premium.financialImpact.recurringMonthlyExposure), ORANGE);
        flow.metric("Estimated annual", money(premium.financialImpact.estimatedAnnualExposure), ORANGE);
        flow.metric("Full-contract exposure", premium.financialImpact.contractTermExposure == null ? "Not reliably calculable" : money(premium.financialImpact.contractTermExposure), ORANGE);
        flow.metric("Possible savings", money(premium.financialImpact.possibleSavings), GREEN);
        flow.metric("Corrected total", money(premium.financialImpact.correctedTotal), GREEN);
        flow.text(premium.financialImpact.explanation, { size: 13.5, color: MUTED });
        flow.text("Cost Forecast", { size: 17, bold: true, color: BLUE, gap: 8 });
        const maxCost = Math.max(1, ...premium.visualizations.costForecast.map((item) => item.value ?? 0));
        premium.visualizations.costForecast.forEach((item) => flow.bar(item.label, item.value, maxCost, item.displayValue, item.basis, BLUE));
        flow.text("Savings Timeline", { size: 17, bold: true, color: GREEN, gap: 8 });
        const maxSavings = Math.max(1, ...premium.visualizations.savingsTimeline.map((item) => item.value));
        premium.visualizations.savingsTimeline.forEach((item) => flow.bar(item.label, item.value, maxSavings, item.displayValue, item.basis, GREEN));
        break;
      }
      case "risk-scorecard":
        flow.score("Professional Risk Gauge", premium.executiveDashboard.attentionScore, "The audit's canonical attention score.", premium.executiveDashboard.attentionScore >= 70 ? RED : GOLD);
        flow.score("Contract Health Gauge", premium.executiveDashboard.contractHealthScore, "The inverse health view of the same attention score.", GREEN);
        flow.score("AI Confidence Visualization", premium.executiveOverview.confidence, "Normalized evidence confidence, never a legal certainty.", BLUE);
        flow.text("Contract Scorecard", { size: 17, bold: true, color: BLUE, gap: 8 });
        premium.visualizations.contractScorecard.forEach((item) => flow.score(item.label, item.score, item.explanation, BLUE));
        flow.text("Hidden Fee Heat Map", { size: 17, bold: true, color: GOLD, gap: 7 });
        if (!premium.visualizations.hiddenFeeHeatMap.length) flow.text("No fee-category concentration was confirmed in the structured findings.", { color: MUTED });
        premium.visualizations.hiddenFeeHeatMap.forEach((item) => flow.label(item.category, `${item.count} finding(s) | ${money(item.amount)} stated | ${item.severity}`));
        flow.text("Industry Benchmark Comparison", { size: 17, bold: true, color: BLUE, gap: 7 });
        flow.text("A transparent best-practice comparison; no unsupported peer-market averages are invented.", { size: 12.5, color: MUTED });
        premium.visualizations.industryBenchmark.forEach((item) => {
          flow.text(item.dimension, { size: 15, bold: true, color: GOLD, gap: 3 });
          flow.label("Document position", item.documentPosition);
          flow.label("Professional best practice", item.professionalBestPractice);
          flow.label("Gap", item.gap);
        });
        flow.text("Priority Matrix", { size: 17, bold: true, color: GOLD, gap: 7 });
        if (!premium.visualizations.priorityMatrix.length) flow.text("No findings require placement in the priority matrix.", { color: MUTED });
        premium.visualizations.priorityMatrix.forEach((item, index) => flow.label(`${index + 1}. ${item.title}`, `${item.quadrant} | ${item.urgency} | ${item.financialImpact}`));
        break;
      case "timeline":
        if (!premium.timeline.length) flow.text("No deadline was returned with enough evidence to mark it verified. Ask the provider to confirm every renewal, cancellation, notice, trial, and price-change date in writing, then calendar the earliest applicable deadline.", { color: MUTED });
        premium.timeline.forEach((item, index) => {
          flow.text(`${index + 1}. ${item.event} - ${item.date}`, { bold: true, color: GOLD, gap: 3 });
          flow.label("Source", item.location); flow.label("Evidence", item.evidence); flow.label("Action", item.recommendedAction);
        });
        break;
      case "prioritized-findings":
        if (!premium.findings.length) {
          flow.text("No major hidden fee was confirmed", { bold: true, color: GREEN });
          flow.text("This remains a complete Contract Health Report. Use the protections, missing-details, monitoring, checklists, questions, and renewal controls below.");
        }
        (["Critical", "High", "Medium", "Low", "Informational"] as const).forEach((severity) => {
          const group = premium.findings.filter((finding) => finding.severity === severity);
          if (!group.length) return;
          flow.text(`${severity} (${group.length})`, { size: 18, bold: true, color: severity === "Critical" ? RED : severity === "High" ? ORANGE : severity === "Medium" ? GOLD : GREEN, gap: 7 });
          group.forEach((finding) => {
            flow.text(`${finding.title} - ${finding.confidence}% confidence - ${finding.amount == null ? "Amount not stated" : money(finding.amount)}`, { bold: true, gap: 2 });
            flow.text(finding.executiveSummary, { size: 13.5, color: MUTED, gap: 8 });
          });
        });
        break;
      case "detailed-evidence":
        if (!premium.findings.length) flow.text("No detailed adverse finding was generated. The report still documents coverage, limitations, favorable terms, missing protections, and the controls needed for human confirmation.");
        premium.findings.forEach((finding, index) => flow.premiumFinding(finding, index));
        break;
      case "positive-terms":
        renderInsightItems(premium.positiveTerms, GREEN, "Next step");
        break;
      case "missing-protections":
        renderInsightItems(premium.missingProtections, GOLD, "Next step");
        break;
      case "watch-later":
        renderInsightItems(premium.watchLater, BLUE, "Next step");
        break;
      case "professional-checklists": {
        const checklists = [["Procurement Checklist", premium.checklists.procurement], ["Attorney Review Checklist", premium.checklists.attorneyReview], ["Negotiation Checklist", premium.checklists.negotiation], ["Renewal Readiness", premium.checklists.renewalReadiness], ["Invoice Monitoring Checklist", premium.checklists.invoiceMonitoring]] as const;
        checklists.forEach(([title, items]) => { flow.text(title, { size: 17, bold: true, color: GOLD, gap: 6 }); items.forEach((item) => flow.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 })); });
        break;
      }
      case "action-plan": {
        const phases = [["Today", premium.actionPlan.today], ["Before signing", premium.actionPlan.beforeSigning], ["During negotiation", premium.actionPlan.duringNegotiation], ["After signing", premium.actionPlan.afterSigning], ["Before renewal", premium.actionPlan.beforeRenewal]] as const;
        phases.forEach(([title, items]) => { flow.text(title, { size: 17, bold: true, color: GOLD, gap: 6 }); items.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { indent: 12, size: 13.5, gap: 5 })); });
        break;
      }
      case "provider-guidance":
        flow.text("Provider-specific questions", { size: 17, bold: true, color: BLUE, gap: 7 });
        premium.providerQuestions.forEach((question, index) => flow.text(`${index + 1}. ${question}`, { gap: 5 }));
        flow.text("Escalation steps", { size: 17, bold: true, color: GOLD, gap: 7 });
        premium.escalationSteps.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { indent: 12, gap: 5 }));
        break;
      case "methodology":
        flow.text(`${premium.documentType}${premium.issuer ? ` | ${premium.issuer}` : ""}${premium.payer ? ` | ${premium.payer}` : ""}`, { size: 12.5, color: MUTED, gap: 4 });
        flow.text(`Report ID: ${premium.reportId || "Not available"} | Analysis date: ${premium.analysisDate}`, { size: 11.5, color: MUTED, gap: 10 });
        flow.metric("Evidence confidence", `${premium.executiveOverview.confidence}%`, BLUE);
        flow.text(premium.methodology.coverage);
        [["Limitations", premium.methodology.limitations], ["Unreadable or uncertain areas", premium.methodology.unreadableAreas], ["Assumptions", premium.methodology.assumptions], ["Human confirmation required", premium.methodology.humanConfirmation]].forEach(([title, items]) => {
          flow.text(title as string, { size: 17, bold: true, color: GOLD, gap: 7 });
          (items as string[]).forEach((item) => flow.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
        });
        break;
    }
  });
  flow.finalize();
  return pdf.save();
}
