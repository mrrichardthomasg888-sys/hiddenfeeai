/**
 * HiddenFeeAI — Premium PDF Report Generator
 * Produces a Fortune 500-quality executive audit report using PDFKit.
 *
 * Design: Deep navy backgrounds, electric blue/purple accents, premium typography,
 * professional tables, color-coded severity indicators, clean page breaks.
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
const COLORS = {
  // Backgrounds
  navy: "#0a0e1a",
  navyMid: "#0f1629",
  navyCard: "#131b2e",
  navyBorder: "#1e2d4a",

  // Brand
  electric: "#3b82f6",
  electricBright: "#60a5fa",
  violet: "#8b5cf6",
  violetLight: "#a78bfa",

  // Severity
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
  savings: "#10b981",

  // Text
  white: "#f8fafc",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",

  // Tables
  tableHeader: "#1e3a5f",
  tableRowAlt: "#0f1e35",
  tableRow: "#0a1628",
};

// ── Page constants ──────────────────────────────────────────────────────────
const PAGE_W = 612;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ── Helpers ────────────────────────────────────────────────────────────────
function severityColor(severity: string): string {
  switch (severity) {
    case "Critical": return COLORS.critical;
    case "High": return COLORS.high;
    case "Medium": return COLORS.medium;
    case "Low": return COLORS.low;
    default: return COLORS.textSecondary;
  }
}

function riskColor(risk: string): string {
  switch (risk) {
    case "High": return COLORS.critical;
    case "Elevated": return COLORS.high;
    case "Review Recommended": return COLORS.medium;
    default: return COLORS.low;
  }
}

function scoreColor(score: number): string {
  if (score >= 70) return COLORS.critical;
  if (score >= 40) return COLORS.high;
  if (score >= 20) return COLORS.medium;
  return COLORS.low;
}

function formatDollar(n: number): string {
  if (!n || isNaN(n)) return "$0";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function addNewPage(doc: PDFKit.PDFDocument): void {
  doc.addPage();
  doc.rect(0, 0, PAGE_W, 792).fill(COLORS.navy);
  doc.x = MARGIN;
  doc.y = 48;
}

function checkPageBreak(doc: PDFKit.PDFDocument, neededHeight: number = 120): void {
  if (doc.y > 700 - neededHeight) {
    addNewPage(doc);
  }
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string, subtitle?: string): void {
  checkPageBreak(doc, 60);
  doc.x = MARGIN;
  doc.moveDown(0.8);

  // Accent line
  doc.rect(MARGIN, doc.y, 4, subtitle ? 32 : 22).fill(COLORS.electric);
  doc.x = MARGIN + 12;

  doc.font("Helvetica-Bold").fontSize(14).fillColor(COLORS.white).text(title, MARGIN + 12, doc.y);
  if (subtitle) {
    doc.font("Helvetica").fontSize(10).fillColor(COLORS.textSecondary).text(subtitle, { indent: 0 });
  }
  doc.x = MARGIN;
  doc.moveDown(0.5);
}

function severityBadge(doc: PDFKit.PDFDocument, x: number, y: number, severity: string): void {
  const color = severityColor(severity);
  const label = severity.toUpperCase();
  const badgeW = 60;
  doc.rect(x, y, badgeW, 14).fill(color + "22");
  doc.font("Helvetica-Bold").fontSize(7).fillColor(color).text(label, x + 4, y + 4, { width: badgeW - 8 });
}

function horizontalRule(doc: PDFKit.PDFDocument): void {
  doc.x = MARGIN;
  doc.moveDown(0.3);
  doc.rect(MARGIN, doc.y, CONTENT_W, 0.5).fill(COLORS.navyBorder);
  doc.moveDown(0.3);
}

// ── Cover Page ─────────────────────────────────────────────────────────────
function renderCoverPage(doc: PDFKit.PDFDocument, report: AuditReport): void {
  const { documentMetadata: meta, overallRiskScore, riskCategory, financialImpact, estimatedSavings, executiveSummary } = report;

  // Full-page dark background
  doc.rect(0, 0, PAGE_W, 792).fill(COLORS.navy);

  // Top gradient stripe
  doc.rect(0, 0, PAGE_W, 6).fill(COLORS.electric);

  // Logo / Brand
  doc.y = 60;
  doc.font("Helvetica-Bold").fontSize(28).fillColor(COLORS.violetLight)
    .text("HiddenFeeAI", MARGIN, doc.y, { align: "left" });
  doc.font("Helvetica").fontSize(11).fillColor(COLORS.textSecondary)
    .text("Enterprise Financial Intelligence Platform", MARGIN, doc.y + 2);

  // Report title
  doc.y = 140;
  doc.font("Helvetica-Bold").fontSize(22).fillColor(COLORS.white)
    .text("EXECUTIVE AUDIT REPORT", MARGIN, doc.y);
  doc.font("Helvetica").fontSize(14).fillColor(COLORS.electricBright)
    .text(meta.documentType, MARGIN, doc.y + 4);

  // Divider
  doc.y = 200;
  doc.rect(MARGIN, doc.y, CONTENT_W, 1).fill(COLORS.navyBorder);

  // Meta info row
  doc.y = 212;
  const col1 = MARGIN;
  const col2 = MARGIN + CONTENT_W / 2;

  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textMuted).text("AUDIT ID", col1, doc.y);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textMuted).text("ANALYSIS DATE", col2, doc.y);
  doc.y = 223;
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary).text(meta.reportId.slice(0, 16).toUpperCase(), col1, doc.y);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary).text(
    new Date(meta.analysisDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    col2, doc.y
  );

  doc.y = 250;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textMuted).text("ISSUER", col1, doc.y);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.textMuted).text("DOCUMENT TYPE", col2, doc.y);
  doc.y = 261;
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary).text(meta.issuer ?? "Not identified", col1, doc.y);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary).text(meta.documentType, col2, doc.y);

  // Risk Score Dashboard
  doc.y = 310;
  doc.rect(MARGIN, doc.y, CONTENT_W, 140).fill(COLORS.navyCard);
  doc.rect(MARGIN, doc.y, CONTENT_W, 2).fill(COLORS.electric);

  doc.y = 322;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.textMuted).text("OVERALL RISK SCORE", MARGIN + 16, doc.y);

  doc.y = 336;
  const scoreC = scoreColor(overallRiskScore);
  doc.font("Helvetica-Bold").fontSize(48).fillColor(scoreC).text(`${overallRiskScore}`, MARGIN + 16, doc.y);
  doc.font("Helvetica").fontSize(12).fillColor(scoreC).text(`/ 100 — ${riskCategory}`, MARGIN + 90, doc.y + 22);

  // Stats row
  const statY = 400;
  const statW = CONTENT_W / 3;
  const stats = [
    { label: "POTENTIAL SAVINGS", value: formatDollar(estimatedSavings.mostLikely), color: COLORS.savings },
    { label: "QUESTIONABLE CHARGES", value: formatDollar(financialImpact.questionableChargesTotal), color: COLORS.critical },
    { label: "TOTAL FINDINGS", value: String(executiveSummary.totalFindings), color: COLORS.electric },
  ];

  stats.forEach((stat, i) => {
    const x = MARGIN + i * statW;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(COLORS.textMuted).text(stat.label, x + 16, statY);
    doc.font("Helvetica-Bold").fontSize(18).fillColor(stat.color).text(stat.value, x + 16, statY + 12);
  });

  // Executive headline
  doc.y = 470;
  doc.rect(MARGIN, doc.y, CONTENT_W, 80).fill(COLORS.navyMid);
  doc.y = 482;
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.textMuted).text("EXECUTIVE HEADLINE", MARGIN + 16, doc.y);
  doc.font("Helvetica-BoldOblique").fontSize(13).fillColor(COLORS.white)
    .text(executiveSummary.headline, MARGIN + 16, doc.y + 14, { width: CONTENT_W - 32 });

  // Footer — use absolute positioning to avoid cursor overflow
  doc.rect(MARGIN, 740, CONTENT_W, 0.5).fill(COLORS.navyBorder);
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.textMuted)
    .text("HiddenFeeAI  |  Confidential — Document not stored", MARGIN, 748, { width: CONTENT_W, align: "center" });
  // Reset cursor to safe position to prevent auto-pagination
  doc.y = 700;
  doc.x = MARGIN;
}

// ── Executive Summary ──────────────────────────────────────────────────────
function renderExecutiveSummary(doc: PDFKit.PDFDocument, report: AuditReport): void {
  sectionHeader(doc, "Executive Summary");

  const { executiveSummary: es, documentMetadata: meta } = report;

  doc.font("Helvetica").fontSize(11).fillColor(COLORS.textPrimary)
    .text(es.overview, MARGIN, doc.y, { width: CONTENT_W });
  doc.moveDown(0.5);

  // Two-column: critical findings + immediate action
  const colW = (CONTENT_W - 12) / 2;
  const boxY = doc.y;
  const leftX = MARGIN;
  const rightX = MARGIN + colW + 12;

  // Left box
  doc.rect(leftX, boxY, colW, 80).fill(COLORS.navyCard);
  doc.rect(leftX, boxY, 3, 80).fill(COLORS.critical);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.critical).text("CRITICAL FINDINGS", leftX + 10, boxY + 8);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary)
    .text(es.criticalFindings, leftX + 10, boxY + 22, { width: colW - 20, height: 52 });

  // Right box
  doc.rect(rightX, boxY, colW, 80).fill(COLORS.navyCard);
  doc.rect(rightX, boxY, 3, 80).fill(COLORS.electric);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.electric).text("IMMEDIATE ACTION REQUIRED", rightX + 10, boxY + 8);
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary)
    .text(es.immediateActions, rightX + 10, boxY + 22, { width: colW - 20, height: 52 });

  doc.y = boxY + 90;
  doc.x = MARGIN;

  // Meta bar
  doc.rect(MARGIN, doc.y, CONTENT_W, 30).fill(COLORS.navyMid);
  const metas = [
    `Pages Reviewed: ${meta.pagesReviewed}`,
    `Line Items: ${meta.lineItemsReviewed}`,
    `Confidence: ${report.confidence}%`,
    `File: ${meta.fileName ?? "N/A"}`,
  ];
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.textSecondary)
    .text(metas.join("   |   "), MARGIN + 12, doc.y + 10, { width: CONTENT_W - 24 });
  doc.y = doc.y + 40;
}

// ── Financial Impact Dashboard ─────────────────────────────────────────────
function renderFinancialDashboard(doc: PDFKit.PDFDocument, report: AuditReport): void {
  checkPageBreak(doc, 200);
  sectionHeader(doc, "Financial Impact Analysis");

  const { financialImpact: fi, estimatedSavings: es } = report;

  // Impact table
  const tableY = doc.y;
  doc.rect(MARGIN, tableY, CONTENT_W, 24).fill(COLORS.tableHeader);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white)
    .text("CATEGORY", MARGIN + 10, tableY + 8)
    .text("AMOUNT", MARGIN + CONTENT_W * 0.5, tableY + 8, { width: CONTENT_W * 0.25, align: "right" })
    .text("STATUS", MARGIN + CONTENT_W * 0.75, tableY + 8, { width: CONTENT_W * 0.25, align: "right" });

  const rows = [
    { label: "Original Total Billed", amount: fi.originalTotal, status: "Billed", color: COLORS.textPrimary, statusColor: COLORS.textSecondary },
    { label: "Questionable Charges", amount: fi.questionableChargesTotal, status: "Disputed", color: COLORS.critical, statusColor: COLORS.critical },
    { label: "Potential Overcharge", amount: fi.potentialOvercharge, status: "Flagged", color: COLORS.high, statusColor: COLORS.high },
    { label: "Recommended Corrected Total", amount: fi.correctedTotal, status: "Recommended", color: COLORS.savings, statusColor: COLORS.savings },
  ];

  rows.forEach((row, i) => {
    const rowY = tableY + 24 + i * 22;
    doc.rect(MARGIN, rowY, CONTENT_W, 22).fill(i % 2 === 0 ? COLORS.tableRow : COLORS.tableRowAlt);
    doc.font(row.label.includes("Corrected") ? "Helvetica-Bold" : "Helvetica").fontSize(10)
      .fillColor(row.color).text(row.label, MARGIN + 10, rowY + 6);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(row.color)
      .text(formatDollar(row.amount), MARGIN + CONTENT_W * 0.5, rowY + 6, { width: CONTENT_W * 0.25, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(row.statusColor)
      .text(row.status, MARGIN + CONTENT_W * 0.75, rowY + 6, { width: CONTENT_W * 0.25, align: "right" });
  });

  doc.y = tableY + 24 + rows.length * 22 + 16;

  // Savings estimate boxes
  checkPageBreak(doc, 90);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.textMuted).text("ESTIMATED SAVINGS RANGE", MARGIN, doc.y);
  doc.moveDown(0.3);

  const savingsY = doc.y;
  const sW = (CONTENT_W - 16) / 3;
  const savingsData = [
    { label: "Conservative", value: es.conservative, color: COLORS.medium },
    { label: "Most Likely", value: es.mostLikely, color: COLORS.savings },
    { label: "Optimistic", value: es.optimistic, color: COLORS.electric },
  ];

  savingsData.forEach((s, i) => {
    const x = MARGIN + i * (sW + 8);
    doc.rect(x, savingsY, sW, 52).fill(COLORS.navyCard);
    doc.rect(x, savingsY, sW, 3).fill(s.color);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(s.color).text(s.label.toUpperCase(), x + 8, savingsY + 10);
    doc.font("Helvetica-Bold").fontSize(18).fillColor(COLORS.white).text(formatDollar(s.value), x + 8, savingsY + 22);
  });

  doc.y = savingsY + 62;
  if (es.description) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.textMuted)
      .text(es.description, MARGIN, doc.y, { width: CONTENT_W });
    doc.moveDown(0.5);
  }
}

// ── Generic finding renderer ───────────────────────────────────────────────
type AnyFinding = HiddenFee | QuestionableCharge | ContractRisk;

function renderFindingCard(doc: PDFKit.PDFDocument, finding: AnyFinding, index: number, category: string): void {
  checkPageBreak(doc, 140);

  const cardY = doc.y;
  const cardH = estimateFindingHeight(finding);
  const clampedH = Math.min(cardH, 400); // guard against overflow

  doc.rect(MARGIN, cardY, CONTENT_W, clampedH).fill(COLORS.navyCard);
  doc.rect(MARGIN, cardY, 3, clampedH).fill(severityColor(finding.severity));

  doc.y = cardY + 10;
  const x = MARGIN + 12;

  // Header row
  doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.white)
    .text(`${index + 1}. ${finding.title}`, x, doc.y, { width: CONTENT_W - 80 });

  // Severity badge inline
  severityBadge(doc, MARGIN + CONTENT_W - 70, cardY + 12, finding.severity);
  doc.font("Helvetica").fontSize(8).fillColor(COLORS.textMuted)
    .text(`${category} | ${finding.status ?? "confirmed"} | ${finding.confidenceScore ?? 0}% confidence | ${(finding as HiddenFee).pageNumber != null ? `Page ${(finding as HiddenFee).pageNumber}` : ""}`, x, doc.y);
  doc.moveDown(0.3);

  // Amount
  if ((finding as HiddenFee).amount != null) {
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.critical)
      .text(formatDollar((finding as HiddenFee).amount!), x, doc.y);
    doc.moveDown(0.2);
  }

  // Evidence
  if (finding.evidence) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.textMuted)
      .text(`"${finding.evidence}"`, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  // Explanation
  doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary)
    .text(finding.explanation, x, doc.y, { width: CONTENT_W - 24 });
  doc.moveDown(0.2);

  // Why it matters
  if ((finding as HiddenFee).whyItMatters) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.electric).text("WHY IT MATTERS", x, doc.y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.textSecondary)
      .text((finding as HiddenFee).whyItMatters, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  // Recommended action
  if ((finding as HiddenFee).recommendedAction) {
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.savings).text("→ RECOMMENDED ACTION", x, doc.y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.textPrimary)
      .text((finding as HiddenFee).recommendedAction, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  // Negotiation script preview
  const neg = (finding as HiddenFee).negotiationStrategy;
  if (neg?.script) {
    checkPageBreak(doc, 80);
    doc.rect(x, doc.y, CONTENT_W - 24, 0.5).fill(COLORS.navyBorder);
    doc.moveDown(0.3);
    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.violet).text(`NEGOTIATION SCRIPT (${neg.difficulty} | ${neg.successProbability}% success)`, x, doc.y);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.violetLight)
      .text(neg.script.slice(0, 300) + (neg.script.length > 300 ? "..." : ""), x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);
  }

  doc.y = Math.max(doc.y + 12, cardY + clampedH + 8);
  doc.x = MARGIN;
}

function estimateFindingHeight(finding: AnyFinding): number {
  let h = 80;
  if (finding.evidence) h += 30;
  if (finding.explanation) h += Math.ceil(finding.explanation.length / 80) * 14;
  if ((finding as HiddenFee).whyItMatters) h += 30;
  if ((finding as HiddenFee).recommendedAction) h += 25;
  if ((finding as HiddenFee).negotiationStrategy?.script) h += 50;
  return Math.min(h, 380);
}

// ── Negotiation Leverage ───────────────────────────────────────────────────
function renderNegotiationLeverage(doc: PDFKit.PDFDocument, leverage: NegotiationLeverage[]): void {
  if (!leverage.length) return;

  sectionHeader(doc, "Negotiation Leverage", "Your strategic advantages for disputing charges");

  leverage.forEach((item, i) => {
    checkPageBreak(doc, 160);

    const cardY = doc.y;
    doc.rect(MARGIN, cardY, CONTENT_W, 6).fill(COLORS.violet);
    doc.rect(MARGIN, cardY + 6, CONTENT_W, 130).fill(COLORS.navyCard);

    const x = MARGIN + 12;
    doc.y = cardY + 14;

    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.white)
      .text(`${i + 1}. ${item.title}`, x, doc.y, { width: CONTENT_W - 24 });

    const pColor = item.priority === "Immediate" ? COLORS.critical : item.priority === "High" ? COLORS.high : COLORS.medium;
    doc.font("Helvetica").fontSize(8).fillColor(pColor)
      .text(`${item.priority} Priority | ${item.successProbability}% Success Rate | ${formatDollar(item.estimatedSavings)} potential savings`, x, doc.y);
    doc.moveDown(0.3);

    doc.font("Helvetica").fontSize(10).fillColor(COLORS.textPrimary)
      .text(item.leverage, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.2);

    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.electric).text("WHY THE COMPANY MAY AGREE:", x, doc.y);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.textSecondary)
      .text(item.whyCompanyMayAgree, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);

    doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.violet).text("SUGGESTED WORDING:", x, doc.y);
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.violetLight)
      .text(item.suggestedWording, x, doc.y, { width: CONTENT_W - 24 });
    doc.moveDown(0.3);

    doc.y = Math.max(doc.y + 12, cardY + 144);
    doc.x = MARGIN;
  });
}

// ── Action Plan ────────────────────────────────────────────────────────────
function renderActionPlan(doc: PDFKit.PDFDocument, actions: RecommendedAction[]): void {
  if (!actions.length) return;

  sectionHeader(doc, "Step-by-Step Action Plan", "Execute in priority order for maximum impact");

  const phases = ["Before Contact", "During Negotiation", "After Negotiation"] as const;

  phases.forEach((phase) => {
    const phaseActions = actions.filter((a) => a.phase === phase).sort((a, b) => a.priority - b.priority);
    if (!phaseActions.length) return;

    checkPageBreak(doc, 60);
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.electricBright)
      .text(phase.toUpperCase(), MARGIN, doc.y);
    doc.moveDown(0.3);
    horizontalRule(doc);

    phaseActions.forEach((action) => {
      checkPageBreak(doc, 70);

      const diffColor = action.difficulty === "Easy" ? COLORS.savings : action.difficulty === "Medium" ? COLORS.medium : COLORS.high;
      const timeColor = action.timeframe === "Immediate" ? COLORS.critical : COLORS.textSecondary;

      doc.rect(MARGIN, doc.y, CONTENT_W, 52).fill(COLORS.navyMid);

      const x = MARGIN + 12;
      const rowY = doc.y;

      // Priority circle
      doc.circle(MARGIN + 20, rowY + 14, 10).fill(COLORS.electric);
      doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white)
        .text(String(action.priority), MARGIN + 15, rowY + 10, { width: 14, align: "center" });

      doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white)
        .text(action.action, x + 18, rowY + 4, { width: CONTENT_W - 50 });

      const tags = `${action.timeframe}  |  Difficulty: ${action.difficulty}${action.estimatedSavings ? `  |  Savings: ${formatDollar(action.estimatedSavings)}` : ""}`;
      doc.font("Helvetica").fontSize(8).fillColor(timeColor).text(tags, x + 18, rowY + 20, { width: CONTENT_W - 50 });

      doc.font("Helvetica").fontSize(9).fillColor(COLORS.textSecondary)
        .text(action.details, x + 18, rowY + 34, { width: CONTENT_W - 50, height: 14, ellipsis: true });

      doc.y = rowY + 60;
      doc.x = MARGIN;
    });
  });
}

// ── Phone Script ───────────────────────────────────────────────────────────
function renderPhoneScript(doc: PDFKit.PDFDocument, lines: string[]): void {
  if (!lines.length) return;

  checkPageBreak(doc, 120);
  sectionHeader(doc, "Phone Negotiation Script", "Read this word-for-word when calling");

  doc.rect(MARGIN, doc.y, CONTENT_W, 20).fill(COLORS.tableHeader);
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.white)
    .text("USE THIS EXACT SCRIPT — Studies show specific wording increases success rates by 40%", MARGIN + 10, doc.y + 6, { width: CONTENT_W - 20 });
  doc.y = doc.y + 28;

  lines.forEach((line, i) => {
    checkPageBreak(doc, 35);
    const lineY = doc.y;
    const bg = i % 2 === 0 ? COLORS.navyCard : COLORS.navyMid;
    doc.rect(MARGIN, lineY, CONTENT_W, 28).fill(bg);

    const isStage = line.startsWith("OPENING:") || line.startsWith("WHEN") || line.startsWith("ESCALATION:") || line.startsWith("CLOSING:");
    if (isStage) {
      const [tag, ...rest] = line.split(":");
      doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.electric).text(tag + ":", MARGIN + 10, lineY + 6);
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(COLORS.white)
        .text(rest.join(":").trim(), MARGIN + 80, lineY + 5, { width: CONTENT_W - 100, height: 18, ellipsis: true });
    } else {
      doc.font("Helvetica-Oblique").fontSize(10).fillColor(COLORS.textPrimary)
        .text(line, MARGIN + 10, lineY + 7, { width: CONTENT_W - 20, height: 18, ellipsis: true });
    }
    doc.y = lineY + 32;
    doc.x = MARGIN;
  });
}

// ── Email Template ─────────────────────────────────────────────────────────
function renderEmailTemplate(doc: PDFKit.PDFDocument, paragraphs: string[]): void {
  if (!paragraphs.length) return;

  checkPageBreak(doc, 120);
  sectionHeader(doc, "Email Negotiation Template", "Send this to begin a formal written dispute");

  doc.rect(MARGIN, doc.y, CONTENT_W, paragraphs.length * 28 + 20).fill(COLORS.navyCard);
  doc.rect(MARGIN, doc.y, 4, paragraphs.length * 28 + 20).fill(COLORS.violet);

  const startY = doc.y + 10;
  doc.y = startY;

  paragraphs.forEach((para, i) => {
    checkPageBreak(doc, 35);
    const isSubject = i === 0;
    doc.font(isSubject ? "Helvetica-Bold" : "Helvetica").fontSize(isSubject ? 10 : 9)
      .fillColor(isSubject ? COLORS.white : COLORS.textPrimary)
      .text(para, MARGIN + 14, doc.y, { width: CONTENT_W - 28 });
    doc.moveDown(0.4);
  });

  doc.y = doc.y + 16;
  doc.x = MARGIN;
}

// ── Questions to Ask ───────────────────────────────────────────────────────
function renderQuestions(doc: PDFKit.PDFDocument, questions: string[]): void {
  if (!questions.length) return;

  checkPageBreak(doc, 100);
  sectionHeader(doc, "Questions to Ask the Company");

  questions.forEach((q, i) => {
    checkPageBreak(doc, 30);
    const qY = doc.y;
    doc.rect(MARGIN, qY, 24, 22).fill(COLORS.electric);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.white).text(String(i + 1), MARGIN + 8, qY + 6);
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(COLORS.textPrimary)
      .text(`"${q}"`, MARGIN + 32, qY + 5, { width: CONTENT_W - 36 });
    doc.y = qY + 28;
    doc.x = MARGIN;
  });
}

// ── Page numbers ───────────────────────────────────────────────────────────
function addPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.textMuted)
      .text(
        `HiddenFeeAI Executive Audit Report  |  Page ${i + 1} of ${range.count}  |  Private & Confidential`,
        MARGIN, 770, { width: CONTENT_W, align: "center" }
      );
    // Bottom border
    doc.rect(MARGIN, 765, CONTENT_W, 0.5).fill(COLORS.navyBorder);
  }
}

// ── Main Export ────────────────────────────────────────────────────────────
export async function generatePdf(report: AuditReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 48, bottom: 56, left: MARGIN, right: MARGIN },
        bufferPages: true,
        info: {
          Title: `HiddenFeeAI Executive Audit — ${report.documentMetadata.documentType}`,
          Author: "HiddenFeeAI Intelligence Platform",
          Subject: "Financial Document Forensic Audit Report",
          Keywords: "hidden fees, financial audit, negotiation, consumer protection",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Cover Page
      renderCoverPage(doc, report);

      // Table of Contents / separator — addNewPage handles background + cursor reset
      addNewPage(doc);
      doc.rect(0, 0, PAGE_W, 6).fill(COLORS.electric);
      doc.x = MARGIN;
      doc.y = 60;

      // Executive Summary
      renderExecutiveSummary(doc, report);

      // Financial Dashboard
      renderFinancialDashboard(doc, report);

      // Hidden Fees
      if (report.hiddenFees.length > 0) {
        sectionHeader(doc, `Hidden Fees (${report.hiddenFees.length})`, "Undisclosed or poorly disclosed charges requiring dispute");
        report.hiddenFees.forEach((f, i) => renderFindingCard(doc, f, i, "Hidden Fee"));
      }

      // Questionable Charges
      if (report.questionableCharges.length > 0) {
        sectionHeader(doc, `Questionable Charges (${report.questionableCharges.length})`, "Charges that warrant review and potential dispute");
        report.questionableCharges.forEach((f, i) => renderFindingCard(doc, f, i, "Questionable Charge"));
      }

      // Contract Risks
      if (report.contractRisks.length > 0) {
        sectionHeader(doc, `Contract Risks (${report.contractRisks.length})`, "Clauses that create financial risk or unfavorable terms");
        report.contractRisks.forEach((f, i) => renderFindingCard(doc, f, i, "Contract Risk"));
      }

      // Mathematical Errors
      if (report.mathematicalErrors.length > 0) {
        checkPageBreak(doc, 120);
        sectionHeader(doc, `Mathematical Errors (${report.mathematicalErrors.length})`);
        report.mathematicalErrors.forEach((err: MathematicalError, i) => {
          checkPageBreak(doc, 80);
          const errY = doc.y;
          doc.rect(MARGIN, errY, CONTENT_W, 70).fill(COLORS.navyCard);
          doc.rect(MARGIN, errY, 3, 70).fill(COLORS.critical);
          const x = MARGIN + 12;
          doc.y = errY + 10;
          doc.font("Helvetica-Bold").fontSize(11).fillColor(COLORS.critical).text(`${i + 1}. ${err.title}`, x, doc.y);
          doc.font("Helvetica").fontSize(9).fillColor(COLORS.textSecondary)
            .text(`Expected: ${err.expectedValue != null ? formatDollar(err.expectedValue) : "N/A"}   Actual: ${err.actualValue != null ? formatDollar(err.actualValue) : "N/A"}   Discrepancy: ${err.discrepancy != null ? formatDollar(err.discrepancy) : "N/A"}`, x, doc.y);
          doc.font("Helvetica").fontSize(9).fillColor(COLORS.textPrimary).text(err.explanation, x, doc.y, { width: CONTENT_W - 24 });
          doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.savings).text(`→ ${err.recommendedAction}`, x, doc.y);
          doc.y = errY + 78;
          doc.x = MARGIN;
        });
      }

      // Negotiation Leverage
      renderNegotiationLeverage(doc, report.negotiationLeverage);

      // Action Plan
      renderActionPlan(doc, report.recommendedActions);

      // Questions to Ask
      renderQuestions(doc, report.questionsToAsk);

      // Phone Script
      renderPhoneScript(doc, report.phoneNegotiationScript);

      // Email Template
      renderEmailTemplate(doc, report.emailNegotiationTemplate);

      // Consumer Rights
      if (report.consumerRights.length > 0) {
        checkPageBreak(doc, 100);
        sectionHeader(doc, "Your Consumer Rights");
        report.consumerRights.forEach((cr, i) => {
          checkPageBreak(doc, 70);
          const crY = doc.y;
          doc.rect(MARGIN, crY, CONTENT_W, 60).fill(COLORS.navyMid);
          const x = MARGIN + 12;
          doc.y = crY + 8;
          doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.electricBright).text(`${i + 1}. ${cr.right}`, x, doc.y, { width: CONTENT_W - 24 });
          doc.font("Helvetica").fontSize(9).fillColor(COLORS.textPrimary).text(cr.description, x, doc.y, { width: CONTENT_W - 24 });
          doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.savings).text(`How to exercise: ${cr.howToExercise}`, x, doc.y, { width: CONTENT_W - 24, height: 14, ellipsis: true });
          if (cr.applicableLaw) {
            doc.font("Helvetica").fontSize(8).fillColor(COLORS.textMuted).text(`Law: ${cr.applicableLaw}`, x, doc.y);
          }
          doc.y = crY + 68;
          doc.x = MARGIN;
        });
      }

      // Final footer across all pages
      addPageNumbers(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}