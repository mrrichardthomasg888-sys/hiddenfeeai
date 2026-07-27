// HiddenFeeAI — AI Knowledge Improvement Loop
// Connects user feedback, finding feedback, quality scores,
// and suppression patterns. Identifies weak explanations,
// missing fee categories, false positives, and new consumer questions.
// Privacy-safe: anonymous signals only. No document contents.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImprovementSignal {
  signalId: string;
  type: SignalType;
  source: "user_feedback" | "quality_check" | "suppression_pattern" | "trend_analysis" | "question_gap";
  description: string;
  affectedFeeCategory?: string;
  affectedIndustry?: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  status: "detected" | "investigating" | "resolved" | "dismissed";
  detectedAt: string;
  resolvedAt?: string;
  suggestedAction: string;
  confidence: number;           // 0-100
}

export type SignalType =
  | "weak_explanation"           // Explanation not clear/helpful enough
  | "missing_fee_category"       // Fee found but not in our database
  | "false_positive"             // Flagged as fee but shouldn't have been
  | "false_negative"             // Fee present but not detected
  | "new_consumer_question"      // User asked a question we haven't answered
  | "low_confidence_finding"     // Finding with low AI confidence
  | "consumer_challenge"         // User disagreed with finding
  | "emerging_pattern"           // New fee pattern emerging
  | "negotiation_feedback"       // User reported negotiation outcome
  | "quality_drift";             // Quality score declining over time

export interface ImprovementDashboard {
  totalSignals: number;
  openSignals: number;
  resolvedSignals: number;
  byType: Record<SignalType, number>;
  bySeverity: { critical: number; high: number; medium: number; low: number };
  topImprovementAreas: string[];
  recentResolutions: string[];
}

// ── Signal Detection ───────────────────────────────────────────────────────

export function createImprovementSignal(
  type: SignalType,
  description: string,
  severity: ImprovementSignal["severity"],
  suggestedAction: string,
  affectedCategory?: string,
  affectedIndustry?: string,
): ImprovementSignal {
  return {
    signalId: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    source: "user_feedback",
    description,
    affectedFeeCategory: affectedCategory,
    affectedIndustry,
    severity,
    status: "detected",
    detectedAt: new Date().toISOString(),
    suggestedAction,
    confidence: 75,
  };
}

// ── Feedback Processing ────────────────────────────────────────────────────

export function processUserFeedback(
  findingId: string,
  feedbackType: "agree" | "disagree" | "unclear" | "helpful" | "not_helpful",
  comment?: string,
): ImprovementSignal | null {
  if (feedbackType === "agree" || feedbackType === "helpful") return null;

  const type = feedbackType === "disagree"
    ? "consumer_challenge"
    : feedbackType === "unclear"
      ? "weak_explanation"
      : "low_confidence_finding";

  return createImprovementSignal(
    type,
    comment || `User feedback: ${feedbackType} on finding ${findingId}`,
    feedbackType === "disagree" ? "High" : "Medium",
    feedbackType === "disagree"
      ? "Review finding logic for potential false positive"
      : "Improve explanation clarity and evidence presentation",
  );
}

// ── False Positive Detection ───────────────────────────────────────────────

export function detectFalsePositivePattern(
  feeCategory: string,
  rejectionRate: number,   // % of users who disagreed with this fee type
): ImprovementSignal | null {
  if (rejectionRate > 30) {
    return createImprovementSignal(
      "false_positive",
      `High rejection rate (${rejectionRate}%) for ${feeCategory} — possible systematic false positive`,
      "Critical",
      `Audit ${feeCategory} detection logic, review confidence thresholds, and validate against ground truth examples`,
      feeCategory,
    );
  }
  return null;
}

// ── Missing Fee Detection ──────────────────────────────────────────────────

export function detectMissingFeeCategory(
  feeName: string,
  industry: string,
  observationCount: number,
): ImprovementSignal | null {
  if (observationCount >= 10) {
    return createImprovementSignal(
      "missing_fee_category",
      `New fee category detected: "${feeName}" in ${industry}. Observed ${observationCount} times but not in intelligence database.`,
      "High",
      `Add "${feeName}" to fee intelligence network with canonical name, aliases, and industry assignments`,
      feeName,
      industry,
    );
  }
  return null;
}

// ── Quality Drift Monitoring ───────────────────────────────────────────────

export function detectQualityDrift(
  currentPeriodAvgScore: number,
  previousPeriodAvgScore: number,
  threshold = 5,
): ImprovementSignal | null {
  const drift = previousPeriodAvgScore - currentPeriodAvgScore;
  if (drift > threshold) {
    return createImprovementSignal(
      "quality_drift",
      `Quality score declining: dropped from ${previousPeriodAvgScore} to ${currentPeriodAvgScore} (${drift} point drift)`,
      "High",
      "Review recent model changes, check for data quality issues, validate against benchmark dataset",
    );
  }
  return null;
}

// ── Dashboard Generation ───────────────────────────────────────────────────

export function generateImprovementDashboard(signals: ImprovementSignal[]): ImprovementDashboard {
  const open = signals.filter((s) => s.status === "detected" || s.status === "investigating");
  const resolved = signals.filter((s) => s.status === "resolved");

  const byType = {} as Record<SignalType, number>;
  for (const s of signals) {
    byType[s.type] = (byType[s.type] || 0) + 1;
  }

  const bySeverity = {
    critical: signals.filter((s) => s.severity === "Critical").length,
    high: signals.filter((s) => s.severity === "High").length,
    medium: signals.filter((s) => s.severity === "Medium").length,
    low: signals.filter((s) => s.severity === "Low").length,
  };

  const topAreas = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${type}: ${count} signals`);

  return {
    totalSignals: signals.length,
    openSignals: open.length,
    resolvedSignals: resolved.length,
    byType,
    bySeverity,
    topImprovementAreas: topAreas,
    recentResolutions: resolved.slice(-5).map((s) => s.description),
  };
}

export const IMPROVEMENT_SIGNALS_VERSION = "4.0.0";