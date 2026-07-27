import type { Env, RiskAssessmentResult, AuditReport, NormalizedDocument } from "../types.js";

/**
 * Risk Analyzer — Specialized Analyzer
 * 
 * Evaluates overall consumer risk: transparency, complexity, financial exposure,
 * and missing disclosures. This is the "big picture" analyzer.
 */

const SYSTEM_PROMPT = `You are a consumer risk assessment specialist. Evaluate the OVERALL risk profile of this document.

## WHAT YOU EVALUATE

1. TRANSPARENCY — How clear is the pricing? Are fees hidden or obvious?
2. COMPLEXITY — How hard is this document to understand? Legalese? Buried terms?
3. CONSUMER RISK — Overall risk to the consumer (financial, legal, practical)
4. FINANCIAL EXPOSURE — Maximum potential financial impact if things go wrong
5. MISSING DISCLOSURES — What SHOULD be disclosed but isn't? (flag absences)

## SCORING (0-100 for each dimension)

- Transparency: 100 = crystal clear, 0 = deliberately confusing
- Complexity: 0 = simple, 100 = extremely complex/legalistic
- Consumer Risk: 0 = no risk, 100 = extreme risk
- Financial Exposure: 0 = no exposure, 100 = unlimited liability
- Overall Risk Score: composite of all dimensions

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "riskScore": number 0-100,
  "riskLevel": "Low" | "Review Recommended" | "Elevated" | "High",
  "transparencyScore": number 0-100,
  "complexityScore": number 0-100,
  "consumerRiskScore": number 0-100,
  "financialExposureScore": number 0-100,
  "missingDisclosures": ["disclosure 1", "disclosure 2"],
  "confidence": number 0-100
}

Risk level thresholds: 0-25 Low, 26-50 Review Recommended, 51-75 Elevated, 76-100 High.

CRITICAL: Return ONLY the JSON object.`;

function buildUserMessage(doc: NormalizedDocument, feeCount: number, clauseCount: number): string {
  return `Document Content:
${doc.markdown.slice(0, 40000)}

Context:
- ${feeCount} hidden fees detected
- ${clauseCount} risky clauses detected
- ${doc.fees.length} fee groups in normalized data
- Language: ${doc.language}
- Parties: ${doc.parties.join(', ') || 'Unknown'}

Assess the OVERALL risk profile of this consumer document. Be honest — if it's a clean document, say so.`;
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
    const errorText = await response.text().catch(() => 'Unknown');
    throw new Error(`DeepSeek API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

function parseResponse(raw: string): Partial<RiskAssessmentResult> {
  try { return JSON.parse(raw); } catch {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) try { return JSON.parse(match[1]); } catch { /* fall through */ }
    const fb = raw.indexOf('{'), lb = raw.lastIndexOf('}');
    if (fb !== -1 && lb > fb) try { return JSON.parse(raw.slice(fb, lb + 1)); } catch { /* fall through */ }
    throw new Error('Failed to parse risk assessment');
  }
}

export async function assessRisk(
  doc: NormalizedDocument,
  feeCount: number,
  clauseCount: number,
  env: Env,
): Promise<RiskAssessmentResult> {
  console.log(`[RiskAnalyzer] Assessing risk for ${doc.fileName}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildUserMessage(doc, feeCount, clauseCount) },
  ];

  try {
    const raw = await callDeepSeek(messages, env);
    const result = parseResponse(raw);

    return {
      riskScore: Math.min(100, Math.max(0, Number(result.riskScore) || 30)),
      riskLevel: (['Low', 'Review Recommended', 'Elevated', 'High'].includes(result.riskLevel as string) 
        ? result.riskLevel as AuditReport['risk_level'] : 'Review Recommended'),
      transparencyScore: Math.min(100, Math.max(0, Number(result.transparencyScore) || 50)),
      complexityScore: Math.min(100, Math.max(0, Number(result.complexityScore) || 50)),
      consumerRiskScore: Math.min(100, Math.max(0, Number(result.consumerRiskScore) || 50)),
      financialExposureScore: Math.min(100, Math.max(0, Number(result.financialExposureScore) || 50)),
      missingDisclosures: Array.isArray(result.missingDisclosures) ? result.missingDisclosures : [],
      confidence: Math.min(100, Math.max(0, Number(result.confidence) || 80)),
    };
  } catch (err) {
    console.error('[RiskAnalyzer] Failed:', err);
    return {
      riskScore: 30,
      riskLevel: 'Review Recommended',
      transparencyScore: 50,
      complexityScore: 50,
      consumerRiskScore: 50,
      financialExposureScore: 50,
      missingDisclosures: [],
      confidence: 0,
    };
  }
}