import type { QualityEvaluation } from "./qualityEvaluator.js";

/**
 * Analysis Performance Scorecard
 * Aggregates evaluation metrics into an operational scorecard.
 */

export interface AnalysisScore {
  accuracyScore: number;
  evidenceScore: number;
  confidenceAlignmentScore: number;
  safetyScore: number;
  overallQuality: 'excellent' | 'good' | 'fair' | 'needs_review';
  averageScores: {
    last10: number;
    last50: number;
    allTime: number;
  };
  gradeDistribution: Record<string, number>;
}

// In-memory rolling window (production: KV)
const recentEvaluations: QualityEvaluation[] = [];
const MAX_STORED = 100;

export function recordEvaluation(eval_: QualityEvaluation): void {
  recentEvaluations.push(eval_);
  while (recentEvaluations.length > MAX_STORED) recentEvaluations.shift();
}

export function getAnalysisScorecard(): AnalysisScore {
  if (recentEvaluations.length === 0) {
    return {
      accuracyScore: 0, evidenceScore: 0, confidenceAlignmentScore: 0, safetyScore: 0,
      overallQuality: 'needs_review',
      averageScores: { last10: 0, last50: 0, allTime: 0 },
      gradeDistribution: {},
    };
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
  const all = recentEvaluations;
  const last10 = all.slice(-10);
  const last50 = all.slice(-50);

  const accuracyScore = avg(all.map(e => e.detection.score));
  const evidenceScore = avg(all.map(e => e.evidence.score));
  const safetyScore = avg(all.map(e => e.safety.score));
  const confidenceScore = avg(all.map(e => e.overallScore));

  const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 };
  for (const e of all) { dist[e.grade] = (dist[e.grade] || 0) + 1; }

  const overall = confidenceScore >= 90 ? 'excellent' : confidenceScore >= 75 ? 'good' : confidenceScore >= 60 ? 'fair' : 'needs_review';

  return {
    accuracyScore, evidenceScore, confidenceAlignmentScore: confidenceScore, safetyScore, overallQuality: overall,
    averageScores: { last10: avg(last10.map(e => e.overallScore)), last50: avg(last50.map(e => e.overallScore)), allTime: avg(all.map(e => e.overallScore)) },
    gradeDistribution: dist,
  };
}