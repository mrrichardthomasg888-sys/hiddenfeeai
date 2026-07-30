import type { AuditReport, Env } from "../types.js";

interface AuditInput {
  text: string;
  fileName: string;
  fileType: string;
  pages: number;
  lineItems: number;
}

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const FORENSIC_SYSTEM_PROMPT = `You are a forensic financial auditor, billing expert, and consumer advocate with 20 years of experience.

Your job is to analyze financial documents and generate a structured audit report.

## RULES

1. NEVER invent findings. Every finding MUST have direct evidence from the document text.
2. Evidence must be a direct quote or specific reference (line, page, amount) from the document.
3. Set confidence_score based on evidence quality:
   - 90-100: Direct quote with exact amount, clear overcharge
   - 70-89: Strong evidence, reasonable interpretation
   - 50-69: Suspicious pattern, needs human review
   - Below 50: Do not include as a finding
4. If a document appears to be clean (no issues found), return an empty findings array with risk_score 0-15.
5. You must check ALL calculations: subtotals, totals, tax calculations, percentage calculations.
6. Flag ALL of these fee types when found:
   - Administrative fees, Processing fees, Service charges, Documentation fees
   - Dealer fees, Convenience fees, Technology fees, Compliance fees
   - Regulatory fees, Shipping/Handling markups, Late fees
   - Subscription/Membership fees, "Miscellaneous" charges, Unexplained charges
7. Return valid JSON only. No markdown, no code fences, no explanation text.

## OUTPUT SCHEMA

Return a JSON object with exactly this structure:
{
  "document_meta": {
    "document_type": "Invoice" | "Receipt" | "Bill" | "Contract" | "Bank Statement" | "Credit Card Statement" | "Insurance Statement" | "Medical Bill" | "Utility Bill" | "Other",
    "issuer": "Company or person who issued this document",
    "payer": "Customer or recipient name",
    "analysis_date": "ISO date string",
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
      "title": "Short descriptive name of the issue",
      "category": "Hidden Fee" | "Billing Error" | "Math Error" | "Duplicate Charge" | "Contract Risk",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "status": "confirmed" | "possible" | "needs_review",
      "confidence_score": number 0-100,
      "amount": number or null,
      "page": number or null,
      "line_reference": "Line reference if available",
      "evidence": "Direct quote from the document showing the charge",
      "explanation": "Clear explanation of why this is an issue",
      "why_it_matters": "Impact on the customer in plain language",
      "recommended_action": "Specific step the customer should take",
      "negotiation_message": "Script or template for asking about this charge",
      "negotiation_strategy": {
        "difficulty": "Easy or Medium or Hard",
        "steps": ["3-4 step-by-step negotiation approach items"],
        "script": "Full conversation script the customer can read from",
        "key_points": ["3-4 key talking points"]
      }
    }
  ],
  "math_errors": [Finding array],
  "duplicate_charges": [Finding array],
  "hidden_fees": [Finding array],
  "contract_risks": [Finding array],
  "clean_document_summary": {
    "spending_breakdown": [{ "category": string, "amount": number }],
    "cost_categories": [string],
    "key_terms": [string],
    "negotiation_opportunities": [string],
    "questions_to_ask": [string],
    "money_saving_suggestions": [string]
  } or null
}

Note: If no issues found, set clean_document_summary to a valid object with positive observations instead of null.`;

function buildUserMessage(input: AuditInput): string {
  return `Analyze this financial document and generate a forensic audit report.

File: ${input.fileName}
Type: ${input.fileType}
Pages: ${input.pages}
Line items found: ${input.lineItems}

Document content:
---
${input.text.slice(0, 50000)}
---
${
  input.text.length > 50000
    ? "\n[Note: Document was truncated at 50,000 characters for processing]"
    : ""
}`;
}

function parseAuditResponse(raw: string): AuditReport {
  console.log(`[AI] Raw response length: ${raw.length} chars`);

  // Try direct parse first
  try {
    return JSON.parse(raw) as AuditReport;
  } catch {
    // Try to extract JSON from markdown code fences
    const jsonMatch = raw.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]) as AuditReport;
      } catch {
        // fall through
      }
    }

    // Try to find the first { and last }
    const firstBrace = raw.indexOf("{");
    const lastBrace = raw.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(raw.slice(firstBrace, lastBrace + 1)) as AuditReport;
      } catch {
        try {
          const truncated = raw.slice(firstBrace, lastBrace + 1);
          for (let end = truncated.length - 1; end > firstBrace + 100; end--) {
            if (truncated[end] === "}" || truncated[end] === "]") {
              try {
                return JSON.parse(truncated.slice(0, end + 1)) as AuditReport;
              } catch {
                continue;
              }
            }
          }
        } catch {
          // fall through
        }
      }
    }

    console.error(`[AI] Failed to parse JSON. Response ends with: ${raw.slice(-200).replace(/\n/g, "\\n")}`);
    throw new Error("Failed to parse AI audit response as JSON");
  }
}

function validateAuditReport(report: Partial<AuditReport>): AuditReport {
  function newId(): string {
    return crypto.randomUUID();
  }

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

  for (const finding of merged.findings) {
    if (!finding.id) finding.id = newId();
  }
  for (const finding of merged.math_errors) {
    if (!finding.id) finding.id = newId();
  }
  for (const finding of merged.duplicate_charges) {
    if (!finding.id) finding.id = newId();
  }
  for (const finding of merged.hidden_fees) {
    if (!finding.id) finding.id = newId();
  }
  for (const finding of merged.contract_risks) {
    if (!finding.id) finding.id = newId();
  }

  return merged;
}

async function callGemini(messages: DeepSeekMessage[], env: Env, model: string): Promise<string> {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let systemPrompt = "";
  const contents = messages
    .filter(m => {
      if (m.role === "system") {
        systemPrompt = m.content;
        return false;
      }
      return true;
    })
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

  const requestBody: any = {
    contents,
    generationConfig: {
      maxOutputTokens: 8192,
      responseMimeType: "application/json"
    }
  };

  if (systemPrompt) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt }]
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini returned empty response.");
  }
  return text;
}

/**
 * Run a full forensic audit on the extracted document text.
 * This function receives ONLY real extracted document content.
 * No hardcoded examples or demo data.
 */
export async function runAudit(input: AuditInput, env: Env): Promise<AuditReport> {
  const messages: DeepSeekMessage[] = [
    { role: "system", content: FORENSIC_SYSTEM_PROMPT },
    { role: "user", content: buildUserMessage(input) },
  ];

  const model = env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const rawResponse = await callGemini(messages, env, model);
  const parsed = parseAuditResponse(rawResponse);
  const validated = validateAuditReport(parsed);

  // Override with actual document metadata
  validated.document_meta.pages_reviewed = input.pages;
  validated.document_meta.line_items_reviewed = input.lineItems;
  validated.document_meta.analysis_date = new Date().toISOString();

  // Distribute findings into categorized arrays
  if (validated.findings.length > 0) {
    validated.math_errors = validated.findings.filter((f) => f.category === "Math Error");
    validated.duplicate_charges = validated.findings.filter((f) => f.category === "Duplicate Charge");
    validated.hidden_fees = validated.findings.filter((f) => f.category === "Hidden Fee");
    validated.contract_risks = validated.findings.filter((f) => f.category === "Contract Risk");
  }

  return validated;
}
