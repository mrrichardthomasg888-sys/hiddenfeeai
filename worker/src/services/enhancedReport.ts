import type { AuditReport, Finding, VerifiedFinding } from "../types.js";
import type { EnhancedExecutiveSummary, TopConcern } from "../intelligence/executiveSummary.js";
import type { PrioritizedFinding } from "../intelligence/prioritizationEngine.js";
import type { TrustScore } from "../trust/trustScore.js";
import type { ConsumerExplanation } from "../intelligence/explanationEngine.js";
import type { NegotiationAdvice } from "../intelligence/negotiationEngine.js";
import type { EducationTopic } from "../education/consumerEducation.js";
import type { ActionPlan } from "../intelligence/actionPlanEngine.js";
import type { SavingsEstimate } from "../intelligence/savingsEstimator.js";
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from "pdf-lib";

// ═══ Premium Redesign: Color Palette ═══
type Color = [number, number, number];
const C_PRIMARY: Color = [0.44, 0.31, 0.98]; // A strong, modern violet
const C_BACKGROUND: Color = [0.98, 0.98, 0.99]; // Off-white for a softer, premium feel
const C_TEXT_HEADER: Color = [0.1, 0.1, 0.15]; // Near-black for headers
const C_TEXT_BODY: Color = [0.25, 0.25, 0.3]; // Dark gray for body text
const C_TEXT_MUTED: Color = [0.5, 0.5, 0.55]; // Lighter gray for metadata
const C_BORDER: Color = [0.9, 0.9, 0.92]; // Subtle border color
const C_GREEN: Color = [0.1, 0.6, 0.35];
const C_RED: Color = [0.8, 0.15, 0.15];
const C_ORANGE: Color = [0.95, 0.5, 0.1];
const C_YELLOW: Color = [0.9, 0.7, 0.1];

// ═══ Layout Constants ═══
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function severityColor(severity: string): Color {
  switch (severity?.toLowerCase()) {
    case "critical": return C_RED;
    case "high": return C_ORANGE;
    case "medium": return C_YELLOW;
    default: return C_GREEN;
  }
}

export interface EnhancedReportData {
  auditReport: AuditReport;
  executiveSummary?: EnhancedExecutiveSummary;
  prioritizedFindings?: PrioritizedFinding[];
  trustScore?: TrustScore;
  explanations?: Map<string, ConsumerExplanation>;
  negotiationAdvice?: Map<string, NegotiationAdvice>;
  educationTopics?: EducationTopic[];
  actionPlan?: ActionPlan;
  savingsEstimates?: SavingsEstimate[];
}

/**
 * A robust layout engine for PDF generation.
 * This class manages pages, content flow, and ensures no components are
 * awkwardly split across pages, which prevents blank pages.
 */
class PDFLayoutManager {
  doc: PDFDocument;
  pages: PDFPage[] = [];
  y = 0;
  font: PDFFont;
  fontBold: PDFFont;

  constructor(doc: PDFDocument, font: PDFFont, fontBold: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.fontBold = fontBold;
  }

  private get currentPage(): PDFPage {
    return this.pages[this.pages.length - 1];
  }

  private addNewPage() {
    const newPage = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.pages.push(newPage);
    this.y = PAGE_HEIGHT - MARGIN;
    newPage.drawRectangle({
      x: 0, y: 0,
      width: PAGE_WIDTH, height: PAGE_HEIGHT,
      color: rgb(...C_BACKGROUND),
    });
    this.drawPageHeader();
  }

