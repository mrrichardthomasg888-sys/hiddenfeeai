import type { VerifiedFinding } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Potential Savings Estimator
 * 
 * Estimates possible savings based on fee knowledge and industry data.
 * 
 * CRITICAL: Never claims guaranteed savings.
 * Always uses qualifying language: "potential", "estimated", "possible".
 * Every estimate is a RANGE, not a specific number.
 */

export interface SavingsEstimate {
  findingId: string;
  feeName: string;
  currentAmount: number;
  estimatable: boolean;
  rangeLow: number;
  rangeHigh: number;
  rangeLabel: string;
  confidence: number;
  basis: string;
  disclaimer: string;
}

const DISCLAIMER = "This is an estimate based on typical outcomes reported by consumers. Actual savings depend on your specific situation and negotiation. Not a guarantee.";

/**
 * Generate savings estimates for all fee-based findings.
 */
export function estimateSavings(findings: VerifiedFinding[]): SavingsEstimate[] {
  const feeFindings = findings.filter(f => 
    !f.suppressed && f.amount && f.amount > 0 &&
    (f.category === 'Hidden Fee' || f.category === 'Fee' || 
     f.title.toLowerCase().includes('fee') || f.title.toLowerCase().includes('charge'))
  );

  return feeFindings.map(f => estimateForFinding(f));
}

function estimateForFinding(f: VerifiedFinding): SavingsEstimate {
  const amount = f.amount || 0;
  const knowledge = lookupFee(f.title);
  
  if (!knowledge || amount === 0) {
    return {
      findingId: f.id,
      feeName: f.title,
      currentAmount: amount,
      estimatable: false,
      rangeLow: 0,
      rangeHigh: 0,
      rangeLabel: 'Unable to estimate',
      confidence: 0,
      basis: 'Insufficient data for savings estimate',
      disclaimer: DISCLAIMER,
    };
  }

  // Different estimation strategies by negotiability
  switch (knowledge.negotiability) {
    case 'highly_negotiable':
      return {
        findingId: f.id,
        feeName: f.title,
        currentAmount: amount,
        estimatable: true,
        rangeLow: Math.round(amount * 0.3),
        rangeHigh: Math.round(amount * 0.8),
        rangeLabel: `$${Math.round(amount * 0.3)} - $${Math.round(amount * 0.8)}`,
        confidence: 0.75,
        basis: `${knowledge.feeName} is frequently reduced by 30-80% when negotiated. ${knowledge.negotiabilityReason}`,
        disclaimer: DISCLAIMER,
      };

    case 'somewhat_negotiable':
      return {
        findingId: f.id,
        feeName: f.title,
        currentAmount: amount,
        estimatable: true,
        rangeLow: Math.round(amount * 0.1),
        rangeHigh: Math.round(amount * 0.5),
        rangeLabel: `$${Math.round(amount * 0.1)} - $${Math.round(amount * 0.5)}`,
        confidence: 0.55,
        basis: `${knowledge.feeName} can sometimes be reduced by 10-50%. ${knowledge.negotiabilityReason}`,
        disclaimer: DISCLAIMER,
      };

    case 'rarely_negotiable':
      return {
        findingId: f.id,
        feeName: f.title,
        currentAmount: amount,
        estimatable: true,
        rangeLow: 0,
        rangeHigh: Math.round(amount * 0.2),
        rangeLabel: `$0 - $${Math.round(amount * 0.2)}`,
        confidence: 0.3,
        basis: `${knowledge.feeName} is rarely reduced but exceptions exist. ${knowledge.negotiabilityReason}`,
        disclaimer: DISCLAIMER,
      };

    case 'not_negotiable':
    default:
      return {
        findingId: f.id,
        feeName: f.title,
        currentAmount: amount,
        estimatable: false,
        rangeLow: 0,
        rangeHigh: 0,
        rangeLabel: 'Not typically negotiable',
        confidence: 0.1,
        basis: `${knowledge.feeName} is generally fixed. Consider alternative providers or bundling.`,
        disclaimer: DISCLAIMER,
      };
  }
}

/**
 * Aggregate savings across all findings.
 */
export function aggregateSavings(estimates: SavingsEstimate[]): {
  totalCurrent: number;
  totalLow: number;
  totalHigh: number;
  potentialSavingsLabel: string;
  confidence: number;
} {
  const estimatable = estimates.filter(e => e.estimatable);
  
  const totalCurrent = estimates.reduce((s, e) => s + e.currentAmount, 0);
  const totalLow = estimatable.reduce((s, e) => s + e.rangeLow, 0);
  const totalHigh = estimatable.reduce((s, e) => s + e.rangeHigh, 0);
  
  const avgConfidence = estimatable.length > 0
    ? estimatable.reduce((s, e) => s + e.confidence, 0) / estimatable.length
    : 0;

  return {
    totalCurrent,
    totalLow,
    totalHigh,
    potentialSavingsLabel: totalHigh > 0
      ? `$${totalLow} - $${totalHigh} possible savings on $${totalCurrent} in identified fees`
      : 'No negotiable fees identified',
    confidence: Math.round(avgConfidence * 100),
  };
}