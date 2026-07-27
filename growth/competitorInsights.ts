// HiddenFeeAI — Competitor Gap Analysis Foundation
// Tracks missing topics, missing industries, content opportunities.
// Does NOT scrape illegally. Uses publicly available information only.
// Based on legitimate competitive research and industry analysis.

import { INDUSTRY_COVERAGE, type Industry } from "./aiAuthority";
import { KEYWORD_OPPORTUNITIES } from "../seo/contentAuthority";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CompetitorProfile {
  name: string;
  url: string;
  type: "direct" | "adjacent" | "content";
  strengths: string[];
  weaknesses: string[];
  estimatedTraffic: "Low" | "Medium" | "High";
  contentDepth: number;       // 0-100
  feeCoverage: Industry[];    // Industries they cover
}

export interface MarketOpportunity {
  industry: Industry;
  totalAddressableKeywords: number;
  competitorCovered: number;
  ourCovered: number;
  gapScore: number;           // 0-100, higher = bigger opportunity
  lowCompetitionOpportunities: string[];
  firstMoverAdvantage: boolean;
}

export interface CompetitorLandscape {
  totalCompetitors: number;
  directCompetitors: number;
  contentCompetitors: number;
  ourAverageCoverage: number;
  competitorAverageCoverage: number;
  underservedIndustries: Industry[];
  marketOpportunities: MarketOpportunity[];
}

// ── Competitor Profiles (Based on Public Knowledge) ────────────────────────

// These profiles are based on publicly observable market positions.
// No scraping, no proprietary data. All information from public sources.

export const COMPETITOR_PROFILES: CompetitorProfile[] = [
  {
    name: "NerdWallet",
    url: "https://nerdwallet.com",
    type: "adjacent",
    strengths: [
      "Strong domain authority",
      "Broad financial content coverage",
      "Established consumer trust",
      "High search visibility for financial topics",
    ],
    weaknesses: [
      "Not specialized in fee detection",
      "No document analysis tool",
      "Content is general advice, not personalized audit",
      "No AI-powered contract review",
    ],
    estimatedTraffic: "High",
    contentDepth: 85,
    feeCoverage: ["banking", "insurance", "automotive"],
  },
  {
    name: "Bankrate",
    url: "https://bankrate.com",
    type: "adjacent",
    strengths: [
      "High authority in banking/finance",
      "Comprehensive rate comparison",
      "Strong SEO for banking keywords",
    ],
    weaknesses: [
      "Limited to financial products",
      "No document analysis capability",
      "Doesn't cover healthcare, utilities, subscriptions",
      "No AI-powered hidden fee detection",
    ],
    estimatedTraffic: "High",
    contentDepth: 80,
    feeCoverage: ["banking", "insurance"],
  },
  {
    name: "Consumer Reports",
    url: "https://consumerreports.org",
    type: "adjacent",
    strengths: [
      "Exceptional consumer trust",
      "Decades of consumer advocacy",
      "Product reviews and testing",
    ],
    weaknesses: [
      "Paywalled content",
      "Not focused specifically on hidden fees",
      "No instant document analysis",
      "Content is broad consumer advocacy, not fee-specific",
    ],
    estimatedTraffic: "Medium",
    contentDepth: 90,
    feeCoverage: ["automotive", "utilities"],
  },
  {
    name: "The Points Guy / Finance Blogs",
    url: "various",
    type: "content",
    strengths: [
      "Deep credit card and travel fee knowledge",
      "Engaged audience",
      "Regularly updated content",
    ],
    weaknesses: [
      "Narrow focus (credit cards/travel)",
      "No document analysis tool",
      "Limited to loyalty/finance niches",
      "No comprehensive fee detection across industries",
    ],
    estimatedTraffic: "Medium",
    contentDepth: 60,
    feeCoverage: ["banking", "subscriptions"],
  },
  {
    name: "LegalZoom / Rocket Lawyer",
    url: "https://legalzoom.com",
    type: "adjacent",
    strengths: [
      "Document processing at scale",
      "Consumer legal education",
      "Trusted legal brand",
    ],
    weaknesses: [
      "Focus on document creation, not analysis",
      "No AI-powered fee detection",
      "Legal document focus, not bills/invoices",
      "Higher price point, not instant",
    ],
    estimatedTraffic: "High",
    contentDepth: 70,
    feeCoverage: ["housing"],
  },
];

// ── Market Opportunity Analysis ────────────────────────────────────────────

export function analyzeMarketOpportunities(): MarketOpportunity[] {
  const industries: Industry[] = ["automotive", "housing", "healthcare", "banking", "insurance", "subscriptions", "utilities"];

  return industries.map((industry) => {
    // Keywords for this industry
    const industryKeywords = KEYWORD_OPPORTUNITIES.filter(
      (k) => k.relatedIndustry === industry,
    );
    const totalAddressable = industryKeywords.length;

    // Competitor coverage
    const competitorCoverage = COMPETITOR_PROFILES.filter(
      (c) => c.feeCoverage.includes(industry),
    );
    const competitorCovered = competitorCoverage.length;

    // Our coverage
    const ourCoverage = Object.values(INDUSTRY_COVERAGE).find(
      (c) => c.industry === industry,
    );
    const ourCovered = ourCoverage?.topicsCovered || 0;

    // Low competition keywords
    const lowCompKeywords = industryKeywords
      .filter((k) => k.competition === "Low")
      .map((k) => k.keyword);

    // First mover advantage: no direct competitors covering this
    const firstMover = competitorCoverage.length === 0;

    // Gap score
    const gapScore = Math.round(
      ((totalAddressable - ourCovered) / Math.max(totalAddressable, 1)) * 50 +
      (firstMover ? 30 : 0) +
      (lowCompKeywords.length * 5),
    );

    return {
      industry,
      totalAddressableKeywords: totalAddressable,
      competitorCovered,
      ourCovered,
      gapScore: Math.min(100, gapScore),
      lowCompetitionOpportunities: lowCompKeywords,
      firstMoverAdvantage: firstMover,
    };
  });
}

