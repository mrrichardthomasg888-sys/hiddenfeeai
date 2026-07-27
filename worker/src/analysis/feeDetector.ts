import type { Env, VerifiableFinding, FeeDetectionResult, NormalizedDocument, NegotiationStrategy } from "../types.js";

/**
 * Fee Detector — Specialized Analyzer
 * 
 * Detects hidden fees, junk fees, and unexpected charges.
 * 
 * This is NOT a generic financial document analyzer.
 * It is specifically trained to identify:
 * - Administrative/processing/documentation fees
 * - Service/convenience/technology fees
 * - Mandatory add-ons disguised as optional
 * - Recurring charges buried in fine print
 * - Cancellation/early termination fees
 * - Dealer fees, resort fees, facility fees
 * 
 * Independent prompt + output schema + confidence score.
 */

const SYSTEM_PROMPT = `You are a forensic fee detection specialist. Your ONLY job is to find hidden, unexpected, and questionable fees in consumer documents.

## WHAT YOU LOOK FOR

1. Administrative Fees — "processing fee", "documentation fee", "admin fee", "paperwork fee"
2. Service Fees — "service charge", "convenience fee", "handling fee"
3. Technology Fees — "platform fee", "technology fee", "digital fee", "system fee"
4. Mandatory Add-Ons — fees presented as optional but actually required
5. Recurring Charges — monthly/annual fees buried in fine print
6. Cancellation Fees — early termination, cancellation, break fees
7. Dealer Fees — doc fees, dealer prep, market adjustment (auto contracts)
8. Resort Fees — facility fees, amenity fees, destination fees (hotels/travel)
9. Junk Fees — any fee with no clear service provided in return
10. Hidden Charges — fees not included in the advertised price

## RULES

1. Every fee MUST have a direct evidence quote from the document.
2. If you cannot find the exact text, do NOT report the fee.
3. Set confidence based on evidence clarity:
   - 95-100: Exact dollar amount with clear label and page reference
   - 90-94: Clear fee mentioned with amount
   - 80-89: Fee implied by context, reasonable interpretation
   - Below 80: Do not include
4. Flag whether each fee appears to be mandatory vs optional.
5. Identify whether each fee is recurring.

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "fees": [
    {
      "title": "Short descriptive name",
      "category": "Hidden Fee",
      "severity": "Low" | "Medium" | "High" | "Critical",
      "confidenceScore": number 80-100,
      "amount": number or null,
      "page": number or null,
      "sectionHeading": "Section where found" or null,
      "evidenceQuote": "EXACT text from document",
      "explanation": "Why this is a hidden/unexpected fee",
      "whyItMatters": "Impact on total cost",
      "recommendedAction": "What the consumer should do",
      "negotiationMessage": "Script to challenge this fee",
      "negotiationStrategy": {
        "difficulty": "Easy" | "Medium" | "Hard",
        "steps": ["step 1", "step 2", "step 3"],
        "script": "Full conversation script",
        "key_points": ["point 1", "point 2"]
      }
    }
  ],
  "totalDetectedAmount": number,
  "confidence": number 0-100
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanation text. Every fee must have evidenceQuote.`;

function buildUserMessage(doc: NormalizedDocument, expectedFees: string[]): string {
  const feeContext = doc.fees.length > 0
    ? `Pre-identified fees:\n${JSON.stringify(doc.fees.map(f => ({
        name: f.canonicalName,
        amounts: f.amounts.map(a => `$${a.value} ${a.isRecurring ? '(recurring ' + a.period + ')' : ''}`),
        pages: f.pageReferences,
        likelyHidden: f.isHidden,
      })), null, 2)}`
    : 'No pre-identified fees detected.';

  const expectedContext = expectedFees.length > 0
    ? `Expected fee types for this document type:\n${expectedFees.join(', ')}`
    : '';

  return `Document Type: ${doc.fileFormat}
Document Content:
${doc.markdown.slice(0, 60000)}

${feeContext}

${expectedContext}

Analyze this document for hidden fees, junk fees, and unexpected charges.
Every fee must include the EXACT text from the document as evidence.`;
}

function parseResponse(raw: string): Partial<FeeDetectionResult> {
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
    throw new Error('Failed to parse fee detection response');
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
 * Run fee detection on a normalized document.
 */
export async function detectFees(
  doc: NormalizedDocument,
  expectedFees: string[],
  env: Env,
): Promise<FeeDetectionResult> {
  console.log(`[FeeDetector] Analyzing ${doc.fileName} — expecting ${expectedFees.length} fee categories`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(doc, expectedFees) },
  ];

  let result: Partial<FeeDetectionResult>;
  try {
    const raw = await callDeepSeek(messages, env);
    result = parseResponse(raw);
  } catch (err) {
    console.error('[FeeDetector] API call failed:', err);
    return {
      fees: [],
      totalDetectedFees: 0,
      totalDetectedAmount: 0,
      confidence: 0,
    };
  }

  // Normalize findings
  const fees: VerifiableFinding[] = (result.fees || []).map((f: any, i: number) => ({
    id: crypto.randomUUID(),
    title: String(f.title || `Fee ${i + 1}`),
    category: 'Hidden Fee',
    severity: (['Low', 'Medium', 'High', 'Critical'].includes(f.severity) ? f.severity : 'Medium') as VerifiableFinding['severity'],
    confidenceScore: Math.min(100, Math.max(0, Number(f.confidenceScore) || 80)),
    confidenceTier: (Number(f.confidenceScore) >= 95 ? 'verified' : Number(f.confidenceScore) >= 90 ? 'high' : Number(f.confidenceScore) >= 80 ? 'moderate' : 'low') as VerifiableFinding['confidenceTier'],
    amount: f.amount != null ? Number(f.amount) : null,
    page: f.page != null ? Number(f.page) : null,
    sectionHeading: f.sectionHeading || null,
    evidenceQuote: String(f.evidenceQuote || ''),
    explanation: String(f.explanation || ''),
    whyItMatters: String(f.whyItMatters || ''),
    recommendedAction: String(f.recommendedAction || ''),
    negotiationMessage: f.negotiationMessage || undefined,
    negotiationStrategy: f.negotiationStrategy || undefined,
    sourceAnalyzer: 'feeDetector',
  }));

  const totalAmount = fees.reduce((sum, f) => sum + (f.amount ?? 0), 0);

  console.log(`[FeeDetector] Found ${fees.length} fees, total: $${totalAmount}`);

  return {
    fees,
    totalDetectedFees: fees.length,
    totalDetectedAmount: totalAmount,
    confidence: result.confidence ?? (fees.length > 0 ? 85 : 90),
  };
}