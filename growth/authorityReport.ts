// HiddenFeeAI — Authority Report Generator
// Generates an internal report measuring HiddenFeeAI's authority
// across topics, industries, consumer questions, schema coverage,
// and internal link coverage.
// This is the dashboard for growth and content strategy.

import { computeAuthorityMetrics, identifyContentGaps, AI_AUTHORITY_VERSION } from "./aiAuthority";
import { computeGraphStats, KNOWLEDGE_GRAPH_VERSION } from "../knowledge/knowledgeGraph";
import { computeQuestionStats, CONSUMER_QUESTIONS_VERSION } from "../knowledge/consumerQuestions";
import { computeKeywordCoverage, SEO_VERSION } from "../seo/contentAuthority";
import { validateAllPages, generateHelpfulContentReport, VALIDATOR_VERSION } from "../seo/contentValidator";
import { validateSchemaCoverage, SCHEMA_GENERATOR_VERSION } from "../seo/schemaGenerator";
import { computeLinkHealthScore, LINK_ENGINE_VERSION } from "../seo/internalLinkEngine";
import { analyzeCompetitorLandscape, COMPETITOR_INSIGHTS_VERSION } from "./competitorInsights";

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuthorityReport {
  generatedAt: string;
  version: string;
  executiveSummary: ExecutiveSummary;
  knowledgeArchitecture: KnowledgeArchitecture;
  seoPerformance: SEOPerformance;
  contentQuality: ContentQualitySummary;
  growthReadiness: GrowthReadiness;
  priorities: PriorityAction[];
  componentVersions: Record<string, string>;
}

export interface ExecutiveSummary {
  authorityScore: number;           // 0-100
  rating: "Exceptional" | "Strong" | "Good" | "Developing" | "Needs Focus";
  keyStrengths: string[];
  keyGaps: string[];
  overallStatus: string;
}

export interface KnowledgeArchitecture {
  topicsCount: number;
  industriesCovered: number;
  feesDocumented: number;
  consumerQuestionsAnswered: number;
  knowledgeGraphNodes: number;
  knowledgeGraphEdges: number;
  averageAuthorityScore: number;
}

export interface SEOPerformance {
  keywordCoveragePercent: number;
  pagesWithSchema: number;
  totalPages: number;
  schemaCoveragePercent: number;
  internalLinkHealthScore: number;
  internalLinkStatus: string;
  criticalKeywordsUncovered: number;
  lowCompetitionOpportunities: number;
}

export interface ContentQualitySummary {
  averagePageScore: number;
  eeatAverage: number;
  pagesNeedingSchema: string[];
  thinContentPages: string[];
  highPriorityIssues: number;
}

export interface GrowthReadiness {
  answerEngineReadiness: Record<string, number>;
  competitorGapScore: number;
  underservedIndustries: string[];
  firstMoverIndustries: string[];
  strategicRecommendations: string[];
}

export interface PriorityAction {
  priority: "Critical" | "High" | "Medium" | "Low";
  category: string;
  action: string;
  impact: string;
}

// ── Main Report Generator ──────────────────────────────────────────────────

