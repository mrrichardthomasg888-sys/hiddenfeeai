// HiddenFeeAI — Growth Dashboard
// Combines conversion funnel, retention, engagement,
// revenue signals, and feedback into a unified growth view.
// Privacy-safe: aggregate metrics only. No PII, no document data.

import { generateUploadFunnel, type FunnelStep } from "./uploadFunnel";
import { computeRetentionMetrics } from "../retention/engagementSignals";
import type { EngagementEvent } from "../retention/engagementSignals";
import { generateOnboardingReport } from "../growth/onboardingOptimization";
import { generateValueOptimizationReport } from "../intelligence/customerValueEngine";
import { generateTrustConversionReport } from "../trust/conversionTrust";
import { generateFeedbackIntelligence } from "../feedback/growthFeedback";
import { generateExperimentDashboard } from "../experiments/experimentFramework";

// ── Types ──────────────────────────────────────────────────────────────────

export interface GrowthDashboard {
  generatedAt: string;
  overview: GrowthOverview;
  conversion: ConversionSection;
  retention: RetentionSection;
  engagement: EngagementSection;
  trust: TrustSection;
  revenue: RevenueSection;
  feedback: FeedbackSection;
  experiments: ExperimentSection;
  topPriorities: PriorityAction[];
}

export interface GrowthOverview {
  totalVisitors: number;
  totalReportsGenerated: number;
  overallConversionRate: number;
  returnUserRate: number;
  averageEngagementScore: number;
  trustScore: number;
  growthScore: number;          // 0-100 composite
}

export interface ConversionSection {
  funnel: FunnelStep[];
  biggestDropoff: { step: string; rate: number; recommendation: string };
  onboardingInsights: string[];
}

export interface RetentionSection {
  returnRate30Day: number;
  returnRate90Day: number;
  averageAnalysesPerUser: number;
  powerUserPercent: number;
  returnTriggers: string[];
}

export interface EngagementSection {
  averageEngagementScore: number;
  averageTimePerReport: number;
  pdfDownloadRate: number;
  scriptCopyRate: number;
  mostEngagingSections: string[];
}

export interface TrustSection {
  overallTrustScore: number;
  criticalTrustGaps: string[];
  trustOptimizations: string[];
}

export interface RevenueSection {
  totalRevenue: number;
  averageRevenuePerReport: number;
  conversionRate: number;
  revenueBySource: Record<string, number>;
  topRevenueOpportunities: string[];
}

export interface FeedbackSection {
  sentimentDistribution: { positive: number; neutral: number; negative: number };
  topPurchaseReasons: string[];
  topAbandonmentReasons: string[];
  featureRequests: string[];
}

export interface ExperimentSection {
  activeExperiments: number;
  concludedExperiments: number;
  keyLearnings: string[];
}

export interface PriorityAction {
  rank: number;
  category: string;
  action: string;
  expectedImpact: string;
  effort: "Low" | "Medium" | "High";
}

// ── Dashboard Generator ────────────────────────────────────────────────────