  private drawPageHeader() {
    this.currentPage.drawText('HiddenFeeAI Audit Report', {
      x: MARGIN,
      y: PAGE_HEIGHT - 35,
      font: this.font,
      size: 9,
      color: rgb(...C_TEXT_MUTED),
    });
    this.currentPage.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 45 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 45 },
      thickness: 0.5,
      color: rgb(...C_BORDER),
    });
  }

  ensureSpace(height: number) {
    if (this.y - height < MARGIN) {
      this.addNewPage();
      this.y -= 40; // Extra space for header on new page
    }
  }

  addSpace(height: number) {
    this.ensureSpace(height);
    this.y -= height;
  }

  // A robust text drawing method that calculates its own height
  drawText(text: string, options: {
    font?: PDFFont, size?: number, color?: Color, x?: number, y?: number,
    maxWidth?: number, lineHeight?: number, bold?: boolean
  } = {}) {
    const {
      size = 10,
      color = C_TEXT_BODY,
      x = MARGIN,
      maxWidth = CONTENT_WIDTH,
      lineHeight = 1.4,
      bold = false,
    } = options;
    const font = bold ? this.fontBold : this.font;

    const lines = this.wrapText(text, font, size, maxWidth);
    const height = lines.length * size * lineHeight;

    this.ensureSpace(height);

    const yStart = options.y ?? this.y;
    for (let i = 0; i < lines.length; i++) {
      this.currentPage.drawText(lines[i], {
        font, size, color: rgb(...color),
        x,
        y: yStart - (i * size * lineHeight),
      });
    }

    if (!options.y) {
      this.y -= height;
    }
    return height;
  }

  drawLine() {
    this.ensureSpace(10);
    this.y -= 5;
    this.currentPage.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 1,
      color: rgb(...C_BORDER),
    });
    this.y -= 5;
  }

  /**
   * Draws a finding card, managing its own vertical space.
   * Ensures the entire card fits on the current page or moves to a new one.
   */
  drawFindingCard(finding: Finding, index: number) {
    const title = `${index + 1}. ${finding.title}`;
    const meta = `${finding.severity} Severity | Confidence: ${finding.confidence_score}% ${finding.page ? `| Page: ${finding.page}` : ''}`;
    const explanation = finding.explanation;
    const evidence = `Evidence: "${finding.evidence}"`;

    // Calculate heights of individual text blocks
    const titleHeight = this.getTextHeight(title, { size: 12, bold: true });
    const metaHeight = this.getTextHeight(meta, { size: 8 });
    const explanationHeight = this.getTextHeight(explanation, { size: 9 });
    const evidenceHeight = this.getTextHeight(evidence, { size: 8 });

    // Define internal card padding and spacing
    const cardPaddingTop = 20;
    const cardPaddingBottom = 10;
    const spacingBetweenText = 5 + 10 + 5; // Between title/meta, meta/explanation, explanation/evidence

    // Calculate total height the card will occupy
    const totalContentHeight = titleHeight + metaHeight + explanationHeight + evidenceHeight + spacingBetweenText;
    const totalCardHeight = totalContentHeight + cardPaddingTop + cardPaddingBottom;

    this.ensureSpace(totalCardHeight); // Ensure enough space for the entire card

    const cardRectY = this.y - totalCardHeight; // This is the bottom Y coordinate of the card rectangle
    const sevColor = severityColor(finding.severity);

    // Draw card background and severity bar
    this.currentPage.drawRectangle({
      x: MARGIN, y: cardRectY,
      width: CONTENT_WIDTH, height: totalCardHeight,
      color: rgb(1, 1, 1),
      borderColor: rgb(...C_BORDER),
      borderWidth: 1,
    });
    this.currentPage.drawRectangle({
      x: MARGIN, y: cardRectY,
      width: 5, height: totalCardHeight,
      color: rgb(...sevColor),
    });

    // Draw text elements, letting drawText update this.y automatically
    this.y -= cardPaddingTop; // Move down for top padding
    this.drawText(title, { x: MARGIN + 15, size: 12, bold: true, color: C_TEXT_HEADER });
    this.y -= 5; // Spacing
    this.drawText(meta, { x: MARGIN + 15, size: 8, color: sevColor });
    this.y -= 10; // Spacing
    this.drawText(explanation, { x: MARGIN + 15, size: 9, maxWidth: CONTENT_WIDTH - 30 });
    this.y -= 5; // Spacing
    this.drawText(evidence, { x: MARGIN + 15, size: 8, color: C_TEXT_MUTED, maxWidth: CONTENT_WIDTH - 30 });
    this.y -= cardPaddingBottom; // Move down for bottom padding
  }

  // Utility to measure text height without drawing
  getTextHeight(text: string, options: { font?: PDFFont, size?: number, maxWidth?: number, lineHeight?: number, bold?: boolean } = {}): number {
    const { size = 10, maxWidth = CONTENT_WIDTH, lineHeight = 1.4, bold = false } = options;
    const font = bold ? this.fontBold : this.font;
    const lines = this.wrapText(text, font, size, maxWidth);
    return lines.length * size * lineHeight;
  }

  wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    if (!text) return [];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  async finalize() {
    const totalPages = this.doc.getPageCount();
    for (let i = 0; i < totalPages; i++) {
      const page = this.doc.getPage(i);
      const footerText = `Page ${i + 1} of ${totalPages}`;
      page.drawText(footerText, {
        x: PAGE_WIDTH / 2 - this.font.widthOfTextAtSize(footerText, 8) / 2,
        y: 30,
        font: this.font,
        size: 8,
        color: rgb(...C_TEXT_MUTED),
      });
    }
    return this.doc.save();
  }
}

