import type { Env, VerifiableFinding, NegotiationResult, NormalizedDocument } from "../types.js";

/**
 * Negotiation Advisor — Specialized Analyzer
 * 
 * Identifies negotiable fees, generates consumer-facing questions, and provides
 * actionable scripts and talking points. This is the "what do I DO about this?" layer.
 */

const SYSTEM_PROMPT = `You are a consumer negotiation advisor. Your ONLY job is to identify negotiable items and provide actionable advice.

## WHAT YOU DO

1. Identify which fees/charges are potentially negotiable
2. Provide questions the consumer should ask
3. Suggest alternative wording for concerning clauses
4. Provide talking points for phone/email conversations
5. Assess negotiation difficulty

## NEGOTIABILITY FACTORS

- Administrative/documentation fees — often negotiable (especially in auto purchases)
- Dealer fees — frequently negotiable or removable
- Processing fees — may be waived if you ask
- Late fees — sometimes waived for first-time or good customers
- Service charges — may be reduced for loyalty
- Mandatory add-ons — can sometimes be removed
- Interest rates — negotiable with good credit
- Contract terms — some clauses are negotiable (arbitration waivers, auto-renewal)

## RULES

1. Only recommend negotiation for items that are ACTUALLY present in the document.
2. Every recommendation must reference a specific fee or clause from the document.
3. Provide realistic, consumer-friendly scripts.
4. Be honest about negotiation difficulty.

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "opportunities": [
    {
      "title": "Negotiable item name",
      "category": "Negotiation",
      "severity": "Low" | "Medium" | "High",
      "confidenceScore": number 80-100,
      "amount": number or null,
      "page": number or null,
      "sectionHeading": null,
      "evidenceQuote": "The exact item being negotiated",
      "explanation": "Why this is negotiable",
      "whyItMatters": "Potential savings",
      "recommendedAction": "How to negotiate this",
      "negotiationMessage": "Exact script to use",
      "negotiationStrategy": {
        "difficulty": "Easy" | "Medium" | "Hard",
        "steps": ["step 1", "step 2"],
        "script": "Full script",
        "key_points": ["point 1", "point 2"]
      }
    }
  ],
  "negotiableFees": [
    {"name": "Fee name", "amount": number, "likelihood": "high" | "medium" | "low"}
  ],
  "suggestedQuestions": ["question 1", "question 2"],
  "talkingPoints": ["point 1", "point 2"],
  "confidence": number 0-100
}

CRITICAL: Return ONLY the JSON object.`;

function buildUserMessage(
  doc: NormalizedDocument,
  feeFindings: VerifiableFinding[],
  clauseFindings: VerifiableFinding[],
): string {
  const feeSummary = feeFindings.map(f => ({
    title: f.title,
    amount: f.amount,
    explanation: f.explanation.slice(0, 150),
  }));
  
  const clauseSummary = clauseFindings.map(c => ({
    title: c.title,
    severity: c.severity,
    explanation: c.explanation.slice(0, 150),
  }));

  return `Document Content (for reference):
${doc.markdown.slice(0, 30000)}

Fees detected:
${JSON.stringify(feeSummary, null, 2)}

Clauses detected:
${JSON.stringify(clauseSummary, null, 2)}

Which of these fees and clauses are negotiable? Provide specific scripts and questions for the consumer.`;
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
      temperature: 0.2,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error (${response.status})`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

function parseResponse(raw: string): any {
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) try { return JSON.parse(m[1]); } catch { /* fall through */ }
    const fb = raw.indexOf('{'), lb = raw.lastIndexOf('}');
    if (fb !== -1 && lb > fb) try { return JSON.parse(raw.slice(fb, lb + 1)); } catch { /* fall through */ }
    throw new Error('Failed to parse negotiation response');
  }
}

export async function adviseNegotiation(
  doc: NormalizedDocument,
  feeFindings: VerifiableFinding[],
  clauseFindings: VerifiableFinding[],
  env: Env,
): Promise<NegotiationResult> {
  console.log(`[NegotiationAdvisor] Analyzing ${doc.fileName}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(doc, feeFindings, clauseFindings) },
  ];

  try {
    const raw = await callDeepSeek(messages, env);
    const result = parseResponse(raw);

    const opportunities: VerifiableFinding[] = (result.opportunities || []).map((o: any) => ({
      id: crypto.randomUUID(),
      title: String(o.title || 'Negotiation opportunity'),
      category: 'Negotiation',
      severity: (['Low', 'Medium', 'High'].includes(o.severity) ? o.severity : 'Medium') as VerifiableFinding['severity'],
      confidenceScore: Math.min(100, Math.max(0, Number(o.confidenceScore) || 80)),
      confidenceTier: (Number(o.confidenceScore) >= 95 ? 'verified' : Number(o.confidenceScore) >= 90 ? 'high' : 'moderate') as VerifiableFinding['confidenceTier'],
      amount: o.amount != null ? Number(o.amount) : null,
      page: o.page != null ? Number(o.page) : null,
      sectionHeading: null,
      evidenceQuote: String(o.evidenceQuote || ''),
      explanation: String(o.explanation || ''),
      whyItMatters: String(o.whyItMatters || ''),
      recommendedAction: String(o.recommendedAction || ''),
      negotiationMessage: o.negotiationMessage || undefined,
      negotiationStrategy: o.negotiationStrategy || undefined,
      sourceAnalyzer: 'negotiationAdvisor',
    }));

    return {
      opportunities,
      negotiableFees: Array.isArray(result.negotiableFees) ? result.negotiableFees : [],
      suggestedQuestions: Array.isArray(result.suggestedQuestions) ? result.suggestedQuestions : [],
      talkingPoints: Array.isArray(result.talkingPoints) ? result.talkingPoints : [],
      confidence: result.confidence ?? 80,
    };
  } catch (err) {
    console.error('[NegotiationAdvisor] Failed:', err);
    return {
      opportunities: [],
      negotiableFees: [],
      suggestedQuestions: [],
      talkingPoints: [],
      confidence: 0,
    };
  }
}