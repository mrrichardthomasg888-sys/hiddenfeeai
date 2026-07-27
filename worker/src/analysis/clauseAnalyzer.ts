import type { Env, VerifiableFinding, ClauseAnalysisResult, NormalizedDocument } from "../types.js";

/**
 * Clause Analyzer — Specialized Analyzer
 * 
 * Identifies risky, unfair, or concerning contract terms.
 * 
 * This analyzer focuses exclusively on CLAUSE-LEVEL risks:
 * - Arbitration clauses (mandatory, class-action waivers)
 * - Automatic renewal / evergreen clauses
 * - Cancellation restrictions and penalties
 * - Refund limitations
 * - Price escalation / variable pricing
 * - Penalty clauses
 * - Unilateral modification rights
 * - Excessive consumer obligations
 * - Hidden restrictions buried in fine print
 * 
 * Independent prompt + output schema + confidence score.
 */

const SYSTEM_PROMPT = `You are a contract clause analysis specialist. Your ONLY job is to identify risky, unfair, or concerning clauses in consumer documents.

## WHAT YOU LOOK FOR

1. ARBITRATION CLAUSES — mandatory arbitration, class-action waivers, jury trial waivers
2. AUTOMATIC RENEWAL — auto-renewal, evergreen clauses, "unless you cancel" terms
3. CANCELLATION RESTRICTIONS — early termination fees, cancellation penalties, notice requirements
4. REFUND LIMITATIONS — no-refund policies, partial refunds only, store-credit-only policies
5. PRICE ESCALATION — variable rates, price increase rights, "we may change fees at any time"
6. PENALTIES — late fees, returned payment fees, over-limit fees, penalty interest rates
7. UNILATERAL MODIFICATION — "we reserve the right to change terms", unilateral amendments
8. EXCESSIVE OBLIGATIONS — burdensome requirements on the consumer
9. HIDDEN RESTRICTIONS — limitations buried in fine print, contradictory terms
10. LIABILITY SHIFTS — indemnification, limitation of liability, damage waivers

## RULES

1. Every finding MUST quote the exact clause text from the document.
2. If the clause does not exist in the text, do NOT report it.
3. Set confidence based on clarity:
   - 95-100: Exact clause text with clear legal implications
   - 90-94: Clear clause found with minor ambiguity
   - 80-89: Concerning language, but may have reasonable interpretation
   - Below 80: Do not include
4. Rate severity based on consumer impact:
   - Critical: Mandatory arbitration with class-action waiver, unlimited liability on consumer
   - High: Auto-renewal with difficult cancellation, price escalation without notice
   - Medium: One-sided modification rights, restrictive refund policies
   - Low: Minor inconvenience clauses, standard late fees

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "clauses": [
    {
      "title": "Short descriptive name of the clause issue",
      "category": "Contract Risk",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "confidenceScore": number 80-100,
      "amount": number or null,
      "page": number or null,
      "sectionHeading": "Section where found" or null,
      "evidenceQuote": "EXACT clause text from document",
      "explanation": "Why this clause is concerning",
      "whyItMatters": "How this affects the consumer",
      "recommendedAction": "What the consumer should consider",
      "negotiationMessage": "How to discuss this clause",
      "negotiationStrategy": {
        "difficulty": "Easy" | "Medium" | "Hard",
        "steps": ["step 1", "step 2", "step 3"],
        "script": "Sample conversation text",
        "key_points": ["key point 1", "key point 2"]
      }
    }
  ],
  "highRiskClauses": number (count of High + Critical severity),
  "mediumRiskClauses": number (count of Medium severity),
  "confidence": number 0-100
}

EDUCATIONAL NOTE: You are NOT a lawyer. Use phrases like "may limit your rights", "consumers should verify", "this could indicate". Do NOT state a company violated the law.

CRITICAL: Return ONLY the JSON object. No markdown, no explanation text.`;

