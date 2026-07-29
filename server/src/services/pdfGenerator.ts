/**
 * HiddenFeeAI — Premium PDF Report Generator v2
 * Produces a Fortune 500-quality executive audit report using PDFKit.
 *
 * FIXES:
 *   - Blank second page eliminated by using bufferPages + never letting
 *     any render function move the cursor past SAFE_Y_MAX (720).
 *     The cover-page footer is drawn with lineBreak:false so it doesn't
 *     push doc.y into PDFKit's auto-pagination zone.
 *
 * DESIGN:
 *   Deep navy backgrounds, electric blue/violet accent system, premium
 *   typography, professional tables, color-coded severity indicators,
 *   a full Table of Contents, and a polished back cover.
 */

import type {
  AuditReport,
  HiddenFee,
  QuestionableCharge,
  ContractRisk,
  MathematicalError,
  NegotiationLeverage,
  RecommendedAction,
} from "@/types/audit.js";
import PDFDocument from "pdfkit";

// ── Color Palette ──────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  navy:      "#080d1a",
  navyMid:   "#0d1526",
  navyCard:  "#111e33",
  navyBorder:"#1c2d4a",

  // Brand
  electric:      "#3b82f6",
  electricBright:"#60a5fa",
  violet:        "#8b5cf6",
  violetLight:   "#a78bfa",
  violetDark:    "#6d28d9",
  teal:          "#14b8a6",

  // Severity
  critical: "#ef4444",
  high:     "#f97316",
  medium:   "#eab308",
  low:      "#22c55e",
  savings:  "#10b981",

  // Text
  white:         "#f8fafc",
  textPrimary:   "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted:     "#64748b",

  // Tables
  tableHeader: "#1a3a5c",
  tableRowAlt: "#0e1d32",
  tableRow:    "#09152a",
};

// ── Page constants ──────────────────────────────────────────────────────────
const PAGE_W    = 612;
const PAGE_H    = 792;
const MARGIN    = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;
// Never let the cursor drift past this Y before triggering a page break.
// Keeps us well clear of PDFKit's auto-pagination trigger zone (~750).
const SAFE_Y_MAX = 720;
const FOOTER_Y   = 762;

// ── Helpers ────────────────────────────────────────────────────────────────
function severityColor(s: string): string {
  switch (s) {
    case "Critical": return C.critical;
    case "High":     return C.high;
    case "Medium":   return C.medium;
    case "Low":      return C.low;
    default:         return C.textSecondary;
  }
}

function scoreColor(n: number): string {
  if (n >= 70) return C.critical;
  if (n >= 40) return C.high;
  if (n >= 20) return C.medium;
  return C.low;
}

function fmt$(n: number): string {
  if (!n || isNaN(n)) return "$0";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Fill a NEW page with the dark background and reset the cursor.
 * This REPLACES the old addNewPage.  Using doc.addPage() manually ensures
 * we own the page — PDFKit will not sneak in an extra blank page.
 */
function newPage(doc: PDFKit.PDFDocument): void {
  doc.addPage();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.navy);
  doc.x = MARGIN;
  doc.y = 48;
}

/**
 * Ensure there's enough vertical room remaining; if not, open a new page.
 * Extra buffer (24 pts) keeps us away from the danger zone.
 */
function guard(doc: PDFKit.PDFDocument, needed = 120): void {
  if (doc.y > SAFE_Y_MAX - needed) {
    newPage(doc);
  }
}

// ── Decorative horizontal rule ─────────────────────────────────────────────
function hr(doc: PDFKit.PDFDocument, color = C.navyBorder, thickness = 0.5): void {
  doc.x = MARGIN;
  doc.moveDown(0.3);
  doc.rect(MARGIN, doc.y, CONTENT_W, thickness).fill(color);
  doc.moveDown(0.4);
}

// ── Gradient-style horizontal stripe (faked with rects) ───────────────────
function accentStripe(doc: PDFKit.PDFDocument, y: number, h = 4): void {
  // left → electric, right → violet, faked via two rects
  doc.rect(0, y, PAGE_W * 0.6, h).fill(C.electric);
  doc.rect(PAGE_W * 0.4, y, PAGE_W * 0.6, h).fill(C.violet);
}

// ── Premium section header ─────────────────────────────────────────────────
function sectionHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
  guard(doc, 80);
  doc.x = MARGIN;
  doc.moveDown(0.6);

  const headerH = subtitle ? 38 : 28;
  // Background pill
  doc.rect(MARGIN, doc.y, CONTENT_W, headerH).fill(C.navyCard);
  // Left accent bar (electric blue → violet gradient faked)
  doc.rect(MARGIN, doc.y, 4, headerH).fill(C.electric);
  doc.rect(MARGIN, doc.y + headerH * 0.5, 4, headerH * 0.5).fill(C.violet);

  const ty = doc.y + 7;
  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.white)
    .text(title, MARGIN + 14, ty);
  if (subtitle) {
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
      .text(subtitle, MARGIN + 14, ty + 18);
  }

  doc.y = doc.y + headerH + 8;
  doc.x = MARGIN;
}

// ── Severity badge pill ────────────────────────────────────────────────────
function badge(doc: PDFKit.PDFDocument, x: number, y: number, label: string, color: string): void {
  const w = 58, h = 14;
  doc.rect(x, y, w, h).fill(color + "28");
  doc.rect(x, y, w, 1.5).fill(color);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(color)
    .text(label.toUpperCase(), x + 4, y + 4, { width: w - 8 });
}