export async function generateEnhancedPdf(data: EnhancedReportData): Promise<Uint8Array> {
  const { auditReport } = data;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const layout = new PDFLayoutManager(doc, font, fontBold);

  // ═══════════════════════════════════════════
  //  COVER PAGE
  // ═══════════════════════════════════════════
  layout.addNewPage();
  layout.currentPage.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(0.05, 0.05, 0.15) });
  layout.drawText('CONFIDENTIAL AI AUDIT REPORT', { y: PAGE_HEIGHT / 2 + 100, size: 28, color: [1, 1, 1], bold: true, x: MARGIN });
  layout.drawText(auditReport.document_meta.document_type || 'Document Analysis', { y: PAGE_HEIGHT / 2 + 70, size: 20, color: C_PRIMARY, bold: true, x: MARGIN });
  layout.y = PAGE_HEIGHT / 2;
  layout.drawLine();
  const formattedDate = new Date(auditReport.document_meta.analysis_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  layout.drawText(`Date: ${formattedDate}`, { size: 12, color: [0.8, 0.8, 0.8] });
  layout.addSpace(5);
  layout.drawText(`File: ${auditReport.document_meta.fileName || 'N/A'}`, { size: 12, color: [0.8, 0.8, 0.8] });
  layout.addSpace(5);
  layout.drawText(`Report ID: ${auditReport.document_meta.report_id.slice(0, 8).toUpperCase()}`, { size: 12, color: [0.8, 0.8, 0.8] });

  // ═══════════════════════════════════════════
  //  EXECUTIVE SUMMARY
  // ═══════════════════════════════════════════
  layout.addNewPage();
  layout.addSpace(40);
  layout.drawText('Executive Summary', { size: 24, bold: true, color: C_TEXT_HEADER });
  layout.addSpace(20);

  // --- Risk Score ---
  if (data.trustScore) {
    const ts = data.trustScore;
    const scoreColor = ts.score >= 80 ? C_GREEN : ts.score >= 60 ? C_YELLOW : C_ORANGE;
    layout.drawText('Trust Score', { size: 16, bold: true, color: C_TEXT_HEADER });
    layout.addSpace(5);
    layout.drawText(`${ts.score}/100`, { size: 28, bold: true, color: scoreColor });
    layout.addSpace(5);
    layout.drawText(ts.ratingLabel, { size: 11, color: C_TEXT_BODY });
    layout.addSpace(20);
  }

  // --- Financial Impact ---
  if (data.executiveSummary) {
    const es = data.executiveSummary;
    layout.drawText('Financial Overview', { size: 16, bold: true, color: C_TEXT_HEADER });
    layout.addSpace(10);
    layout.drawText(`Total First-Year Impact: $${es.totalFirstYear.toLocaleString()}`, { size: 14, bold: true, color: C_ORANGE });
    layout.addSpace(5);
    if (es.oneTimeCosts > 0) layout.drawText(`One-Time Charges: $${es.oneTimeCosts.toLocaleString()}`, { size: 10 });
    if (es.recurringMonthly > 0) layout.drawText(`Monthly Recurring: $${es.recurringMonthly.toLocaleString()}`, { size: 10 });
    layout.addSpace(20);
  }

  // --- Summary Text ---
  if (data.executiveSummary?.riskSummary) {
    layout.drawText('Summary', { size: 16, bold: true, color: C_TEXT_HEADER });
    layout.addSpace(10);
    layout.drawText(data.executiveSummary.riskSummary, { size: 10, lineHeight: 1.5 });
    layout.addSpace(20);
  }

  // --- Key Takeaways ---
  if (data.executiveSummary?.keyTakeaways && data.executiveSummary.keyTakeaways.length > 0) {
    layout.drawText('Key Takeaways', { size: 16, bold: true, color: C_TEXT_HEADER });
    layout.addSpace(10);
    for (const takeaway of data.executiveSummary.keyTakeaways) {
      layout.drawText(`• ${takeaway}`, { size: 10, lineHeight: 1.6, maxWidth: CONTENT_WIDTH - 15, x: MARGIN + 15 });
      layout.addSpace(5);
    }
  }

  // ═══════════════════════════════════════════
  //  PRIORITIZED FINDINGS
  // ═══════════════════════════════════════════
  if (data.prioritizedFindings && data.prioritizedFindings.length > 0) {
    layout.addNewPage();
    layout.addSpace(40);
    layout.drawText('Priority Findings', { size: 24, bold: true, color: C_TEXT_HEADER });
    layout.drawText('These are the most critical issues that require your immediate attention.', { size: 11, color: C_TEXT_MUTED });
    layout.addSpace(20);

    for (const pf of data.prioritizedFindings.slice(0, 3)) {
      layout.drawFindingCard(pf.finding, pf.rank - 1);
      layout.addSpace(15);
    }
  }

  // ═══════════════════════════════════════════
  //  DETAILED FINDINGS
  // ═══════════════════════════════════════════
  if (auditReport.findings && auditReport.findings.length > 0) {
    layout.addNewPage();
    layout.addSpace(40);
    layout.drawText('All Findings', { size: 24, bold: true, color: C_TEXT_HEADER });
    layout.drawText(`A detailed list of all ${auditReport.findings.length} issues identified in the document.`, { size: 11, color: C_TEXT_MUTED });
    layout.addSpace(20);

    for (let i = 0; i < auditReport.findings.length; i++) {
      layout.drawFindingCard(auditReport.findings[i], i);
      layout.addSpace(15);
    }
  }

  // ═══════════════════════════════════════════
  //  ACTION PLAN & NEGOTIATION
  // ═══════════════════════════════════════════
  if (data.actionPlan || (data.negotiationAdvice && data.negotiationAdvice.size > 0)) {
    layout.addNewPage();
    layout.addSpace(40);
    layout.drawText('Action Center', { size: 24, bold: true, color: C_TEXT_HEADER });
    layout.drawText('Your recommended next steps and negotiation guidance.', { size: 11, color: C_TEXT_MUTED });
    layout.addSpace(20);

    if (data.actionPlan) {
      layout.drawText('Action Checklist', { size: 16, bold: true, color: C_TEXT_HEADER });
      layout.addSpace(10);
      for (const item of data.actionPlan.checklist.slice(0, 5)) {
        layout.drawText(`☐ ${item}`, { size: 10, lineHeight: 1.6 });
        layout.addSpace(5);
      }
      layout.addSpace(20);
    }

    if (data.negotiationAdvice && data.negotiationAdvice.size > 0) {
      const advices = Array.from(data.negotiationAdvice.values()).filter(a => a.negotiability !== 'none').slice(0, 2);
      if (advices.length > 0) {
        layout.drawText('Negotiation Scripts', { size: 16, bold: true, color: C_TEXT_HEADER }); // This updates layout.y
        layout.addSpace(10); // This updates layout.y
        for (const advice of advices) {
          // Calculate heights for the negotiation card content
          const scriptHeight = layout.getTextHeight(advice.phoneScript, { size: 9, maxWidth: CONTENT_WIDTH - 20 });
          const titleHeight = layout.getTextHeight(`For: ${advice.findingTitle}`, { size: 11, bold: true });
          const cardPaddingTop = 20;
          const cardPaddingBottom = 10;
          const spacingBetweenText = 10; // Between title and script

          const totalContentHeight = titleHeight + scriptHeight + spacingBetweenText;
          const totalCardHeight = totalContentHeight + cardPaddingTop + cardPaddingBottom;

          layout.ensureSpace(totalCardHeight); // Ensure space for the entire card
          const cardRectY = layout.y - totalCardHeight; // Bottom Y coordinate of the card rectangle

          layout.currentPage.drawRectangle({
            x: MARGIN, y: cardRectY,
            width: CONTENT_WIDTH, height: totalCardHeight,
            color: rgb(0.95, 0.98, 0.95), // Light green background
            borderColor: rgb(...C_GREEN),
            borderWidth: 1,
          });

          layout.y -= cardPaddingTop; // Move down for top padding
          layout.drawText(`For: ${advice.findingTitle}`, { x: MARGIN + 10, size: 11, bold: true, color: C_GREEN });
          layout.y -= spacingBetweenText; // Spacing
          layout.drawText(`"${advice.phoneScript}"`, { x: MARGIN + 10, size: 9, color: C_TEXT_BODY, maxWidth: CONTENT_WIDTH - 20 });
          layout.y -= cardPaddingBottom; // Move down for bottom padding
          layout.addSpace(15);
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  //  FINALIZATION
  // ═══════════════════════════════════════════
  return layout.finalize();
}