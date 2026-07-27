import type { AuditReport, NegotiationStrategy } from "@/types/audit.js";
import PDFDocument from "pdfkit";

/**
 * Renders a negotiation strategy block for a finding.
 */
function renderNegotiation(doc: PDFKit.PDFDocument, strategy: NegotiationStrategy): void {
  doc.moveDown(0.3);
  const difficultyColor =
    strategy.difficulty === "Easy" ? "#059669" :
    strategy.difficulty === "Medium" ? "#f59e0b" : "#dc2626";

  // Difficulty badge
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#6366f1")
    .text("Negotiation Assistant", { indent: 10 });
  doc.font("Helvetica").fontSize(10).fillColor(difficultyColor)
    .text(`Difficulty: ${strategy.difficulty}`, { indent: 10 });

  // Steps
  if (strategy.steps.length > 0) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#52525b")
      .text("Steps:", { indent: 10 });
    for (const step of strategy.steps) {
      doc.font("Helvetica").fontSize(10).fillColor("#52525b")
        .text(`  • ${step}`, { indent: 15 });
    }
  }

  // Script
  if (strategy.script) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#52525b")
      .text("Suggested Script:", { indent: 10 });
    doc.font("Helvetica-Oblique").fontSize(10).fillColor("#6366f1")
      .text(strategy.script, { indent: 15 });
  }

  // Key points
  if (strategy.key_points.length > 0) {
    doc.moveDown(0.2);
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#52525b")
      .text("Key Points:", { indent: 10 });
    for (const point of strategy.key_points) {
      doc.font("Helvetica").fontSize(10).fillColor("#52525b")
        .text(`  • ${point}`, { indent: 15 });
    }
  }
}

/**
 * Renders a summary section header
 */
function renderSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
  doc.x = 60;
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#18181b").text(title);
  doc.moveDown(0.2);
}

/**
 * Generates a PDF buffer for an audit report using pdfkit.
 */
