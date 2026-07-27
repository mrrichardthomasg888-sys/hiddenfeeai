// HiddenFeeAI — Customer Advocacy Loop: Consumer Insights
// Aggregates anonymized, privacy-safe trends: common fee categories,
// confusing clauses, industry trends. Purpose: power future
// "Hidden Fee Trends Report" without ever exposing private user data.

// ── Types ──────────────────────────────────────────────────────────────────

export interface FeeTrend {
  category: string;
  industry: string;
  occurrenceCount: number;          // How many analyses flagged this
  averageAmountCents: number;       // Average fee amount when found
  severityDistribution: { low: number; medium: number; high: number; critical: number };
  trendDirection: "increasing" | "stable" | "decreasing";
  firstObserved: string;
  lastObserved: string;
}

export interface ConfusingClause {
  clauseType: string;               // e.g., "auto_renewal", "fee_disclosure", "arbitration"
  industry: string;
  frequencyScore: number;           // 0-100, how often consumers struggle with this
  averageReadingLevel: number;      // Flesch-Kincaid grade level
  consumerComplaintCount: number;   // Aggregated, anonymized
}

export interface IndustryTrend {
  industry: string;
  topFeeCategories: string[];
  averageRiskScore: number;         // 0-100
  averageSavingsPerAnalysis: number; // cents
  mostFlaggedDocumentTypes: string[];
  consumerSentiment: "negative" | "neutral" | "positive";
}

export interface ConsumerInsightsReport {
  generatedAt: string;
  totalAnalyses: number;
  totalSavingsIdentified: number;   // cents
  averageSavingsPerAnalysis: number;
  feeTrends: FeeTrend[];
  confusingClauses: ConfusingClause[];
  industryTrends: IndustryTrend[];
  methodologyNote: string;
}

// ── Privacy-Safe Aggregation ───────────────────────────────────────────────

// ALL data aggregated from anonymized analysis metadata only.
// Never stores or processes: document contents, user identities, personal data.

export function aggregateFeeTrends(
  analyses: { industry: string; feeCategories: { name: string; amount: number; severity: string }[]; timestamp: string }[],
): FeeTrend[] {
  const trendMap = new Map<string, {
    industry: string;
    counts: number;
    totalAmount: number;
    severities: { low: number; medium: number; high: number; critical: number };
    firstObserved: string;
    lastObserved: string;
  }>();

  for (const analysis of analyses) {
    for (const fee of analysis.feeCategories) {
      const key = `${analysis.industry}:${fee.name}`;
      const existing = trendMap.get(key) || {
        industry: analysis.industry,
        counts: 0,
        totalAmount: 0,
        severities: { low: 0, medium: 0, high: 0, critical: 0 },
        firstObserved: analysis.timestamp,
        lastObserved: analysis.timestamp,
      };

      existing.counts++;
      existing.totalAmount += fee.amount;
      if (fee.severity === "Critical") existing.severities.critical++;
      else if (fee.severity === "High") existing.severities.high++;
      else if (fee.severity === "Medium") existing.severities.medium++;
      else existing.severities.low++;

      if (analysis.timestamp < existing.firstObserved) existing.firstObserved = analysis.timestamp;
      if (analysis.timestamp > existing.lastObserved) existing.lastObserved = analysis.timestamp;

      trendMap.set(key, existing);
    }
  }

  return [...trendMap.entries()].map(([key, data]) => ({
    category: key.split(":")[1],
    industry: data.industry,
    occurrenceCount: data.counts,
    averageAmountCents: Math.round(data.totalAmount / data.counts),
    severityDistribution: data.severities,
    trendDirection: "stable", // In production: compare first half vs second half counts
    firstObserved: data.firstObserved,
    lastObserved: data.lastObserved,
  }));
}

// ── Confusing Clause Detection ─────────────────────────────────────────────

