import type { AuditReport, ExtractedDocument, ExtractedData, Env, Finding } from "../types.js";

// ─── Stage 1: Structured Extraction ───

const STAGE1_SYSTEM_PROMPT = `You are a financial document extraction engine. Analyze the following structured document text and extract ALL financial entities.

Instructions:
1. Extract every line item with a monetary amount.
2. Identify fee categories: administrative, processing, service, late, overdraft, maintenance, setup, cancellation, convenience, technology, compliance, regulatory, shipping/handling, miscellaneous, unexplained.
3. Identify dates, billing periods, account numbers, contract terms.
4. Flag auto-renewal clauses, arbitration clauses, variable rate terms.
5. Identify unclear or ambiguous pricing language.
6. For each extraction, provide the exact text snippet as evidence and note the page number.

Output ONLY valid JSON matching this schema:
{
  "extractedItems": [
    {
      "id": "uuid",
      "type": "fee" | "charge" | "clause" | "term" | "discount",
      "category": "string",
      "description": "string",
      "amount": number | null,
      "currency": "USD",
      "pageReference": "string",
      "lineReference": "string",
      "evidenceText": "exact quote",
      "isRecurring": boolean,
      "confidence": "high" | "medium" | "low"
    }
  ],
  "contractTerms": [
    {
      "termType": "string",
      "description": "string",
      "pageReference": "string",
      "evidenceText": "exact quote",
      "concernLevel": "high" | "medium" | "low"
    }
  ],
  "ambiguousLanguage": [
    {
      "phrase": "exact ambiguous text",
      "pageReference": "string",
      "explanation": "why this is unclear"
    }
  ],
  "summary": {
    "totalDetectedAmount": number,
    "itemCount": number,
    "highestConcernItems": ["string", "string", "string"]
  }
}

CRITICAL RULES:
- Do NOT hallucinate items. Only extract what is actually in the text.
- Use null for amounts that are not stated.
- Preserve exact spelling in evidenceText.
- Every item must have evidenceText.
- Return ONLY the JSON object, no markdown, no explanation.`;

// ─── Stage 2: Consumer Analysis & Report ───

const STAGE2_SYSTEM_PROMPT = `You are a consumer education assistant specializing in document analysis. You are NOT a lawyer. Do NOT claim any company violated a law. Use educational, cautious language only.

Analyze the following extracted financial data and generate a professional consumer document analysis report.

Generate a report with these sections as valid JSON:
{
  "document_meta": {
    "document_type": "string (Invoice | Receipt | Bill | Contract | Bank Statement | Credit Card Statement | Insurance Statement | Medical Bill | Utility Bill | Other)",
    "issuer": "string",
    "payer": "string",
    "analysis_date": "ISO date",
    "pages_reviewed": number,
    "line_items_reviewed": number,
    "report_id": "uuid"
  },
  "risk_score": number 0-100,
  "risk_level": "Low" | "Review Recommended" | "Elevated" | "High",
  "potential_savings": number,
  "confidence_level": number 0-100,
  "financial_impact": {
    "original_total": number,
    "questionable_charges_total": number,
    "corrected_total": number
  },
  "findings": [
    {
      "id": "uuid",
      "title": "string",
      "category": "Hidden Fee" | "Billing Error" | "Math Error" | "Duplicate Charge" | "Contract Risk",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "status": "confirmed" | "possible" | "needs_review",
      "confidence_score": number 0-100,
      "amount": number | null,
      "page": number | null,
      "line_reference": "string",
      "evidence": "exact quote from document",
      "explanation": "clear explanation",
      "why_it_matters": "impact on consumer",
      "recommended_action": "specific step",
      "negotiation_message": "script template",
      "negotiation_strategy": {
        "difficulty": "Easy" | "Medium" | "Hard",
        "steps": ["step 1", "step 2", "step 3"],
        "script": "full conversation script",
        "key_points": ["point 1", "point 2", "point 3"]
      }
    }
  ],
  "math_errors": [],
  "duplicate_charges": [],
  "hidden_fees": [],
  "contract_risks": [],
  "clean_document_summary": {
    "spending_breakdown": [{"category": "string", "amount": number}],
    "cost_categories": ["string"],
    "key_terms": ["string"],
    "negotiation_opportunities": ["string"],
    "questions_to_ask": ["string"],
    "money_saving_suggestions": ["string"]
  },
  "negotiationChecklist": ["actionable string", "actionable string"],
  "suggestedNegotiationMessage": {
    "subject": "email subject line",
    "body": "full email body text"
  },
  "educationReferences": [
    {"topic": "string", "explanation": "string"}
  ]
}

CRITICAL RULES:
- NEVER state that a company broke a law. Use phrases like "may not comply with", "consumers should verify whether", "this could indicate", "regulators generally expect", "industry best practices suggest".
- Every fee must have severity score 1-10 implied by the severity level (Critical=10, High=7-9, Medium=4-6, Low=1-3).
- Risk score 0-100 based on: number of fees, total amount, auto-renewal/arbitration clauses, unclear language.
- Include page references for EVERY finding.
- Confidence must be honest. If evidence is weak, mark "low".
- Suggested negotiation message must reference actual fee names and amounts.
- Tone: professional, educational, empowering — never accusatory.
- Populate ALL arrays even if empty.
- Return ONLY valid JSON, no markdown, no explanation.`;

