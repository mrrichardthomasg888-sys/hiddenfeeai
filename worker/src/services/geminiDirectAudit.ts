import type { AuditReport, Env, Finding } from "../types.js";
import { extractOffice } from "./extraction/officeExtractor.js";

const MODEL = "gemini-3.5-flash-lite";
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

const PROMPT = `Audit the COMPLETE attached file as a forensic consumer-contract and billing expert. Inspect every page, image, table, cell, total, subtotal, header, footer, footnote, disclosure, appendix, handwriting, scan and fine-print term.

Look for hidden, junk, vague, duplicate, administrative, convenience, processing, maintenance, platform, technology, regulatory, recovery, service, activation, cancellation, termination, early-exit, late, renewal, usage, overage, minimum and pass-through fees; auto-renewal and cancellation traps; unilateral price or contract changes; minimum commitments; unused or bundled services; ambiguous definitions; liability, indemnification, arbitration, venue and warranty limits; data ownership, privacy, security and AI-use clauses; service levels, credits, uptime and support; taxes, surcharges, reimbursements and expenses; missing dates or totals; conflicts between tables and legal terms; negotiable clauses; favorable protections; and protections the customer should request.

Create one consolidated negotiation playbook for the document, not a full script per finding. Each finding should have only a concise finding-specific talking point plus questions and replacement language. Identify verified dates, recurring exposure, positive terms, missing protections, future watch items, provider questions, escalation steps and a final decision. For a clean document, still return a useful contract-health assessment.

Never invent evidence, fees, savings, dates, totals or page references. Clearly label estimates and uncertainty. Confidence values must be 0-100 (for example 99, never 0.99). Every finding and claimed positive term needs an exact source quote and a page, section, table, row, cell, sheet or image reference. Keep scripts concise enough to remain together on a printed page. Return JSON only using the requested schema.`;

const INSIGHT_ITEM_SCHEMA = { type: "OBJECT", required: ["title", "explanation", "source_reference", "evidence", "recommended_action"], properties: {
  title: { type: "STRING" }, explanation: { type: "STRING" }, source_reference: { type: "STRING" }, evidence: { type: "STRING" }, recommended_action: { type: "STRING" },
} };

const PLAYBOOK_SCHEMA = { type: "OBJECT", required: ["objective", "leverage_points", "priority_items", "opening_statement", "likely_objections", "concessions", "unacceptable_terms", "escalation_path", "walk_away_threshold", "follow_up_schedule", "phone_script", "short_email", "detailed_email"], properties: {
  objective: { type: "STRING" }, leverage_points: { type: "ARRAY", items: { type: "STRING" } }, priority_items: { type: "ARRAY", items: { type: "STRING" } }, opening_statement: { type: "STRING" },
  likely_objections: { type: "ARRAY", items: { type: "OBJECT", required: ["objection", "response"], properties: { objection: { type: "STRING" }, response: { type: "STRING" } } } },
  concessions: { type: "ARRAY", items: { type: "STRING" } }, unacceptable_terms: { type: "ARRAY", items: { type: "STRING" } }, escalation_path: { type: "ARRAY", items: { type: "STRING" } }, walk_away_threshold: { type: "STRING" }, follow_up_schedule: { type: "ARRAY", items: { type: "STRING" } },
  phone_script: { type: "STRING" }, short_email: { type: "STRING" }, detailed_email: { type: "STRING" }, renewal_script: { type: "STRING" }, cancellation_script: { type: "STRING" },
} };

