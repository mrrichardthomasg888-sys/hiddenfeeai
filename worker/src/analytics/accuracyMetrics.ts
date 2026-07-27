/**
 * Accuracy Analytics Engine
 * 
 * Tracks analysis quality metrics over time WITHOUT storing document content.
 * 
 * TRACKED (anonymized):
 * - Finding counts by category and severity
 * - Verification success rates
 * - Suppression rates
 * - Confidence score distributions
 * - Feedback patterns (aggregate only)
 * 
 * NEVER TRACKED:
 * - Document text, names, addresses
 * - Financial amounts (except anonymized counts)
 * - Personal identifiers
 */

export interface AccuracySnapshot {
  timestamp: string;
  findings: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  verification: {
    evidenceFoundRate: number;
    suppressionRate: number;
    averageMatchScore: number;
  };
  confidence: {
    average: number;
    distribution: Record<string, number>; // tier → count
  };
  feedback: {
    helpfulRate: number;
    totalFeedback: number;
  };
}

// In-memory aggregation (in production, write to KV or Analytics Engine)
let currentSnapshot: AccuracySnapshot = createEmptySnapshot();

function createEmptySnapshot(): AccuracySnapshot {
  return {
    timestamp: new Date().toISOString(),
    findings: {
      total: 0,
      byCategory: {},
      bySeverity: {},
    },
    verification: {
      evidenceFoundRate: 0,
      suppressionRate: 0,
      averageMatchScore: 0,
    },
    confidence: {
      average: 0,
      distribution: { verified: 0, high: 0, moderate: 0, low: 0 },
    },
    feedback: {
      helpfulRate: 0,
      totalFeedback: 0,
    },
  };
}

/**
 * Record metrics from a completed analysis.
 * Call after verification completes.
 */
export function recordAnalysisMetrics(meta: {
  findings: Array<{ category: string; severity: string; confidenceTier: string; evidencePresent: boolean; suppressed: boolean }>;
  evidenceMatchScores: number[];
}): void {
  const snap = currentSnapshot;

  // Findings
  snap.findings.total += meta.findings.length;
  for (const f of meta.findings) {
    snap.findings.byCategory[f.category] = (snap.findings.byCategory[f.category] || 0) + 1;
    snap.findings.bySeverity[f.severity] = (snap.findings.bySeverity[f.severity] || 0) + 1;
    snap.confidence.distribution[f.confidenceTier] = (snap.confidence.distribution[f.confidenceTier] || 0) + 1;
  }

  // Verification
  const evidenceFound = meta.findings.filter(f => f.evidencePresent).length;
  const suppressed = meta.findings.filter(f => f.suppressed).length;
  const total = meta.findings.length;

  snap.verification.evidenceFoundRate = total > 0 ? evidenceFound / total : 0;
  snap.verification.suppressionRate = total > 0 ? suppressed / total : 0;
  snap.verification.averageMatchScore = meta.evidenceMatchScores.length > 0
    ? meta.evidenceMatchScores.reduce((s, v) => s + v, 0) / meta.evidenceMatchScores.length
    : 0;

  // Confidence
  snap.confidence.average = meta.findings.length > 0
    ? meta.findings.reduce((s, f, i) => s + (meta.findings[i] as any)?.confidenceScore || 0, 0) / meta.findings.length
    : 0;

  snap.timestamp = new Date().toISOString();
}

/**
 * Record user feedback (aggregated — no document content).
 */
export function recordFeedbackAggregate(type: 'helpful' | 'not_helpful' | 'incorrect'): void {
  currentSnapshot.feedback.totalFeedback++;
  // Track rates (simplified — in production, use a proper counter)
}

/**
 * Get current accuracy snapshot.
 */
export function getAccuracySnapshot(): AccuracySnapshot {
  return { ...currentSnapshot };
}

/**
 * Reset snapshot (for testing or new reporting periods).
 */
export function resetAccuracySnapshot(): void {
  currentSnapshot = createEmptySnapshot();
}