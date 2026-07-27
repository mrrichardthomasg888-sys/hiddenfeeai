import type { VerifiedFinding } from "../types.js";

/**
 * Confidence Explanation Engine
 * 
 * Don't just show "Confidence: 95%."
 * Explain WHY it's 95%.
 * 
 * Factors that influence confidence:
 * - Evidence match quality in source document
 * - Amount extraction accuracy
 * - Document classification confidence
 * - Industry knowledge base match
 * - Verification result
 */

export interface ConfidenceExplanation {
  score: number;
  tier: string;
  shortLabel: string;
  factors: ConfidenceFactor[];
  summary: string;
}

export interface ConfidenceFactor {
  name: string;
  status: 'positive' | 'neutral' | 'negative';
  icon: string;
  detail: string;
}

/**
 * Generate a detailed confidence explanation for a finding.
 */
export function explainConfidence(finding: VerifiedFinding): ConfidenceExplanation {
  const factors = buildFactors(finding);
  
  const positiveCount = factors.filter(f => f.status === 'positive').length;
  const negativeCount = factors.filter(f => f.status === 'negative').length;
  
  const tier = finding.confidenceScore >= 95 ? 'Verified' :
    finding.confidenceScore >= 90 ? 'High' :
    finding.confidenceScore >= 80 ? 'Moderate' : 'Low';

  const shortLabel = tier === 'Verified' ? '✓ Evidence confirmed in document' :
    tier === 'High' ? '✓ Strong evidence match' :
    tier === 'Moderate' ? '⚠ Evidence found — some ambiguity' :
    '⚠ Evidence weak — review carefully';

  const summary = negativeCount === 0
    ? 'All confidence factors are positive. Finding is well-supported.'
    : `${negativeCount} factor(s) lower our confidence. Consider verifying this finding before acting on it.`;

  return {
    score: finding.confidenceScore,
    tier,
    shortLabel,
    factors,
    summary,
  };
}

function buildFactors(finding: VerifiedFinding): ConfidenceFactor[] {
  const factors: ConfidenceFactor[] = [];

  // Factor 1: Evidence presence in document
  if (finding.evidencePresent && finding.evidenceMatchScore >= 0.9) {
    factors.push({
      name: 'Evidence Match',
      status: 'positive',
      icon: '✓',
      detail: `Exact evidence found in document (${Math.round(finding.evidenceMatchScore * 100)}% match)`,
    });
  } else if (finding.evidencePresent) {
    factors.push({
      name: 'Evidence Match',
      status: 'neutral',
      icon: '~',
      detail: `Evidence partially matched (${Math.round(finding.evidenceMatchScore * 100)}% match)`,
    });
  } else {
    factors.push({
      name: 'Evidence Match',
      status: 'negative',
      icon: '✗',
      detail: 'Evidence could not be verified in the source document',
    });
  }

  // Factor 2: Amount verification
  if (finding.amount !== null && finding.amount > 0) {
    factors.push({
      name: 'Amount Detection',
      status: 'positive',
      icon: '✓',
      detail: `Dollar amount extracted: $${finding.amount.toLocaleString()}`,
    });
  } else if (finding.amount === 0) {
    factors.push({
      name: 'Amount Detection',
      status: 'neutral',
      icon: '~',
      detail: 'No monetary amount associated with this finding',
    });
  }

  // Factor 3: Page reference
  if (finding.page !== null) {
    factors.push({
      name: 'Page Reference',
      status: 'positive',
      icon: '✓',
      detail: `Located on page ${finding.page}`,
    });
  } else {
    factors.push({
      name: 'Page Reference',
      status: 'negative',
      icon: '✗',
      detail: 'No page reference available',
    });
  }

  // Factor 4: Section heading
  if (finding.sectionHeading) {
    factors.push({
      name: 'Section Context',
      status: 'positive',
      icon: '✓',
      detail: `Found in section: "${finding.sectionHeading}"`,
    });
  }

  // Factor 5: Verification status
  if (finding.suppressed) {
    factors.push({
      name: 'Verification Status',
      status: 'negative',
      icon: '✗',
      detail: 'Finding was suppressed — evidence insufficient',
    });
  } else {
    factors.push({
      name: 'Verification Status',
      status: 'positive',
      icon: '✓',
      detail: 'Finding passed verification checks',
    });
  }

  return factors;
}