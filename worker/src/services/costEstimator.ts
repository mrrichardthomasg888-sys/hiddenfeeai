/**
 * AI Cost Estimator
 * 
 * Tracks estimated AI API costs without logging document contents.
 * DeepSeek pricing (approximate, as of 2026):
 * - deepseek-chat: $0.14/1M input tokens, $0.28/1M output tokens
 * - deepseek-reasoner: $0.55/1M input tokens, $2.19/1M output tokens
 * 
 * Estimates are conservative (over-estimate by ~10% for safety).
 */

interface CostBreakdown {
  model: string;
  purpose: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostCents: number;
}

interface SessionCost {
  sessionId: string;
  totalCostCents: number;
  breakdowns: CostBreakdown[];
  startedAt: number;
}

// Pricing constants (USD per 1M tokens)
const PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
};

// Character-to-token ratio (rough estimate: 1 token ≈ 4 chars for English text)
const CHARS_PER_TOKEN = 4;

// In-memory tracking (per request — not persisted)
const activeSessions = new Map<string, SessionCost>();

export function startCostSession(sessionId: string): void {
  activeSessions.set(sessionId, {
    sessionId,
    totalCostCents: 0,
    breakdowns: [],
    startedAt: Date.now(),
  });
}

export function estimateTokensFromChars(charCount: number): number {
  return Math.ceil(charCount / CHARS_PER_TOKEN);
}

export function estimateCostCents(
  model: string,
  inputChars: number,
  outputChars: number,
): number {
  const pricing = PRICING[model] || PRICING['deepseek-chat'];
  const inputTokens = estimateTokensFromChars(inputChars);
  const outputTokens = estimateTokensFromChars(outputChars);
  
  const costCents = (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  ) * 100; // Convert dollars to cents

  return Math.max(costCents, 0.01); // Minimum 0.01c per call
}

export function recordApiCall(
  sessionId: string,
  model: string,
  purpose: string,
  inputChars: number,
  outputChars: number,
): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const costCents = estimateCostCents(model, inputChars, outputChars);
  
  session.breakdowns.push({
    model,
    purpose,
    inputTokens: estimateTokensFromChars(inputChars),
    outputTokens: estimateTokensFromChars(outputChars),
    estimatedCostCents: costCents,
  });
  
  session.totalCostCents += costCents;
}

export function getSessionCost(sessionId: string): SessionCost | undefined {
  return activeSessions.get(sessionId);
}

export function endCostSession(sessionId: string): SessionCost | undefined {
  const session = activeSessions.get(sessionId);
  activeSessions.delete(sessionId);
  return session;
}

/**
 * Estimate total cost for a typical analysis session.
 * Used for capacity planning and monitoring only.
 * 
 * Typical costs:
 * - Simple receipt/invoice (no clauses): ~$0.01-0.03
 * - Standard contract (fees + clauses): ~$0.05-0.15
 * - Complex document (100+ pages): ~$0.20-0.50
 */
export function getEstimatedCostRange(
  pageCount: number,
  hasTables: boolean,
  isContract: boolean,
): { min: number; max: number } {
  // Base extraction cost
  const extractionCost = pageCount * 0.002;
  
  // Analysis cost scales with document type
  const analysisCost = isContract
    ? pageCount * 0.008  // Contracts need clause analysis too
    : pageCount * 0.004; // Bills/invoices are simpler
  
  // Table extraction adds cost
  const tableBonus = hasTables ? 0.02 : 0;
  
  const total = extractionCost + analysisCost + tableBonus;
  
  return {
    min: Math.max(total * 0.8, 0.01),
    max: Math.max(total * 1.5, 0.02),
  };
}