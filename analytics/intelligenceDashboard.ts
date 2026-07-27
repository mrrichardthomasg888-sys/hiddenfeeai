// HiddenFeeAI — Intelligence Dashboard Data
// Aggregates metrics from all intelligence modules:
// fee categories, industries, trend changes, knowledge growth,
// feedback improvements. Privacy-safe aggregate only.

import { computeFeeIntelligenceStats, FEE_INTELLIGENCE_VERSION } from "../intelligence/feeIntelligenceNetwork";
import { generateMonthlyTrendReport, FEE_TREND_ENGINE_VERSION } from "./feeTrendEngine";
import { computeQuestionStats, CONSUMER_QUESTIONS_VERSION } from "../knowledge/consumerQuestions";
import { computeGraphStats, KNOWLEDGE_GRAPH_VERSION } from "../knowledge/knowledgeGraph";
import { generateImprovementDashboard } from "../ai/improvementSignals";
import type { ImprovementSignal } from "../ai/improvementSignals";
import { generateTransparencyReport } from "../publicReports/transparencyReport";

// ── Types ──────────────────────────────────────────────────────────────────

export interface IntelligenceDashboard {
  generatedAt: string;
  overview: DashboardOverview;
  feeIntelligence: FeeIntelligenceMetrics;
  knowledgeGrowth: KnowledgeGrowthMetrics;
  industryCoverage: IndustryCoverageMetrics;
  aiImprovement: AIImprovementMetrics;
  trendActivity: TrendActivityMetrics;
  dataQuality: DataQualitySummary;
  recommendations: string[];
}

export interface DashboardOverview {
  totalFeeCategories: number;
  totalIndustries: number;
  totalConsumerQuestions: number;
  totalKnowledgeGraphNodes: number;
  totalKnowledgeGraphEdges: number;
  intelligenceScore: number;       // 0-100 composite
  lastUpdated: string;
}

export interface FeeIntelligenceMetrics {
  totalFeeTypes: number;
  industriesCovered: number;
  uniqueCategories: number;
  totalAliases: number;
  averageNegotiability: number;
  trendingUpCount: number;
  trendingDownCount: number;
  mostCommonFee: string;
  mostNegotiableFee: string;
}

export interface KnowledgeGrowthMetrics {
  totalQuestions: number;
  featuredSnippetReady: number;
  featuredSnippetPercent: number;
  highVolumeQuestions: number;
  knowledgeGraphNodes: number;
  knowledgeGraphEdges: number;
  averageNodeWeight: number;
}

export interface IndustryCoverageMetrics {
  industriesWithData: number;
  totalIndustries: number;
  coveragePercent: number;
  strongestIndustry: string;
  weakestIndustry: string;
  gaps: string[];
}

export interface AIImprovementMetrics {
  totalSignals: number;
  openSignals: number;
  resolvedSignals: number;
  criticalIssues: number;
  topImprovementAreas: string[];
}

export interface TrendActivityMetrics {
  emergingFees: number;
  decliningFees: number;
  industryShifts: number;
  regulatoryUpdates: number;
  lastTrendReportDate: string;
}

export interface DataQualitySummary {
  minimumSampleSize: number;
  dataFreshnessDays: number;
  confidenceThreshold: number;
  publicationGate: "open" | "restricted" | "closed";
}

// ── Dashboard Generator ────────────────────────────────────────────────────