export function generateGrowthDashboard(
  stats: {
    totalVisitors: number;
    totalReportsGenerated: number;
    totalRevenue: number;
    revenueBySource: Record<string, number>;
    funnelCounts: Record<string, number>;
    returnRate30: number;
    returnRate90: number;
    avgAnalysesPerUser: number;
    powerUserPercent: number;
    avgEngagementScore: number;
    avgTimePerReport: number;
    pdfDownloadRate: number;
    scriptCopyRate: number;
    paymentConversionRate: number;
  },
): GrowthDashboard {
  const onboarding = generateOnboardingReport();
  const valueReport = generateValueOptimizationReport({
    paymentConversionRate: stats.paymentConversionRate,
    reportEngagementScore: stats.avgEngagementScore,
    scriptCopyRate: stats.scriptCopyRate,
    repeatRate: stats.returnRate30,
  });
  const trustReport = generateTrustConversionReport();
  const feedbackReport = generateFeedbackIntelligence();
  const experimentReport = generateExperimentDashboard();

  const funnel = generateUploadFunnel(stats.funnelCounts as any);
  const biggestDropoff = funnel
    .filter((s, i) => i > 0)
    .sort((a, b) => a.conversionFromPrevious - b.conversionFromPrevious)[0];

  // Composite growth score
  const growthScore = Math.round(
    (stats.paymentConversionRate * 0.25) +
    (stats.returnRate30 * 0.20) +
    (stats.avgEngagementScore * 0.20) +
    (trustReport.overallTrustScore * 0.20) +
    (Math.min(stats.pdfDownloadRate, 100) * 0.15),
  );

  // Priorities
  const priorities: PriorityAction[] = [
    {
      rank: 1,
      category: "Conversion",
      action: "Show one specific finding with dollar amount in free preview",
      expectedImpact: "+20-30% payment conversion",
      effort: "Low",
    },
    {
      rank: 2,
      category: "Trust",
      action: trustReport.criticalGaps[0] || "Add specific privacy timeline to upload area",
      expectedImpact: "+15% upload completion",
      effort: "Low",
    },
    {
      rank: 3,
      category: "Retention",
      action: "Add 'Compare with another document' prompt after first report",
      expectedImpact: "+15-20% return rate",
      effort: "Medium",
    },
    {
      rank: 4,
      category: "Engagement",
      action: "Add PDF download button prominently in report header",
      expectedImpact: "+20% PDF downloads, increased sharing",
      effort: "Low",
    },
    {
      rank: 5,
      category: "Revenue",
      action: "Optimize payment headline to include specific savings amount",
      expectedImpact: "+15-25% revenue per visitor",
      effort: "Low",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalVisitors: stats.totalVisitors,
      totalReportsGenerated: stats.totalReportsGenerated,
      overallConversionRate: stats.totalVisitors > 0
        ? Math.round((stats.totalReportsGenerated / stats.totalVisitors) * 100)
        : 0,
      returnUserRate: stats.returnRate30,
      averageEngagementScore: stats.avgEngagementScore,
      trustScore: trustReport.overallTrustScore,
      growthScore: Math.min(100, growthScore),
    },
    conversion: {
      funnel,
      biggestDropoff: biggestDropoff
        ? { step: biggestDropoff.label, rate: 100 - biggestDropoff.conversionFromPrevious, recommendation: "Investigate and optimize this step" }
        : { step: "N/A", rate: 0, recommendation: "Insufficient data" },
      onboardingInsights: onboarding.topRecommendations.slice(0, 3),
    },
    retention: {
      returnRate30Day: stats.returnRate30,
      returnRate90Day: stats.returnRate90,
      averageAnalysesPerUser: stats.avgAnalysesPerUser,
      powerUserPercent: stats.powerUserPercent,
      returnTriggers: [
        "Compare with another document type",
        "Check a new contract before signing",
        "Fee trend alert prompted re-check",
      ],
    },
    engagement: {
      averageEngagementScore: stats.avgEngagementScore,
      averageTimePerReport: stats.avgTimePerReport,
      pdfDownloadRate: stats.pdfDownloadRate,
      scriptCopyRate: stats.scriptCopyRate,
      mostEngagingSections: ["Financial Impact", "Hidden Fees Found", "Negotiation Scripts"],
    },
    trust: {
      overallTrustScore: trustReport.overallTrustScore,
      criticalTrustGaps: trustReport.criticalGaps,
      trustOptimizations: trustReport.trustTips.slice(0, 3),
    },
    revenue: {
      totalRevenue: stats.totalRevenue,
      averageRevenuePerReport: stats.totalReportsGenerated > 0
        ? Math.round(stats.totalRevenue / stats.totalReportsGenerated)
        : 0,
      conversionRate: stats.paymentConversionRate,
      revenueBySource: stats.revenueBySource,
      topRevenueOpportunities: [
        "Optimize payment prompt — biggest revenue leverage point",
        "Increase return user rate — returning users convert at 3x first-time rate",
        "Launch API tier — recurring revenue stream",
      ],
    },
    feedback: {
      sentimentDistribution: feedbackReport.sentimentDistribution,
      topPurchaseReasons: feedbackReport.topPurchaseReasons,
      topAbandonmentReasons: feedbackReport.topAbandonmentReasons,
      featureRequests: feedbackReport.featureRequests.slice(0, 3),
    },
    experiments: {
      activeExperiments: experimentReport.activeExperiments,
      concludedExperiments: experimentReport.concludedExperiments,
      keyLearnings: experimentReport.learnings.slice(0, 3),
    },
    topPriorities: priorities,
  };
}

// ── Quick Summary ──────────────────────────────────────────────────────────

export function generateQuickGrowthSummary(dashboard: GrowthDashboard): string {
  const ov = dashboard.overview;
  return [
    "════════════════════════════════",
    "  GROWTH DASHBOARD",
    `  ${new Date(dashboard.generatedAt).toLocaleDateString()}`,
    "════════════════════════════════",
    "",
    `  Growth Score: ${ov.growthScore}/100`,
    `  Visitors: ${ov.totalVisitors.toLocaleString()}`,
    `  Reports: ${ov.totalReportsGenerated.toLocaleString()}`,
    `  Conversion: ${ov.overallConversionRate}%`,
    `  Returns (30d): ${ov.returnUserRate}%`,
    `  Trust Score: ${ov.trustScore}/100`,
    "",
    "  TOP PRIORITIES:",
    ...dashboard.topPriorities.map((p) => `    ${p.rank}. [${p.category}] ${p.action}`),
    "════════════════════════════════",
  ].join("\n");
}

export const GROWTH_DASHBOARD_VERSION = "5.0.0";