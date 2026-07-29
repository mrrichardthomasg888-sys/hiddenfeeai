import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import type { AuditReport, Finding } from "../types.js";

const PRIMARY_COLOR = rgb(139 / 255, 92 / 255, 246 / 255); // text-violet-500
const TEXT_COLOR = rgb(224 / 255, 231 / 255, 255 / 255); // text-slate-200
const BG_COLOR = rgb(17 / 255, 24 / 255, 39 / 255); // bg-gray-900
const BORDER_COLOR = rgb(55 / 255, 65 / 255, 81 / 255); // border-gray-700

const MARGIN = 50;
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_H1 = 24;
const FONT_SIZE_H2 = 16;
const LINE_HEIGHT = 1.4;

class PDFBuilder {
  doc: PDFDocument;
  font: PDFFont;
  boldFont: PDFFont;
  y: number;
  page: any;

  constructor(doc: PDFDocument, font: PDFFont, boldFont: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.boldFont = boldFont;
    this.page = this.doc.addPage();
    this.y = this.page.getHeight() - MARGIN;
    this.page.drawRectangle({
      x: 0,
      y: 0,
      width: this.page.getWidth(),
      height: this.page.getHeight(),
      color: BG_COLOR,
    });
  }

  async addPageIfNeeded(neededHeight: number) {
    if (this.y - neededHeight < MARGIN) {
      this.addFooter();
      this.page = this.doc.addPage();
      this.y = this.page.getHeight() - MARGIN;
      this.page.drawRectangle({
        x: 0,
        y: 0,
        width: this.page.getWidth(),
        height: this.page.getHeight(),
        color: BG_COLOR,
      });
    }
  }

  addFooter() {
    const pageNumber = this.doc.getPageCount();
    this.page.drawText(`HiddenFeeAI Report | Page ${pageNumber}`, {
      x: MARGIN,
      y: MARGIN / 2,
      font: this.font,
      size: 8,
      color: BORDER_COLOR,
    });
  }

  async drawH1(text: string) {
    const height = FONT_SIZE_H1 * LINE_HEIGHT;
    await this.addPageIfNeeded(height);
    this.page.drawText(text, {
      x: MARGIN,
      y: this.y,
      font: this.boldFont,
      size: FONT_SIZE_H1,
      color: PRIMARY_COLOR,
    });
    this.y -= height;
  }

  async drawH2(text: string) {
    const height = FONT_SIZE_H2 * LINE_HEIGHT * 1.5;
    await this.addPageIfNeeded(height);
    this.y -= FONT_SIZE_H2 * 0.5;
    this.page.drawText(text, {
      x: MARGIN,
      y: this.y,
      font: this.boldFont,
      size: FONT_SIZE_H2,
      color: TEXT_COLOR,
    });
    this.y -= height;
  }

  async drawParagraph(text: string) {
    const maxWidth = this.page.getWidth() - MARGIN * 2;
    const lines = this.wrapText(text, maxWidth);
    const height = lines.length * FONT_SIZE_NORMAL * LINE_HEIGHT;
    await this.addPageIfNeeded(height);

    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN,
        y: this.y,
        font: this.font,
        size: FONT_SIZE_NORMAL,
        color: TEXT_COLOR,
        lineHeight: FONT_SIZE_NORMAL * LINE_HEIGHT,
      });
      this.y -= FONT_SIZE_NORMAL * LINE_HEIGHT;
    }
  }

  wrapText(text: string, maxWidth: number): string[] {
    const words = text.replace(/\n/g, ' \n ').split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      if (word === '\n') {
        lines.push(currentLine);
        currentLine = '';
        continue;
      }
      const testLine = currentLine.length > 0 ? `${currentLine} ${word}` : word;
      const width = this.font.widthOfTextAtSize(testLine, FONT_SIZE_NORMAL);
      if (width < maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }
}

export async function generatePdf(report: AuditReport, title: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const builder = new PDFBuilder(doc, font, boldFont);

  await builder.drawH1(title);
  await builder.drawParagraph(`This report details ${report.findings.length} potential issues found in your document, with an estimated risk score of ${report.risk_score}/100.`);

  await builder.drawH2("Findings");

  for (const finding of report.findings) {
    const findingText = `[${finding.severity.toUpperCase()}] ${finding.title}: ${finding.summary}\nEvidence: ${finding.evidence}`;
    await builder.drawParagraph(findingText);
    builder.y -= FONT_SIZE_NORMAL; // Add spacing between findings
  }

  builder.addFooter();

  return doc.save();
}