const RESPONSE_SCHEMA = {
  type: "OBJECT", required: ["document_meta", "risk_score", "risk_level", "potential_savings", "confidence_level", "financial_impact", "findings", "premium_insights"],
  properties: {
    document_meta: { type: "OBJECT", required: ["document_type", "pages_reviewed", "line_items_reviewed"], properties: {
      document_type: { type: "STRING" }, issuer: { type: "STRING" }, payer: { type: "STRING" }, pages_reviewed: { type: "INTEGER" }, line_items_reviewed: { type: "INTEGER" },
    } },
    risk_score: { type: "NUMBER" }, risk_level: { type: "STRING", enum: ["Low", "Review Recommended", "Elevated", "High"] }, potential_savings: { type: "NUMBER" }, confidence_level: { type: "NUMBER" },
    financial_impact: { type: "OBJECT", required: ["original_total", "questionable_charges_total", "corrected_total"], properties: { original_total: { type: "NUMBER" }, questionable_charges_total: { type: "NUMBER" }, corrected_total: { type: "NUMBER" } } },
    findings: { type: "ARRAY", items: { type: "OBJECT", required: ["title", "category", "severity", "confidence_score", "evidence", "explanation", "recommended_action", "source_reference", "charge_timing"], properties: {
      title: { type: "STRING" }, category: { type: "STRING" }, severity: { type: "STRING", enum: ["Low", "Medium", "High", "Critical"] }, status: { type: "STRING", enum: ["confirmed", "possible", "needs_review"] }, confidence_score: { type: "NUMBER" }, amount: { type: "NUMBER", nullable: true }, percentage: { type: "STRING", nullable: true }, page: { type: "INTEGER", nullable: true }, source_reference: { type: "STRING" }, evidence: { type: "STRING" }, explanation: { type: "STRING" }, why_it_matters: { type: "STRING" }, recommended_action: { type: "STRING" }, charge_timing: { type: "STRING", enum: ["mandatory", "conditional", "recurring", "one-time"] },
      questions_to_ask: { type: "ARRAY", items: { type: "STRING" } }, negotiability_assessment: { type: "STRING" }, alternative_language: { type: "STRING" }, financial_impact: { type: "STRING" },
    } } },
    premium_insights: { type: "OBJECT", required: ["document_summary", "confirmed_charges", "recurring_monthly_exposure", "estimated_annual_exposure", "calculation_explanation", "timeline", "positive_terms", "missing_protections", "watch_items", "provider_questions", "escalation_steps", "final_decision", "decision_reasoning", "unreadable_areas", "assumptions", "negotiation_playbook"], properties: {
      document_summary: { type: "STRING" }, confirmed_charges: { type: "NUMBER" }, recurring_monthly_exposure: { type: "NUMBER" }, estimated_annual_exposure: { type: "NUMBER" }, contract_term_exposure: { type: "NUMBER", nullable: true }, calculation_explanation: { type: "STRING" },
      timeline: { type: "ARRAY", items: { type: "OBJECT", required: ["event", "date", "source_reference", "evidence", "recommended_action"], properties: { event: { type: "STRING" }, date: { type: "STRING" }, source_reference: { type: "STRING" }, evidence: { type: "STRING" }, recommended_action: { type: "STRING" } } } },
      positive_terms: { type: "ARRAY", items: INSIGHT_ITEM_SCHEMA }, missing_protections: { type: "ARRAY", items: INSIGHT_ITEM_SCHEMA }, watch_items: { type: "ARRAY", items: INSIGHT_ITEM_SCHEMA }, provider_questions: { type: "ARRAY", items: { type: "STRING" } }, escalation_steps: { type: "ARRAY", items: { type: "STRING" } },
      final_decision: { type: "STRING", enum: ["Accept", "Negotiate", "Escalate", "Request Clarification", "Avoid"] }, decision_reasoning: { type: "STRING" }, unreadable_areas: { type: "ARRAY", items: { type: "STRING" } }, assumptions: { type: "ARRAY", items: { type: "STRING" } }, negotiation_playbook: PLAYBOOK_SCHEMA,
    } },
  },
};

function apiKey(env: Env): string {
  const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!key) throw new Error("Gemini is not configured.");
  return key;
}

async function fetchRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  let last: Error | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.ok || !RETRYABLE.has(response.status)) return response;
      last = new Error(`HTTP ${response.status}`);
    } catch (error) { last = error instanceof Error ? error : new Error(String(error)); }
  }
  throw last ?? new Error("Temporary Gemini request failure.");
}

async function uploadFile(file: File, env: Env, auditId: string): Promise<{ uri: string; name: string; mimeType: string }> {
  const key = apiKey(env);
  console.log(`[PIPELINE] auditId=${auditId} stage=request_sent_to_gemini bytes=${file.size} mime=${file.type}`);
  const start = await fetchRetry("https://generativelanguage.googleapis.com/upload/v1beta/files", {
    method: "POST", headers: { "x-goog-api-key": key, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(file.size), "X-Goog-Upload-Header-Content-Type": file.type, "Content-Type": "application/json" },
    body: JSON.stringify({ file: { display_name: file.name } }),
  });
  if (!start.ok) throw new Error(`Gemini rejected the file (${start.status}).`);
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("Gemini did not provide an upload URL.");
  const uploaded = await fetchRetry(uploadUrl, { method: "POST", headers: { "Content-Length": String(file.size), "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize", "Content-Type": file.type }, body: file });
  if (!uploaded.ok) throw new Error(`Gemini file upload failed (${uploaded.status}).`);
  const payload = await uploaded.json() as any;
  const info = payload.file;
  if (!info?.uri || !info?.name) throw new Error("Gemini returned incomplete file metadata.");
  console.log(`[PIPELINE] auditId=${auditId} stage=gemini_file_accepted fileName=${info.name} state=${info.state || "ACTIVE"}`);
  return { uri: info.uri, name: info.name, mimeType: info.mimeType || file.type };
}

async function waitUntilActive(file: { uri: string; name: string; mimeType: string }, env: Env, auditId: string) {
  const key = apiKey(env);
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, { headers: { "x-goog-api-key": key } });
    if (!response.ok) throw new Error(`Gemini file status failed (${response.status}).`);
    const current = await response.json() as any;
    if (!current.state || current.state === "ACTIVE") return;
    if (current.state === "FAILED") throw new Error("Gemini could not process this file.");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Gemini file processing timed out.");
}