export function generateAuthorityReport(): AuthorityReport {
  const now = new Date().toISOString();

  // Gather all data
  const authorityMetrics = computeAuthorityMetrics();
  const contentGaps = identifyContentGaps();
  const graphStats = computeGraphStats();
  const questionStats = computeQuestionStats();
  const keywordCoverage = computeKeywordCoverage();
  const pageValidation = validateAllPages();
  const helpfulContent = generateHelpfulContentReport();
  const schemaCoverage = validateSchemaCoverage();
  const linkHealth = computeLinkHealthScore();
  const competitorLandscape = analyzeCompetitorLandscape();

  // Compute authority score
  const authorityScore = computeOverallAuthorityScore(
    authorityMetrics.averageAuthorityScore,
    authorityMetrics.answerEngineReadiness,
    keywordCoverage.coveragePercent,
    schemaCoverage.coveragePercent,
    linkHealth.score,
    helpfulContent.eeatAverage,
  );

  const rating = getAuthorityRating(authorityScore);

  // Key strengths and gaps
  const { strengths, gaps } = identifyStrengthsAndGaps({
    authorityMetrics,
    keywordCoverage,
    schemaCoverage,
    linkHealth,
    competitorLandscape,
    questionStats,
  });

  // Priorities
  const priorities = generatePriorities({
    contentGaps,
    pageValidation,
    schemaCoverage,
    competitorLandscape,
  });

  return {
    generatedAt: now,
    version: "2.0.0",
    executiveSummary: {
      authorityScore,
      rating,
      keyStrengths: strengths,
      keyGaps: gaps,
      overallStatus: `HiddenFeeAI has an authority score of ${authorityScore}/100 (${rating}). ` +
        `${strengths.length} key strengths identified. ${gaps.length} gaps need attention. ` +
        `${priorities.filter((p) => p.priority === "Critical").length} critical actions recommended.`,
    },
    knowledgeArchitecture: {
      topicsCount: authorityMetrics.totalTopics,
      industriesCovered: authorityMetrics.industriesCovered,
      feesDocumented: authorityMetrics.feesDocumented,
      consumerQuestionsAnswered: questionStats.totalQuestions,
      knowledgeGraphNodes: graphStats.totalNodes,
      knowledgeGraphEdges: graphStats.totalEdges,
      averageAuthorityScore: authorityMetrics.averageAuthorityScore,
    },
    seoPerformance: {
      keywordCoveragePercent: keywordCoverage.coveragePercent,
      pagesWithSchema: schemaCoverage.pagesWithSchema,
      totalPages: schemaCoverage.totalPages,
      schemaCoveragePercent: schemaCoverage.coveragePercent,
      internalLinkHealthScore: linkHealth.score,
      internalLinkStatus: linkHealth.status,
      criticalKeywordsUncovered: keywordCoverage.criticalUncovered,
      lowCompetitionOpportunities: keywordCoverage.lowCompetitionOpportunities,
    },
    contentQuality: {
      averagePageScore: pageValidation.averageScore,
      eeatAverage: helpfulContent.eeatAverage,
      pagesNeedingSchema: pageValidation.pagesWithoutSchema,
      thinContentPages: pageValidation.thinContentPages,
      highPriorityIssues: pageValidation.highIssues.length,
    },
    growthReadiness: {
      answerEngineReadiness: authorityMetrics.answerEngineReadiness,
      competitorGapScore: competitorLandscape.marketOpportunities.length > 0
        ? Math.round(competitorLandscape.marketOpportunities.reduce((s, o) => s + o.gapScore, 0) / competitorLandscape.marketOpportunities.length)
        : 0,
      underservedIndustries: competitorLandscape.underservedIndustries,
      firstMoverIndustries: competitorLandscape.marketOpportunities
        .filter((o) => o.firstMoverAdvantage)
        .map((o) => o.industry),
      strategicRecommendations: competitorLandscape.marketOpportunities
        .filter((o) => o.gapScore >= 60)
        .map((o) => `Expand ${o.industry} coverage: ${o.totalAddressableKeywords} keywords, ${o.lowCompetitionOpportunities.length} low-competition, gap score: ${o.gapScore}`),
    },
    priorities,
    componentVersions: {
      aiAuthority: AI_AUTHORITY_VERSION,
      knowledgeGraph: KNOWLEDGE_GRAPH_VERSION,
      consumerQuestions: CONSUMER_QUESTIONS_VERSION,
      seo: SEO_VERSION,
      validator: VALIDATOR_VERSION,
      schemaGenerator: SCHEMA_GENERATOR_VERSION,
      linkEngine: LINK_ENGINE_VERSION,
      competitorInsights: COMPETITOR_INSIGHTS_VERSION,
    },
  };
}

// ── Authority Score Computation ────────────────────────────────────────────

