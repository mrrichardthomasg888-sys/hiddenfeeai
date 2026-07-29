/**
 * HiddenFeeAI — Google Gemini Document Intelligence Engine
 *
 * This is the SOLE document processing pipeline. There are no other OCR systems,
 * no competing extractors, and no fallback chains to other AI providers.
 *
 * Calls the Gemini REST API directly (no SDK version lock-in).
 * Sends the raw file (PDF, image, DOCX, TXT, CSV, XLSX, etc.) and
 * returns a complete structured audit report in a single multimodal API call.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { env } from "@/config/env.js";
import type { AuditReport } from "@/types/audit.js";
import { v4 as uuid } from "uuid";

// ── Extract text from DOCX (it's a ZIP containing word/document.xml) ──────
async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    // Use PowerShell to extract text from DOCX
    const result = execSync(
      `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[System.IO.Compression.ZipFile]::OpenRead('${filePath.replace(/'/g, "''")}'); $entry=$zip.GetEntry('word/document.xml'); $reader=New-Object System.IO.StreamReader($entry.Open()); $content=$reader.ReadToEnd(); $reader.Close(); $zip.Dispose(); $content"`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
    );
    // Strip XML tags to get plain text
    return result
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    return "";
  }
}

// ── Extract text from XLSX (it's a ZIP containing sheet XMLs) ──────────────
async function extractTextFromXlsx(filePath: string): Promise<string> {
  try {
    const result = execSync(
      `powershell -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $zip=[System.IO.Compression.ZipFile]::OpenRead('${filePath.replace(/'/g, "''")}'); $text=''; foreach($entry in $zip.Entries){ if($entry.FullName -match 'sharedStrings.xml'){ $reader=New-Object System.IO.StreamReader($entry.Open()); $text=$reader.ReadToEnd(); $reader.Close() } }; $zip.Dispose(); $text"`,
      { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 }
    );
    return result
      .replace(/<si[^>]*>/g, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } catch {
    return "";
  }
}

// ── MIME type map ───────────────────────────────────────────────────────────
const MIME_TYPE_MAP: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  tiff: "image/tiff",
  tif: "image/tiff",
  gif: "image/gif",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
  md: "text/plain",
  html: "text/html",
  htm: "text/html",
};

// Gemini API base URL — uses the current v1beta endpoint
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ── System instruction for Gemini ──────────────────────────────────────────
const FORENSIC_SYSTEM_INSTRUCTION = `You are an elite enterprise-grade Financial Intelligence Engine combining the expertise of:

- Senior Forensic Financial Auditor (20+ years experience)
- Consumer Protection Investigator
- Contract Risk Specialist  
- Pricing Transparency Expert
- Negotiation Consultant
- Legal Document Reviewer

YOUR MANDATE: Analyze every financial document with forensic precision. Find hidden fees, deceptive charges, mathematical errors, risky contract clauses, and negotiation opportunities.

BEHAVIORAL RULES:
1. NEVER invent findings. Every finding MUST have direct evidence from the document.
2. Evidence MUST be a direct quote or specific reference from the document.
3. Set confidence based on evidence quality: 90-100 = direct quote + exact amount; 70-89 = strong evidence; 50-69 = suspicious pattern; below 50 = omit entirely.
4. If a document is clean, return empty arrays — never invent problems.
5. Check ALL calculations: subtotals, totals, tax, percentages, prorations.
6. Flag ALL suspicious fee types: Administrative, Processing, Service, Documentation, Dealer, Convenience, Technology, Compliance, Regulatory, Shipping/Handling markups, Late fees, Subscription/Membership, Miscellaneous, Unexplained charges.
7. Return STRICT JSON ONLY. NO markdown. NO code fences. NO explanatory text. NO conversational language. ONLY the JSON object.
8. Produce professional executive-quality analysis — never chatbot-style responses.

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

// ── Parse and validate Gemini's JSON response ──────────────────────────────
function parseGeminiResponse(raw: string, fileName: string): AuditReport {
  // Strip any accidental markdown wrapping
  let cleaned = raw.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1];
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
    for (let end = cleaned.length - 1; end > 100; end--) {
      if (cleaned[end] === "}" || cleaned[end] === "]") {
        try {
          parsed = JSON.parse(cleaned.slice(0, end + 1) + (cleaned[end] === "]" ? "}" : "")) as Partial<AuditReport>;
          break;
        } catch {
          continue;
        }
      }
    }
    // If still not parsed, use empty report
    parsed = {};
  }

  return validateAndNormalize(parsed, fileName);
}

// ── Validate & normalize the parsed report ─────────────────────────────────
function validateAndNormalize(raw: Partial<AuditReport>, fileName: string): AuditReport {
  const reportId = uuid();
  const now = new Date().toISOString();

  const meta = (raw.documentMetadata ?? {}) as Partial<AuditReport["documentMetadata"]>;
  const exec = (raw.executiveSummary ?? {}) as Partial<AuditReport["executiveSummary"]>;
  const fi = (raw.financialImpact ?? {}) as Partial<AuditReport["financialImpact"]>;
  const es = (raw.estimatedSavings ?? {}) as Partial<AuditReport["estimatedSavings"]>;

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
      criticalFindings: exec.criticalFindings ?? (hiddenFees.length > 0 ? `${hiddenFees.length} hidden fee(s) identified.` : "No critical findings."),
      immediateActions: exec.immediateActions ?? "Review all findings and contact the issuer with any disputes.",
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
    phoneNegotiationScript: Array.isArray(raw.phoneNegotiationScript) ? raw.phoneNegotiationScript : [],
    emailNegotiationTemplate: Array.isArray(raw.emailNegotiationTemplate) ? raw.emailNegotiationTemplate : [],
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

// ── Upload file to Gemini File API (for unsupported inline MIME types) ──────
async function uploadFileToGemini(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<string> {
  // Use multipart upload
  const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
  const url = `https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=multipart&key=${env.geminiApiKey}`;

  const metadata = JSON.stringify({ file: { displayName: fileName } });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
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
    throw new Error(`Gemini File API upload error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as { file?: { uri?: string; name?: string } };
  const uri = data.file?.uri;
  if (!uri) {
    throw new Error("Gemini File API upload failed — no URI returned.");
  }

  // Poll for file to become ACTIVE
  const fileNameReturned = data.file?.name;
  if (fileNameReturned) {
    let attempts = 0;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const stateRes = await fetch(
        `${GEMINI_API_BASE}/${fileNameReturned}?key=${env.geminiApiKey}`,
      );
      if (stateRes.ok) {
        const stateData = await stateRes.json() as { state?: string };
        if (stateData.state === "ACTIVE") break;
        if (stateData.state === "FAILED") {
          throw new Error("Document upload to Gemini failed.");
        }
      }
      attempts++;
    }
  }

  return uri;
}

// ── Call Gemini REST API directly (no SDK) ─────────────────────────────────
async function callGeminiApi(
  model: string,
  contents: unknown,
  systemInstruction: string,
): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${env.geminiApiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.1,
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
    throw new Error(`Gemini API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || text.trim().length < 10) {
    throw new Error("Gemini returned an empty response. Please try again.");
  }

  return text;
}

// ── Main Gemini Engine function ────────────────────────────────────────────
/**
 * Analyzes a document using Google Gemini via direct REST API.
 * Sends the raw file as base64 inline for multimodal processing.
 * Returns a complete structured AuditReport.
 */