// ── Competitive Landscape Summary ──────────────────────────────────────────

export function analyzeCompetitorLandscape(): CompetitorLandscape {
  const opportunities = analyzeMarketOpportunities();
  const directCompetitors = COMPETITOR_PROFILES.filter((c) => c.type === "direct").length;
  const contentCompetitors = COMPETITOR_PROFILES.filter((c) => c.type === "content").length;
  const ourAvg = opportunities.reduce((s, o) => s + o.ourCovered, 0) / Math.max(opportunities.length, 1);
  const compAvg = opportunities.reduce((s, o) => s + o.competitorCovered, 0) / Math.max(opportunities.length, 1);
  const underserved = opportunities
    .filter((o) => o.competitorCovered === 0)
    .map((o) => o.industry);

  return {
    totalCompetitors: COMPETITOR_PROFILES.length,
    directCompetitors,
    contentCompetitors,
    ourAverageCoverage: Math.round(ourAvg * 10) / 10,
    competitorAverageCoverage: Math.round(compAvg * 10) / 10,
    underservedIndustries: underserved,
    marketOpportunities: opportunities.sort((a, b) => b.gapScore - a.gapScore),
  };
}

// ── Strategic Recommendations ──────────────────────────────────────────────

export function generateStrategicRecommendations(): string[] {
  const landscape = analyzeCompetitorLandscape();
  const recommendations: string[] = [];

  // First-mover opportunities
  const firstMovers = landscape.marketOpportunities.filter((o) => o.firstMoverAdvantage);
  if (firstMovers.length > 0) {
    recommendations.push(
      `First-mover advantage in ${firstMovers.length} industries: ${firstMovers.map((o) => o.industry).join(", ")}. Build comprehensive content immediately before competitors enter.`,
    );
  }

  // High-gap opportunities
  const highGaps = landscape.marketOpportunities.filter((o) => o.gapScore >= 70);
  for (const gap of highGaps) {
    recommendations.push(
      `High-opportunity gap in '${gap.industry}': ${gap.totalAddressableKeywords} addressable keywords, ${gap.lowCompetitionOpportunities.length} low-competition. Our coverage: ${gap.ourCovered} topics. Priority: publish comprehensive ${gap.industry} fee guide.`,
    );
  }

  // Differentiator amplification
  recommendations.push(
    "Key differentiator: No competitor offers AI-powered document analysis for hidden fees. All competitors are content-only. Lean into 'the tool that actually does the work' positioning.",
  );

  // Content depth advantage
  if (landscape.ourAverageCoverage < landscape.competitorAverageCoverage) {
    recommendations.push(
      `Content depth gap: our ${landscape.ourAverageCoverage} avg topics/industry vs competitor ${landscape.competitorAverageCoverage}. Prioritize topic expansion in underserved industries.`,
    );
  } else {
    recommendations.push(
      `Content depth lead: our ${landscape.ourAverageCoverage} avg topics/industry vs competitor ${landscape.competitorAverageCoverage}. Maintain lead while adding tool functionality.`,
    );
  }

  // Search landscape recommendation
  const lowCompTotal = landscape.marketOpportunities.reduce(
    (s, o) => s + o.lowCompetitionOpportunities.length, 0,
  );
  recommendations.push(
    `Low-competition keyword opportunity: ${lowCompTotal} keywords across all industries. Target these with dedicated FAQ pages and schema markup for quick wins in Google AI Overviews.`,
  );

  return recommendations;
}

// ── Gap Opportunity Score ──────────────────────────────────────────────────

export function computeOpportunityScore(): {
  overall: number;
  breakdown: { category: string; score: number; maxScore: number }[];
} {
  const landscape = analyzeCompetitorLandscape();
  const avgGap = landscape.marketOpportunities.reduce((s, o) => s + o.gapScore, 0) /
    Math.max(landscape.marketOpportunities.length, 1);

  return {
    overall: Math.round(avgGap),
    breakdown: [
      {
        category: "Industry Coverage vs Competitors",
        score: landscape.ourAverageCoverage,
        maxScore: Math.max(landscape.competitorAverageCoverage, landscape.ourAverageCoverage, 10),
      },
      {
        category: "First-Mover Industries",
        score: landscape.underservedIndustries.length,
        maxScore: 7,
      },
      {
        category: "Low-Competition Keywords Available",
        score: landscape.marketOpportunities.reduce((s, o) => s + o.lowCompetitionOpportunities.length, 0),
        maxScore: 20,
      },
      {
        category: "Tool Differentiation",
        score: 10,
        maxScore: 10,
      },
    ],
  };
}

export const COMPETITOR_INSIGHTS_VERSION = "2.0.0";