export async function generatePdf(report: AuditReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
        info: {
          Title: `HiddenFeeAI Audit - ${report.document_meta.document_type}`,
          Author: "HiddenFeeAI",
          Subject: "Financial Document Audit Report",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const { document_meta, risk_score, risk_level, financial_impact, potential_savings, findings, clean_document_summary } = report;
      const formattedDate = new Date(document_meta.analysis_date).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
      });

      const pageWidth = 492; // 612 - 60 - 60 margins
      const leftMargin = 60;

      // --- Header ---
      doc.font("Helvetica-Bold").fontSize(22).fillColor("#8b5cf6")
        .text("HiddenFeeAI", leftMargin, doc.y);
      doc.font("Helvetica").fontSize(13).fillColor("#71717a")
        .text("Audit Report");
      doc.moveDown(0.5);
      doc.font("Helvetica-Bold").fontSize(18).fillColor("#18181b")
        .text(`${document_meta.document_type} Audit`);
      doc.font("Helvetica").fontSize(10).fillColor("#a1a1aa")
        .text(`Issuer: ${document_meta.issuer ?? "N/A"}  |  Report ID: ${document_meta.report_id.slice(0, 8)}  |  ${formattedDate}`);
      doc.moveDown(1);

      // --- Risk Score row (side by side) ---
      renderSectionHeader(doc, "Risk Assessment");

      const riskY = doc.y;
      doc.font("Helvetica").fontSize(11).fillColor("#333333")
        .text(`Score: ${risk_score}/100`, leftMargin, riskY, { width: 200 });
      doc.font("Helvetica").fontSize(11).fillColor(risk_level === "High" ? "#dc2626" : risk_level === "Elevated" ? "#f59e0b" : "#059669")
        .text(`Level: ${risk_level}`, leftMargin + 150, riskY, { width: 150 });
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#059669")
        .text(`Savings: $${potential_savings.toLocaleString()}`, leftMargin + 300, riskY, { width: 200, align: "right" });
      doc.x = leftMargin; // reset cursor to left margin after absolute-positioned row
      doc.moveDown(1.2);

      // ── Determine if we have measurable financial amounts ──
      const hasMeasurableAmounts = findings.some(f => f.amount != null && f.amount > 0);
      const hasFindings = findings.length > 0;
      const criticalCount = findings.filter(f => f.severity === "Critical").length;

      if (hasMeasurableAmounts) {
        // ── SCENARIO A: Show financial impact table ──
        renderSectionHeader(doc, "Financial Impact");
        const tableLeft = leftMargin;

        const col1W = Math.round(pageWidth * 0.45);
        const col2W = Math.round(pageWidth * 0.30);
        const col3W = pageWidth - col1W - col2W;
        const col1X = tableLeft + 8;
        const col2X = tableLeft + col1W;
        const col3X = tableLeft + col1W + col2W;

        doc.rect(tableLeft, doc.y, pageWidth, 20).fill("#1e1b4b");
        const headerY = doc.y + 5;
        doc.fillColor("#e4e4e7").font("Helvetica-Bold").fontSize(10)
          .text("Category", col1X, headerY)
          .text("Amount", col2X, headerY, { width: col2W, align: "right" })
          .text("Status", col3X, headerY, { width: col3W - 8, align: "right" });
        doc.moveDown(2);

        const drawRow = (label: string, amount: string, status: string, labelColor: string, amtColor: string, statusColor: string, boldLabel = false) => {
          const y = doc.y;
          doc.fillColor(labelColor).font(boldLabel ? "Helvetica-Bold" : "Helvetica").fontSize(10)
            .text(label, col1X, y, { width: col1W - 4 });
          doc.fillColor(amtColor).font("Helvetica").fontSize(10)
            .text(amount, col2X, y, { width: col2W, align: "right" });
          doc.fillColor(statusColor).font("Helvetica").fontSize(10)
            .text(status, col3X, y, { width: col3W - 8, align: "right" });
          doc.moveDown(1.0);
        };

        drawRow("Original Total", `$${financial_impact.original_total.toLocaleString()}`, "Billed", "#333333", "#333333", "#71717a");
        drawRow("Questionable Charges", `$${financial_impact.questionable_charges_total.toLocaleString()}`, "Flagged", "#dc2626", "#dc2626", "#dc2626");
        if (financial_impact.corrected_total > 0 && financial_impact.original_total > 0) {
          drawRow("Corrected Total", `$${financial_impact.corrected_total.toLocaleString()}`, "Recommended", "#059669", "#059669", "#059669", true);
        }
        doc.x = leftMargin;
        doc.moveDown(1);
      } else if (hasFindings) {
        // ── SCENARIO B: Findings exist but amounts are N/A ──
        doc.x = leftMargin;
        renderSectionHeader(doc, "Impact Summary");

        doc.font("Helvetica").fontSize(10).fillColor("#333333")
          .text(`Findings Identified: ${findings.length}`, { indent: 10 });
        if (criticalCount > 0) {
          doc.font("Helvetica").fontSize(10).fillColor("#dc2626")
            .text(`Critical Findings: ${criticalCount}`, { indent: 10 });
        }
        doc.font("Helvetica").fontSize(10).fillColor("#333333")
          .text(`Overall Risk Level: ${risk_level}`, { indent: 10 })
          .text("Potential Financial Exposure: Not Quantifiable From the Document", { indent: 10 })
          .text("Verified Questionable Charges: No dollar amount identified", { indent: 10 })
          .text("Estimated Savings: Not calculated", { indent: 10 });

        doc.moveDown(1);
        doc.font("Helvetica-Oblique").fontSize(10).fillColor("#6366f1")
          .text("Several findings involve contract terms, pricing flexibility, or potential future charges rather than currently billed amounts. These risks may create financial exposure, but the document does not provide enough information to calculate a reliable dollar value.", { indent: 10 });

        doc.x = leftMargin;
        doc.moveDown(1);
      } else {
        // ── SCENARIO C: No findings, no measurable impact ──
        renderSectionHeader(doc, "Financial Impact");
        const tableLeft = leftMargin;

        const col1W = Math.round(pageWidth * 0.45);
        const col2W = Math.round(pageWidth * 0.30);
        const col3W = pageWidth - col1W - col2W;
        const col1X = tableLeft + 8;
        const col2X = tableLeft + col1W;
        const col3X = tableLeft + col1W + col2W;

        doc.rect(tableLeft, doc.y, pageWidth, 20).fill("#1e1b4b");
        const headerY = doc.y + 5;
        doc.fillColor("#e4e4e7").font("Helvetica-Bold").fontSize(10)
          .text("Category", col1X, headerY)
          .text("Amount", col2X, headerY, { width: col2W, align: "right" })
          .text("Status", col3X, headerY, { width: col3W - 8, align: "right" });
        doc.moveDown(2);

        const drawRow = (label: string, amount: string, status: string, labelColor: string, amtColor: string, statusColor: string, boldLabel = false) => {
          const y = doc.y;
          doc.fillColor(labelColor).font(boldLabel ? "Helvetica-Bold" : "Helvetica").fontSize(10)
            .text(label, col1X, y, { width: col1W - 4 });
          doc.fillColor(amtColor).font("Helvetica").fontSize(10)
            .text(amount, col2X, y, { width: col2W, align: "right" });
          doc.fillColor(statusColor).font("Helvetica").fontSize(10)
            .text(status, col3X, y, { width: col3W - 8, align: "right" });
          doc.moveDown(1.0);
        };

        drawRow("Original Total", `$${financial_impact.original_total.toLocaleString()}`, "Billed", "#333333", "#333333", "#71717a");
        drawRow("Questionable Charges", `$${financial_impact.questionable_charges_total.toLocaleString()}`, "Flagged", "#dc2626", "#dc2626", "#dc2626");
        drawRow("Corrected Total", `$${financial_impact.corrected_total.toLocaleString()}`, "Recommended", "#059669", "#059669", "#059669", true);
        doc.x = leftMargin;
        doc.moveDown(1);
      }

      // --- Findings ---
      renderSectionHeader(doc, `Findings (${findings.length})`);

      for (let i = 0; i < findings.length; i++) {
        const f = findings[i];
        const isHighRisk = f.severity === "Critical" || f.severity === "High";
        const severityColor = isHighRisk ? "#dc2626" : "#f59e0b";
        const amountStr = f.amount != null ? `$${f.amount.toLocaleString()}` : "N/A";

        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.x = leftMargin;
        doc.font("Helvetica-Bold").fontSize(12).fillColor("#18181b")
          .text(`${i + 1}. ${f.title}`);
        doc.font("Helvetica").fontSize(10).fillColor(severityColor)
          .text(`Severity: ${f.severity}  |  Amount: ${amountStr}  |  Category: ${f.category}`);
        doc.font("Helvetica").fontSize(10).fillColor("#52525b")
          .text(f.explanation, { indent: 10 });
        if (f.evidence) {
          doc.font("Helvetica-Oblique").fontSize(10).fillColor("#71717a")
            .text(`Evidence: "${f.evidence}"`, { indent: 10 });
        }
        doc.font("Helvetica").fontSize(10).fillColor("#6366f1")
          .text(f.recommended_action, { indent: 10 });

        // -- Negotiation Assistant per finding --
        if (f.negotiation_message) {
          doc.font("Helvetica-Oblique").fontSize(10).fillColor("#8b5cf6")
            .text(`Negotiation Tip: "${f.negotiation_message}"`, { indent: 10 });
        }
        if (f.negotiation_strategy) {
          renderNegotiation(doc, f.negotiation_strategy);
        }

        doc.moveDown(0.6);
      }

      // --- Clean Document Summary / Negotiation Assistant section ---
      if (clean_document_summary) {
        if (doc.y > 650) {
          doc.addPage();
        }

        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(16).fillColor("#8b5cf6")
          .text("Negotiation Assistant", { align: "center" });
        doc.moveDown(0.5);

        // Key terms
        if (clean_document_summary.key_terms.length > 0) {
          renderSectionHeader(doc, "Key Terms to Know");
          for (const term of clean_document_summary.key_terms) {
            doc.font("Helvetica").fontSize(10).fillColor("#52525b")
              .text(`  • ${term}`, { indent: leftMargin });
          }
        }

        // Negotiation opportunities
        if (clean_document_summary.negotiation_opportunities.length > 0) {
          renderSectionHeader(doc, "Negotiation Opportunities");
          for (const opp of clean_document_summary.negotiation_opportunities) {
            doc.font("Helvetica").fontSize(10).fillColor("#52525b")
              .text(`  • ${opp}`, { indent: leftMargin });
          }
        }

        // Questions to ask
        if (clean_document_summary.questions_to_ask.length > 0) {
          renderSectionHeader(doc, "Questions to Ask Your Provider");
          for (const q of clean_document_summary.questions_to_ask) {
            doc.font("Helvetica-Oblique").fontSize(10).fillColor("#6366f1")
              .text(`  ? ${q}`, { indent: leftMargin });
          }
        }

        // Money-saving suggestions
        if (clean_document_summary.money_saving_suggestions.length > 0) {
          renderSectionHeader(doc, "Money-Saving Suggestions");
          for (const s of clean_document_summary.money_saving_suggestions) {
            doc.font("Helvetica").fontSize(10).fillColor("#059669")
              .text(`  $$ ${s}`, { indent: leftMargin });
          }
        }
      }

      // --- Footer ---
      doc.moveDown(2);
      doc.font("Helvetica").fontSize(9).fillColor("#a1a1aa").text("Generated by HiddenFeeAI", { align: "center" });
      doc.font("Helvetica").fontSize(9).fillColor("#a1a1aa").text("Private AI Analysis - Document not stored", { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}