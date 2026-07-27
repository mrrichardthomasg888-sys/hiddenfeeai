import type { VerifiedFinding, DecisionResult } from "../types.js";
import { estimateSavings, aggregateSavings } from "./savingsEstimator.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Customer Value Summary
 * 
 * Generates a user-facing summary of what HiddenFeeAI found.
 * Always uses qualifying language: "potential", "estimated", "possible".
 * Never promises guaranteed savings.
 */

export interface CustomerValueSummary {
  documentsReviewed: number;
  totalIssuesFound: number;
  criticalIssues: number;
  highIssues: number;
  potentialFeesIdentified: number;
  feesLabel: string;
  negotiationOpportunities: number;
  potentialSavingsLabel: string;
  highestPriorityItem: string;
  highestPriorityAction: string;
  keyTakeaways: string[];
  nextRecommendedAction: string;
  disclaimer: string;
}

const DISCLAIMER = "Estimates are based on automated document analysis. Actual outcomes depend on negotiation, market conditions, and individual circumstances. This is not financial or legal advice.";

export function generateCustomerValueSummary(
  allFindings: VerifiedFinding[],
  documentCount: number,
  decision?: DecisionResult,
): CustomerValueSummary {
  const active = allFindings.filter(f => !f.suppressed);
  const critical = active.filter(f => f.severity === 'Critical').length;
  const high = active.filter(f => f.severity === 'High').length;
  const totalFees = active
    .filter(f => f.amount && f.amount > 0)
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  const savings = estimateSavings(active);
  const savingsAgg = aggregateSavings(savings);
  const negotiable = savings.filter(s => s.estimatable).length;
  const highest = active.sort((a, b) => {
    const sa = a.confidenceScore * (a.amount || 1) * (a.severity === 'Critical' ? 3 : a.severity === 'High' ? 2 : 1);
    const sb = b.confidenceScore * (b.amount || 1) * (b.severity === 'Critical' ? 3 : b.severity === 'High' ? 2 : 1);
    return sb - sa;
  })[0];

  const k = highest ? lookupFee(highest.title) : null;

  return {
    documentsReviewed: documentCount,
    totalIssuesFound: active.length,
    criticalIssues: critical,
    highIssues: high,
    potentialFeesIdentified: totalFees,
    feesLabel: totalFees > 0
      ? `$${totalFees.toLocaleString()} in potential fees and charges identified`
      : 'No significant fees identified',
    negotiationOpportunities: negotiable,
    potentialSavingsLabel: savingsAgg.potentialSavingsLabel,
    highestPriorityItem: highest ? highest.title : 'None',
    highestPriorityAction: k?.negotiability === 'highly_negotiable'
      ? `Address the "${highest?.title}" first — this is frequently negotiable.`
      : highest?.recommendedAction || 'Review findings and address highest-priority items first.',
    keyTakeaways: buildTakeaways(active, totalFees, savingsAgg),
    nextRecommendedAction: critical > 0
      ? `Address ${critical} critical finding(s) before signing or committing.`
      : negotiable > 0
        ? `Review ${negotiable} potentially negotiable items — you may be able to reduce costs.`
        : 'Review findings and keep this report for your records.',
    disclaimer: DISCLAIMER,
  };
}

function buildTakeaways(
  findings: VerifiedFinding[],
  totalFees: number,
  savingsAgg: ReturnType<typeof aggregateSavings>,
): string[] {
  const t: string[] = [];
  if (totalFees > 0) t.push(`Potential fees identified: $${totalFees.toLocaleString()}`);
  if (savingsAgg.totalHigh > 0) t.push(`Potential savings opportunity: ${savingsAgg.potentialSavingsLabel}`);
  const arbitration = findings.find(f => f.evidenceQuote.toLowerCase().includes('arbitration'));
  if (arbitration) t.push('Document contains an arbitration clause — review before signing');
  const autoRenew = findings.find(f => f.title.toLowerCase().includes('renew'));
  if (autoRenew) t.push('Auto-renewal detected — set a calendar reminder');
  if (t.length === 0) t.push('Document appears standard — no significant concerns');
  return t;
}