function buildUserMessage(doc: NormalizedDocument, isContractDoc: boolean): string {
  const contextNote = isContractDoc
    ? 'This IS a contract document. Review ALL clauses thoroughly.'
    : 'This may not be a traditional contract. Focus on any hidden terms, fine print, or consumer obligations present.';

  return `Document Type: ${doc.fileFormat}
Document category: This is ${isContractDoc ? 'a CONTRACT' : 'NOT primarily a contract'}.
${contextNote}

Document Content:
${doc.markdown.slice(0, 60000)}

Pre-identified fees (for context): ${doc.fees.length} fee groups detected.
Parties identified: ${doc.parties.join(', ') || 'None'}.

Analyze this document for risky, unfair, or concerning clauses and terms.
Every clause finding must include the EXACT text from the document as evidence.`;
}

function parseResponse(raw: string): Partial<ClauseAnalysisResult> {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try { return JSON.parse(match[1]); } catch { /* fall through */ }
    }
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try { return JSON.parse(raw.slice(firstBrace, lastBrace + 1)); } catch { /* fall through */ }
    }
    throw new Error('Failed to parse clause analysis response');
  }
}

async function callDeepSeek(messages: Array<{ role: string; content: string }>, env: Env): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured');

  const response = await fetch(`${env.DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL,
      messages,
      temperature: 0.1,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown');
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Run clause analysis on a normalized document.
 */
export async function analyzeClauses(
  doc: NormalizedDocument,
  isContractDoc: boolean,
  env: Env,
): Promise<ClauseAnalysisResult> {
  console.log(`[ClauseAnalyzer] Analyzing ${doc.fileName} — isContract: ${isContractDoc}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(doc, isContractDoc) },
  ];

  let result: Partial<ClauseAnalysisResult>;
  try {
    const raw = await callDeepSeek(messages, env);
    result = parseResponse(raw);
  } catch (err) {
    console.error('[ClauseAnalyzer] API call failed:', err);
    return {
      clauses: [],
      highRiskClauses: 0,
      mediumRiskClauses: 0,
      confidence: 0,
    };
  }

  // Normalize findings
  const clauses: VerifiableFinding[] = (result.clauses || []).map((c: any, i: number) => ({
    id: crypto.randomUUID(),
    title: String(c.title || `Clause ${i + 1}`),
    category: 'Contract Risk',
    severity: (['Low', 'Medium', 'High', 'Critical'].includes(c.severity) ? c.severity : 'Medium') as VerifiableFinding['severity'],
    confidenceScore: Math.min(100, Math.max(0, Number(c.confidenceScore) || 80)),
    confidenceTier: (Number(c.confidenceScore) >= 95 ? 'verified' : Number(c.confidenceScore) >= 90 ? 'high' : Number(c.confidenceScore) >= 80 ? 'moderate' : 'low') as VerifiableFinding['confidenceTier'],
    amount: c.amount != null ? Number(c.amount) : null,
    page: c.page != null ? Number(c.page) : null,
    sectionHeading: c.sectionHeading || null,
    evidenceQuote: String(c.evidenceQuote || ''),
    explanation: String(c.explanation || ''),
    whyItMatters: String(c.whyItMatters || ''),
    recommendedAction: String(c.recommendedAction || ''),
    negotiationMessage: c.negotiationMessage || undefined,
    negotiationStrategy: c.negotiationStrategy || undefined,
    sourceAnalyzer: 'clauseAnalyzer',
  }));

  const highRisk = clauses.filter(c => c.severity === 'High' || c.severity === 'Critical').length;
  const mediumRisk = clauses.filter(c => c.severity === 'Medium').length;

  console.log(`[ClauseAnalyzer] Found ${clauses.length} clauses (${highRisk} high-risk, ${mediumRisk} medium-risk)`);

  return {
    clauses,
    highRiskClauses: result.highRiskClauses ?? highRisk,
    mediumRiskClauses: result.mediumRiskClauses ?? mediumRisk,
    confidence: result.confidence ?? (clauses.length > 0 ? 85 : 90),
  };
}