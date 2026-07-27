import type { VerifiedFinding, StructuredDocument, VerificationResult } from "../types.js";

/**
 * Trust Score Engine
 * 
 * Generates a report-level trust score measuring ANALYSIS RELIABILITY.
 * 
 * IMPORTANT: This measures whether the analysis is well-supported,
 * NOT whether a company or contract is "good" or "bad."
 * 
 * A high trust score means: "The evidence supports these findings."
 * A low trust score means: "Take these findings with caution."
 */

export interface TrustScore {
  score: number; // 0-100
  rating: 'Excellent' | 'Good' | 'Fair' | 'Limited' | 'Poor';
  ratingLabel: string;
  factors: TrustFactor[];
  summary: string;
  disclaimer: string;
}

export interface TrustFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  label: string;
  detail: string;
}

const DISCLAIMER = "Trust Score measures how well the AI's findings are supported by evidence in your document. It does not judge whether any company or individual is trustworthy. Always verify important decisions independently.";

/**
 * Calculate overall trust score from analysis results.
 */
export function calculateTrustScore(
  verificationResult: VerificationResult,
  doc: StructuredDocument,
  findingsCount: number,
): TrustScore {
  const factors = calculateFactors(verificationResult, doc, findingsCount);
  
  // Weighted average
  const totalWeight = factors.reduce((s, f) => s + f.weight, 0);
  const weightedSum = factors.reduce((s, f) => s + f.score * f.weight, 0);
  const score = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  const { rating, ratingLabel } = getRating(score);

  return {
    score,
    rating,
    ratingLabel,
    factors,
    summary: buildSummary(score, rating, factors),
    disclaimer: DISCLAIMER,
  };
}

function calculateFactors(
  verification: VerificationResult,
  doc: StructuredDocument,
  findingsCount: number,
): TrustFactor[] {
  const factors: TrustFactor[] = [];

  // Factor 1: Evidence Coverage — what % of findings have source evidence?
  const findingsWithEvidence = verification.verifiedFindings.filter(f => f.evidencePresent).length;
  const total = verification.verifiedFindings.length;
  const evidenceCoverage = total > 0 ? (findingsWithEvidence / total) * 100 : 0;
  
  factors.push({
    name: 'Evidence Coverage',
    score: Math.round(evidenceCoverage),
    weight: 0.35,
    label: evidenceCoverage >= 90 ? 'Excellent' : 
           evidenceCoverage >= 70 ? 'Good' : 
           evidenceCoverage >= 50 ? 'Fair' : 'Limited',
    detail: `${findingsWithEvidence}/${total} findings have supporting evidence in the document.`,
  });

  // Factor 2: Verification Success — how well did evidence match?
  const verifiedFindings = verification.verifiedFindings.filter(f => f.evidencePresent);
  const avgMatchScore = verifiedFindings.length > 0
    ? verifiedFindings.reduce((s, f) => s + f.evidenceMatchScore, 0) / verifiedFindings.length * 100
    : 0;
  
  factors.push({
    name: 'Verification Match Quality',
    score: Math.round(avgMatchScore),
    weight: 0.25,
    label: avgMatchScore >= 85 ? 'Strong' : 
           avgMatchScore >= 70 ? 'Good' : 
           avgMatchScore >= 50 ? 'Adequate' : 'Weak',
    detail: `Evidence matched source text with ${Math.round(avgMatchScore)}% accuracy.`,
  });

  // Factor 3: Document Extraction Quality
  const extractionQuality = doc.extractionConfidence * 100;
  
  factors.push({
    name: 'Document Extraction Quality',
    score: Math.round(extractionQuality),
    weight: 0.20,
    label: extractionQuality >= 90 ? 'Excellent' :
           extractionQuality >= 70 ? 'Good' :
           extractionQuality >= 50 ? 'Fair' : 'Poor',
    detail: `Document was read with ${Math.round(extractionQuality)}% extraction quality. ${doc.extractionMethod} extraction method used.`,
  });

  // Factor 4: Hallucination Prevention
  const suppressionRate = total > 0 ? (verification.suppressedCount / Math.max(total + verification.suppressedCount, 1)) * 100 : 0;
  const antiHallucination = Math.max(0, 100 - suppressionRate);
  
  factors.push({
    name: 'Hallucination Prevention',
    score: Math.round(antiHallucination),
    weight: 0.20,
    label: suppressionRate < 10 ? 'Excellent' :
           suppressionRate < 25 ? 'Good' :
           suppressionRate < 40 ? 'Fair' : 'Needs Attention',
    detail: verification.suppressedCount > 0
      ? `${verification.suppressedCount} findings were suppressed due to insufficient evidence.`
      : 'No findings were flagged for insufficient evidence.',
  });

  return factors;
}

function getRating(score: number): { rating: TrustScore['rating']; ratingLabel: string } {
  if (score >= 90) return {
    rating: 'Excellent',
    ratingLabel: '🟢 Analysis is well-supported by document evidence. Findings are reliable.',
  };
  if (score >= 75) return {
    rating: 'Good',
    ratingLabel: '🟢 Most findings are supported. A few may require additional verification.',
  };
  if (score >= 55) return {
    rating: 'Fair',
    ratingLabel: '🟡 Some findings have limited evidence. Review key items carefully.',
  };
  if (score >= 35) return {
    rating: 'Limited',
    ratingLabel: '🟠 Evidence is sparse. Consider this a preliminary review.',
  };
  return {
    rating: 'Poor',
    ratingLabel: '🔴 Analysis could not be reliably verified. Human review strongly recommended.',
  };
}

function buildSummary(score: number, rating: string, factors: TrustFactor[]): string {
  const strengths = factors.filter(f => f.score >= 80).map(f => f.name);
  const weaknesses = factors.filter(f => f.score < 50).map(f => f.name);

  let summary = `Overall Trust Score: ${score}/100 (${rating}). `;

  if (strengths.length > 0) {
    summary += `Strengths: ${strengths.join(', ')}. `;
  }
  if (weaknesses.length > 0) {
    summary += `Areas to watch: ${weaknesses.join(', ')}. `;
  }

  return summary;
}