// ─── DeepSeek API caller ───

async function callDeepSeek(
  messages: Array<{ role: string; content: string }>,
  model: string,
  env: Env,
  maxTokens = 12000
): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const response = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── JSON parser with fallback ───

function parseJsonResponse(raw: string): any {
  // Try direct parse
  try {
    return JSON.parse(raw);
  } catch {
    // Try markdown fence
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1]);
      } catch { /* fall through */ }
    }
    // Try first { to last }
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
      } catch {
        // Try truncating from the end
        const truncated = raw.slice(firstBrace, lastBrace + 1);
        for (let end = truncated.length - 1; end > firstBrace + 100; end--) {
          if (truncated[end] === "}" || truncated[end] === "]") {
            try {
              return JSON.parse(truncated.slice(0, end + 1));
            } catch { continue; }
          }
        }
      }
    }
    throw new Error("Failed to parse AI response as JSON");
  }
}

// ─── Validators ───

function newId(): string {
  return crypto.randomUUID();
}

function validateAuditReport(report: Partial<AuditReport>): AuditReport {
  const defaultReport: AuditReport = {
    document_meta: {
      document_type: "Other",
      analysis_date: new Date().toISOString(),
      pages_reviewed: 0,
      line_items_reviewed: 0,
      report_id: newId(),
    },
    risk_score: 0,
    risk_level: "Low",
    potential_savings: 0,
    confidence_level: 0,
    financial_impact: {
      original_total: 0,
      questionable_charges_total: 0,
      corrected_total: 0,
    },
    findings: [],
    math_errors: [],
    duplicate_charges: [],
    hidden_fees: [],
    contract_risks: [],
    clean_document_summary: null,
  };

  const merged = { ...defaultReport, ...report };
  merged.findings ??= [];
  merged.math_errors ??= [];
  merged.duplicate_charges ??= [];
  merged.hidden_fees ??= [];
  merged.contract_risks ??= [];

  // Assign IDs where missing
  for (const arr of [merged.findings, merged.math_errors, merged.duplicate_charges, merged.hidden_fees, merged.contract_risks]) {
    for (const f of arr) {
      if (!f.id) f.id = newId();
    }
  }

  return merged;
}

// ─── Stage 1: Structured Extraction ───

function buildStage1Message(doc: ExtractedDocument): string {
  const pagesJson = JSON.stringify(
    doc.pages.map(p => ({
      pageNumber: p.pageNumber,
      text: p.text.slice(0, 8000), // Truncate per page for token limits
    }))
  );

  return `Document pages:
${pagesJson}

File: ${doc.fileName}
File type: ${doc.fileType}
Page count: ${doc.pageCount}
Extraction confidence: ${Math.round(doc.extractionConfidence * 100)}%

Extract ALL financial entities from the above document pages.`;
}

