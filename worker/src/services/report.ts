import type { AuditReport } from "../types.js";
import { PDFDocument, rgb, StandardFonts, type RGB } from "pdf-lib";

// Helper type for color
type Color = [number, number, number];

function hexToRgb(hex: string): Color {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

const VIOLET: Color = [0.545, 0.361, 0.965];
const DARK_BG: Color = [0.02, 0.02, 0.1];
const LIGHT_TEXT: Color = [0.9, 0.9, 0.95];
const MUTED_TEXT: Color = [0.5, 0.5, 0.6];
const GREEN: Color = [0.063, 0.725, 0.51];
const RED: Color = [0.863, 0.149, 0.149];
const WARN: Color = [0.961, 0.62, 0.043];
const WHITE: Color = [1, 1, 1];
const HEADER_BG: Color = [0.02, 0.02, 0.1];

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 60;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Generates a PDF buffer for an audit report using pdf-lib (Worker-compatible).
 */
export async function generatePdf(report: AuditReport): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  const leftMargin = MARGIN;
  const maxLineWidth = CONTENT_WIDTH - 20;

  function wrapText(text: string, size: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxLineWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawText(text: string, size: number, color: Color, options: { bold?: boolean; italic?: boolean; align?: "left" | "right" | "center"; indent?: number; x?: number } = {}) {
    const f = options.bold ? fontBold : options.italic ? fontOblique : font;
    const indent = options.indent ?? 0;
    const x = options.x ?? leftMargin + indent;
    const lines = wrapText(text, size);

    for (const line of lines) {
      if (y < MARGIN + 20) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }

      let drawX = x;
      if (options.align === "right") {
        drawX = PAGE_WIDTH - MARGIN - font.widthOfTextAtSize(line, size);
      } else if (options.align === "center") {
        drawX = (PAGE_WIDTH - font.widthOfTextAtSize(line, size)) / 2;
      }

      page.drawText(line, {
        x: drawX,
        y: y,
        size,
        font: f,
        color: rgb(color[0], color[1], color[2]),
      });
      y -= size * 1.4;
    }
  }

  function drawBullet(text: string, size: number, color: Color, indent: number) {
    drawText(`• ${text}`, size, color, { indent });
  }

  function moveDown(amount: number) {
    y -= amount;
  }

  const { document_meta, risk_score, risk_level, financial_impact, potential_savings, findings, clean_document_summary } = report;
  const formattedDate = new Date(document_meta.analysis_date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  // --- Header ---
  drawText("HiddenFeeAI", 22, VIOLET, { bold: true });
  drawText("Audit Report", 13, MUTED_TEXT);
  moveDown(10);
  drawText(`${document_meta.document_type} Audit`, 18, WHITE, { bold: true });
  drawText(`Issuer: ${document_meta.issuer ?? "N/A"}  |  Report ID: ${document_meta.report_id.slice(0, 8)}  |  ${formattedDate}`, 9, MUTED_TEXT);
  moveDown(20);

  // --- Risk Assessment ---
  drawText("Risk Assessment", 14, WHITE, { bold: true });
  moveDown(8);
  drawText(`Score: ${risk_score}/100`, 11, LIGHT_TEXT);
  const levelColor = risk_level === "High" ? RED : risk_level === "Elevated" ? WARN : GREEN;
  drawText(`Level: ${risk_level}`, 11, levelColor);
  drawText(`Potential Savings: $${potential_savings.toLocaleString()}`, 11, GREEN, { bold: true });
  moveDown(20);

  // --- Financial Impact ---
  drawText("Financial Impact", 14, WHITE, { bold: true });
  moveDown(8);

  // Draw table header
  page.drawRectangle({
    x: leftMargin,
    y: y - 2,
    width: CONTENT_WIDTH,
    height: 18,
    color: rgb(HEADER_BG[0], HEADER_BG[1], HEADER_BG[2]),
  });

  const colW = Math.round(CONTENT_WIDTH * 0.45);
  const colW2 = Math.round(CONTENT_WIDTH * 0.30);
  const colW3 = CONTENT_WIDTH - colW - colW2;

  drawText("Category", 10, LIGHT_TEXT, { bold: true, x: leftMargin + 8, indent: 0 });
  drawText("Amount", 10, LIGHT_TEXT, { bold: true, x: leftMargin + colW, indent: 0, align: "right" });
  drawText("Status", 10, LIGHT_TEXT, { bold: true, x: leftMargin + colW + colW2, indent: 0, align: "right" });
  moveDown(22);

  function drawTableRow(label: string, amount: string, status: string, labelColor: Color, amtColor: Color, statusColor: Color, bold = false) {
    drawText(label, 10, labelColor, { bold, x: leftMargin + 8 });
    // Manually draw amount and status at their column positions
    const amtWidth = font.widthOfTextAtSize(amount, 10);
    page.drawText(amount, {
      x: leftMargin + colW + (colW2 - amtWidth - 4),
      y: y,
      size: 10,
      font: font,
      color: rgb(amtColor[0], amtColor[1], amtColor[2]),
    });
    const stWidth = font.widthOfTextAtSize(status, 10);
    page.drawText(status, {
      x: leftMargin + colW + colW2 + (colW3 - stWidth - 8),
      y: y,
      size: 10,
      font: bold ? fontBold : font,
      color: rgb(statusColor[0], statusColor[1], statusColor[2]),
    });
    moveDown(16);
  }

  drawTableRow("Original Total", `$${financial_impact.original_total.toLocaleString()}`, "Billed", LIGHT_TEXT, LIGHT_TEXT, MUTED_TEXT);
  drawTableRow("Questionable Charges", `$${financial_impact.questionable_charges_total.toLocaleString()}`, "Flagged", RED, RED, RED);
  drawTableRow("Corrected Total", `$${financial_impact.corrected_total.toLocaleString()}`, "Recommended", GREEN, GREEN, GREEN, true);
  moveDown(16);

  // --- Findings ---
  drawText(`Findings (${findings.length})`, 14, WHITE, { bold: true });
  moveDown(10);

  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const isHighRisk = f.severity === "Critical" || f.severity === "High";
    const sevColor = isHighRisk ? RED : WARN;
    const amountStr = f.amount != null ? `$${f.amount.toLocaleString()}` : "N/A";

    if (y < 120) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    drawText(`${i + 1}. ${f.title}`, 12, WHITE, { bold: true });
    drawText(`Severity: ${f.severity}  |  Amount: ${amountStr}  |  Category: ${f.category}`, 9, sevColor);
    drawText(f.explanation, 9, LIGHT_TEXT, { indent: 10 });
    if (f.evidence) {
      drawText(`Evidence: "${f.evidence}"`, 9, MUTED_TEXT, { indent: 10 });
    }
    drawText(f.recommended_action, 9, VIOLET, { indent: 10 });

    // Negotiation per finding
    if (f.negotiation_message) {
      drawText(`Negotiation Tip: "${f.negotiation_message}"`, 9, VIOLET, { italic: true, indent: 10 });
    }
    if (f.negotiation_strategy) {
      moveDown(4);
      drawText("Negotiation Assistant", 10, VIOLET, { bold: true, indent: 10 });
      const diffColor = f.negotiation_strategy.difficulty === "Easy" ? GREEN : f.negotiation_strategy.difficulty === "Medium" ? WARN : RED;
      drawText(`Difficulty: ${f.negotiation_strategy.difficulty}`, 9, diffColor, { indent: 10 });
      if (f.negotiation_strategy.steps.length > 0) {
        drawText("Steps:", 9, MUTED_TEXT, { bold: true, indent: 10 });
        for (const step of f.negotiation_strategy.steps) {
          drawBullet(step, 9, LIGHT_TEXT, 15);
        }
      }
      if (f.negotiation_strategy.script) {
        drawText("Script:", 9, MUTED_TEXT, { bold: true, indent: 10 });
        drawText(f.negotiation_strategy.script, 9, VIOLET, { italic: true, indent: 15 });
      }
    }

    moveDown(14);
  }

  // --- Clean Document Summary / Negotiation Assistant ---
  if (clean_document_summary) {
    if (y < 200) {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }

    moveDown(10);
    drawText("Negotiation Assistant", 16, VIOLET, { bold: true, align: "center" });
    moveDown(10);

    if (clean_document_summary.key_terms.length > 0) {
      drawText("Key Terms to Know", 14, WHITE, { bold: true });
      for (const term of clean_document_summary.key_terms) drawBullet(term, 9, LIGHT_TEXT, 0);
      moveDown(8);
    }

    if (clean_document_summary.negotiation_opportunities.length > 0) {
      drawText("Negotiation Opportunities", 14, WHITE, { bold: true });
      for (const opp of clean_document_summary.negotiation_opportunities) drawBullet(opp, 9, LIGHT_TEXT, 0);
      moveDown(8);
    }

    if (clean_document_summary.questions_to_ask.length > 0) {
      drawText("Questions to Ask Your Provider", 14, WHITE, { bold: true });
      for (const q of clean_document_summary.questions_to_ask) drawBullet(q, 9, VIOLET, 0);
      moveDown(8);
    }

    if (clean_document_summary.money_saving_suggestions.length > 0) {
      drawText("Money-Saving Suggestions", 14, WHITE, { bold: true });
      for (const s of clean_document_summary.money_saving_suggestions) drawBullet(s, 9, GREEN, 0);
    }
  }

  // --- Footer ---
  moveDown(20);
  drawText("Generated by HiddenFeeAI", 8, MUTED_TEXT, { align: "center" });
  drawText("Private AI Analysis - Document not stored", 8, MUTED_TEXT, { align: "center" });

  return pdfDoc.save();
}