function computeOverallAuthorityScore(
  avgAuthority: number,
  answerEngineReadiness: Record<string, number>,
  keywordCoverage: number,
  schemaCoverage: number,
  linkHealth: number,
  eeatAverage: number,
): number {
  const engineAvg = Object.values(answerEngineReadiness).length > 0
    ? Object.values(answerEngineReadiness).reduce((s, v) => s + v, 0) / Object.values(answerEngineReadiness).length
    : 0;

  return Math.round(
    (avgAuthority * 0.25) +
    (engineAvg * 0.15) +
    (keywordCoverage * 0.15) +
    (schemaCoverage * 0.15) +
    (linkHealth * 0.15) +
    (eeatAverage * 0.15),
  );
}

function getAuthorityRating(score: number): "Exceptional" | "Strong" | "Good" | "Developing" | "Needs Focus" {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Developing";
  return "Needs Focus";
}

// ── Strengths and Gaps ─────────────────────────────────────────────────────

interface ReportData {
  authorityMetrics: ReturnType<typeof computeAuthorityMetrics>;
  keywordCoverage: ReturnType<typeof computeKeywordCoverage>;
  schemaCoverage: ReturnType<typeof validateSchemaCoverage>;
  linkHealth: ReturnType<typeof computeLinkHealthScore>;
  competitorLandscape: ReturnType<typeof analyzeCompetitorLandscape>;
  questionStats: ReturnType<typeof computeQuestionStats>;
}

function identifyStrengthsAndGaps(data: ReportData): { strengths: string[]; gaps: string[] } {
  const strengths: string[] = [];
  const gaps: string[] = [];

  // Strengths
  if (data.questionStats.featuredSnippetPercent >= 75) {
    strengths.push(`Strong featured snippet readiness: ${data.questionStats.featuredSnippetPercent}% of consumer questions are snippet-optimized`);
  }

  if (data.linkHealth.score >= 70) {
    strengths.push(`Healthy internal linking: ${data.linkHealth.score}/100 score, ${data.linkHealth.status}`);
  }

  if (data.authorityMetrics.industriesCovered >= 4) {
    strengths.push(`Multi-industry coverage: ${data.authorityMetrics.industriesCovered} industries with active content`);
  }

  if (data.competitorLandscape.underservedIndustries.length > 0) {
    strengths.push(`First-mover advantage in ${data.competitorLandscape.underservedIndustries.length} industries competitors don't cover`);
  }

  if (data.keywordCoverage.lowCompetitionOpportunities >= 5) {
    strengths.push(`${data.keywordCoverage.lowCompetitionOpportunities} low-competition keyword opportunities available for quick wins`);
  }

  if (data.authorityMetrics.expertQuotesCount > 0) {
    strengths.push(`Evidence-backed content with ${data.authorityMetrics.expertQuotesCount} expert citations`);
  }

  // Gaps
  if (data.schemaCoverage.coveragePercent < 100) {
    gaps.push(`Schema coverage at ${data.schemaCoverage.coveragePercent}%: ${data.schemaCoverage.pagesNeedingSchema.length} pages missing structured data`);
  }

  if (data.keywordCoverage.criticalUncovered > 0) {
    gaps.push(`${data.keywordCoverage.criticalUncovered} critical keywords completely uncovered — immediate content needed`);
  }

  if (data.keywordCoverage.coveragePercent < 50) {
    gaps.push(`Keyword coverage at ${data.keywordCoverage.coveragePercent}% — significant content expansion needed`);
  }

  const underservedCount = data.competitorLandscape.underservedIndustries.length;
  if (underservedCount > 0) {
    gaps.push(`${underservedCount} industries with zero competitor coverage — but also zero our coverage. Untapped potential.`);
  }

  return { strengths, gaps };
}

// ── Priority Actions ───────────────────────────────────────────────────────

interface PriorityInput {
  contentGaps: ReturnType<typeof identifyContentGaps>;
  pageValidation: ReturnType<typeof validateAllPages>;
  schemaCoverage: ReturnType<typeof validateSchemaCoverage>;
  competitorLandscape: ReturnType<typeof analyzeCompetitorLandscape>;
}