// ─── Stage 2: Consumer Analysis ───

function buildStage2Message(extracted: ExtractedData, doc: ExtractedDocument): string {
  return `Extracted data:
${JSON.stringify(extracted, null, 2)}

Document info:
File name: ${doc.fileName}
File type: ${doc.fileType}
Page count: ${doc.pageCount}
Extraction confidence: ${Math.round(doc.extractionConfidence * 100)}%

Warnings: ${doc.warnings.join("; ") || "none"}

Generate a complete consumer document analysis report from the above extracted data.`;
}

// ─── AIAnalyzer class ───

export class AIAnalyzer {
  constructor(private env: Env) {}

  async runAudit(doc: ExtractedDocument): Promise<AuditReport> {
    // Stage 1: Structured Extraction
    console.log("[AIAnalyzer] Stage 1: Structured extraction...");
    const stage1Messages = [
      { role: "system", content: STAGE1_SYSTEM_PROMPT },
      { role: "user", content: buildStage1Message(doc) },
    ];

    let extractedData: Partial<ExtractedData> = {};
    try {
      const stage1Raw = await callDeepSeek(stage1Messages, "deepseek-chat", this.env, 8000);
      extractedData = parseJsonResponse(stage1Raw) as Partial<ExtractedData>;
      console.log(`[AIAnalyzer] Stage 1 complete: ${extractedData.extractedItems?.length || 0} items extracted`);
    } catch (err) {
      console.error("[AIAnalyzer] Stage 1 failed:", err);
      // Continue with partial data
      extractedData = {
        extractedItems: [],
        contractTerms: [],
        ambiguousLanguage: [],
        summary: { totalDetectedAmount: 0, itemCount: 0, highestConcernItems: [] },
      };
    }

    // Stage 2: Consumer Analysis & Report
    console.log("[AIAnalyzer] Stage 2: Consumer analysis...");
    const stage2Messages = [
      { role: "system", content: STAGE2_SYSTEM_PROMPT },
      { role: "user", content: buildStage2Message(extractedData as ExtractedData, doc) },
    ];

    let report: AuditReport;
    try {
      const stage2Raw = await callDeepSeek(
        stage2Messages,
        this.env.DEEPSEEK_REASONER_MODEL || "deepseek-reasoner",
        this.env,
        16000
      );
      const parsed = parseJsonResponse(stage2Raw) as Partial<AuditReport>;
      report = validateAuditReport(parsed);
      console.log(`[AIAnalyzer] Stage 2 complete: ${report.findings.length} findings`);
    } catch (err) {
      console.error("[AIAnalyzer] Stage 2 failed:", err);
      throw new Error("AI analysis failed. Please try again or upload a clearer document.");
    }

    // Override metadata with actual document info
    report.document_meta.pages_reviewed = doc.pageCount;
    report.document_meta.line_items_reviewed = doc.fullText.split("\n").filter(l => l.trim()).length;
    report.document_meta.analysis_date = new Date().toISOString();
    report.document_meta.report_id = report.document_meta.report_id || newId();

    // Distribute findings into categorized arrays
    if (report.findings.length > 0) {
      report.math_errors = report.findings.filter(
        (f: Finding) => f.category === "Math Error" || f.category === "Billing Error"
      );
      report.duplicate_charges = report.findings.filter(
        (f: Finding) => f.category === "Duplicate Charge"
      );
      report.hidden_fees = report.findings.filter(
        (f: Finding) => f.category === "Hidden Fee"
      );
      report.contract_risks = report.findings.filter(
        (f: Finding) => f.category === "Contract Risk"
      );
    }

    // Store extracted data for debugging / reference
    // (not part of AuditReport type, so we skip storing it directly)

    return report;
  }
}