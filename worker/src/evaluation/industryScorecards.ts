/**
 * Industry Accuracy Scorecards
 * 
 * Tracks per-industry performance metrics for internal quality monitoring.
 * Never includes document content or PII.
 */

export interface IndustryScore {
  industry: string;
  documentsTested: number;
  feeDetectionAccuracy: number;
  evidenceAccuracy: number;
  averageFindings: number;
  suppressionRate: number;
  gradeDistribution: Record<string, number>;
  mostCommonMiss: string;
}

const industryData: Map<string, { detections: number; correctFees: number; evidenceHits: number; totalFindings: number; suppressions: number; grades: Record<string, number> }> = new Map();

export function recordIndustryResult(industry: string, meta: {
  detectedFees: number; correctFees: number; evidenceFound: number; totalEvidence: number; totalFindings: number; suppressed: number; grade: string;
}): void {
  if (!industryData.has(industry)) industryData.set(industry, { detections: 0, correctFees: 0, evidenceHits: 0, totalFindings: 0, suppressions: 0, grades: {} });
  const d = industryData.get(industry)!;
  d.detections += meta.detectedFees; d.correctFees += meta.correctFees;
  d.evidenceHits += meta.evidenceFound; d.totalFindings += meta.totalEvidence; d.suppressions += meta.suppressed;
  d.grades[meta.grade] = (d.grades[meta.grade] || 0) + 1;
}

export function getIndustryScorecards(): IndustryScore[] {
  const results: IndustryScore[] = [];
  for (const [industry, d] of industryData) {
    results.push({
      industry,
      documentsTested: Object.values(d.grades).reduce((s, v) => s + v, 0),
      feeDetectionAccuracy: d.detections > 0 ? Math.round((d.correctFees / d.detections) * 100) : 0,
      evidenceAccuracy: d.totalFindings > 0 ? Math.round((d.evidenceHits / d.totalFindings) * 100) : 0,
      averageFindings: d.totalFindings > 0 ? Math.round(d.totalFindings / Math.max(Object.values(d.grades).reduce((s, v) => s + v, 0), 1)) : 0,
      suppressionRate: d.totalFindings > 0 ? Math.round((d.suppressions / d.totalFindings) * 100) : 0,
      gradeDistribution: d.grades,
      mostCommonMiss: 'Data insufficient',
    });
  }
  return results;
}