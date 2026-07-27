import type { AuditReport, Finding, VerifiedFinding } from "../types.js";
import type { EnhancedExecutiveSummary, TopConcern } from "../intelligence/executiveSummary.js";
import type { PrioritizedFinding } from "../intelligence/prioritizationEngine.js";
import type { TrustScore } from "../trust/trustScore.js";
import type { ConsumerExplanation } from "../intelligence/explanationEngine.js";
import type { NegotiationAdvice } from "../intelligence/negotiationEngine.js";
import type { EducationTopic } from "../education/consumerEducation.js";
import type { ActionPlan } from "../intelligence/actionPlanEngine.js";
import type { SavingsEstimate } from "../intelligence/savingsEstimator.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ═══ Same color palette as original for visual consistency ═══
type Color = [number, number, number];

const VIOLET: Color = [0.545, 0.361, 0.965];
const DARK_BG: Color = [0.02, 0.02, 0.1];
const LIGHT_TEXT: Color = [0.9, 0.9, 0.95];
const MUTED_TEXT: Color = [0.5, 0.5, 0.6];
const GREEN: Color = [0.063, 0.725, 0.51];
const RED: Color = [0.863, 0.149, 0.149];
const ORANGE: Color = [0.961, 0.62, 0.043];
const YELLOW: Color = [0.93, 0.80, 0.04];
const WHITE: Color = [1, 1, 1];
const VIOLET_LIGHT: Color = [0.71, 0.56, 0.97];
const BORDER_SUBTLE: Color = [0.15, 0.15, 0.25];
const BLUE: Color = [0.2, 0.6, 1.0];

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function severityColor(severity: string): Color {
  switch (severity) { case "Critical": return RED; case "High": return ORANGE; case "Medium": return YELLOW; default: return GREEN; }
}

// ═══ Enhanced Report Input ═══
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