export async function analyzeWithGemini(
  filePath: string,
  fileName: string,
): Promise<AuditReport> {
  if (!env.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured. Set it in your .env file.");
  }

  const ext = path.extname(fileName).toLowerCase().replace(".", "");
  const mimeType = MIME_TYPE_MAP[ext];

  if (!mimeType) {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const isTextFile = ["txt", "md", "html", "htm", "csv"].includes(ext);
  // Office documents (DOCX, XLSX) — extract text locally and send as text
  const isOfficeDoc = ["docx", "xlsx"].includes(ext);

  console.log(`[Gemini Engine] File: ${fileName}, ext: ${ext}, mimeType: ${mimeType}, isTextFile: ${isTextFile}, isOfficeDoc: ${isOfficeDoc}`);

  try {
    let contents: unknown;

    if (isTextFile || isOfficeDoc) {
      // Read as text (or extract text from office docs) and send inline
      let textContent: string;
      if (ext === "docx") {
        textContent = await extractTextFromDocx(filePath);
        console.log(`[Gemini Engine] Extracted ${textContent.length} chars from DOCX`);
      } else if (ext === "xlsx") {
        textContent = await extractTextFromXlsx(filePath);
        console.log(`[Gemini Engine] Extracted ${textContent.length} chars from XLSX`);
      } else {
        textContent = await fs.readFile(filePath, "utf-8");
      }

      if (!textContent || textContent.trim().length < 10) {
        throw new Error(`Could not extract text from .${ext} file. Please try a different format (PDF, TXT, or image).`);
      }

      const prompt = `Analyze this ${ext} financial document and generate a complete forensic audit report.

File: ${fileName}
Content:
---
${textContent.slice(0, 80000)}
---${textContent.length > 80000 ? "\n[Document truncated at 80,000 characters for processing]" : ""}

Return ONLY the JSON audit report. No other text.`;

      contents = {
        role: "user",
        parts: [{ text: prompt }],
      };
    } else {
      // Read binary file (PDF, images), base64 encode, send as inline_data
      const fileBuffer = await fs.readFile(filePath);
      const base64Content = fileBuffer.toString("base64");

      contents = {
        role: "user",
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Content,
            },
          },
          {
            text: `Analyze this financial document. File: ${fileName}. Return ONLY the JSON audit report. No other text.`,
          },
        ],
      };
    }

    const responseText = await callGeminiApi(
      env.geminiModel,
      contents,
      FORENSIC_SYSTEM_INSTRUCTION,
    );

    const report = parseGeminiResponse(responseText, fileName);
    report.documentMetadata.fileName = fileName;
    report.documentMetadata.fileType = ext;

    return report;
  } finally {
    // Always clean up the temp file
    await fs.unlink(filePath).catch(() => {});
  }
}