import { PDFDocument, PDFHexString, PDFName, PDFNumber, PDFString, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import type { AuditReport, Finding } from "../types.js";
import type { EnhancedExecutiveSummary } from "../intelligence/executiveSummary.js";
import type { PrioritizedFinding } from "../intelligence/prioritizationEngine.js";
import type { TrustScore } from "../trust/trustScore.js";
import type { NegotiationAdvice } from "../intelligence/negotiationEngine.js";
import type { EducationTopic } from "../education/consumerEducation.js";
import type { ActionPlan } from "../intelligence/actionPlanEngine.js";
import type { SavingsEstimate } from "../intelligence/savingsEstimator.js";
import { buildPremiumReport, normalizeConfidence, type PremiumFinding, type PremiumReport } from "./premiumReport.js";

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

  index(includeDetailedEvidence = true): void {
    this.section("Report Index", "A guided view of every category in your professional audit");
    const entries = [
      ["01", "Executive Decision Brief", "Risk, savings, coverage, decision, and urgent actions.", "Executive Decision Brief"],
      ["02", "Financial Impact", "Confirmed charges, recurring exposure, and calculations.", "Financial Impact Summary"],
      ["03", "Top Urgent Actions", "The highest-value next steps to take first.", "Top Urgent Actions"],
      ["04", "Negotiation Playbook", "One consolidated strategy, phone script, and email set.", "Negotiation Playbook"],
      ["05", "Timeline and Deadlines", "Verified dates and actions tied to source evidence.", "Timeline and Deadlines"],
      ["06", "Prioritized Findings", "All findings ranked by severity and confidence.", "Prioritized Findings"],
      ["07", "Detailed Evidence", "Quotes, locations, impact, questions, and replacement language.", "Detailed Evidence"],
      ["08", "Positive Terms and Missing Protections", "What to preserve, request, and monitor.", "Positive Terms and Protections"],
      ["09", "Action Plan", "Today through renewal, organized by contract stage.", "Start Here Action Plan"],
      ["10", "Questions and Escalation", "Provider questions and a practical escalation path.", "Provider Questions and Escalation"],
      ["11", "Methodology and Limitations", "Coverage, confidence, assumptions, and human checks.", "Methodology, Confidence, and Limitations"],
    ].filter((entry) => includeDetailedEvidence || entry[3] !== "Detailed Evidence");
    entries.forEach(([number, title, description, target], index) => {
      this.ensure(52);
      const y = this.y - 44;
      this.indexLinks.push({ pageIndex: this.pageNumber - 1, y, target, title });
      this.page.drawRectangle({ x: MARGIN, y, width: WIDTH, height: 44, color: rgb(0.07, 0.14, 0.25), borderColor: rgb(...BORDER), borderWidth: 0.5 });
      this.page.drawRectangle({ x: MARGIN, y, width: 46, height: 44, color: index % 2 === 0 ? rgb(...BLUE) : rgb(...GOLD) });
      this.page.drawText(number, { x: MARGIN + 12, y: y + 16, size: 11, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText(title, { x: MARGIN + 59, y: y + 25, size: 13, font: this.bold, color: rgb(1, 1, 1) });
      this.page.drawText(description, { x: MARGIN + 59, y: y + 9, size: 9.5, font: this.regular, color: rgb(...MUTED) });
      this.y -= 52;
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

  label(label: string, value: unknown): void {
    if (value == null || clean(value) === "") return;
    this.text(`${label}: ${clean(value)}`, { size: 14, gap: 8 });
  }

  metric(label: string, value: string, color: Color = BLUE): void {
    this.ensure(58);
    this.page.drawRectangle({ x: MARGIN, y: this.y - 50, width: WIDTH, height: 50, color: rgb(0.06, 0.13, 0.23), borderColor: rgb(...BORDER), borderWidth: 0.6 });
    this.page.drawRectangle({ x: MARGIN, y: this.y - 50, width: 5, height: 50, color: rgb(...color) });
    this.page.drawText(clean(label), { x: MARGIN + 16, y: this.y - 20, size: 12.5, font: this.regular, color: rgb(...MUTED) });
    const safeValue = clean(value);
    this.page.drawText(safeValue, { x: PAGE_W - MARGIN - 12 - this.bold.widthOfTextAtSize(safeValue, 17), y: this.y - 23, size: 17, font: this.bold, color: rgb(...color) });
    this.y -= 60;
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
    this.text(`${finding.severity} | ${finding.confidence}% confidence | ${finding.amount == null ? "Amount not stated" : money(finding.amount)} | ${finding.location}`, { size: 12.5, color: MUTED, gap: 9 });
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
        Type: "Annot", Subtype: "Link", Rect: [MARGIN, entry.y, MARGIN + WIDTH, entry.y + 44], Border: [0, 0, 0], Dest: destination,
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
  flow.index(premium.findings.length > 0);

  flow.section("Executive Decision Brief", "The decision, financial stakes, coverage, and three actions that matter most");
  flow.metric("Risk score", `${premium.executiveOverview.riskScore}/100 - ${premium.executiveOverview.riskLevel}`, premium.executiveOverview.riskScore >= 70 ? RED : premium.executiveOverview.riskScore >= 40 ? ORANGE : GREEN);
  flow.metric("Potential savings", money(premium.executiveOverview.potentialSavings), GREEN);
  flow.metric("Evidence confidence", `${premium.executiveOverview.confidence}%`, BLUE);
  flow.metric("Document coverage", `${premium.executiveOverview.pagesReviewed} pages / ${report.document_meta.line_items_reviewed} line items`, BLUE);
  flow.label("Decision", premium.executiveOverview.decision);
  flow.text(premium.executiveOverview.decisionReasoning);
  flow.text(premium.executiveOverview.documentSummary, { color: MUTED });
  premium.executiveOverview.urgentActions.slice(0, 3).forEach((item, index) => flow.text(`${index + 1}. ${item}`, { bold: true, gap: 6 }));

  flow.addPage();
  flow.section("Financial Impact Summary", "Confirmed amounts, recurring-cost forecast, possible savings, and how the numbers were calculated");
  flow.metric("Confirmed charges", money(premium.financialImpact.confirmedCharges), ORANGE);
  flow.metric("Monthly recurring exposure", money(premium.financialImpact.recurringMonthlyExposure), ORANGE);
  flow.metric("Estimated annual exposure", money(premium.financialImpact.estimatedAnnualExposure), ORANGE);
  flow.metric("Full-contract exposure", premium.financialImpact.contractTermExposure == null ? "Not reliably calculable" : money(premium.financialImpact.contractTermExposure), ORANGE);
  flow.metric("Possible savings", money(premium.financialImpact.possibleSavings), GREEN);
  flow.text(premium.financialImpact.explanation, { size: 13.5, color: MUTED });

  flow.addPage();
  flow.section("Top Urgent Actions", "Ranked steps to protect your money and your negotiating position");
  premium.executiveOverview.urgentActions.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { bold: index < 3, gap: 7 }));

  flow.section("Negotiation Playbook", "One consolidated strategy and script set for the entire document");
  flow.playbook(premium);

  flow.section("Timeline and Deadlines", "Only dates supported by the document analysis are shown as verified");
  if (!premium.timeline.length) flow.text("No renewal, cancellation, notice, price-change, trial, or other deadline was returned with enough evidence to list as verified. Ask the provider to confirm all dates in writing and review the original document manually.", { color: MUTED });
  premium.timeline.forEach((item, index) => {
    flow.text(`${index + 1}. ${item.event} - ${item.date}`, { bold: true, color: GOLD, gap: 3 });
    flow.label("Source", item.location);
    flow.label("Evidence", item.evidence);
    flow.label("Action", item.recommendedAction);
  });

  flow.section(`Prioritized Findings (${premium.findings.length})`, "Grouped by severity and ranked by evidence confidence");
  if (!premium.findings.length) flow.text("No major hidden fee was confirmed. Continue with the positive-terms, missing-protections, monitoring, and verification checklists in this report.");
  (["Critical", "High", "Medium", "Low", "Informational"] as const).forEach((severity) => {
    const group = premium.findings.filter((finding) => finding.severity === severity);
    if (!group.length) return;
    flow.text(`${severity} (${group.length})`, { size: 18, bold: true, color: severity === "Critical" ? RED : severity === "High" ? ORANGE : severity === "Medium" ? GOLD : GREEN, gap: 7 });
    group.forEach((finding) => {
      flow.text(`${finding.title} - ${finding.confidence}% confidence - ${finding.amount == null ? "Amount not stated" : money(finding.amount)}`, { bold: true, gap: 2 });
      flow.text(finding.recommendedAction, { size: 13.5, color: MUTED, gap: 8 });
    });
  });

  if (premium.findings.length) {
    flow.text("How to use the detailed evidence", { size: 17, bold: true, color: BLUE, gap: 7 });
    [
      "Open the original document to the listed page, section, table, row, cell, sheet, or image reference.",
      "Compare the exact quote with the surrounding language so qualifiers and exceptions are not missed.",
      "Use the finding-specific talking point first; use the full consolidated scripts only when you are ready to contact the provider.",
      "Record the provider's answer and require every promised change, credit, waiver, or exception in writing.",
    ].forEach((item, index) => flow.text(`${index + 1}. ${item}`, { indent: 12, size: 13, gap: 5 }));

    flow.addPage();
    flow.section("Detailed Evidence", "Every finding includes its quote, source location, impact, action, questions, negotiability, and replacement language");
    premium.findings.forEach((finding, index) => flow.premiumFinding(finding, index));
  }

  flow.section("Positive Terms and Protections", "Useful terms to preserve, including in a clean contract");
  premium.positiveTerms.forEach((item) => {
    flow.text(item.title, { size: 17, bold: true, color: GREEN, gap: 4 });
    flow.text(item.explanation, { size: 13.5, gap: 4 });
    if (item.evidence) flow.label("Evidence", item.evidence);
    if (item.source_reference) flow.label("Source", item.source_reference);
    flow.label("Preserve it by", item.recommended_action);
  });
  flow.section("What Is Missing?", "Protections and pricing details to confirm or request");
  premium.missingProtections.forEach((item) => {
    flow.text(item.title, { size: 17, bold: true, color: GOLD, gap: 4 });
    flow.text(item.explanation, { size: 13.5, gap: 4 });
    flow.label("Recommended request", item.recommended_action);
  });
  flow.section("What to Watch Later", "Invoice, usage, renewal, fee, and policy-change monitoring");
  premium.watchLater.forEach((item) => {
    flow.text(item.title, { size: 17, bold: true, color: BLUE, gap: 4 });
    flow.text(item.explanation, { size: 13.5, gap: 4 });
    flow.label("Monitoring action", item.recommended_action);
  });

  flow.section("Start Here Action Plan", "Today, before signing, during negotiation, after signing, and before renewal");
  const phases = [["Today", premium.actionPlan.today], ["Before signing", premium.actionPlan.beforeSigning], ["During negotiation", premium.actionPlan.duringNegotiation], ["After signing", premium.actionPlan.afterSigning], ["Before renewal", premium.actionPlan.beforeRenewal]] as const;
  phases.forEach(([title, items]) => {
    flow.text(title, { size: 17, bold: true, color: GOLD, gap: 6 });
    items.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { indent: 12, size: 13.5, gap: 5 }));
  });

  flow.section("Provider Questions and Escalation", "Focused questions and the next person to contact if the first answer is not enough");
  premium.providerQuestions.forEach((question, index) => flow.text(`${index + 1}. ${question}`, { gap: 5 }));
  flow.text("Escalation steps", { size: 17, bold: true, color: GOLD, gap: 7 });
  premium.escalationSteps.forEach((item, index) => flow.text(`${index + 1}. ${item}`, { indent: 12, gap: 5 }));

  flow.addPage();
  flow.section("Methodology, Confidence, and Limitations", "Document coverage, uncertainty, assumptions, and items requiring human confirmation");
  flow.text(`${premium.documentType}${premium.issuer ? ` | ${premium.issuer}` : ""}${premium.payer ? ` | ${premium.payer}` : ""}`, { size: 12.5, color: MUTED, gap: 4 });
  flow.text(`Report ID: ${premium.reportId || "Not available"} | Analysis date: ${premium.analysisDate}`, { size: 11.5, color: MUTED, gap: 10 });
  flow.metric("Evidence confidence", `${premium.executiveOverview.confidence}%`, BLUE);
  flow.text(premium.methodology.coverage);
  flow.text("Limitations", { size: 17, bold: true, color: GOLD, gap: 7 });
  premium.methodology.limitations.forEach((item) => flow.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
  flow.text("Unreadable or uncertain areas", { size: 17, bold: true, color: GOLD, gap: 7 });
  premium.methodology.unreadableAreas.forEach((item) => flow.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
  flow.text("Assumptions", { size: 17, bold: true, color: GOLD, gap: 7 });
  premium.methodology.assumptions.forEach((item) => flow.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
  flow.text("Human confirmation required", { size: 17, bold: true, color: GOLD, gap: 7 });
  premium.methodology.humanConfirmation.forEach((item) => flow.text(`- ${item}`, { indent: 12, size: 13.5, gap: 5 }));
  flow.finalize();
  return pdf.save();
}