export function generateIntelligenceDashboard(
  signals: ImprovementSignal[] = [],
  totalAnalyses: number = 0,
): IntelligenceDashboard {
  const feeStats = computeFeeIntelligenceStats();
  const questionStats = computeQuestionStats();
  const graphStats = computeGraphStats();
  const improvementDashboard = generateImprovementDashboard(signals);
  const trendReport = generateMonthlyTrendReport(new Date().toLocaleString("default", { month: "long", year: "numeric" }));
  const now = new Date().toISOString();

  // Industry coverage
  const industries = ["automotive", "housing", "healthcare", "banking", "insurance", "subscriptions", "utilities"];
  const industriesWithData = feeStats.industriesCovered;

  // Composite intelligence score
  const intelligenceScore = Math.round(
    (feeStats.totalFeeTypes / 10 * 20) +               // 10 fee types = full marks
    (industriesWithData / 7 * 20) +                     // 7 industries = full marks
    (questionStats.featuredSnippetPercent * 0.2) +      // 100% snippet = 20 points
    (graphStats.totalNodes / 44 * 15) +                 // 44 nodes = full marks
    (improvementDashboard.resolvedSignals / Math.max(improvementDashboard.totalSignals, 1) * 15) +
    (feeStats.averageNegotiability * 0.1)               // 100% = 10 points
  );

  return {
    generatedAt: now,
    overview: {
      totalFeeCategories: feeStats.totalFeeTypes,
      totalIndustries: industriesWithData,
      totalConsumerQuestions: questionStats.totalQuestions,
      totalKnowledgeGraphNodes: graphStats.totalNodes,
      totalKnowledgeGraphEdges: graphStats.totalEdges,
      intelligenceScore: Math.min(100, intelligenceScore),
      lastUpdated: now,
    },
    feeIntelligence: {
      totalFeeTypes: feeStats.totalFeeTypes,
      industriesCovered: feeStats.industriesCovered,
      uniqueCategories: feeStats.uniqueCategories,
      totalAliases: feeStats.totalAliases,
      averageNegotiability: feeStats.averageNegotiability,
      trendingUpCount: feeStats.trendingUpCount,
      trendingDownCount: feeStats.trendingDownCount,
      mostCommonFee: feeStats.mostCommonFee,
      mostNegotiableFee: feeStats.mostNegotiableFee,
    },
    knowledgeGrowth: {
      totalQuestions: questionStats.totalQuestions,
      featuredSnippetReady: questionStats.featuredSnippetReady,
      featuredSnippetPercent: questionStats.featuredSnippetPercent,
      highVolumeQuestions: questionStats.highVolumeQuestions,
      knowledgeGraphNodes: graphStats.totalNodes,
      knowledgeGraphEdges: graphStats.totalEdges,
      averageNodeWeight: Math.round(graphStats.totalEdges / Math.max(graphStats.totalNodes, 1) * 10) / 10,
    },
    industryCoverage: {
      industriesWithData,
      totalIndustries: industries.length,
      coveragePercent: Math.round((industriesWithData / industries.length) * 100),
      strongestIndustry: "automotive",
      weakestIndustry: industries.filter((i) => i !== "automotive" && i !== "healthcare")[0] || "insurance",
      gaps: industries
        .filter((i) => i === "insurance" || i === "banking")
        .map((i) => `Expand ${i} fee intelligence — limited observation data`),
    },
    aiImprovement: {
      totalSignals: improvementDashboard.totalSignals,
      openSignals: improvementDashboard.openSignals,
      resolvedSignals: improvementDashboard.resolvedSignals,
      criticalIssues: improvementDashboard.bySeverity.critical,
      topImprovementAreas: improvementDashboard.topImprovementAreas,
    },
    trendActivity: {
      emergingFees: trendReport.emergingFees.length,
      decliningFees: trendReport.decliningFees.length,
      industryShifts: trendReport.industryShifts.length,
      regulatoryUpdates: trendReport.regulatoryChanges.length,
      lastTrendReportDate: trendReport.generatedAt,
    },
    dataQuality: {
      minimumSampleSize: 100,
      dataFreshnessDays: 180,
      confidenceThreshold: 70,
      publicationGate: totalAnalyses >= 100 ? "open" : totalAnalyses >= 50 ? "restricted" : "closed",
    },
    recommendations: [
      totalAnalyses < 100
        ? `Reach ${100 - totalAnalyses} more analyses to unlock full public transparency reporting`
        : "Publish 2026 Hidden Fee Transparency Report — data quality gate passed",
      feeStats.trendingUpCount > 0
        ? `${feeStats.trendingUpCount} fee categories trending upward — update consumer education content`
        : "Fee trends stable — maintain current content",
      industriesWithData < 7
        ? `Expand into ${7 - industriesWithData} uncovered industries: insurance, banking`
        : "Full industry coverage achieved",
      improvementDashboard.openSignals > 0
        ? `Address ${improvementDashboard.openSignals} open AI improvement signals`
        : "All AI improvement signals resolved",
    ],
  };
}

// ── Component Versions Summary ─────────────────────────────────────────────

export function getIntelligenceComponentVersions(): Record<string, string> {
  return {
    feeIntelligence: FEE_INTELLIGENCE_VERSION,
    feeTrendEngine: FEE_TREND_ENGINE_VERSION,
    consumerQuestions: CONSUMER_QUESTIONS_VERSION,
    knowledgeGraph: KNOWLEDGE_GRAPH_VERSION,
    improvementSignals: "4.0.0",
    transparencyReport: "4.0.0",
    dataQuality: "4.0.0",
    knowledgeExport: "4.0.0",
  };
}

export const INTELLIGENCE_DASHBOARD_VERSION = "4.0.0";