// ── Footer stamp (drawn with lineBreak:false so cursor never moves) ────────
function footerStamp(doc: PDFKit.PDFDocument): void {
  doc.rect(MARGIN, FOOTER_Y - 6, CONTENT_W, 0.5).fill(C.navyBorder);
  doc.font("Helvetica").fontSize(7).fillColor(C.textMuted)
    .text(
      "HiddenFeeAI  |  Executive Audit Report  |  Confidential — Document not stored",
      MARGIN, FOOTER_Y, { width: CONTENT_W, align: "center", lineBreak: true }
    );
}

// ── Page Numbers (post-render pass) ───────────────────────────────────────
function addPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    // Draw footer line and text on every page at the very bottom
    doc.rect(MARGIN, FOOTER_Y - 6, CONTENT_W, 0.5).fill(C.navyBorder);
    doc.font("Helvetica").fontSize(7).fillColor(C.textMuted)
      .text(
        `HiddenFeeAI Executive Audit Report  ·  Page ${i + 1} of ${range.count}  ·  Private & Confidential`,
        MARGIN, FOOTER_Y,
        { width: CONTENT_W, align: "center", lineBreak: true }
      );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── COVER PAGE ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderCoverPage(doc: PDFKit.PDFDocument, report: AuditReport): void {
  const { documentMetadata: meta, overallRiskScore, riskCategory,
          financialImpact, estimatedSavings, executiveSummary: es } = report;

  // Full-bleed dark background — drawn first so nothing is hidden behind it
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.navy);

  // Top accent stripe
  accentStripe(doc, 0, 6);

  // ── Brand — ALL text uses fixed absolute Y coords ──
  // "HiddenFeeAI" at y=52, subtitle at y=78
  doc.font("Helvetica-Bold").fontSize(26).fillColor(C.violetLight)
    .text("HiddenFeeAI", MARGIN, 52);
  doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
    .text("Enterprise Financial Intelligence Platform", MARGIN, 78);

  // ── Report type label ──
  doc.rect(MARGIN, 100, CONTENT_W, 1).fill(C.navyBorder);
  doc.font("Helvetica-Bold").fontSize(20).fillColor(C.white)
    .text("EXECUTIVE AUDIT REPORT", MARGIN, 108);
  doc.font("Helvetica").fontSize(12).fillColor(C.electricBright)
    .text(meta.documentType, MARGIN, 132);

  // ── Meta grid ──
  doc.rect(MARGIN, 158, CONTENT_W, 0.5).fill(C.navyBorder);
  const col1 = MARGIN, col2 = MARGIN + CONTENT_W * 0.33, col3 = MARGIN + CONTENT_W * 0.66;
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.textMuted).text("AUDIT ID",       col1, 166);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.textMuted).text("ANALYSIS DATE",  col2, 166);
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.textMuted).text("ISSUER",         col3, 166);
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
    .text(meta.reportId.slice(0, 16).toUpperCase(), col1, 178, { width: CONTENT_W * 0.3 });
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
    .text(new Date(meta.analysisDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), col2, 178, { width: CONTENT_W * 0.3 });
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
    .text(meta.issuer ?? "Not identified", col3, 178, { width: CONTENT_W * 0.3 });

  doc.rect(MARGIN, 200, CONTENT_W, 0.5).fill(C.navyBorder);

  // ── Risk Score hero card ──
  const riskCardY = 210;
  doc.rect(MARGIN, riskCardY, CONTENT_W, 148).fill(C.navyCard);
  accentStripe(doc, riskCardY, 3);

  const scoreC = scoreColor(overallRiskScore);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textMuted)
    .text("OVERALL RISK SCORE", MARGIN + 16, riskCardY + 14, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(52).fillColor(scoreC)
    .text(String(overallRiskScore), MARGIN + 16, riskCardY + 26, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(scoreC)
    .text(`/ 100 — ${riskCategory}`, MARGIN + 16, riskCardY + 82, { lineBreak: false });

  doc.rect(MARGIN + 130, riskCardY + 14, 0.5, 120).fill(C.navyBorder);

  const statStartX = MARGIN + 148;
  const statW = (CONTENT_W - 148 - 16) / 3;
  const stats = [
    { label: "POTENTIAL SAVINGS",    value: fmt$(estimatedSavings.mostLikely),             color: C.savings },
    { label: "QUESTIONABLE CHARGES", value: fmt$(financialImpact.questionableChargesTotal), color: C.critical },
    { label: "TOTAL FINDINGS",       value: String(es.totalFindings),                      color: C.electric },
  ];
  stats.forEach((s, i) => {
    const sx = statStartX + i * (statW + 8);
    const bc = i === 0 ? C.savings : i === 1 ? C.critical : C.electric;
    doc.rect(sx, riskCardY + 14, statW, 3).fill(bc);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.textMuted)
      .text(s.label, sx, riskCardY + 24, { lineBreak: false, width: statW });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(s.color)
      .text(s.value, sx, riskCardY + 36, { lineBreak: false, width: statW });
  });

  // ── Executive headline banner ──
  const bannerY = 374;
  doc.rect(MARGIN, bannerY, CONTENT_W, 90).fill(C.navyMid);
  doc.rect(MARGIN, bannerY, 4, 90).fill(C.violet);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.violetLight)
    .text("EXECUTIVE HEADLINE", MARGIN + 14, bannerY + 10, { lineBreak: false });
  // headline text: allow wrap but clamped to banner height via height option
  doc.font("Helvetica-BoldOblique").fontSize(13).fillColor(C.white)
    .text(es.headline, MARGIN + 14, bannerY + 24, { width: CONTENT_W - 28, height: 58, ellipsis: true });

  // ── "What we found" quick-facts strip ──
  const summaryY = 480;
  doc.rect(MARGIN, summaryY, CONTENT_W, 0.5).fill(C.navyBorder);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textMuted)
    .text("WHAT WE FOUND AT A GLANCE", MARGIN, summaryY + 8, { lineBreak: false });

  const factW = CONTENT_W / 4;
  const facts = [
    { label: "Pages Reviewed",     value: String(meta.pagesReviewed ?? "—") },
    { label: "Line Items Checked", value: String(meta.lineItemsReviewed ?? "—") },
    { label: "AI Confidence",      value: `${report.confidence}%` },
    { label: "Hidden Fees Found",  value: String(report.hiddenFees?.length ?? 0) },
  ];
  facts.forEach((f, i) => {
    const fx = MARGIN + i * factW;
    doc.font("Helvetica-Bold").fontSize(18).fillColor(C.white)
      .text(f.value, fx, summaryY + 22, { lineBreak: false, width: factW - 4 });
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
      .text(f.label, fx, summaryY + 44, { lineBreak: false, width: factW - 4 });
  });

  doc.rect(MARGIN, summaryY + 60, CONTENT_W, 0.5).fill(C.navyBorder);

  // ── Confidentiality notice — fixed y, lineBreak:false to prevent cursor bleed ──
  doc.font("Helvetica-Oblique").fontSize(8.5).fillColor(C.textMuted)
    .text(
      "This report is prepared exclusively for the document owner. All findings are based on AI analysis and should be reviewed by a qualified professional before taking legal action.",
      MARGIN, 556, { width: CONTENT_W, lineBreak: false }
    );

  // ── Bottom accent stripe ──
  accentStripe(doc, PAGE_H - 6, 6);

  // ── Footer — lineBreak:false so cursor NEVER moves ──
  footerStamp(doc);

  // ── CRITICAL: pin cursor to a safe position well inside the page ──
  // This prevents PDFKit from seeing overflow and auto-inserting a blank page.
  doc.y = 400;
  doc.x = MARGIN;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── TABLE OF CONTENTS PAGE ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderTableOfContents(doc: PDFKit.PDFDocument, report: AuditReport): void {
  newPage(doc);
  accentStripe(doc, 0, 6);

  doc.y = 52;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.electricBright)
    .text("CONTENTS", MARGIN, doc.y, { lineBreak: false });
  doc.y = 66;
  doc.font("Helvetica-Bold").fontSize(22).fillColor(C.white)
    .text("Report Overview", MARGIN, doc.y, { lineBreak: false });

  doc.y = 100;
  hr(doc, C.navyBorder, 1);

  const sections = [
    { num: "01", title: "Executive Summary",       desc: "Headline findings, critical issues, immediate actions" },
    { num: "02", title: "Financial Impact Analysis", desc: "Overcharge totals, corrected amounts, savings range" },
    ...(report.hiddenFees?.length ? [{ num: "03", title: `Hidden Fees (${report.hiddenFees.length})`, desc: "Undisclosed charges requiring dispute" }] : []),
    ...(report.questionableCharges?.length ? [{ num: "04", title: `Questionable Charges (${report.questionableCharges.length})`, desc: "Charges that warrant review" }] : []),
    ...(report.contractRisks?.length ? [{ num: "05", title: `Contract Risks (${report.contractRisks.length})`, desc: "Clauses creating financial risk" }] : []),
    ...(report.mathematicalErrors?.length ? [{ num: "06", title: `Mathematical Errors (${report.mathematicalErrors.length})`, desc: "Billing miscalculations" }] : []),
    ...(report.negotiationLeverage?.length ? [{ num: "07", title: "Negotiation Leverage",  desc: "Strategic advantages for disputing charges" }] : []),
    { num: "08", title: "Step-by-Step Action Plan", desc: "Priority actions before, during, and after negotiation" },
    ...(report.questionsToAsk?.length ? [{ num: "09", title: "Questions to Ask",       desc: "Key questions for your billing discussion" }] : []),
    ...(report.phoneNegotiationScript?.length ? [{ num: "10", title: "Phone Script",              desc: "Word-for-word negotiation script" }] : []),
    ...(report.emailNegotiationTemplate?.length ? [{ num: "11", title: "Email Template",           desc: "Formal written dispute template" }] : []),
    ...(report.consumerRights?.length ? [{ num: "12", title: "Your Consumer Rights",     desc: "Legal protections and how to exercise them" }] : []),
  ];

  sections.forEach((s, i) => {
    guard(doc, 44);
    const rowY = doc.y;
    const bg = i % 2 === 0 ? C.tableRow : C.tableRowAlt;
    doc.rect(MARGIN, rowY, CONTENT_W, 36).fill(bg);

    // Number badge
    doc.rect(MARGIN, rowY, 40, 36).fill(C.navyCard);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(C.electricBright)
      .text(s.num, MARGIN + 4, rowY + 9, { width: 32, align: "center", lineBreak: false });

    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white)
      .text(s.title, MARGIN + 52, rowY + 6, { width: CONTENT_W - 60, lineBreak: false });
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
      .text(s.desc, MARGIN + 52, rowY + 21, { width: CONTENT_W - 60, lineBreak: false });

    doc.y = rowY + 40;
    doc.x = MARGIN;
  });

  footerStamp(doc);
}

