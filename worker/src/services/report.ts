import type { AuditReport, Finding } from "../types.js";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─── Color palette ───

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
const BG_CARD: Color = [0.06, 0.06, 0.16];
const BORDER_SUBTLE: Color = [0.15, 0.15, 0.25];

// ─── Layout constants ───

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// ─── Severity → color mapping ───

function severityColor(severity: string): Color {
  switch (severity) {
    case "Critical": return RED;
    case "High": return ORANGE;
    case "Medium": return YELLOW;
    case "Low": return GREEN;
    default: return MUTED_TEXT;
  }
}

function riskColor(score: number): Color {
  if (score <= 30) return GREEN;
  if (score <= 60) return YELLOW;
  if (score <= 80) return ORANGE;
  return RED;
}

// ─── PDF driver ───

export async function generatePdf(report: AuditReport): Promise<Uint8Array> {
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
    drawFooter();
  }

  function drawFooter(): void {
    const text = `Page ${pageNumber}`;
    const w = font.widthOfTextAtSize(text, 8);
    page.drawText(text, {
      x: (PAGE_WIDTH - w) / 2,
      y: 20,
      size: 8,
      font: font,
      color: rgb(...MUTED_TEXT),
    });
  }

  function wrapText(text: string, size: number, maxWidth: number = CONTENT_WIDTH): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawText(
    text: string,
    size: number,
    color: Color,
    opts: {
      bold?: boolean;
      italic?: boolean;
      x?: number;
      align?: "left" | "center" | "right";
      maxWidth?: number;
    } = {}
  ): void {
    const f = opts.bold ? fontBold : opts.italic ? fontOblique : font;
    const maxW = opts.maxWidth ?? CONTENT_WIDTH;
    const lines = wrapText(text, size, maxW);

    for (const line of lines) {
      if (y < MARGIN + 20) newPage();

      let drawX = opts.x ?? MARGIN;
      if (opts.align === "center") {
        drawX = (PAGE_WIDTH - font.widthOfTextAtSize(line, size)) / 2;
      } else if (opts.align === "right") {
        drawX = PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(line, size);
      }

      page.drawText(line, {
        x: drawX,
        y,
        size,
        font: f,
        color: rgb(color[0], color[1], color[2]),
      });
      y -= size * 1.4;
    }
  }

  function drawBullet(text: string, size: number, color: Color, indent = 0, checked = false): void {
    const prefix = checked ? "☑  " : "• ";
    const x = MARGIN + indent;
    if (y < MARGIN + 20) newPage();
    page.drawText(prefix + text, {
      x,
      y,
      size,
      font,
      color: rgb(color[0], color[1], color[2]),
    });
    y -= size * 1.4;
  }

  function drawCheckbox(text: string, size: number, color: Color, indent = 0): void {
    const x = MARGIN + indent;
    if (y < MARGIN + 20) newPage();
    page.drawText(`☐  ${text}`, {
      x,
      y,
      size,
      font,
      color: rgb(color[0], color[1], color[2]),
    });
    y -= size * 1.4;
  }

  function drawLine(yPos: number, color: Color = BORDER_SUBTLE, thickness = 0.5): void {
    page.drawLine({
      start: { x: MARGIN, y: yPos },
      end: { x: PAGE_WIDTH - MARGIN, y: yPos },
      thickness,
      color: rgb(color[0], color[1], color[2]),
    });
  }

  function drawRect(x: number, y: number, w: number, h: number, color: Color, fill = true): void {
    page.drawRectangle({
      x, y: y - h, width: w, height: h,
      color: rgb(color[0], color[1], color[2]),
    });
  }

  function moveDown(amount: number): void {
    y -= amount;
  }

  // ─── Start drawing ───

  const { document_meta, risk_score, risk_level, financial_impact, potential_savings, findings, clean_document_summary } = report;
  const formattedDate = new Date(document_meta.analysis_date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // ═══ DOCUMENT METADATA HEADER ═══
  drawRect(MARGIN, y, CONTENT_WIDTH, 72, DARK_BG);
  y -= 10;

  drawText("HIDDENFEEAI AUDIT REPORT", 14, VIOLET, { bold: true });
  drawText(`Report ID: ${document_meta.report_id.slice(0, 8).toUpperCase()}  ·  ${formattedDate}`, 8, MUTED_TEXT);

  y -= 6;
  const metaLine = [
    `📄 ${document_meta.document_type || "Document"}`,
    `📑 ${document_meta.pages_reviewed} page${document_meta.pages_reviewed !== 1 ? "s" : ""} reviewed`,
    `📊 ${document_meta.line_items_reviewed} line items`,
    `📋 Issuer: ${document_meta.issuer || "N/A"}`,
  ].join("   ·   ");
  drawText(metaLine, 8, MUTED_TEXT);
  y -= 8;
  drawLine(y, BORDER_SUBTLE, 0.5);
  moveDown(14);

  // ═══ RISK SCORE GAUGE ═══
  drawText("RISK ASSESSMENT", 11, MUTED_TEXT, { bold: true });
  moveDown(8);

  // Gauge background
  const gaugeY = y;
  const gaugeHeight = 28;
  const gaugeLeft = MARGIN;
  const gaugeFull = CONTENT_WIDTH;
  const scoreX = gaugeLeft + (gaugeFull * (risk_score / 100));

  // Background bar (dark)
  drawRect(gaugeLeft, gaugeY, gaugeFull, gaugeHeight, [0.08, 0.08, 0.16]);

  // Green zone (0-30)
  drawRect(gaugeLeft, gaugeY, gaugeFull * 0.3, gaugeHeight, [0.05, 0.35, 0.15]);
  // Yellow zone (30-60)
  drawRect(gaugeLeft + gaugeFull * 0.3, gaugeY, gaugeFull * 0.3, gaugeHeight, [0.45, 0.35, 0.05]);
  // Orange zone (60-80)
  drawRect(gaugeLeft + gaugeFull * 0.6, gaugeY, gaugeFull * 0.2, gaugeHeight, [0.5, 0.3, 0.02]);
  // Red zone (80-100)
  drawRect(gaugeLeft + gaugeFull * 0.8, gaugeY, gaugeFull * 0.2, gaugeHeight, [0.5, 0.05, 0.05]);

  // Draw the score indicator line
  page.drawLine({
    start: { x: scoreX, y: gaugeY - 2 },
    end: { x: scoreX, y: gaugeY - gaugeHeight - 2 },
    thickness: 2.5,
    color: rgb(WHITE[0], WHITE[1], WHITE[2]),
  });

  // Score label inside the gauge
  const scoreLabel = `RISK SCORE: ${risk_score}/100`;
  const scoreLabelW = fontBold.widthOfTextAtSize(scoreLabel, 12);
  page.drawText(scoreLabel, {
    x: Math.min(Math.max(scoreX - scoreLabelW / 2, gaugeLeft + 8), PAGE_WIDTH - MARGIN - scoreLabelW - 8),
    y: gaugeY - 20,
    size: 12,
    font: fontBold,
    color: rgb(WHITE[0], WHITE[1], WHITE[2]),
  });

  y -= gaugeHeight + 8;

  // Risk level label
  const riskColorVal = riskColor(risk_score);
  drawText(`Risk Level: ${risk_level}`, 12, riskColorVal, { bold: true });
  moveDown(4);

  // Confidence badge
  const confidencePct = report.confidence_level || Math.round((report.findings.reduce((s, f) => s + f.confidence_score, 0) / Math.max(report.findings.length, 1)) || 85);
  const confColor = confidencePct >= 80 ? GREEN : confidencePct >= 60 ? ORANGE : RED;
  const confText = `Confidence: ${confidencePct}%`;

  // Badge rectangle
  const confW = fontBold.widthOfTextAtSize(confText, 10) + 16;
  drawRect(PAGE_WIDTH - MARGIN - confW, y + 12, confW, 16, [confColor[0] * 0.15, confColor[1] * 0.15, confColor[2] * 0.15]);
  drawText(confText, 10, confColor, { bold: true, x: PAGE_WIDTH - MARGIN - confW + 8 });

  // ── Determine if we have measurable financial amounts ──
  const hasMeasurableAmounts = findings.some(f => f.amount != null && f.amount > 0);
  const hasFindings = findings.length > 0;
  const criticalCount = findings.filter(f => f.severity === "Critical").length;

  // Only show potential savings if there are measurable amounts
  if (hasMeasurableAmounts) {
    moveDown(4);
    drawText(`💰 Potential Savings: $${potential_savings.toLocaleString()}`, 12, GREEN, { bold: true });
  }
  moveDown(14);

  if (hasMeasurableAmounts) {
    // ═══ SCENARIO A: Measurable dollar amounts exist — show financial impact table ═══
    drawText("FINANCIAL IMPACT", 11, MUTED_TEXT, { bold: true });
    moveDown(8);

    const tableY = y;
    const tableRowH = 20;
    const colLabelW = CONTENT_WIDTH * 0.48;
    const colAmtW = CONTENT_WIDTH * 0.28;
    const colStatusW = CONTENT_WIDTH - colLabelW - colAmtW;

    // Header row
    drawRect(MARGIN, tableY - 2, CONTENT_WIDTH, tableRowH, [0.05, 0.05, 0.12]);
    drawText("Category", 9, LIGHT_TEXT, { bold: true, x: MARGIN + 6 });
    drawText("Amount", 9, LIGHT_TEXT, { bold: true, x: MARGIN + colLabelW });
    drawText("Status", 9, LIGHT_TEXT, { bold: true, x: MARGIN + colLabelW + colAmtW });
    y -= tableRowH + 4;

    function tableRow(label: string, amount: string, status: string, labelC: Color, amtC: Color, statC: Color, bold = false): void {
      if (y < MARGIN + 20) newPage();
      const f = bold ? fontBold : font;
      page.drawText(label, { x: MARGIN + 6, y, size: 9, font: f, color: rgb(labelC[0], labelC[1], labelC[2]) });
      page.drawText(amount, { x: MARGIN + colLabelW, y, size: 9, font: f, color: rgb(amtC[0], amtC[1], amtC[2]) });
      page.drawText(status, { x: MARGIN + colLabelW + colAmtW, y, size: 9, font: f, color: rgb(statC[0], statC[1], statC[2]) });
      y -= 16;
    }

    tableRow("Original Total", `$${financial_impact.original_total.toLocaleString()}`, "Billed", LIGHT_TEXT, LIGHT_TEXT, MUTED_TEXT);
    tableRow("Questionable Charges", `$${financial_impact.questionable_charges_total.toLocaleString()}`, "Flagged", RED, RED, RED);
    // Only show Corrected Total if we can actually calculate it
    if (financial_impact.corrected_total > 0 && financial_impact.original_total > 0) {
      tableRow("Corrected Total", `$${financial_impact.corrected_total.toLocaleString()}`, "Recommended", GREEN, GREEN, GREEN, true);
    }
    moveDown(6);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  } else if (hasFindings) {
    // ═══ SCENARIO B: Findings exist but amounts are N/A — show Impact Summary ═══
    drawText("IMPACT SUMMARY", 11, MUTED_TEXT, { bold: true });
    moveDown(8);

    const summaryItems = [
      `Findings Identified: ${findings.length}`,
      criticalCount > 0 ? `Critical Findings: ${criticalCount}` : null,
      `Overall Risk Level: ${risk_level}`,
      "Potential Financial Exposure: Not Quantifiable From the Document",
      "Verified Questionable Charges: No dollar amount identified",
      "Estimated Savings: Not calculated",
    ].filter(Boolean) as string[];

    for (const item of summaryItems) {
      drawBullet(item, 9, LIGHT_TEXT, 4);
    }

    moveDown(8);
    // Explanatory note in a bordered box
    const noteY = y + 8;
    const noteText = "Several findings involve contract terms, pricing flexibility, or potential future charges rather than currently billed amounts. These risks may create financial exposure, but the document does not provide enough information to calculate a reliable dollar value.";
    const noteLines = wrapText(noteText, 8, CONTENT_WIDTH - 16);
    const noteHeight = noteLines.length * 12 + 20;

    drawRect(MARGIN, noteY, CONTENT_WIDTH, noteHeight, [VIOLET[0] * 0.08, VIOLET[1] * 0.08, VIOLET[2] * 0.08]);
    page.drawRectangle({
      x: MARGIN, y: noteY - noteHeight,
      width: CONTENT_WIDTH, height: noteHeight,
      borderColor: rgb(VIOLET[0] * 0.3, VIOLET[1] * 0.3, VIOLET[2] * 0.3),
      borderWidth: 1,
    });

    y -= 2;
    for (const line of noteLines) {
      if (y < MARGIN + 20) newPage();
      page.drawText(line, {
        x: MARGIN + 8,
        y,
        size: 8,
        font: fontOblique,
        color: rgb(LIGHT_TEXT[0], LIGHT_TEXT[1], LIGHT_TEXT[2]),
      });
      y -= 10;
    }

    y -= 12;
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  } else {
    // ═══ SCENARIO C: No findings and no measurable impact — show $0 values ═══
    drawText("FINANCIAL IMPACT", 11, MUTED_TEXT, { bold: true });
    moveDown(8);

    const tableY = y;
    const tableRowH = 20;
    const colLabelW = CONTENT_WIDTH * 0.48;
    const colAmtW = CONTENT_WIDTH * 0.28;
    const colStatusW = CONTENT_WIDTH - colLabelW - colAmtW;

    drawRect(MARGIN, tableY - 2, CONTENT_WIDTH, tableRowH, [0.05, 0.05, 0.12]);
    drawText("Category", 9, LIGHT_TEXT, { bold: true, x: MARGIN + 6 });
    drawText("Amount", 9, LIGHT_TEXT, { bold: true, x: MARGIN + colLabelW });
    drawText("Status", 9, LIGHT_TEXT, { bold: true, x: MARGIN + colLabelW + colAmtW });
    y -= tableRowH + 4;

    function tableRow(label: string, amount: string, status: string, labelC: Color, amtC: Color, statC: Color, bold = false): void {
      if (y < MARGIN + 20) newPage();
      const f = bold ? fontBold : font;
      page.drawText(label, { x: MARGIN + 6, y, size: 9, font: f, color: rgb(labelC[0], labelC[1], labelC[2]) });
      page.drawText(amount, { x: MARGIN + colLabelW, y, size: 9, font: f, color: rgb(amtC[0], amtC[1], amtC[2]) });
      page.drawText(status, { x: MARGIN + colLabelW + colAmtW, y, size: 9, font: f, color: rgb(statC[0], statC[1], statC[2]) });
      y -= 16;
    }

    tableRow("Original Total", `$${financial_impact.original_total.toLocaleString()}`, "Billed", LIGHT_TEXT, LIGHT_TEXT, MUTED_TEXT);
    tableRow("Questionable Charges", `$${financial_impact.questionable_charges_total.toLocaleString()}`, "Flagged", RED, RED, RED);
    tableRow("Corrected Total", `$${financial_impact.corrected_total.toLocaleString()}`, "Recommended", GREEN, GREEN, GREEN, true);
    moveDown(6);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  }

  // ═══ TOP 3 CRITICAL FEES ═══
  const sortedBySeverity = [...findings]
    .filter(f => f.amount != null)
    .sort((a, b) => {
      const sevMap: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      return (sevMap[b.severity] || 0) - (sevMap[a.severity] || 0);
    })
    .slice(0, 3);

  if (sortedBySeverity.length > 0) {
    drawText("TOP CRITICAL FEES", 11, MUTED_TEXT, { bold: true });
    moveDown(8);

    for (const f of sortedBySeverity) {
      if (y < 120) newPage();
      const cardHeight = 50;
      const sevC = severityColor(f.severity);

      // Card background
      drawRect(MARGIN, y, CONTENT_WIDTH, cardHeight, [sevC[0] * 0.12, sevC[1] * 0.12, sevC[2] * 0.12]);
      // Left colored border
      drawRect(MARGIN, y, 4, cardHeight, sevC);

      // Title and amount
      const feeTitle = f.title;
      const feeAmt = f.amount ? `$${f.amount.toLocaleString()}` : "N/A";
      drawText(feeTitle, 11, WHITE, { bold: true, x: MARGIN + 12 });
      drawText(feeAmt, 14, sevC, { bold: true, x: MARGIN + 12 });

      // Severity badge
      const sevText = f.severity.toUpperCase();
      const sevW = fontBold.widthOfTextAtSize(sevText, 7) + 12;
      drawRect(MARGIN + 12, y - 36, sevW, 12, [sevC[0] * 0.3, sevC[1] * 0.3, sevC[2] * 0.3]);
      drawText(sevText, 7, sevC, { bold: true, x: MARGIN + 16 });

      // Page reference badge
      if (f.page) {
        const pageRef = f.line_reference ? `Page ${f.page}, Line ${f.line_reference}` : `Page ${f.page}`;
        const prW = font.widthOfTextAtSize(pageRef, 7) + 12;
        drawRect(MARGIN + 18 + sevW, y - 36, prW, 12, [VIOLET[0] * 0.2, VIOLET[1] * 0.2, VIOLET[2] * 0.2]);
        drawText(pageRef, 7, VIOLET_LIGHT, { x: MARGIN + 22 + sevW });
      }

      y -= cardHeight + 10;
    }
    moveDown(4);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  }

  // ═══ ALL FINDINGS ═══
  drawText(`DETAILED FINDINGS (${findings.length})`, 11, MUTED_TEXT, { bold: true });
  moveDown(10);

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    if (y < 150) newPage();

    const sevC = severityColor(f.severity);

    // Left colored border for the finding card
    const cardH = 80;
    drawRect(MARGIN, y, 3, cardH, sevC);

    const indent = 10;

    // Title
    drawText(`${i + 1}. ${f.title}`, 11, WHITE, { bold: true, x: MARGIN + indent });

    // Severity + amount + page badge
    const amtStr = f.amount != null ? `$${f.amount.toLocaleString()}` : "N/A";
    let badgeLine = `Severity: ${f.severity}  |  Amount: ${amtStr}  |  Category: ${f.category}`;
    drawText(badgeLine, 8, sevC, { x: MARGIN + indent });

    // Page reference badge
    if (f.page) {
      const pageRef = f.line_reference ? `📍 Page ${f.page}, Line ${f.line_reference}` : `📍 Page ${f.page}`;
      drawText(pageRef, 7, VIOLET_LIGHT, { x: MARGIN + indent });
    }

    moveDown(2);
    drawText(f.explanation, 8, LIGHT_TEXT, { x: MARGIN + indent, maxWidth: CONTENT_WIDTH - indent - 4 });

    if (f.evidence) {
      drawText(`Evidence: "${f.evidence}"`, 8, MUTED_TEXT, { italic: true, x: MARGIN + indent, maxWidth: CONTENT_WIDTH - indent - 4 });
    }
    moveDown(2);
    drawText(`→ ${f.recommended_action}`, 8, VIOLET_LIGHT, { x: MARGIN + indent, maxWidth: CONTENT_WIDTH - indent - 4 });

    if (f.negotiation_message) {
      drawText(`💬 "${f.negotiation_message}"`, 8, VIOLET, { italic: true, x: MARGIN + indent, maxWidth: CONTENT_WIDTH - indent - 4 });
    }

    y -= cardH + 6;
  }

  moveDown(4);
  drawLine(y, BORDER_SUBTLE, 0.5);
  moveDown(14);

  // ═══ NEGOTIATION CHECKLIST ═══
  if (clean_document_summary?.negotiation_opportunities?.length || clean_document_summary?.questions_to_ask?.length) {
    if (y < 180) newPage();

    drawText("NEGOTIATION CHECKLIST", 13, VIOLET, { bold: true });
    moveDown(8);

    const checklistItems: string[] = [];
    if (clean_document_summary.negotiation_opportunities?.length) {
      checklistItems.push(...clean_document_summary.negotiation_opportunities);
    }
    if (clean_document_summary.questions_to_ask?.length) {
      checklistItems.push(...clean_document_summary.questions_to_ask);
    }

    for (const item of checklistItems) {
      drawCheckbox(item, 9, LIGHT_TEXT, 4);
    }
    moveDown(6);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  }

  // ═══ COPY-PASTE NEGOTIATION MESSAGE ═══
  // Check for negotiation messages across all findings
  const allNegotiationMsgs = findings
    .filter(f => f.negotiation_message)
    .map(f => f.negotiation_message!);

  if (allNegotiationMsgs.length > 0 || clean_document_summary?.key_terms?.length) {
    if (y < 200) newPage();

    drawText("COPY & SEND THIS MESSAGE", 13, VIOLET, { bold: true });
    moveDown(8);

    // Bordered box
    const boxStartY = y + 8;
    const boxLines: string[] = [];
    boxLines.push("Subject: Regarding Fees & Charges on My Account");
    boxLines.push("");
    boxLines.push("Dear Customer Service Team,");
    boxLines.push("");
    boxLines.push("I've reviewed my recent document and identified several fees and charges that I would like clarified or adjusted:");
    boxLines.push("");

    for (const msg of allNegotiationMsgs.slice(0, 5)) {
      boxLines.push(`• ${msg}`);
    }

    if (clean_document_summary?.money_saving_suggestions?.length) {
      boxLines.push("");
      boxLines.push("I would appreciate it if you could:");
      for (const s of clean_document_summary.money_saving_suggestions) {
        boxLines.push(`• ${s}`);
      }
    }

    boxLines.push("");
    boxLines.push("Thank you for your attention to this matter. I look forward to your response.");
    boxLines.push("");
    boxLines.push("Best regards,");
    boxLines.push("[Your Name]");

    const boxHeight = boxLines.length * 12 + 24;

    // Draw background box
    drawRect(MARGIN, y + 8, CONTENT_WIDTH, boxHeight, [VIOLET[0] * 0.08, VIOLET[1] * 0.08, VIOLET[2] * 0.08]);

    // Draw border
    page.drawRectangle({
      x: MARGIN, y: y + 8 - boxHeight,
      width: CONTENT_WIDTH, height: boxHeight,
      borderColor: rgb(VIOLET[0] * 0.4, VIOLET[1] * 0.4, VIOLET[2] * 0.4),
      borderWidth: 1,
    });

    y -= 2;
    for (const line of boxLines) {
      if (y < MARGIN + 20) newPage();
      const lineColor: Color = line.startsWith("Subject:") || line.startsWith("Dear") || line.startsWith("Best") || line.startsWith("[Your")
        ? WHITE
        : LIGHT_TEXT;
      page.drawText(line, {
        x: MARGIN + 12,
        y,
        size: 8,
        font: line.startsWith("Subject:") || line.startsWith("Dear") ? fontBold : font,
        color: rgb(lineColor[0], lineColor[1], lineColor[2]),
      });
      y -= 10;
    }

    y -= 18;
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  }

  // ═══ MONEY SAVING SUGGESTIONS ═══
  if (clean_document_summary?.money_saving_suggestions?.length) {
    if (y < 150) newPage();
    drawText("MONEY-SAVING SUGGESTIONS", 13, GREEN, { bold: true });
    moveDown(6);
    for (const s of clean_document_summary.money_saving_suggestions) {
      drawBullet(s, 9, LIGHT_TEXT, 4);
    }
    moveDown(4);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  }

  // ═══ KEY TERMS ═══
  if (clean_document_summary?.key_terms?.length) {
    if (y < 150) newPage();
    drawText("KEY TERMS TO KNOW", 13, WHITE, { bold: true });
    moveDown(6);
    for (const term of clean_document_summary.key_terms) {
      drawBullet(term, 9, LIGHT_TEXT, 4);
    }
    moveDown(4);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(14);
  }

  // ═══ EDUCATION REFERENCES ═══
  // Build education references from findings explanations
  const eduRefs = findings
    .filter(f => f.explanation && f.explanation.length > 30)
    .slice(0, 5)
    .map(f => ({
      topic: f.title,
      explanation: f.explanation,
    }));

  if (eduRefs.length > 0) {
    if (y < 180) newPage();
    drawText("CONSUMER EDUCATION", 13, VIOLET, { bold: true });
    moveDown(4);
    drawText("Understanding the fees identified in your document:", 9, MUTED_TEXT);
    moveDown(8);

    for (let i = 0; i < eduRefs.length; i++) {
      const ref = eduRefs[i];
      if (y < MARGIN + 40) newPage();
      drawText(`${i + 1}. ${ref.topic}`, 9, WHITE, { bold: true });
      drawText(ref.explanation, 8, LIGHT_TEXT, { maxWidth: CONTENT_WIDTH - 8 });
      moveDown(4);
    }

    moveDown(4);
    drawLine(y, BORDER_SUBTLE, 0.5);
    moveDown(10);
  }

  // ═══ FOOTER ═══
  moveDown(14);
  drawLine(y, VIOLET, 1);
  moveDown(12);
  drawText("Generated by HiddenFeeAI", 8, MUTED_TEXT, { align: "center" });
  drawText("Private AI Analysis — Document not stored", 8, MUTED_TEXT, { align: "center" });
  drawText("This report is for educational purposes only. Not legal advice.", 8, MUTED_TEXT, { align: "center" });

  return pdfDoc.save();
}