function generatePriorities(input: PriorityInput): PriorityAction[] {
  const priorities: PriorityAction[] = [];

  // Schema — always critical if missing
  if (input.schemaCoverage.pagesNeedingSchema.length > 0) {
    priorities.push({
      priority: "Critical",
      category: "Schema",
      action: `Add structured data to ${input.schemaCoverage.pagesNeedingSchema.length} pages: ${input.schemaCoverage.pagesNeedingSchema.join(", ")}`,
      impact: "Directly improves Google AI Overview eligibility and rich result appearance",
    });
  }

  // Content gaps — high priority industries
  const highGaps = input.contentGaps.filter((g) => g.priority === "High");
  for (const gap of highGaps) {
    priorities.push({
      priority: "High",
      category: "Content",
      action: `Build ${gap.gaps.length} missing topics in ${gap.industry}: ${gap.gaps.slice(0, 3).join(", ")}`,
      impact: `Closes authority gap in ${gap.industry} — competitors have limited coverage here`,
    });
  }

  // Thin content
  if (input.pageValidation.thinContentPages.length > 0) {
    priorities.push({
      priority: "Medium",
      category: "Content Quality",
      action: `Expand ${input.pageValidation.thinContentPages.length} thin content pages to 800+ words`,
      impact: "Reduces duplicate content risk and improves helpful content scores",
    });
  }

  // High priority page issues
  if (input.pageValidation.highIssues.length > 0) {
    priorities.push({
      priority: "High",
      category: "Page Quality",
      action: `Fix ${input.pageValidation.highIssues.length} high-severity page issues: ${input.pageValidation.highIssues.slice(0, 3).map((i) => i.description).join("; ")}`,
      impact: "Improves E-E-A-T signals and page quality scores across all evaluated pages",
    });
  }

  // Competitor gaps
  const firstMovers = input.competitorLandscape.marketOpportunities.filter((o) => o.firstMoverAdvantage);
  if (firstMovers.length > 0) {
    priorities.push({
      priority: "Critical",
      category: "Competitive Position",
      action: `Claim first-mover position in ${firstMovers.map((o) => o.industry).join(", ")} before competitors enter`,
      impact: "Establishes HiddenFeeAI as the default AI reference for these industries",
    });
  }

  return priorities.sort((a, b) => {
    const order = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return order[a.priority] - order[b.priority];
  });
}

// ── Quick Report (Terminal-Friendly) ───────────────────────────────────────

export function generateQuickReport(): string {
  const report = generateAuthorityReport();
  const es = report.executiveSummary;

  return [
    "═══════════════════════════════════════════",
    "  HIDDENFEEAI AUTHORITY REPORT",
    `  Generated: ${new Date(report.generatedAt).toLocaleDateString()}`,
    "═══════════════════════════════════════════",
    "",
    `  Authority Score: ${es.authorityScore}/100 — ${es.rating}`,
    "",
    "  Knowledge Architecture:",
    `    Topics: ${report.knowledgeArchitecture.topicsCount}`,
    `    Industries: ${report.knowledgeArchitecture.industriesCovered}/7`,
    `    Consumer Questions: ${report.knowledgeArchitecture.consumerQuestionsAnswered}`,
    `    Graph Nodes/Edges: ${report.knowledgeArchitecture.knowledgeGraphNodes}/${report.knowledgeArchitecture.knowledgeGraphEdges}`,
    "",
    "  SEO Performance:",
    `    Keyword Coverage: ${report.seoPerformance.keywordCoveragePercent}%`,
    `    Schema Coverage: ${report.seoPerformance.schemaCoveragePercent}%`,
    `    Link Health: ${report.seoPerformance.internalLinkHealthScore}/100 (${report.seoPerformance.internalLinkStatus})`,
    "",
    "  Priorities:",
    ...report.priorities.map((p) => `    [${p.priority}] ${p.action}`),
    "",
    `  Component Versions: ${Object.values(report.componentVersions).every(v => v === "2.0.0") ? "✅ All v2.0.0" : "⚠️ Version mismatch"}`,
    "═══════════════════════════════════════════",
  ].join("\n");
}

export const AUTHORITY_REPORT_VERSION = "2.0.0";