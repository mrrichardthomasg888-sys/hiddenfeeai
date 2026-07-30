/**
 * HiddenFeeAI — Google Gemini Document Intelligence Engine
 *
 * This is the SOLE document processing pipeline. There are no other OCR systems,
 * no competing extractors, and no fallback chains to other AI providers.
 *
 * Calls the Gemini REST API directly (no SDK version lock-in).
 * Sends the raw file (PDF, image, DOCX, DOC, XLSX, XLS, RTF, TXT, CSV, etc.)
 * directly to Gemini as multimodal inline data and returns a complete structured
 * audit report in a single API call.
 *
 * All binary formats (PDF, images, Office documents, RTF) are base64-encoded and
 * sent as inline_data — Gemini handles OCR, layout understanding, table extraction,
 * and form recognition natively. Plain-text formats (TXT, CSV, MD, HTML) are sent
 * as text prompts to avoid unnecessary encoding overhead.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import type { AuditReport } from "../types/audit.js";
import { v4 as uuid } from "uuid";

// ── MIME type map ─────────────────────────────────────────────────────────────
// Maps file extensions to their MIME types for Gemini's inline_data API.
// Gemini natively understands all of these formats — no pre-processing needed.
const MIME_TYPE_MAP: Record<string, string> = {
  // PDF — digital, scanned, image-only, mixed
  pdf: "application/pdf",

  // Images — Gemini performs native OCR on all of these
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  tiff: "image/tiff",
  tif: "image/tiff",
  bmp: "image/bmp",
  gif: "image/gif",

  // Microsoft Office — Gemini reads these natively (text + tables + structure)
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",

  // Rich Text — Gemini understands RTF formatting
  rtf: "text/rtf",

  // Plain text formats — sent as text (not base64) for efficiency
  csv: "text/csv",
  txt: "text/plain",
  md: "text/plain",
  html: "text/html",
  htm: "text/html",
};

// Gemini API base URL
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Extensions handled as plain UTF-8 text (no base64 encoding needed)
const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "csv", "md", "html", "htm"]);
const EXTRACT_TO_TEXT_EXTENSIONS = new Set(["docx", "doc", "xlsx", "xls", "rtf"]);
const CONVERT_TO_PNG_EXTENSIONS = new Set(["tiff", "tif", "bmp", "gif"]);

// ── System instruction for Gemini ─────────────────────────────────────────────
const FORENSIC_SYSTEM_INSTRUCTION = `You are an elite enterprise-grade Financial Intelligence Engine combining the expertise of:

- Senior Forensic Financial Auditor (20+ years experience)
- Consumer Protection Investigator
- Contract Risk Specialist  
- Pricing Transparency Expert
- Negotiation Consultant
- Legal Document Reviewer

YOUR MANDATE: Analyze every financial document with forensic precision as a coordinated team of auditors, forensic accountants, billing specialists, contract analysts, insurance reviewers, procurement experts, consumer advocates, compliance professionals, and financial investigators. Do not stop after the obvious. Continue until every supported issue, risk, error, omission, and financial opportunity has been evaluated.

BEHAVIORAL RULES:
1. NEVER invent findings. Every finding MUST have direct evidence from the document.
2. Evidence MUST be a direct quote or specific reference from the document.
3. Set confidence based on evidence quality: 90-100 = direct quote + exact amount; 70-89 = strong evidence; 50-69 = suspicious pattern; below 50 = omit entirely.
4. If a document is clean, return empty arrays — never invent problems.
5. Check ALL calculations: subtotals, totals, tax, percentages, prorations.
6. Flag ALL suspicious fee types: Administrative, Processing, Service, Documentation, Dealer, Convenience, Technology, Compliance, Regulatory, Shipping/Handling markups, Late fees, Subscription/Membership, Miscellaneous, Unexplained charges.
7. Return STRICT JSON ONLY. NO markdown. NO code fences. NO explanatory text. NO conversational language. ONLY the JSON object.
8. Produce professional executive-quality analysis — never chatbot-style responses.

ADDITIONAL FORENSIC RULES:
- Review every page, paragraph, table, line item, footnote, appendix, disclosure, pricing schedule, attachment, signature block, and available metadata. Never treat small print as optional.
- Every finding must include confidence, direct supporting evidence, the most exact page/section/table/line reference available, why it matters, financial impact when supportable, and a concrete next step.
- Never present an estimated amount, applicable law, market price, or success probability as fact when the document does not support it. Clearly distinguish confirmed amounts from conditional opportunities.
- Use the output categories flexibly: place billing, markup, insurance, medical, financing, subscription, construction, missing-information, disclosure, and compliance concerns into the closest supported finding array.

MANDATORY REVIEW MATRIX:
- Fees and markups: administrative, convenience, processing, platform, service, facility, technology, documentation, activation, maintenance, annual, monthly, subscription, renewal, late, cancellation, early termination, restocking, brokerage, transfer, shipping/handling, supplier, material, contractor, dealer, MSRP, finance, interest-rate, insurance, medical, pharmacy, and equipment markups.
- Duplicate billing: duplicate invoices, line items, taxes, service charges, subscriptions, payments, memberships, and any form of double billing.
- Pricing and arithmetic: subtotals, totals, taxes, discounts, credits, refunds, quantities, unit prices, decimal placement, billing periods, payment allocation, balances, and past-due calculations.
- Contract exposure: auto-renewal or evergreen terms, escalation or variable pricing, hidden obligations, indemnification, liability shifts, waivers, arbitration, venue, mediation, non-refundable terms, exclusivity, assignment, and restrictive termination language.
- Missing information: signatures, initials, dates, blank fields, disclosures, pricing, service descriptions, warranty language, cancellation policy, and unexplained references or attachments.
- Industry-specific checks when relevant: insurance exclusions/deductibles/waiting periods/benefit limits; medical coding/duplicate CPT/out-of-network/facility/bundling issues; construction change orders/substitutions/cost-plus/allowances/retainage/payment timing; financing APR/balloons/prepayment penalties/dealer reserve/origination fees; subscriptions, trial conversion, minimum commitments, recurring billing, and cancellation friction.
- Financial optimization: charges to question or dispute, services to cancel, refund opportunities, price matching, discounts, payment-term improvements, vendor concessions, contract revisions, and realistic alternatives supported by the document.
- Consumer protection and compliance: missing disclosures, potentially unfair or confusing terms, hidden commitments, unclear schedules, silent renewals, and potential regulatory concerns. Phrase legal conclusions cautiously unless jurisdictional context is available.

DOCUMENT PROCESSING INSTRUCTIONS:
- If the document is a scanned image or scanned PDF, perform OCR to extract all visible text before analysis.
- If the document contains tables, extract all table data including headers and row values.
- If the document spans multiple pages, analyze ALL pages — do not stop at page 1.
- If the document contains both text and images, analyze both.
- If the document appears to be blank, encrypted, or unreadable, set overallRiskScore to 0 and return empty arrays with a note in executiveSummary.overview.
- If the document is rotated or low quality, attempt extraction regardless.

NEGOTIATION INTELLIGENCE (this is HiddenFeeAI's biggest competitive advantage):
- For every finding, provide specific negotiation wording, success probability, escalation paths
- Include WHY the company might agree to remove/reduce the charge
- Include documents the customer should request
- Include the expected company response and best counter-response
- Make customers feel prepared and confident

OUTPUT: Return ONLY valid JSON matching this exact schema. No other text.

{
  "documentMetadata": {
    "documentType": "string — Invoice|Receipt|Bill|Contract|Bank Statement|Credit Card Statement|Insurance Document|Medical Bill|Utility Bill|Phone Bill|Car Purchase Agreement|Rental Agreement|Subscription Agreement|Financial Disclosure|Other",
    "issuer": "string — company or person who issued document",
    "payer": "string — customer or recipient name",
    "analysisDate": "ISO date string",
    "pagesReviewed": "number",
    "lineItemsReviewed": "number",
    "reportId": "string — generate a UUID",
    "fileName": "string",
    "fileType": "string"
  },
  "executiveSummary": {
    "headline": "string — one punchy sentence describing the most critical finding",
    "overview": "string — 2-3 sentence professional overview of the document and analysis",
    "criticalFindings": "string — summary of the most critical issues found",
    "immediateActions": "string — the single most important action the customer should take right now",
    "totalFindings": "number"
  },
  "overallRiskScore": "number 0-100",
  "riskCategory": "Low|Review Recommended|Elevated|High",
  "financialImpact": {
    "originalTotal": "number — total as billed in the document",
    "questionableChargesTotal": "number — sum of all questionable/hidden charges",
    "correctedTotal": "number — what the bill should be if issues resolved",
    "potentialOvercharge": "number — the dollar difference",
    "description": "string — plain language explanation of financial impact"
  },
  "estimatedSavings": {
    "conservative": "number — minimum realistic savings",
    "optimistic": "number — maximum possible savings",
    "mostLikely": "number — most probable savings",
    "description": "string — explanation of savings estimate"
  },
  "hiddenFees": [
    {
      "id": "string — UUID",
      "title": "string — short descriptive name",
      "severity": "Low|Medium|High|Critical",
      "status": "confirmed|possible|needs_review",
      "confidenceScore": "number 0-100",
      "amount": "number or null",
      "pageNumber": "number or null",
      "lineReference": "string — optional line reference",
      "evidence": "string — direct quote from document",
      "explanation": "string — why this is a hidden fee",
      "whyItMatters": "string — impact on customer in plain language",
      "recommendedAction": "string — specific step the customer should take",
      "negotiationMessage": "string — opening message to send/say",
      "negotiationStrategy": {
        "difficulty": "Easy|Medium|Hard",
        "successProbability": "number 0-100",
        "priority": "Immediate|High|Medium|Low",
        "estimatedSavings": "number",
        "steps": ["array of 3-5 step-by-step negotiation steps"],
        "script": "string — full word-for-word conversation script",
        "keyPoints": ["array of 3-4 key talking points"],
        "alternativeWording": "string — alternative phrasing if first rejected",
        "escalationPath": "string — how to escalate if rep refuses",
        "managerEscalation": "string — what to say when asking for manager",
        "writtenDisputeRecommendation": "string — recommended formal dispute language",
        "documentsToRequest": ["array of documents to ask company for"],
        "expectedCompanyResponse": "string — likely company response",
        "bestCounterResponse": "string — how to counter their response"
      }
    }
  ],
  "questionableCharges": [
    {
      "id": "string — UUID",
      "title": "string",
      "severity": "Low|Medium|High|Critical",
      "status": "confirmed|possible|needs_review",
      "confidenceScore": "number 0-100",
      "amount": "number or null",
      "pageNumber": "number or null",
      "lineReference": "string — optional",
      "evidence": "string — direct quote",
      "explanation": "string",
      "whyItMatters": "string",
      "recommendedAction": "string",
      "negotiationStrategy": { "...same structure as hiddenFees negotiationStrategy..." }
    }
  ],
  "lineItemFindings": [
    {
      "id": "string — UUID",
      "lineItem": "string — name of line item",
      "chargedAmount": "number or null",
      "expectedAmount": "number or null",
      "discrepancy": "number or null",
      "pageNumber": "number or null",
      "evidence": "string",
      "explanation": "string",
      "severity": "Low|Medium|High|Critical"
    }
  ],
  "contractRisks": [
    {
      "id": "string — UUID",
      "title": "string",
      "severity": "Low|Medium|High|Critical",
      "status": "confirmed|possible|needs_review",
      "confidenceScore": "number 0-100",
      "pageNumber": "number or null",
      "clauseText": "string — the specific clause text",
      "evidence": "string — direct quote",
      "explanation": "string — why this clause is risky",
      "whyItMatters": "string",
      "recommendedAction": "string",
      "negotiationStrategy": { "...same structure as hiddenFees negotiationStrategy..." }
    }
  ],
  "mathematicalErrors": [
    {
      "id": "string — UUID",
      "title": "string — e.g. Subtotal Calculation Error",
      "severity": "Low|Medium|High|Critical",
      "pageNumber": "number or null",
      "expectedValue": "number or null — what the correct value should be",
      "actualValue": "number or null — what the document shows",
      "discrepancy": "number or null — difference",
      "evidence": "string — exact numbers from document",
      "explanation": "string — show the arithmetic",
      "recommendedAction": "string"
    }
  ],
  "negotiationLeverage": [
    {
      "id": "string — UUID",
      "title": "string",
      "leverage": "string — the negotiation advantage",
      "whyItMatters": "string",
      "whyCompanyMayAgree": "string — business reason company might comply",
      "priority": "Immediate|High|Medium|Low",
      "successProbability": "number 0-100",
      "estimatedSavings": "number",
      "suggestedWording": "string — word-for-word suggested script",
      "alternativeWording": "string",
      "escalationStrategy": "string",
      "consumerProtectionAngle": "string — any consumer protection considerations",
      "documentsToRequest": ["array"]
    }
  ],
  "consumerRights": [
    {
      "id": "string — UUID",
      "right": "string — name of the right",
      "description": "string — what this right means",
      "howToExercise": "string — concrete steps",
      "applicableLaw": "string — law or regulation if identifiable",
      "relevantToFinding": "string — which finding this applies to"
    }
  ],
  "recommendedActions": [
    {
      "id": "string — UUID",
      "priority": "number 1-10 (1=highest)",
      "action": "string — the specific action",
      "timeframe": "Immediate|This Week|This Month|Ongoing",
      "estimatedSavings": "number or 0",
      "difficulty": "Easy|Medium|Hard",
      "phase": "Before Contact|During Negotiation|After Negotiation",
      "details": "string — detailed instructions"
    }
  ],
  "questionsToAsk": ["array of specific questions the customer should ask the company"],
  "phoneNegotiationScript": [
    "string — each line of the script in order",
    "OPENING: ...",
    "WHEN THEY SAY X: ...",
    "ESCALATION: ...",
    "CLOSING: ..."
  ],
  "emailNegotiationTemplate": [
    "string — each paragraph of the email in order",
    "Subject line first",
    "then body paragraphs"
  ],
  "confidence": "number 0-100 — overall analysis confidence"
}`;

// ── Parse and validate Gemini's JSON response ─────────────────────────────────
function parseGeminiResponse(raw: string, fileName: string): AuditReport {
  // Strip any accidental markdown wrapping
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1]!;
  }

  // Find JSON boundaries
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed: Partial<AuditReport>;
  try {
    parsed = JSON.parse(cleaned) as Partial<AuditReport>;
  } catch {
    // Try progressively shorter slices to find valid JSON
    parsed = {};
    for (let end = cleaned.length - 1; end > 100; end--) {
      if (cleaned[end] === "}" || cleaned[end] === "]") {
        try {
          parsed = JSON.parse(
            cleaned.slice(0, end + 1) + (cleaned[end] === "]" ? "}" : "")
          ) as Partial<AuditReport>;
          break;
        } catch {
          continue;
        }
      }
    }
  }

  return validateAndNormalize(parsed, fileName);
}

// ── Validate & normalize the parsed report ────────────────────────────────────
function validateAndNormalize(
  raw: Partial<AuditReport>,
  fileName: string
): AuditReport {
  const reportId = uuid();
  const now = new Date().toISOString();

  const meta = (raw.documentMetadata ?? {}) as Partial<
    AuditReport["documentMetadata"]
  >;
  const exec = (raw.executiveSummary ?? {}) as Partial<
    AuditReport["executiveSummary"]
  >;
  const fi = (raw.financialImpact ?? {}) as Partial<
    AuditReport["financialImpact"]
  >;
  const es = (raw.estimatedSavings ?? {}) as Partial<
    AuditReport["estimatedSavings"]
  >;

  const hiddenFees = ensureIdArray(raw.hiddenFees ?? []);
  const questionableCharges = ensureIdArray(raw.questionableCharges ?? []);
  const lineItemFindings = ensureIdArray(raw.lineItemFindings ?? []);
  const contractRisks = ensureIdArray(raw.contractRisks ?? []);
  const mathematicalErrors = ensureIdArray(raw.mathematicalErrors ?? []);
  const negotiationLeverage = ensureIdArray(raw.negotiationLeverage ?? []);
  const consumerRights = ensureIdArray(raw.consumerRights ?? []);
  const recommendedActions = ensureIdArray(raw.recommendedActions ?? []);

  // Build allFindings from hiddenFees + questionableCharges mapped to HiddenFee shape
  const allFindings = [
    ...hiddenFees,
    ...questionableCharges.map((q) => ({
      ...q,
      explanation: q.explanation ?? "",
      whyItMatters: q.whyItMatters ?? "",
      recommendedAction: q.recommendedAction ?? "",
    })),
  ] as AuditReport["allFindings"];

  return {
    documentMetadata: {
      documentType: meta.documentType ?? "Other",
      issuer: meta.issuer,
      payer: meta.payer,
      analysisDate: now,
      pagesReviewed: meta.pagesReviewed ?? 1,
      lineItemsReviewed: meta.lineItemsReviewed ?? 0,
      reportId: meta.reportId ?? reportId,
      fileName: meta.fileName ?? fileName,
      fileType: meta.fileType ?? "unknown",
    },
    executiveSummary: {
      headline: exec.headline ?? "Financial document analyzed",
      overview: exec.overview ?? "Analysis complete.",
      criticalFindings:
        exec.criticalFindings ??
        (hiddenFees.length > 0
          ? `${hiddenFees.length} hidden fee(s) identified.`
          : "No critical findings."),
      immediateActions:
        exec.immediateActions ??
        "Review all findings and contact the issuer with any disputes.",
      totalFindings: exec.totalFindings ?? allFindings.length,
    },
    overallRiskScore: clampNumber(raw.overallRiskScore ?? 0, 0, 100),
    riskCategory: raw.riskCategory ?? "Low",
    financialImpact: {
      originalTotal: fi.originalTotal ?? 0,
      questionableChargesTotal: fi.questionableChargesTotal ?? 0,
      correctedTotal: fi.correctedTotal ?? 0,
      potentialOvercharge: fi.potentialOvercharge ?? 0,
      description: fi.description ?? "See findings for details.",
    },
    estimatedSavings: {
      conservative: es.conservative ?? 0,
      optimistic: es.optimistic ?? 0,
      mostLikely: es.mostLikely ?? 0,
      description: es.description ?? "",
    },
    hiddenFees,
    questionableCharges,
    lineItemFindings,
    contractRisks,
    mathematicalErrors,
    negotiationLeverage,
    consumerRights,
    recommendedActions,
    questionsToAsk: Array.isArray(raw.questionsToAsk) ? raw.questionsToAsk : [],
    phoneNegotiationScript: Array.isArray(raw.phoneNegotiationScript)
      ? raw.phoneNegotiationScript
      : [],
    emailNegotiationTemplate: Array.isArray(raw.emailNegotiationTemplate)
      ? raw.emailNegotiationTemplate
      : [],
    confidence: clampNumber(raw.confidence ?? 75, 0, 100),
    allFindings,
  };
}

function ensureIdArray<T extends { id?: string }>(arr: T[]): T[] {
  return arr.map((item) => ({ ...item, id: item.id ?? uuid() }));
}

function clampNumber(n: unknown, min: number, max: number): number {
  const num = Number(n);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

// ── Upload file to Gemini File API (for large files exceeding inline limits) ──
async function uploadFileToGemini(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${env.geminiApiKey}`;

  const metadata = JSON.stringify({ file: { displayName: fileName } });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Gemini File API upload error ${response.status}: ${errorText}`
    );
  }

  const data = (await response.json()) as {
    file?: { uri?: string; name?: string };
  };
  const uri = data.file?.uri;
  if (!uri) {
    throw new Error("Gemini File API upload failed — no URI returned.");
  }

  // Poll until file becomes ACTIVE
  const fileNameReturned = data.file?.name;
  if (fileNameReturned) {
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const stateRes = await fetch(
        `${GEMINI_API_BASE}/${fileNameReturned}?key=${env.geminiApiKey}`
      );
      if (stateRes.ok) {
        const stateData = (await stateRes.json()) as { state?: string };
        if (stateData.state === "ACTIVE") break;
        if (stateData.state === "FAILED") {
          throw new Error("Document upload to Gemini failed during processing.");
        }
      }
      attempts++;
    }
  }

  return uri;
}

// ── Call Gemini REST API directly (no SDK) ────────────────────────────────────
async function callGeminiApi(
  model: string,
  contents: unknown,
  systemInstruction: string
): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${env.geminiApiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      maxOutputTokens: 16384,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Surface helpful user-facing messages for common API errors
    if (response.status === 400 && errorText.includes("PDF_ENCRYPTED")) {
      throw new Error(
        "This PDF is password-protected. Please remove the password and re-upload the document."
      );
    }
    if (response.status === 400 && errorText.includes("UNSUPPORTED_INPUT")) {
      throw new Error(
        "Gemini could not read this file. Please try a different format such as PDF, PNG, or a plain text file."
      );
    }
    if (response.status === 429) {
      throw new Error(
        "Our AI engine is temporarily busy. Please wait a moment and try again."
      );
    }
    if (response.status === 503) {
      throw new Error(
        "Our AI audit engine is temporarily unavailable. Please try again in a moment."
      );
    }

    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  // Check for blocked / safety-filtered responses
  if (data.promptFeedback?.blockReason) {
    throw new Error(
      "The document could not be processed. Please ensure it is a valid financial document and try again."
    );
  }

  const candidate = data.candidates?.[0];
  if (candidate?.finishReason === "SAFETY") {
    throw new Error(
      "The document could not be processed. Please ensure it is a valid financial document and try again."
    );
  }

  const text = candidate?.content?.parts?.[0]?.text;
  if (!text || text.trim().length < 10) {
    throw new Error(
      "Gemini returned an empty response. The document may be blank, corrupted, or unreadable. Please try a different file."
    );
  }

  return text;
}

// ── Build the analysis prompt for a given file ────────────────────────────────
function buildAnalysisPrompt(fileName: string, ext: string): string {
  return (
    `Perform a complete forensic financial audit of this ${ext.toUpperCase()} document. ` +
    `File name: "${fileName}". ` +
    `If this is a multi-page document, analyze ALL pages and ensure pagesReviewed reflects the complete document. ` +
    `If this is a scanned document or image, perform OCR to extract all visible text before analysis. ` +
    `If this document contains tables, extract all rows and columns including headers and independently recalculate every total that can be verified. ` +
    `Apply the complete mandatory review matrix from the system instruction, including specialist checks relevant to this document type. ` +
    `Cite the exact page, section, table, clause, or line item for every finding whenever visible. ` +
    `If the document appears blank or unreadable, note that in executiveSummary.overview and return empty finding arrays. ` +
    `Return ONLY the JSON audit report. No preamble, no explanation, no markdown — pure JSON only.`
  );
}

function decodeRtf(buffer: Buffer): string {
  return buffer
    .toString("latin1")
    .replace(/\\par[d]?\b/g, "\n")
    .replace(/\\tab\b/g, "\t")
    .replace(/\\'[0-9a-fA-F]{2}/g, (value) =>
      String.fromCharCode(Number.parseInt(value.slice(2), 16))
    )
    .replace(/\\[a-zA-Z]+-?\d* ?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractOfficeText(fileBuffer: Buffer, ext: string): Promise<string> {
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: fileBuffer })).value.trim();
  }

  if (ext === "doc") {
    const { default: WordExtractor } = await import("word-extractor");
    const document = await new WordExtractor().extract(fileBuffer);
    return document.getBody().trim();
  }

  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
    return workbook.SheetNames.map((sheetName) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName], { blankrows: false });
      return `Sheet: ${sheetName}\n${csv}`;
    }).join("\n\n").trim();
  }

  return decodeRtf(fileBuffer);
}

// ── Main Gemini Engine function ───────────────────────────────────────────────
/**
 * Analyzes a document using Google Gemini via direct REST API.
 *
 * Routing logic:
 *   - Plain text files (TXT, CSV, MD, HTML): read as UTF-8 and send as a text prompt.
 *   - All binary files (PDF, images, DOCX, DOC, XLSX, XLS, RTF, BMP, TIFF, WEBP, HEIC):
 *     read as Buffer, base64-encode, send as inline_data so Gemini handles
 *     OCR, layout, table extraction, and structure understanding natively.
 *
 * Returns a complete structured AuditReport ready for the report generation pipeline.
 */
