import type { Env, VerifiableFinding, FinancialImpactResult, NormalizedDocument } from "../types.js";

/**
 * Financial Impact Engine — Specialized Analyzer
 * 
 * Calculates the total financial picture: one-time charges, recurring costs,
 * first-year impact, and potential savings. This is the "what does this cost me?" layer.
 */

const SYSTEM_PROMPT = `You are a financial impact calculation specialist. Your ONLY job is to add up the numbers.

## WHAT YOU CALCULATE

1. ONE-TIME CHARGES — All non-recurring fees and charges
2. MONTHLY RECURRING — Fees that repeat monthly
3. ANNUAL RECURRING — Fees that repeat annually (convert to 12-month equivalent)
4. TOTAL FIRST YEAR — One-time + (monthly × 12) + annual
5. POTENTIAL SAVINGS — Sum of fees that could be negotiated/removed
6. QUESTIONABLE CHARGES — Fees that seem excessive or unusual
7. BREAKDOWN — Category-by-category breakdown

## RULES

1. Only count amounts that are actually present in the document.
2. If an amount is unclear, mark it as estimated.
3. Distinguish clearly between one-time and recurring.
4. Annualize everything to 12 months for comparison.

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "oneTimeCharges": number,
  "monthlyRecurring": number,
  "annualRecurring": number,
  "totalFirstYear": number,
  "potentialSavings": number,
  "questionableCharges": number,
  "breakdown": [
    {"category": "string", "amount": number, "recurring": boolean}
  ],
  "confidence": number 0-100
}

CRITICAL: Return ONLY the JSON object. Every number must have evidence in the document.`;

function buildUserMessage(doc: NormalizedDocument, feeFindings: VerifiableFinding[]): string {
  const feeSummary = feeFindings.map(f => ({
    title: f.title,
    amount: f.amount,
    severity: f.severity,
    category: f.category,
  }));

  const normalizedFees = doc.fees.map(f => ({
    name: f.canonicalName,
    amounts: f.amounts.map(a => ({ value: a.value, recurring: a.isRecurring, period: a.period })),
    isHidden: f.isHidden,
  }));

  const totals = doc.totals.map(t => ({ value: t.value, recurring: t.isRecurring, period: t.period }));

  return `Document Content:
${doc.markdown.slice(0, 40000)}

Detected Fees:
${JSON.stringify(feeSummary, null, 2)}

Normalized Fee Data:
${JSON.stringify(normalizedFees, null, 2)}

Detected Totals:
${JSON.stringify(totals, null, 2)}

Calculate the financial impact. Distinguish one-time from recurring. Be conservative — don't invent numbers.`;
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
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error (${response.status})`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

function parseResponse(raw: string): Partial<FinancialImpactResult> {
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) try { return JSON.parse(m[1]); } catch { /* fall through */ }
    const fb = raw.indexOf('{'), lb = raw.lastIndexOf('}');
    if (fb !== -1 && lb > fb) try { return JSON.parse(raw.slice(fb, lb + 1)); } catch { /* fall through */ }
    throw new Error('Failed to parse financial impact response');
  }
}

export async function calculateFinancialImpact(
  doc: NormalizedDocument,
  feeFindings: VerifiableFinding[],
  env: Env,
): Promise<FinancialImpactResult> {
  console.log(`[FinancialImpact] Calculating for ${doc.fileName}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(doc, feeFindings) },
  ];

  try {
    const raw = await callDeepSeek(messages, env);
    const result = parseResponse(raw);

    return {
      oneTimeCharges: Number(result.oneTimeCharges) || 0,
      monthlyRecurring: Number(result.monthlyRecurring) || 0,
      annualRecurring: Number(result.annualRecurring) || 0,
      totalFirstYear: Number(result.totalFirstYear) || 
        (Number(result.oneTimeCharges) || 0) + (Number(result.monthlyRecurring) || 0) * 12 + (Number(result.annualRecurring) || 0),
      potentialSavings: Number(result.potentialSavings) || 0,
      questionableCharges: Number(result.questionableCharges) || 0,
      breakdown: Array.isArray(result.breakdown) ? result.breakdown.map((b: any) => ({
        category: String(b.category || ''),
        amount: Number(b.amount) || 0,
        recurring: Boolean(b.recurring),
      })) : [],
      confidence: Number(result.confidence) || 80,
    };
  } catch (err) {
    console.error('[FinancialImpact] Failed:', err);

    // Fallback: calculate from normalized data directly
    const oneTime = doc.fees.reduce((sum, f) =>
      sum + f.amounts.filter(a => !a.isRecurring).reduce((s, a) => s + a.value, 0), 0
    );
    const recurring = doc.fees.reduce((sum, f) =>
      sum + f.amounts.filter(a => a.isRecurring).reduce((s, a) => s + a.value, 0), 0
    );

    return {
      oneTimeCharges: oneTime,
      monthlyRecurring: recurring,
      annualRecurring: recurring * 12,
      totalFirstYear: oneTime + recurring * 12,
      potentialSavings: 0,
      questionableCharges: 0,
      breakdown: doc.fees.map(f => ({
        category: f.category,
        amount: f.amounts.reduce((s, a) => s + a.value, 0),
        recurring: f.amounts.some(a => a.isRecurring),
      })),
      confidence: 60, // Lower confidence for fallback calculation
    };
  }
}