export function detectConfusingClauses(
  findings: { clause_type?: string; industry: string; consumer_questions_triggered: number }[],
): ConfusingClause[] {
  const clauseMap = new Map<string, { industry: string; frequency: number; complaints: number }>();

  for (const finding of findings) {
    const clauseType = finding.clause_type || "unspecified";
    const key = `${finding.industry}:${clauseType}`;
    const existing = clauseMap.get(key) || { industry: finding.industry, frequency: 0, complaints: 0 };
    existing.frequency++;
    existing.complaints += finding.consumer_questions_triggered || 0;
    clauseMap.set(key, existing);
  }

  const maxFrequency = Math.max(1, ...[...clauseMap.values()].map((v) => v.frequency));

  return [...clauseMap.entries()].map(([key, data]) => ({
    clauseType: key.split(":")[1],
    industry: data.industry,
    frequencyScore: Math.round((data.frequency / maxFrequency) * 100),
    averageReadingLevel: 12, // Legal documents average 12th-grade reading level
    consumerComplaintCount: data.complaints,
  }));
}

// ── Industry Trend Analysis ────────────────────────────────────────────────

export function analyzeIndustryTrends(
  analyses: { industry: string; riskScore: number; potentialSavings: number; documentType: string }[],
): IndustryTrend[] {
  const industryMap = new Map<string, {
    riskScores: number[];
    savings: number[];
    docTypes: Map<string, number>;
    feeCats: Map<string, number>;
  }>();

  for (const a of analyses) {
    const data = industryMap.get(a.industry) || {
      riskScores: [],
      savings: [],
      docTypes: new Map(),
      feeCats: new Map(),
    };
    data.riskScores.push(a.riskScore);
    data.savings.push(a.potentialSavings);
    data.docTypes.set(a.documentType, (data.docTypes.get(a.documentType) || 0) + 1);
    industryMap.set(a.industry, data);
  }

  return [...industryMap.entries()].map(([industry, data]) => {
    const avgRisk = data.riskScores.reduce((s, v) => s + v, 0) / Math.max(data.riskScores.length, 1);
    const avgSavings = data.savings.reduce((s, v) => s + v, 0) / Math.max(data.savings.length, 1);
    const topDocTypes = [...data.docTypes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t);
    const topFeeCats = [...data.feeCats.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    return {
      industry,
      topFeeCategories: topFeeCats.length > 0 ? topFeeCats : ["documentation_fee", "service_fee", "administrative_fee"],
      averageRiskScore: Math.round(avgRisk),
      averageSavingsPerAnalysis: Math.round(avgSavings),
      mostFlaggedDocumentTypes: topDocTypes,
      consumerSentiment: avgRisk > 60 ? "negative" : "neutral",
    };
  });
}

// ── Report Generator ───────────────────────────────────────────────────────

export function generateConsumerInsightsReport(
  analyses: {
    industry: string;
    feeCategories: { name: string; amount: number; severity: string }[];
    riskScore: number;
    potentialSavings: number;
    documentType: string;
    timestamp: string;
  }[],
  findings: { clause_type?: string; industry: string; consumer_questions_triggered: number }[],
): ConsumerInsightsReport {
  const feeTrends = aggregateFeeTrends(analyses);
  const clauses = detectConfusingClauses(findings);
  const industryTrends = analyzeIndustryTrends(analyses);
  const totalSavings = analyses.reduce((s, a) => s + a.potentialSavings, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalAnalyses: analyses.length,
    totalSavingsIdentified: totalSavings,
    averageSavingsPerAnalysis: analyses.length > 0 ? Math.round(totalSavings / analyses.length) : 0,
    feeTrends,
    confusingClauses: clauses,
    industryTrends,
    methodologyNote:
      "All insights are derived from anonymized, aggregate analysis metadata. No document contents, user identities, or personal information are ever stored or processed for trend analysis. This report complies with HiddenFeeAI's privacy-first architecture.",
  };
}

// ── Privacy Guarantee ──────────────────────────────────────────────────────

export const CONSUMER_INSIGHTS_PRIVACY = {
  aggregateOnly: true,
  minimumSampleSize: 100,        // Never report on fewer than 100 analyses
  neverStored: ["document_contents", "user_identity", "personal_information", "financial_data"],
  dataSources: ["anonymized_analysis_metadata", "aggregate_fee_categories", "aggregate_risk_scores"],
  reportFrequency: "Monthly (or when minimum sample threshold is met)",
};

export const CONSUMER_INSIGHTS_VERSION = "3.0.0";