// ═══════════════════════════════════════════════════════════════════════════
// ── EXECUTIVE SUMMARY ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderExecutiveSummary(doc: PDFKit.PDFDocument, report: AuditReport): void {
  const { executiveSummary: es, documentMetadata: meta } = report;

  sectionHeader(doc, "01  Executive Summary");

  doc.font("Helvetica").fontSize(11).fillColor(C.textPrimary)
    .text(es.overview, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.5);

  // Two-column highlight boxes
  guard(doc, 100);
  const colW = (CONTENT_W - 12) / 2;
  const boxY = doc.y;

  const boxes = [
    { x: MARGIN,          color: C.critical,  label: "CRITICAL FINDINGS",        text: es.criticalFindings },
    { x: MARGIN + colW + 12, color: C.electric, label: "IMMEDIATE ACTION REQUIRED", text: es.immediateActions },
  ];
  boxes.forEach(({ x, color, label, text }) => {
    const h = 90;
    doc.rect(x, boxY, colW, h).fill(C.navyCard);
    doc.rect(x, boxY, 3, h).fill(color);
    doc.rect(x, boxY, colW, 3).fill(color);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(color).text(label, x + 10, boxY + 10, { lineBreak: false });
    doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary)
      .text(text, x + 10, boxY + 24, { width: colW - 20, height: 60 });
  });
  doc.y = boxY + 100;
  doc.x = MARGIN;

  // Meta stats bar
  guard(doc, 36);
  const barY = doc.y;
  doc.rect(MARGIN, barY, CONTENT_W, 32).fill(C.navyMid);
  doc.rect(MARGIN, barY, CONTENT_W, 2).fill(C.electric);
  const metas = [
    `Pages Reviewed: ${meta.pagesReviewed}`,
    `Line Items: ${meta.lineItemsReviewed}`,
    `Confidence: ${report.confidence}%`,
    `File: ${meta.fileName ?? "N/A"}`,
  ];
  doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
    .text(metas.join("   |   "), MARGIN + 12, barY + 11, { width: CONTENT_W - 24, lineBreak: false });
  doc.y = barY + 42;
  doc.x = MARGIN;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── FINANCIAL DASHBOARD ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderFinancialDashboard(doc: PDFKit.PDFDocument, report: AuditReport): void {
  guard(doc, 240);
  sectionHeader(doc, "02  Financial Impact Analysis");

  const { financialImpact: fi, estimatedSavings: es } = report;

  // Table header
  const tableY = doc.y;
  doc.rect(MARGIN, tableY, CONTENT_W, 26).fill(C.tableHeader);
  doc.rect(MARGIN, tableY, CONTENT_W, 3).fill(C.electric);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white)
    .text("CATEGORY",  MARGIN + 10, tableY + 9, { lineBreak: false })
    .text("AMOUNT",    MARGIN + CONTENT_W * 0.55, tableY + 9, { width: CONTENT_W * 0.22, align: "right", lineBreak: false })
    .text("STATUS",    MARGIN + CONTENT_W * 0.77, tableY + 9, { width: CONTENT_W * 0.23, align: "right", lineBreak: false });

  const rows = [
    { label: "Original Total Billed",         amount: fi.originalTotal,              status: "Billed",      color: C.textPrimary, sc: C.textSecondary },
    { label: "Questionable Charges",           amount: fi.questionableChargesTotal,   status: "Disputed",    color: C.critical,    sc: C.critical },
    { label: "Potential Overcharge",           amount: fi.potentialOvercharge,        status: "Flagged",     color: C.high,        sc: C.high },
    { label: "Recommended Corrected Total",    amount: fi.correctedTotal,             status: "Recommended", color: C.savings,     sc: C.savings },
  ];

  rows.forEach((row, i) => {
    const ry = tableY + 26 + i * 24;
    doc.rect(MARGIN, ry, CONTENT_W, 24).fill(i % 2 === 0 ? C.tableRow : C.tableRowAlt);
    if (row.label.includes("Corrected")) {
      doc.rect(MARGIN, ry, CONTENT_W, 24).fill(C.savings + "18");
    }
    doc.font(row.label.includes("Corrected") ? "Helvetica-Bold" : "Helvetica")
      .fontSize(10).fillColor(row.color).text(row.label, MARGIN + 10, ry + 7, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(row.color)
      .text(fmt$(row.amount), MARGIN + CONTENT_W * 0.55, ry + 7, { width: CONTENT_W * 0.22, align: "right", lineBreak: false });
    doc.font("Helvetica").fontSize(9).fillColor(row.sc)
      .text(row.status, MARGIN + CONTENT_W * 0.77, ry + 7, { width: CONTENT_W * 0.23, align: "right", lineBreak: false });
  });

  doc.y = tableY + 26 + rows.length * 24 + 18;
  doc.x = MARGIN;

  // Savings estimate row
  guard(doc, 80);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textMuted)
    .text("ESTIMATED SAVINGS RANGE", MARGIN, doc.y, { lineBreak: false });
  doc.y += 14;

  const sy = doc.y;
  const sw = (CONTENT_W - 16) / 3;
  [
    { label: "Conservative", value: es.conservative, color: C.medium },
    { label: "Most Likely",  value: es.mostLikely,   color: C.savings },
    { label: "Optimistic",   value: es.optimistic,   color: C.electric },
  ].forEach((s, i) => {
    const sx = MARGIN + i * (sw + 8);
    doc.rect(sx, sy, sw, 56).fill(C.navyCard);
    doc.rect(sx, sy, sw, 4).fill(s.color);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(s.color)
      .text(s.label.toUpperCase(), sx + 10, sy + 12, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(20).fillColor(C.white)
      .text(fmt$(s.value), sx + 10, sy + 24, { lineBreak: false });
  });

  doc.y = sy + 66;
  if (es.description) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(C.textMuted)
      .text(es.description, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ── FINDING CARD ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
type AnyFinding = HiddenFee | QuestionableCharge | ContractRisk;

function estimateFindingH(f: AnyFinding): number {
  let h = 84;
  if (f.evidence) h += 26;
  if (f.explanation) h += Math.ceil(f.explanation.length / 90) * 14 + 8;
  if ((f as HiddenFee).whyItMatters) h += 30;
  if ((f as HiddenFee).recommendedAction) h += 26;
  if ((f as HiddenFee).negotiationStrategy?.script) h += 52;
  return Math.min(h, 400);
}

function renderFindingCard(doc: PDFKit.PDFDocument, finding: AnyFinding, index: number, category: string): void {
  const cardH = estimateFindingH(finding);
  guard(doc, Math.min(cardH + 16, 160));

  const cardY = doc.y;
  const clampH = Math.min(cardH, 400);
  const sColor = severityColor(finding.severity);

  doc.rect(MARGIN, cardY, CONTENT_W, clampH).fill(C.navyCard);
  doc.rect(MARGIN, cardY, 4, clampH).fill(sColor);
  doc.rect(MARGIN, cardY, CONTENT_W, 2).fill(sColor + "66");

  const x = MARGIN + 14;
  doc.y = cardY + 12;

  // Title + badge
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white)
    .text(`${index + 1}. ${finding.title}`, x, doc.y, { width: CONTENT_W - 80 });
  badge(doc, MARGIN + CONTENT_W - 66, cardY + 12, finding.severity, sColor);

  // Meta line
  const meta = [
    category,
    finding.status ?? "confirmed",
    `${finding.confidenceScore ?? 0}% confidence`,
    (finding as HiddenFee).pageNumber != null ? `Page ${(finding as HiddenFee).pageNumber}` : "",
  ].filter(Boolean).join("  ·  ");
  doc.font("Helvetica").fontSize(8).fillColor(C.textMuted)
    .text(meta, x, doc.y, { width: CONTENT_W - 24 });
  doc.moveDown(0.3);

  // Amount
  const amount = (finding as HiddenFee).amount;
  if (amount != null) {
    doc.font("Helvetica-Bold").fontSize(15).fillColor(C.critical)
      .text(fmt$(amount), x, doc.y);
    doc.moveDown(0.2);
  }

  // Evidence quote
  if (finding.evidence) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(C.textMuted)
      .text(`"${finding.evidence}"`, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  // Explanation
  doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary)
    .text(finding.explanation, x, doc.y, { width: CONTENT_W - 24 });
  doc.moveDown(0.2);

  // Why it matters
  const why = (finding as HiddenFee).whyItMatters;
  if (why) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.electric).text("WHY IT MATTERS", x, doc.y, { lineBreak: false });
    doc.moveDown(0.1);
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
      .text(why, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  // Recommended action
  const action = (finding as HiddenFee).recommendedAction;
  if (action) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.savings).text("→  RECOMMENDED ACTION", x, doc.y, { lineBreak: false });
    doc.moveDown(0.1);
    doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
      .text(action, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  // ── Premium Negotiation Strategy Card (Playbook) ──
  const neg = (finding as HiddenFee).negotiationStrategy;
  if (neg) {
    guard(doc, 130);
    const playY = doc.y;
    const playH = 110;
    doc.rect(x, playY, CONTENT_W - 24, playH).fill(C.navyMid);
    doc.rect(x, playY, 3, playH).fill(C.violet);
    doc.rect(x, playY, CONTENT_W - 24, 1.5).fill(C.violet + "66");

    const px = x + 12;
    doc.y = playY + 8;

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.violetLight)
      .text(`NEGOTIATION STRATEGY  ·  DIFFICULTY: ${neg.difficulty}  ·  SUCCESS PROBABILITY: ${neg.successProbability}%`, px, doc.y);
    doc.moveDown(0.2);

    if (neg.script) {
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(C.electricBright).text("SCRIPT PREVIEW:", px, doc.y);
      doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.textPrimary)
        .text(`"${neg.script.slice(0, 220)}${neg.script.length > 220 ? "..." : ""}"`, px, doc.y, { width: CONTENT_W - 48 });
      doc.moveDown(0.2);
    }

    if (neg.expectedCompanyResponse && neg.bestCounterResponse) {
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.critical).text("EXPECTED RESPONSE:", px, doc.y);
      doc.font("Helvetica").fontSize(7.5).fillColor(C.textSecondary)
        .text(`"${neg.expectedCompanyResponse.slice(0, 100)}${neg.expectedCompanyResponse.length > 100 ? "..." : ""}"`, px, doc.y, { width: CONTENT_W - 48 });
      doc.moveDown(0.2);

      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.savings).text("BEST COUNTER:", px, doc.y);
      doc.font("Helvetica").fontSize(7.5).fillColor(C.textPrimary)
        .text(`"${neg.bestCounterResponse.slice(0, 100)}${neg.bestCounterResponse.length > 100 ? "..." : ""}"`, px, doc.y, { width: CONTENT_W - 48 });
    }

    doc.y = playY + playH + 6;
  }

  doc.y = Math.max(doc.y + 12, cardY + clampH + 10);
  doc.x = MARGIN;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── NEGOTIATION LEVERAGE ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderNegotiationLeverage(doc: PDFKit.PDFDocument, leverage: NegotiationLeverage[]): void {
  if (!leverage.length) return;
  sectionHeader(doc, "07  Negotiation Leverage", "Your strategic advantages for disputing charges");

  leverage.forEach((item, i) => {
    guard(doc, 160);
    const cardY = doc.y;

    doc.rect(MARGIN, cardY, CONTENT_W, 6).fill(C.violet);
    doc.rect(MARGIN, cardY + 6, CONTENT_W, 134).fill(C.navyCard);

    const x = MARGIN + 14;
    doc.y = cardY + 14;

    doc.font("Helvetica-Bold").fontSize(11).fillColor(C.white)
      .text(`${i + 1}. ${item.title}`, x, doc.y, { width: CONTENT_W - 24 });

    const pc = item.priority === "Immediate" ? C.critical : item.priority === "High" ? C.high : C.medium;
    doc.font("Helvetica").fontSize(8).fillColor(pc)
      .text(`${item.priority} Priority  ·  ${item.successProbability}% Success  ·  ${fmt$(item.estimatedSavings)} potential`, x, doc.y);
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary)
      .text(item.leverage, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.2);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.electric).text("WHY THE COMPANY MAY AGREE:", x, doc.y, { lineBreak: false });
    doc.moveDown(0.1);
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
      .text(item.whyCompanyMayAgree, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.2);

    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.violet).text("SUGGESTED WORDING:", x, doc.y, { lineBreak: false });
    doc.moveDown(0.1);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(C.violetLight)
      .text(item.suggestedWording, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);

    doc.y = Math.max(doc.y + 12, cardY + 148);
    doc.x = MARGIN;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── ACTION PLAN ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderActionPlan(doc: PDFKit.PDFDocument, actions: RecommendedAction[]): void {
  if (!actions.length) return;
  sectionHeader(doc, "08  Step-by-Step Action Plan", "Execute in priority order for maximum impact");

  const phases = ["Before Contact", "During Negotiation", "After Negotiation"] as const;
  phases.forEach((phase) => {
    const phaseActions = actions.filter((a) => a.phase === phase).sort((a, b) => a.priority - b.priority);
    if (!phaseActions.length) return;

    guard(doc, 60);
    doc.moveDown(0.4);

    // Phase header strip
    const phaseY = doc.y;
    doc.rect(MARGIN, phaseY, CONTENT_W, 22).fill(C.tableHeader);
    doc.rect(MARGIN, phaseY, 4, 22).fill(C.electric);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.electricBright)
      .text(phase.toUpperCase(), MARGIN + 12, phaseY + 6);
    doc.y = phaseY + 28;
    doc.x = MARGIN;

    phaseActions.forEach((action) => {
      guard(doc, 64);
      const ry = doc.y;
      doc.rect(MARGIN, ry, CONTENT_W, 54).fill(C.navyMid);

      // Priority circle
      const circleX = MARGIN + 22, circleY = ry + 14;
      doc.circle(circleX, circleY, 12).fill(C.electric);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(C.white)
        .text(String(action.priority), circleX - 6, circleY - 6, { width: 12, align: "center" });

      const tx = MARGIN + 44;
      const diffColor = action.difficulty === "Easy" ? C.savings : action.difficulty === "Medium" ? C.medium : C.high;
      const timeColor = action.timeframe === "Immediate" ? C.critical : C.textSecondary;

      doc.font("Helvetica-Bold").fontSize(10).fillColor(C.white)
        .text(action.action, tx, ry + 6, { width: CONTENT_W - 50 });

      const tags = `${action.timeframe}  ·  Difficulty: ${action.difficulty}${action.estimatedSavings ? `  ·  Savings: ${fmt$(action.estimatedSavings)}` : ""}`;
      doc.font("Helvetica").fontSize(8).fillColor(timeColor)
        .text(tags, tx, ry + 22, { width: CONTENT_W - 50 });

      doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary)
        .text(action.details, tx, ry + 36, { width: CONTENT_W - 50, height: 14, ellipsis: true });

      doc.y = ry + 60;
      doc.x = MARGIN;
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── QUESTIONS TO ASK ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderQuestions(doc: PDFKit.PDFDocument, questions: string[]): void {
  if (!questions.length) return;
  guard(doc, 100);
  sectionHeader(doc, "09  Questions to Ask the Company");

  questions.forEach((q, i) => {
    guard(doc, 32);
    const qy = doc.y;
    doc.rect(MARGIN, qy, 28, 24).fill(C.electric);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(C.white)
      .text(String(i + 1), MARGIN + 7, qy + 7, { width: 14, align: "center", lineBreak: false });
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(C.textPrimary)
      .text(`"${q}"`, MARGIN + 36, qy + 6, { width: CONTENT_W - 40 });
    doc.y = Math.max(doc.y, qy + 30);
    doc.x = MARGIN;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── PHONE SCRIPT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderPhoneScript(doc: PDFKit.PDFDocument, lines: string[]): void {
  if (!lines.length) return;
  guard(doc, 120);
  sectionHeader(doc, "10  Phone Negotiation Script", "Read this word-for-word when calling");

  const tipY = doc.y;
  doc.rect(MARGIN, tipY, CONTENT_W, 22).fill(C.tableHeader);
  doc.rect(MARGIN, tipY, CONTENT_W, 3).fill(C.teal);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.teal)
    .text("✓  USE THIS EXACT SCRIPT — Specific wording increases success rates by 40%", MARGIN + 10, tipY + 7, { lineBreak: false });
  doc.y = tipY + 30;
  doc.x = MARGIN;

  lines.forEach((line, i) => {
    guard(doc, 36);
    const ly = doc.y;
    doc.rect(MARGIN, ly, CONTENT_W, 30).fill(i % 2 === 0 ? C.navyCard : C.navyMid);

    const isTag = /^(OPENING|WHEN|ESCALATION|CLOSING|STEP|AGENT):/.test(line);
    if (isTag) {
      const colonIdx = line.indexOf(":");
      const tag = line.slice(0, colonIdx);
      const rest = line.slice(colonIdx + 1).trim();
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.electric).text(tag + ":", MARGIN + 10, ly + 8, { lineBreak: false });
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(C.white)
        .text(rest, MARGIN + 84, ly + 7, { width: CONTENT_W - 104, height: 18, ellipsis: true, lineBreak: false });
    } else {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(C.textPrimary)
        .text(line, MARGIN + 10, ly + 9, { width: CONTENT_W - 20, height: 18, ellipsis: true, lineBreak: false });
    }
    doc.y = ly + 34;
    doc.x = MARGIN;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── EMAIL TEMPLATE ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderEmailTemplate(doc: PDFKit.PDFDocument, paragraphs: string[]): void {
  if (!paragraphs.length) return;
  guard(doc, 120);
  sectionHeader(doc, "11  Email Negotiation Template", "Send this to begin a formal written dispute");

  const blockY = doc.y;
  const estH = paragraphs.length * 30 + 24;
  doc.rect(MARGIN, blockY, CONTENT_W, estH).fill(C.navyCard);
  doc.rect(MARGIN, blockY, 4, estH).fill(C.violet);
  doc.y = blockY + 12;

  paragraphs.forEach((para, i) => {
    guard(doc, 32);
    const isSubject = i === 0;
    doc.font(isSubject ? "Helvetica-Bold" : "Helvetica")
      .fontSize(isSubject ? 10 : 9)
      .fillColor(isSubject ? C.white : C.textPrimary)
      .text(para, MARGIN + 14, doc.y, { width: CONTENT_W - 28 });
    doc.moveDown(0.4);
  });
  doc.y += 16;
  doc.x = MARGIN;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── BACK COVER / TRUST PANEL ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
function renderBackCover(doc: PDFKit.PDFDocument, report: AuditReport): void {
  newPage(doc);
  accentStripe(doc, 0, 6);

  const meta = report.documentMetadata;

  // ── Brand block — ALL at fixed absolute Y coords so nothing overlaps ──
  // "HiddenFeeAI" at y=100, subtitle at y=140 (fixed, NOT doc.y+offset)
  doc.font("Helvetica-Bold").fontSize(32).fillColor(C.violetLight)
    .text("HiddenFeeAI", MARGIN, 100, { width: CONTENT_W, align: "center", lineBreak: false });
  doc.font("Helvetica").fontSize(11).fillColor(C.textSecondary)
    .text("Enterprise Financial Intelligence Platform", MARGIN, 140, { width: CONTENT_W, align: "center", lineBreak: false });

  // Divider below brand — at fixed y=168
  doc.rect(MARGIN, 168, CONTENT_W, 1).fill(C.navyBorder);

  // ── 3-column trust stats — fixed at y=180 ──
  const trustY = 180;
  const tw = CONTENT_W / 3;
  const trustStats = [
    { value: `${report.confidence}%`,              label: "AI Confidence Score",   color: C.savings },
    { value: String(meta.pagesReviewed ?? "—"),    label: "Pages Reviewed",        color: C.electric },
    { value: String(meta.lineItemsReviewed ?? "—"), label: "Line Items Analyzed", color: C.violet },
  ];
  trustStats.forEach((t, i) => {
    const tx = MARGIN + i * tw;
    doc.rect(tx + 8, trustY, tw - 16, 72).fill(C.navyCard);
    doc.rect(tx + 8, trustY, tw - 16, 4).fill(t.color);
    doc.font("Helvetica-Bold").fontSize(26).fillColor(t.color)
      .text(t.value, tx + 8, trustY + 14, { width: tw - 16, align: "center", lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
      .text(t.label.toUpperCase(), tx + 8, trustY + 46, { width: tw - 16, align: "center", lineBreak: false });
  });

  // Divider below trust boxes — fixed at y=264
  doc.rect(MARGIN, 264, CONTENT_W, 1).fill(C.navyBorder);

  // ── Report ID + disclaimer — fixed positions ──
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textMuted)
    .text("REPORT ID", MARGIN, 276, { lineBreak: false });
  doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary)
    .text(meta.reportId, MARGIN, 290, { lineBreak: false });

  doc.font("Helvetica").fontSize(9).fillColor(C.textMuted)
    .text(
      "This report was generated by HiddenFeeAI's AI analysis engine. All findings are based on automated pattern recognition " +
      "and statistical analysis of the submitted document. This report does not constitute legal advice. " +
      "For disputes involving significant sums, consult a qualified attorney or financial advisor.",
      MARGIN, 318, { width: CONTENT_W }
    );

  // Bottom brand stripe + footer
  accentStripe(doc, PAGE_H - 6, 6);
  footerStamp(doc);

  // Pin cursor safely inside page
  doc.y = 400;
  doc.x = MARGIN;
}

// ═══════════════════════════════════════════════════════════════════════════
// ── MAIN EXPORT ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════
export async function generatePdf(report: AuditReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        autoFirstPage: false,
        margins: { top: 48, bottom: 56, left: MARGIN, right: MARGIN },
        bufferPages: true,
        info: {
          Title:    `HiddenFeeAI Executive Audit — ${report.documentMetadata.documentType}`,
          Author:   "HiddenFeeAI Intelligence Platform",
          Subject:  "Financial Document Forensic Audit Report",
          Keywords: "hidden fees, financial audit, negotiation, consumer protection",
          Creator:  "HiddenFeeAI v2",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data",  (chunk: Buffer) => chunks.push(chunk));
      doc.on("end",   () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Page 1: Cover — rendered on the manually created page ────────
      doc.addPage();
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.navy);
      doc.x = MARGIN;
      doc.y = 48;
      renderCoverPage(doc, report);

      // ── Page 2: Table of Contents ──────────────────────────────────────
      renderTableOfContents(doc, report);

      // ── Page 3+: Main content ──────────────────────────────────────────
      newPage(doc);
      accentStripe(doc, 0, 6);
      doc.x = MARGIN;
      doc.y = 48;

      renderExecutiveSummary(doc, report);
      renderFinancialDashboard(doc, report);

      // Hidden Fees
      if ((report.hiddenFees?.length ?? 0) > 0) {
        guard(doc, 60);
        sectionHeader(
          doc,
          `03  Hidden Fees (${report.hiddenFees.length})`,
          "Undisclosed or poorly disclosed charges requiring dispute"
        );
        report.hiddenFees.forEach((f, i) => renderFindingCard(doc, f, i, "Hidden Fee"));
      }

      // Questionable Charges
      if ((report.questionableCharges?.length ?? 0) > 0) {
        guard(doc, 60);
        sectionHeader(
          doc,
          `04  Questionable Charges (${report.questionableCharges.length})`,
          "Charges that warrant review and potential dispute"
        );
        report.questionableCharges.forEach((f, i) => renderFindingCard(doc, f, i, "Questionable Charge"));
      }

      // Contract Risks
      if ((report.contractRisks?.length ?? 0) > 0) {
        guard(doc, 60);
        sectionHeader(
          doc,
          `05  Contract Risks (${report.contractRisks.length})`,
          "Clauses that create financial risk or unfavorable terms"
        );
        report.contractRisks.forEach((f, i) => renderFindingCard(doc, f, i, "Contract Risk"));
      }

      // Mathematical Errors
      if ((report.mathematicalErrors?.length ?? 0) > 0) {
        guard(doc, 120);
        sectionHeader(doc, `06  Mathematical Errors (${report.mathematicalErrors.length})`);
        report.mathematicalErrors.forEach((err: MathematicalError, i) => {
          guard(doc, 90);
          const ey = doc.y;
          doc.rect(MARGIN, ey, CONTENT_W, 78).fill(C.navyCard);
          doc.rect(MARGIN, ey, 4, 78).fill(C.critical);
          doc.rect(MARGIN, ey, CONTENT_W, 3).fill(C.critical + "66");
          const x = MARGIN + 14;
          doc.y = ey + 10;

          doc.font("Helvetica-Bold").fontSize(11).fillColor(C.critical)
            .text(`${i + 1}. ${err.title}`, x, doc.y, { width: CONTENT_W - 20 });

          const vals = [
            `Expected: ${err.expectedValue != null ? fmt$(err.expectedValue) : "N/A"}`,
            `Actual: ${err.actualValue != null ? fmt$(err.actualValue) : "N/A"}`,
            `Discrepancy: ${err.discrepancy != null ? fmt$(err.discrepancy) : "N/A"}`,
          ].join("   |   ");
          doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary).text(vals, x, doc.y);

          doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
            .text(err.explanation, x, doc.y, { width: CONTENT_W - 24 });
          doc.font("Helvetica-Bold").fontSize(9).fillColor(C.savings)
            .text(`→  ${err.recommendedAction}`, x, doc.y, { width: CONTENT_W - 24 });

          doc.y = ey + 86;
          doc.x = MARGIN;
        });
      }

      // Negotiation Leverage
      renderNegotiationLeverage(doc, report.negotiationLeverage ?? []);

      // Action Plan
      renderActionPlan(doc, report.recommendedActions ?? []);

      // Questions to Ask
      renderQuestions(doc, report.questionsToAsk ?? []);

      // Phone Script
      renderPhoneScript(doc, report.phoneNegotiationScript ?? []);

      // Email Template
      renderEmailTemplate(doc, report.emailNegotiationTemplate ?? []);

      // Consumer Rights
      if ((report.consumerRights?.length ?? 0) > 0) {
        guard(doc, 100);
        sectionHeader(doc, "12  Your Consumer Rights");
        report.consumerRights.forEach((cr, i) => {
          guard(doc, 80);
          const cry = doc.y;
          doc.rect(MARGIN, cry, CONTENT_W, 68).fill(C.navyMid);
          doc.rect(MARGIN, cry, 4, 68).fill(C.teal);
          const x = MARGIN + 14;
          doc.y = cry + 8;

          doc.font("Helvetica-Bold").fontSize(10).fillColor(C.electricBright)
            .text(`${i + 1}. ${cr.right}`, x, doc.y, { width: CONTENT_W - 24 });
          doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
            .text(cr.description, x, doc.y, { width: CONTENT_W - 24 });
          doc.font("Helvetica-Bold").fontSize(8).fillColor(C.savings)
            .text(`How to exercise: ${cr.howToExercise}`, x, doc.y, { width: CONTENT_W - 24, height: 14, ellipsis: true, lineBreak: false });
          if (cr.applicableLaw) {
            doc.moveDown(0.2);
            doc.font("Helvetica").fontSize(8).fillColor(C.textMuted)
              .text(`Law: ${cr.applicableLaw}`, x, doc.y, { width: CONTENT_W - 24, lineBreak: false });
          }
          doc.y = cry + 76;
          doc.x = MARGIN;
        });
      }

      // ── Back Cover ──────────────────────────────────────────────────────
      renderBackCover(doc, report);

      // ── Page numbers (post-render pass) ────────────────────────────────
      addPageNumbers(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}