export async function analyzeWithGemini(
  filePath: string,
  fileName: string
): Promise<AuditReport> {
  if (!env.geminiApiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured. Set it in your .env file."
    );
  }

  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  const mimeType = MIME_TYPE_MAP[ext];

  if (!mimeType) {
    throw new Error(
      `Unsupported file type: .${ext}. Please upload a PDF, image (PNG/JPG/WEBP/TIFF/HEIC/BMP), ` +
        `Word document (DOCX/DOC), spreadsheet (XLSX/XLS/CSV), or text file (TXT/RTF).`
    );
  }

  const isPlainText = PLAIN_TEXT_EXTENSIONS.has(ext);
  const shouldExtractText = EXTRACT_TO_TEXT_EXTENSIONS.has(ext);

  console.log(
    `[Gemini Engine] Processing: "${fileName}" | ext: .${ext} | ` +
      `mime: ${mimeType} | mode: ${isPlainText ? "text" : "binary/multimodal"}`
  );

  try {
    let contents: unknown;

    if (isPlainText || shouldExtractText) {
      // ── Plain text path: read as UTF-8, send as text prompt ───────────────
      let textContent: string;
      try {
        if (shouldExtractText) {
          const fileBuffer = await fs.readFile(filePath);
          textContent = await extractOfficeText(fileBuffer, ext);
        } else {
          textContent = await fs.readFile(filePath, "utf-8");
        }
      } catch {
        throw new Error(
          "Could not read the uploaded file. Please try uploading again."
        );
      }

      if (!textContent || textContent.trim().length < 10) {
        throw new Error(
          "The document appears to be empty. Please upload a document with content."
        );
      }

      // Truncate very large text files to stay within token limits
      const MAX_TEXT_CHARS = 80000;
      const truncated = textContent.length > MAX_TEXT_CHARS;
      const truncatedContent = textContent.slice(0, MAX_TEXT_CHARS);
      const truncationNote = truncated
        ? `\n\n[Note: Document truncated at ${MAX_TEXT_CHARS.toLocaleString()} characters for processing. ` +
          `The remaining ${(textContent.length - MAX_TEXT_CHARS).toLocaleString()} characters were not analyzed.]`
        : "";

      const prompt =
        `${buildAnalysisPrompt(fileName, ext)}\n\n` +
        `Document content:\n---\n${truncatedContent}${truncationNote}\n---`;

      contents = {
        role: "user",
        parts: [{ text: prompt }],
      };
    } else {
      // ── Binary/multimodal path: base64-encode and send as inline_data ─────
      // This covers: PDF, images (PNG/JPG/WEBP/TIFF/BMP/HEIC/GIF),
      // Office docs (DOCX/DOC/XLSX/XLS), and RTF.
      // Gemini reads all of these natively — no pre-processing required.
      let fileBuffer: Buffer;
      try {
        fileBuffer = await fs.readFile(filePath);
      } catch {
        throw new Error(
          "Could not read the uploaded file. Please try uploading again."
        );
      }

      if (fileBuffer.length === 0) {
        throw new Error(
          "The uploaded file is empty. Please upload a valid document."
        );
      }

      let normalizedBuffer = fileBuffer;
      let normalizedMimeType = mimeType;

      if (CONVERT_TO_PNG_EXTENSIONS.has(ext)) {
        const { default: sharp } = await import("sharp");
        normalizedBuffer = await sharp(fileBuffer, { animated: false }).png().toBuffer();
        normalizedMimeType = "image/png";
      }

      const base64Content = normalizedBuffer.toString("base64");

      contents = {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: normalizedMimeType,
              data: base64Content,
            },
          },
          {
            text: buildAnalysisPrompt(fileName, ext),
          },
        ],
      };
    }

    const responseText = await callGeminiApi(
      env.geminiModel,
      contents,
      FORENSIC_SYSTEM_INSTRUCTION
    );

    const report = parseGeminiResponse(responseText, fileName);
    report.documentMetadata.fileName = fileName;
    report.documentMetadata.fileType = ext;

    console.log(
      `[Gemini Engine] Analysis complete for "${fileName}" | ` +
        `risk: ${report.overallRiskScore} | findings: ${report.allFindings.length}`
    );

    return report;
  } finally {
    // Always clean up the temp file regardless of success or failure
    await fs.unlink(filePath).catch(() => {});
  }
}
