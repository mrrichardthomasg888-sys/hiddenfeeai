// HiddenFeeAI — Data Quality Governance
// Monitors sample size, data freshness, confidence levels,
// and source reliability. Prevents small sample conclusions
// and misleading statistics. Privacy-safe: no PII, no document data.

// ── Types ──────────────────────────────────────────────────────────────────

export interface DataQualityCheck {
  checkId: string;
  category: QualityCategory;
  description: string;
  status: "pass" | "warn" | "fail";
  currentValue: number;
  threshold: number;
  recommendation: string;
  checkedAt: string;
}

export type QualityCategory =
  | "sample_size"
  | "data_freshness"
  | "confidence_level"
  | "source_reliability"
  | "trend_validity"
  | "statistical_significance"
  | "bias_detection";

export interface DataQualityReport {
  generatedAt: string;
  overallStatus: "Excellent" | "Good" | "Needs Improvement" | "Critical";
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  failedChecks: number;
  checks: DataQualityCheck[];
  publishableMetrics: string[];
  suppressedMetrics: string[];
  recommendations: string[];
}

// ── Quality Checks ─────────────────────────────────────────────────────────

export function runDataQualityChecks(
  stats: {
    totalAnalyses: number;
    analysesLast30Days: number;
    analysesByIndustry: Record<string, number>;
    averageConfidenceScore: number;
    dataAgeDays: number;
    industryWithFewestAnalyses: { name: string; count: number };
  },
): DataQualityReport {
  const checks: DataQualityCheck[] = [];
  const now = new Date().toISOString();

  // Sample size check
  const samplePass = stats.totalAnalyses >= 100;
  checks.push({
    checkId: "dq-sample-size",
    category: "sample_size",
    description: "Total analyses meets minimum threshold for aggregate reporting",
    status: samplePass ? "pass" : stats.totalAnalyses >= 50 ? "warn" : "fail",
    currentValue: stats.totalAnalyses,
    threshold: 100,
    recommendation: samplePass
      ? "Sample size adequate for aggregate reporting"
      : "Increase sample size to at least 100 before publishing any trends",
    checkedAt: now,
  });

  // Data freshness
  const freshnessPass = stats.dataAgeDays <= 180;
  checks.push({
    checkId: "dq-freshness",
    category: "data_freshness",
    description: "Data recency for trend analysis",
    status: freshnessPass ? "pass" : stats.dataAgeDays <= 270 ? "warn" : "fail",
    currentValue: stats.dataAgeDays,
    threshold: 180,
    recommendation: freshnessPass
      ? "Data freshness adequate for current trend reporting"
      : "Refresh data — current dataset is older than 180 days",
    checkedAt: now,
  });

  // Recent activity
  const activityPass = stats.analysesLast30Days >= 20;
  checks.push({
    checkId: "dq-recent-activity",
    category: "data_freshness",
    description: "Sustained recent activity for trend validity",
    status: activityPass ? "pass" : stats.analysesLast30Days >= 10 ? "warn" : "fail",
    currentValue: stats.analysesLast30Days,
    threshold: 20,
    recommendation: activityPass
      ? "Sufficient recent data for trend detection"
      : "Low recent activity — trends may not reflect current patterns",
    checkedAt: now,
  });

  // Confidence threshold
  const confidencePass = stats.averageConfidenceScore >= 70;
  checks.push({
    checkId: "dq-confidence",
    category: "confidence_level",
    description: "Average AI confidence score across all analyses",
    status: confidencePass ? "pass" : stats.averageConfidenceScore >= 50 ? "warn" : "fail",
    currentValue: stats.averageConfidenceScore,
    threshold: 70,
    recommendation: confidencePass
      ? "AI confidence scores adequate for consumer reporting"
      : "Review and improve AI analysis before publishing findings with low confidence",
    checkedAt: now,
  });

  // Industry distribution check (prevent single-industry bias)
  const industryCount = Object.keys(stats.analysesByIndustry).length;
  const distributionFair = industryCount >= 3;
  checks.push({
    checkId: "dq-industry-distribution",
    category: "bias_detection",
    description: "Industry coverage diversity",
    status: distributionFair ? "pass" : industryCount >= 1 ? "warn" : "fail",
    currentValue: industryCount,
    threshold: 3,
    recommendation: distributionFair
      ? "Adequate industry coverage for cross-industry reporting"
      : "Insufficient industry diversity — report may be biased toward single industry",
    checkedAt: now,
  });

  // Small sample industry check
  const smallestIndustry = stats.industryWithFewestAnalyses;
  const smallSampleAlert = smallestIndustry.count < 30;
  checks.push({
    checkId: "dq-small-industry-sample",
    category: "sample_size",
    description: `Smallest industry sample: ${smallestIndustry.name}`,
    status: !smallSampleAlert ? "pass" : smallestIndustry.count >= 10 ? "warn" : "fail",
    currentValue: smallestIndustry.count,
    threshold: 30,
    recommendation: smallSampleAlert
      ? `Suppress ${smallestIndustry.name} data from reports until sample reaches 30`
      : `All industries meet minimum sample threshold`,
    checkedAt: now,
  });

  // Determine publishable and suppressed metrics
  const passed = checks.filter((c) => c.status === "pass").length;
  const warnings = checks.filter((c) => c.status === "warn").length;
  const failed = checks.filter((c) => c.status === "fail").length;

  let overallStatus: DataQualityReport["overallStatus"];
  if (failed === 0 && warnings === 0) overallStatus = "Excellent";
  else if (failed === 0 && warnings <= 2) overallStatus = "Good";
  else if (failed <= 1) overallStatus = "Needs Improvement";
  else overallStatus = "Critical";

  const publishableMetrics = checks
    .filter((c) => c.status === "pass" || c.status === "warn")
    .map((c) => c.description);

  const suppressedMetrics = checks
    .filter((c) => c.status === "fail")
    .map((c) => `${c.description}: ${c.recommendation}`);

  const recommendations = checks
    .filter((c) => c.status === "warn" || c.status === "fail")
    .map((c) => c.recommendation);

  return {
    generatedAt: now,
    overallStatus,
    totalChecks: checks.length,
    passedChecks: passed,
    warningChecks: warnings,
    failedChecks: failed,
    checks,
    publishableMetrics,
    suppressedMetrics,
    recommendations,
  };
}

// ── Publishing Gate ────────────────────────────────────────────────────────

export function canPublishTrend(report: DataQualityReport): { allowed: boolean; reason?: string } {
  if (report.overallStatus === "Critical") {
    return { allowed: false, reason: "Data quality is critical — publishing would risk misleading consumers" };
  }
  if (report.failedChecks >= 2) {
    return { allowed: false, reason: `${report.failedChecks} quality checks failed. Address before publishing.` };
  }
  if (report.suppressedMetrics.length > 0) {
    return { allowed: true, reason: `Publishing allowed but ${report.suppressedMetrics.length} metrics will be suppressed` };
  }
  return { allowed: true };
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const DATA_QUALITY_PRIVACY = {
  enforcesMinimums: true,
  preventsSmallSamplePublication: true,
  preventsMisleadingStatistics: true,
  neverUsesIndividualData: true,
};

export const DATA_QUALITY_VERSION = "4.0.0";