function validateReport(value: any, auditId: string): AuditReport {
  if (!value?.document_meta || !Array.isArray(value.findings) || !value.financial_impact) throw new Error("Gemini returned malformed report JSON.");
  const findings: Finding[] = value.findings.map((f: any) => {
    if (!f.title || !f.category || !f.severity || !f.evidence || !f.explanation || !f.recommended_action || !f.source_reference) throw new Error("Gemini returned an incomplete finding.");
    const rawConfidence = Number(f.confidence_score);
    const confidence = rawConfidence > 0 && rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
    return { ...f, id: crypto.randomUUID(), status: f.status || "confirmed", confidence_score: Math.max(0, Math.min(100, confidence)), amount: typeof f.amount === "number" ? f.amount : null, page: typeof f.page === "number" ? f.page : null, why_it_matters: f.why_it_matters || f.explanation };
  });
  const rawOverallConfidence = Number(value.confidence_level);
  const confidenceLevel = rawOverallConfidence > 0 && rawOverallConfidence <= 1 ? rawOverallConfidence * 100 : rawOverallConfidence;
  return { ...value, confidence_level: Math.max(0, Math.min(100, confidenceLevel)), document_meta: { ...value.document_meta, analysis_date: new Date().toISOString(), report_id: auditId }, findings, math_errors: findings.filter((f) => f.category === "Math Error" || f.category === "Billing Error"), duplicate_charges: findings.filter((f) => f.category === "Duplicate Charge"), hidden_fees: findings.filter((f) => /fee|charge|surcharge|tax/i.test(f.category + " " + f.title)), contract_risks: findings.filter((f) => !/math|duplicate|billing error/i.test(f.category)), clean_document_summary: findings.length ? null : { spending_breakdown: [], cost_categories: [], key_terms: [], negotiation_opportunities: [], questions_to_ask: [], money_saving_suggestions: [] } } as AuditReport;
}

export async function prepareFileForAudit(file: File, env: Env, auditId: string): Promise<{ uri: string; name: string; mimeType: string; originalFileName: string }> {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  let geminiFile = file;
  if (["doc", "docx", "xls", "xlsx"].includes(extension)) {
    console.log(`[PIPELINE] auditId=${auditId} stage=office_normalization_started format=${extension}`);
    const extracted = await extractOffice(await file.arrayBuffer(), file.name, { fileFormat: extension as any, mimeType: file.type, isDigital: true, isScanned: false, needsOcr: false, detectedLanguage: "unknown", pageCount: 1, hasTables: true, hasImages: extension.startsWith("doc"), hasForms: false, hasSignatures: false, hasHandwriting: false, documentQuality: "good", warnings: [] }, env);
    if (!extracted?.success || !extracted.text.trim()) throw new Error("The Office file contains no readable content.");
    geminiFile = new File([extracted.text], `${file.name}.txt`, { type: "text/plain" });
    console.log(`[PIPELINE] auditId=${auditId} stage=office_normalization_completed sourceBytes=${file.size} normalizedBytes=${geminiFile.size} worksheets=${extracted.coverage?.processedWorksheets || 0} images=${extracted.coverage?.processedImages || 0}`);
  }
  const uploaded = await uploadFile(geminiFile, env, auditId);
  await waitUntilActive(uploaded, env, auditId);
  return { ...uploaded, originalFileName: file.name };
}

export async function auditPreparedFile(uploaded: { uri: string; name: string; mimeType: string }, env: Env, auditId: string): Promise<AuditReport> {
  let completed = false;
  try {
    console.log(`[PIPELINE] auditId=${auditId} stage=gemini_processing_started file=${uploaded.name}`);
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetchRetry(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
          method: "POST", headers: { "x-goog-api-key": apiKey(env), "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ role: "user", parts: [{ fileData: { mimeType: uploaded.mimeType, fileUri: uploaded.uri } }, { text: PROMPT }] }], generationConfig: { temperature: 0, maxOutputTokens: 32768, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA } }),
        });
        if (!response.ok) throw new Error(`Gemini analysis failed (${response.status}): ${(await response.text()).slice(0, 200)}`);
        const payload = await response.json() as any;
        const finishReason = payload.candidates?.[0]?.finishReason;
        const text = payload.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
        if (!text || finishReason === "SAFETY" || finishReason === "MAX_TOKENS") throw new Error(`Gemini returned incomplete output (${finishReason || "empty"}).`);
        console.log(`[PIPELINE] auditId=${auditId} stage=gemini_response_received chars=${text.length} attempt=${attempt}`);
        const report = validateReport(JSON.parse(text), auditId);
        console.log(`[PIPELINE] auditId=${auditId} stage=structured_result_validated findings=${report.findings.length}`);
        completed = true;
        return report;
      } catch (error) { lastError = error; console.warn(`[PIPELINE] auditId=${auditId} stage=retry attempt=${attempt} error="${error instanceof Error ? error.message : String(error)}"`); }
    }
    throw lastError instanceof Error ? lastError : new Error("Gemini analysis failed.");
  } finally {
    if (completed) fetch(`https://generativelanguage.googleapis.com/v1beta/${uploaded.name}`, { method: "DELETE", headers: { "x-goog-api-key": apiKey(env) } }).catch(() => undefined);
  }
}