// ═══ Premium Enhanced PDF Generator ═══
export async function generateEnhancedPdf(data: EnhancedReportData): Promise<Uint8Array> {
  const { auditReport } = data;
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  let pageNumber = 1;

  function newPage(): void {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
    pageNumber++;
    page.drawText(`Page ${pageNumber}`, { x: (PAGE_WIDTH - font.widthOfTextAtSize(`Page ${pageNumber}`, 8)) / 2, y: 20, size: 8, font, color: rgb(...MUTED_TEXT) });
  }

  function drawText(text: string, size: number, color: Color, opts: { bold?: boolean; italic?: boolean; x?: number; align?: "left" | "center" | "right"; maxWidth?: number } = {}): void {
    const f = opts.bold ? fontBold : opts.italic ? fontOblique : font;
    const maxW = opts.maxWidth ?? CONTENT_WIDTH;
    const words = text.split(" "); const lines: string[] = []; let current = "";
    for (const word of words) { const test = current ? current + " " + word : word; if (font.widthOfTextAtSize(test, size) > maxW && current) { lines.push(current); current = word; } else current = test; }
    if (current) lines.push(current);
    for (const line of lines) {
      if (y < MARGIN + 20) newPage();
      const drawX = opts.x ?? MARGIN;
      page.drawText(line, { x: drawX, y, size, font: f, color: rgb(color[0], color[1], color[2]) });
      y -= size * 1.4;
    }
  }

  function drawLine(thickness = 0.5, color: Color = BORDER_SUBTLE): void {
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_WIDTH - MARGIN, y }, thickness, color: rgb(...color) });
  }

  function drawRect(x: number, yy: number, w: number, h: number, color: Color): void {
    page.drawRectangle({ x, y: yy - h, width: w, height: h, color: rgb(...color) });
  }

  function moveDown(amt: number): void { y -= amt; }

  function drawBullet(text: string, size: number, color: Color, indent = 0, checked = false): void {
    if (y < MARGIN + 20) newPage();
    page.drawText((checked ? "☑  " : "• ") + text, { x: MARGIN + indent, y, size, font, color: rgb(...color) });
    y -= size * 1.4;
  }

  function drawCheckbox(text: string, size: number, color: Color, indent = 0): void {
    if (y < MARGIN + 20) newPage();
    page.drawText(`☐  ${text}`, { x: MARGIN + indent, y, size, font, color: rgb(...color) });
    y -= size * 1.4;
  }

  function drawBadge(text: string, x: number, yy: number, color: Color, bgAlpha = 0.3): { w: number; h: number } {
    const w = fontBold.widthOfTextAtSize(text, 7) + 12; const h = 12;
    drawRect(x, yy, w, h, [color[0] * bgAlpha, color[1] * bgAlpha, color[2] * bgAlpha]);
    page.drawText(text, { x: x + 4, y: yy - 10, size: 7, font: fontBold, color: rgb(...color) });
    return { w, h };
  }

  // ═══════════════════════════════════════════
  // PAGE 1: EXECUTIVE SUMMARY HEADER
  // ═══════════════════════════════════════════

  const { document_meta, risk_score, risk_level, findings } = auditReport;
  const formattedDate = new Date(document_meta.analysis_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Header dark bar
  drawRect(MARGIN, y, CONTENT_WIDTH, 80, DARK_BG);
  y -= 10;
  drawText("HIDDENFEEAI DOCUMENT REVIEW", 16, VIOLET, { bold: true });
  drawText(`Report ID: ${document_meta.report_id.slice(0, 8).toUpperCase()}  ·  ${formattedDate}`, 8, MUTED_TEXT);
  y -= 4;
  drawText(`${document_meta.document_type || "Document"}  ·  ${document_meta.pages_reviewed} pages  ·  ${document_meta.line_items_reviewed} line items`, 8, MUTED_TEXT);
  y -= 8;
  drawLine(0.5, BORDER_SUBTLE);
  moveDown(14);

  // Trust Score (if available)
  if (data.trustScore) {
    drawText("TRUST SCORE", 10, MUTED_TEXT, { bold: true });
    moveDown(2);
    const ts = data.trustScore;
    drawText(`${ts.score}/100 — ${ts.rating}`, 14, ts.rating === 'Excellent' || ts.rating === 'Good' ? GREEN : ts.rating === 'Fair' ? YELLOW : RED, { bold: true });
    drawText(ts.ratingLabel, 8, LIGHT_TEXT);
    moveDown(4);
    drawLine();
    moveDown(8);
  }

  // Risk Score Gauge (preserved from original design)
  drawText("RISK ASSESSMENT", 10, MUTED_TEXT, { bold: true });
  moveDown(6);
  const gaugeY = y; const gaugeHeight = 24;
  drawRect(MARGIN, gaugeY, CONTENT_WIDTH, gaugeHeight, [0.08, 0.08, 0.16]);
  drawRect(MARGIN, gaugeY, CONTENT_WIDTH * 0.3, gaugeHeight, [0.05, 0.35, 0.15]);
  drawRect(MARGIN + CONTENT_WIDTH * 0.3, gaugeY, CONTENT_WIDTH * 0.3, gaugeHeight, [0.45, 0.35, 0.05]);
  drawRect(MARGIN + CONTENT_WIDTH * 0.6, gaugeY, CONTENT_WIDTH * 0.2, gaugeHeight, [0.5, 0.3, 0.02]);
  drawRect(MARGIN + CONTENT_WIDTH * 0.8, gaugeY, CONTENT_WIDTH * 0.2, gaugeHeight, [0.5, 0.05, 0.05]);
  const scoreX = MARGIN + (CONTENT_WIDTH * (risk_score / 100));
  page.drawLine({ start: { x: scoreX, y: gaugeY - 2 }, end: { x: scoreX, y: gaugeY - gaugeHeight - 2 }, thickness: 2.5, color: rgb(...WHITE) });
  const scoreLabel = `RISK SCORE: ${risk_score}/100`;
  page.drawText(scoreLabel, { x: Math.min(Math.max(scoreX - fontBold.widthOfTextAtSize(scoreLabel, 11) / 2, MARGIN + 8), PAGE_WIDTH - MARGIN - fontBold.widthOfTextAtSize(scoreLabel, 11) - 8), y: gaugeY - 18, size: 11, font: fontBold, color: rgb(...WHITE) });
  y -= gaugeHeight + 6;
  drawText(`Risk Level: ${risk_level}`, 12, severityColor(risk_level), { bold: true });
  moveDown(10);

  // Executive Summary from intelligence layer
  if (data.executiveSummary) {
    drawText(data.executiveSummary.riskSummary, 9, LIGHT_TEXT, { maxWidth: CONTENT_WIDTH });
    moveDown(6);
    if (data.executiveSummary.keyTakeaways.length > 0) {
      drawText("KEY TAKEAWAYS", 10, VIOLET, { bold: true });
      moveDown(4);
      for (const kt of data.executiveSummary.keyTakeaways) {
        drawBullet(kt, 9, LIGHT_TEXT);
      }
      moveDown(4);
    }
  }

  drawLine();
  moveDown(10);

  // ═══ TOP ISSUES TO ADDRESS FIRST ═══
  if (data.prioritizedFindings && data.prioritizedFindings.length > 0) {
    drawText("TOP ISSUES TO ADDRESS FIRST", 12, VIOLET, { bold: true });
    moveDown(8);

    for (const pf of data.prioritizedFindings.slice(0, 5)) {
      if (y < 120) newPage();
      const f = pf.finding;
      const sevC = severityColor(f.severity);
      const cardH = 55;
      drawRect(MARGIN, y, CONTENT_WIDTH, cardH, [sevC[0] * 0.1, sevC[1] * 0.1, sevC[2] * 0.1]);
      drawRect(MARGIN, y, 4, cardH, sevC);

      // Priority rank
      page.drawText(`#${pf.rank}`, { x: MARGIN + 10, y: y - 12, size: 11, font: fontBold, color: rgb(...sevC) });
      // Title + amount
      const amtLabel = f.amount ? `  —  $${f.amount.toLocaleString()}` : '';
      page.drawText(pf.finding.title + amtLabel, { x: MARGIN + 35, y: y - 12, size: 11, font: fontBold, color: rgb(...WHITE) });
      // Priority label badge
      const badgeW = fontBold.widthOfTextAtSize(pf.priorityLabel, 7) + 12;
      drawRect(MARGIN + 10, y - 26, badgeW, 12, [sevC[0] * 0.25, sevC[1] * 0.25, sevC[2] * 0.25]);
      page.drawText(pf.priorityLabel, { x: MARGIN + 14, y: y - 36, size: 7, font: fontBold, color: rgb(...sevC) });
      // Action
      page.drawText(pf.recommendedAction, { x: MARGIN + 10, y: y - 48, size: 8, font, color: rgb(...VIOLET_LIGHT), maxWidth: CONTENT_WIDTH - 20 });
      y -= cardH + 8;
    }
    drawLine();
    moveDown(10);
  }

  // ═══ EVIDENCE VIEWER ═══
  const sampleFinding = findings[0];
  if (sampleFinding) {
    if (y < 200) newPage();
    drawText("EVIDENCE VIEWER", 12, VIOLET, { bold: true });
    moveDown(6);
    drawText("Sample of evidence supporting our findings:", 9, MUTED_TEXT);
    moveDown(8);

    const f = sampleFinding;
    drawRect(MARGIN, y, CONTENT_WIDTH, 90, [VIOLET[0] * 0.08, VIOLET[1] * 0.08, VIOLET[2] * 0.08]);
    drawText(`${f.title}`, 11, WHITE, { bold: true, x: MARGIN + 8 });
    if (f.page) drawText(`📍 Page ${f.page}${f.line_reference ? `, ${f.line_reference}` : ''}`, 8, VIOLET_LIGHT, { x: MARGIN + 8 });
    moveDown(2);
    if (f.evidence) drawText(`"${f.evidence.slice(0, 200)}${f.evidence.length > 200 ? '...' : ''}"`, 8, MUTED_TEXT, { italic: true, x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
    moveDown(2);
    drawText(`Why flagged: ${f.explanation.slice(0, 150)}`, 8, LIGHT_TEXT, { x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
    moveDown(4);
    drawLine();
    moveDown(10);
  }

  // ═══════════════════════════════════════════
  // PAGE 2+: FINANCIAL IMPACT
  // ═══════════════════════════════════════════
  newPage();

  if (data.executiveSummary) {
    const es = data.executiveSummary;
    drawText("FINANCIAL IMPACT", 14, VIOLET, { bold: true });
    moveDown(10);

    // Cost breakdown
    if (es.oneTimeCosts > 0) drawText(`One-Time Charges: $${es.oneTimeCosts.toLocaleString()}`, 11, LIGHT_TEXT);
    if (es.recurringMonthly > 0) drawText(`Monthly Recurring: $${es.recurringMonthly.toLocaleString()}`, 11, LIGHT_TEXT);
    if (es.recurringAnnual > 0) drawText(`Annual Recurring: $${es.recurringAnnual.toLocaleString()}`, 11, YELLOW);
    moveDown(4);
    drawText(`Total First-Year Impact: $${es.totalFirstYear.toLocaleString()}`, 14, ORANGE, { bold: true });
    moveDown(8);

    // Savings opportunity
    if (data.savingsEstimates && data.savingsEstimates.length > 0) {
      const totalCurrent = data.savingsEstimates.reduce((s, e) => s + e.currentAmount, 0);
      const totalLow = data.savingsEstimates.filter(e => e.estimatable).reduce((s, e) => s + e.rangeLow, 0);
      const totalHigh = data.savingsEstimates.filter(e => e.estimatable).reduce((s, e) => s + e.rangeHigh, 0);
      if (totalHigh > 0) {
        drawText(`POTENTIAL SAVINGS: $${totalLow} - $${totalHigh}`, 13, GREEN, { bold: true });
        drawText(`Based on current fees of $${totalCurrent.toLocaleString()}`, 8, MUTED_TEXT);
        drawText("This is an estimate, not a guarantee. Actual savings depend on negotiation.", 8, MUTED_TEXT);
        moveDown(8);
      }
    }

    drawLine();
    moveDown(10);
  }

  // ═══ ALL FINDINGS (DETAILED) ═══
  drawText(`DETAILED FINDINGS (${findings.length})`, 13, VIOLET, { bold: true });
  moveDown(8);

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    if (y < 160) newPage();
    const sevC = severityColor(f.severity);
    const cardH = 75;
    drawRect(MARGIN, y, CONTENT_WIDTH, cardH, [sevC[0] * 0.08, sevC[1] * 0.08, sevC[2] * 0.08]);
    drawRect(MARGIN, y, 3, cardH, sevC);

    drawText(`${i + 1}. ${f.title}`, 10, WHITE, { bold: true, x: MARGIN + 8 });
    const meta = `${f.severity}  |  ${f.amount ? '$' + f.amount.toLocaleString() : 'N/A'}  |  Confidence: ${f.confidence_score}%`;
    drawText(meta, 7, sevC, { x: MARGIN + 8 });
    if (f.page) drawText(`📍 Page ${f.page}${f.line_reference ? ', ' + f.line_reference : ''}`, 7, VIOLET_LIGHT, { x: MARGIN + 8 });
    moveDown(1);
    drawText(f.explanation.slice(0, 180), 7, LIGHT_TEXT, { x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
    if (f.evidence) {
      drawText(`Evidence: "${f.evidence.slice(0, 120)}${f.evidence.length > 120 ? '...' : ''}"`, 7, MUTED_TEXT, { italic: true, x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
    }
    if (f.recommended_action) {
      drawText(`→ ${f.recommended_action}`, 7, VIOLET_LIGHT, { x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
    }
    y -= cardH + 6;
  }

  // ═══════════════════════════════════════════
  // PAGE: NEGOTIATION CENTER
  // ═══════════════════════════════════════════
  if (data.negotiationAdvice && data.negotiationAdvice.size > 0) {
    if (y < 250) newPage();
    drawText("NEGOTIATION CENTER", 14, VIOLET, { bold: true });
    moveDown(6);
    drawText("Questions to ask, talking points, and scripts.", 9, MUTED_TEXT);
    moveDown(8);

    // Pick the most actionable advice
    const advices = Array.from(data.negotiationAdvice.values()).filter(a => a.negotiability !== 'none').slice(0, 3);

    if (advices.length > 0) {
      for (const advice of advices) {
        if (y < 180) newPage();
        drawRect(MARGIN, y, CONTENT_WIDTH, 100, [GREEN[0] * 0.08, GREEN[1] * 0.08, GREEN[2] * 0.08]);
        drawText(`NEGOTIATE: ${advice.findingTitle}`, 11, GREEN, { bold: true, x: MARGIN + 6 });
        drawText(`Difficulty: ${advice.difficulty}  |  Negotiability: ${advice.negotiability.toUpperCase()}`, 8, LIGHT_TEXT, { x: MARGIN + 6 });
        moveDown(2);
        drawText(`Questions:`, 9, WHITE, { bold: true, x: MARGIN + 6 });
        for (const q of advice.questions.slice(0, 3)) {
          drawBullet(q, 8, LIGHT_TEXT, 6);
        }
        moveDown(2);
        if (advice.phoneScript.length > 100) {
          drawText("Phone Script:", 9, WHITE, { bold: true, x: MARGIN + 6 });
          drawText(advice.phoneScript.slice(0, 250), 7, MUTED_TEXT, { italic: true, x: MARGIN + 6, maxWidth: CONTENT_WIDTH - 12 });
        }
        moveDown(4);
      }
    }
    drawLine();
    moveDown(10);
  }

  // ═══ ACTION PLAN TIMELINE ═══
  if (data.actionPlan) {
    if (y < 200) newPage();
    const ap = data.actionPlan;
    drawText("ACTION PLAN", 14, VIOLET, { bold: true });
    moveDown(8);

    const sections: Array<{ title: string; items: typeof ap.beforeSigning }> = [
      { title: "Before Signing", items: ap.beforeSigning },
      { title: "During Negotiation", items: ap.negotiationSteps },
      { title: "After Signing", items: ap.afterSigning },
      { title: "Ongoing", items: ap.ongoingMonitoring },
    ];

    for (const section of sections) {
      if (y < 80) newPage();
      drawText(section.title, 11, VIOLET_LIGHT, { bold: true });
      moveDown(4);
      for (const item of section.items.slice(0, 3)) {
        drawBullet(`${item.step}: ${item.detail.slice(0, 150)}`, 8, LIGHT_TEXT, 6);
      }
      moveDown(4);
    }

    if (ap.checklist.length > 0) {
      drawText("Checklist", 11, WHITE, { bold: true });
      moveDown(4);
      for (const item of ap.checklist.slice(0, 7)) {
        drawCheckbox(item, 8, LIGHT_TEXT, 4);
      }
    }

    drawLine();
    moveDown(10);
  }

  // ═══ EDUCATION CARDS ═══
  if (data.educationTopics && data.educationTopics.length > 0) {
    if (y < 200) newPage();
    drawText("CONSUMER EDUCATION", 14, VIOLET, { bold: true });
    moveDown(6);
    drawText("Understanding the fees and terms in your document:", 9, MUTED_TEXT);
    moveDown(8);

    for (const topic of data.educationTopics.slice(0, 3)) {
      if (y < 140) newPage();
      drawRect(MARGIN, y, CONTENT_WIDTH, 90, [BLUE[0] * 0.06, BLUE[1] * 0.06, BLUE[2] * 0.06]);
      drawText(topic.topic, 11, BLUE, { bold: true, x: MARGIN + 8 });
      drawText(topic.whatIsIt, 8, LIGHT_TEXT, { x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
      moveDown(1);
      drawText(`Why it matters: ${topic.whyItMatters.slice(0, 150)}`, 8, MUTED_TEXT, { x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
      moveDown(1);
      drawText(`Learn more: ${topic.learnMore.slice(0, 120)}`, 7, VIOLET_LIGHT, { x: MARGIN + 8, maxWidth: CONTENT_WIDTH - 16 });
      y -= 100;
    }

    drawLine();
    moveDown(10);
  }

  // ═══ FOOTER ═══
  moveDown(10);
  drawLine(1, VIOLET);
  moveDown(10);
  drawText("Generated by HiddenFeeAI", 8, MUTED_TEXT, { align: "center" } as any);
  drawText("Private AI Analysis — Document not stored", 8, MUTED_TEXT, { align: "center" } as any);
  drawText("This report is for educational purposes only. Not legal advice.", 8, MUTED_TEXT, { align: "center" } as any);
  drawText("Estimates are based on document analysis and are not guaranteed.", 7, MUTED_TEXT, { align: "center" } as any);

  return pdfDoc.save();
}