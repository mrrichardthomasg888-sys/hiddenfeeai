// HiddenFeeAI — SEO Content Intelligence
// Tracks existing pages, keyword coverage, missing topics,
// content gaps, and internal linking opportunities.
// Identifies low-competition keywords, long-tail questions,
// People Also Ask opportunities, and comparison searches.

import { KNOWLEDGE_TOPICS, INDUSTRY_COVERAGE, type KnowledgeTopic } from "../growth/aiAuthority";

// ── Types ──────────────────────────────────────────────────────────────────

export interface TrackedPage {
  url: string;
  title: string;
  type: "educational" | "tool" | "landing" | "legal" | "blog";
  industry: string[];
  primaryKeyword: string;
  relatedKeywords: string[];
  wordCount: number;
  lastUpdated: string;
  indexedGoogle: boolean;
  hasSchema: boolean;
  hasInternalLinks: boolean;
  authorityScore: number;
}

export interface KeywordOpportunity {
  keyword: string;
  searchVolume: "Low" | "Medium" | "High";
  competition: "Low" | "Medium" | "High";
  type: "question" | "comparison" | "definition" | "how_to" | "people_also_ask";
  relatedIndustry: string;
  existingCoverage: "none" | "partial" | "full";
  priority: "Critical" | "High" | "Medium" | "Low";
}

export interface ContentGap {
  industry: string;
  missingTopics: string[];
  underservedKeywords: KeywordOpportunity[];
  competitorCoverage: number;  // 0-100
  ourCoverage: number;         // 0-100
  opportunityScore: number;    // 0-100
}

export interface InternalLinkOpportunity {
  fromPage: string;
  toPage: string;
  anchorText: string;
  context: string;
  relevance: number;  // 0-100
}

// ── Tracked Pages ──────────────────────────────────────────────────────────

export const TRACKED_PAGES: TrackedPage[] = [
  // Educational Pages
  {
    url: "/hidden-fees-car-purchase",
    title: "Hidden Fees in Car Purchase Agreements",
    type: "educational",
    industry: ["automotive"],
    primaryKeyword: "hidden fees car purchase",
    relatedKeywords: [
      "documentation fee car",
      "dealer prep fee",
      "car buying hidden costs",
      "dealership fees explained",
      "negotiate car dealer fees",
    ],
    wordCount: 2200,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 85,
  },
  {
    url: "/hidden-charges-medical-bills",
    title: "Hidden Charges in Medical Bills",
    type: "educational",
    industry: ["healthcare"],
    primaryKeyword: "hidden charges medical bills",
    relatedKeywords: [
      "facility fee medical",
      "surprise medical bill",
      "hospital hidden charges",
      "medical billing errors",
      "dispute medical bill",
    ],
    wordCount: 2000,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 82,
  },
  {
    url: "/review-contracts-hidden-costs",
    title: "How to Review Contracts for Hidden Costs",
    type: "educational",
    industry: ["automotive", "housing", "insurance", "subscriptions"],
    primaryKeyword: "review contracts hidden costs",
    relatedKeywords: [
      "find hidden fees contract",
      "contract fine print",
      "hidden charges agreement",
      "audit contract costs",
      "contract review tips",
    ],
    wordCount: 1800,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 80,
  },
  {
    url: "/hidden-fees-utility-subscription-bills",
    title: "Hidden Fees in Utility & Subscription Bills",
    type: "educational",
    industry: ["utilities", "subscriptions"],
    primaryKeyword: "hidden fees utility bills",
    relatedKeywords: [
      "utility surcharge explained",
      "subscription hidden fees",
      "cable bill extra charges",
      "electric bill hidden costs",
      "streaming service fees",
    ],
    wordCount: 1600,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 78,
  },

  // Legal/Trust Pages
  {
    url: "/privacy",
    title: "Privacy Policy",
    type: "legal",
    industry: [],
    primaryKeyword: "privacy policy",
    relatedKeywords: ["data protection", "document privacy", "user privacy"],
    wordCount: 1200,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 60,
  },
  {
    url: "/terms",
    title: "Terms of Service",
    type: "legal",
    industry: [],
    primaryKeyword: "terms of service",
    relatedKeywords: ["terms and conditions", "service agreement", "user terms"],
    wordCount: 1100,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 60,
  },
  {
    url: "/refund",
    title: "Refund Policy",
    type: "legal",
    industry: [],
    primaryKeyword: "refund policy",
    relatedKeywords: ["money back guarantee", "refund terms", "satisfaction guarantee"],
    wordCount: 800,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 55,
  },

  // Core Pages
  {
    url: "/",
    title: "HiddenFeeAI — Find Hidden Fees in Your Documents",
    type: "landing",
    industry: ["automotive", "housing", "healthcare", "banking", "insurance", "subscriptions", "utilities"],
    primaryKeyword: "find hidden fees",
    relatedKeywords: [
      "hidden fee detector",
      "document audit",
      "fee analyzer",
      "AI contract review",
      "find hidden charges",
      "consumer fee checker",
    ],
    wordCount: 3000,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 90,
  },
  {
    url: "/faq",
    title: "Frequently Asked Questions",
    type: "blog",
    industry: ["automotive", "healthcare", "utilities", "subscriptions"],
    primaryKeyword: "hidden fees FAQ",
    relatedKeywords: ["common questions hidden fees", "fee questions answered", "hidden charge FAQ"],
    wordCount: 1500,
    lastUpdated: "2026-07-27",
    indexedGoogle: false,
    hasSchema: false,
    hasInternalLinks: true,
    authorityScore: 70,
  },
];

// ── Keyword Opportunities ──────────────────────────────────────────────────

export const KEYWORD_OPPORTUNITIES: KeywordOpportunity[] = [
  // People Also Ask
  {
    keyword: "are hidden fees illegal",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "general",
    existingCoverage: "partial",
    priority: "Critical",
  },
  {
    keyword: "can a dealership charge a documentation fee",
    searchVolume: "High",
    competition: "Medium",
    type: "people_also_ask",
    relatedIndustry: "automotive",
    existingCoverage: "partial",
    priority: "Critical",
  },
  {
    keyword: "what is a facility fee on medical bill",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "healthcare",
    existingCoverage: "partial",
    priority: "High",
  },
  {
    keyword: "how to negotiate dealer fees",
    searchVolume: "High",
    competition: "Medium",
    type: "how_to",
    relatedIndustry: "automotive",
    existingCoverage: "partial",
    priority: "Critical",
  },
  {
    keyword: "how to dispute a medical bill",
    searchVolume: "High",
    competition: "Medium",
    type: "how_to",
    relatedIndustry: "healthcare",
    existingCoverage: "none",
    priority: "Critical",
  },
  {
    keyword: "hidden fees mortgage closing costs",
    searchVolume: "Medium",
    competition: "Medium",
    type: "people_also_ask",
    relatedIndustry: "housing",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "what bank fees can I avoid",
    searchVolume: "High",
    competition: "Medium",
    type: "question",
    relatedIndustry: "banking",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "hidden fees in rental agreements",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "housing",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "are resort fees mandatory",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "subscriptions",
    existingCoverage: "none",
    priority: "Medium",
  },
  {
    keyword: "early termination fee vs cancellation fee",
    searchVolume: "Low",
    competition: "Low",
    type: "comparison",
    relatedIndustry: "subscriptions",
    existingCoverage: "none",
    priority: "Medium",
  },
  {
    keyword: "compare hidden fee detection tools",
    searchVolume: "Low",
    competition: "Low",
    type: "comparison",
    relatedIndustry: "general",
    existingCoverage: "none",
    priority: "Medium",
  },
  {
    keyword: "what is a junk fee",
    searchVolume: "Medium",
    competition: "Medium",
    type: "definition",
    relatedIndustry: "general",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "how to read your contract fine print",
    searchVolume: "Medium",
    competition: "Low",
    type: "how_to",
    relatedIndustry: "general",
    existingCoverage: "partial",
    priority: "High",
  },
  {
    keyword: "CFPB junk fee rules",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "banking",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "hidden fees in insurance policies",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "insurance",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "GAP insurance markup dealer",
    searchVolume: "Low",
    competition: "Low",
    type: "question",
    relatedIndustry: "automotive",
    existingCoverage: "partial",
    priority: "Medium",
  },
  {
    keyword: "what fees can I remove from my car purchase",
    searchVolume: "High",
    competition: "Medium",
    type: "people_also_ask",
    relatedIndustry: "automotive",
    existingCoverage: "partial",
    priority: "Critical",
  },
  {
    keyword: "hidden fees in subscription services",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "subscriptions",
    existingCoverage: "partial",
    priority: "Medium",
  },
  {
    keyword: "overdraft fee consumer protection",
    searchVolume: "Medium",
    competition: "Low",
    type: "people_also_ask",
    relatedIndustry: "banking",
    existingCoverage: "none",
    priority: "High",
  },
  {
    keyword: "how to find hidden fees before buying a car",
    searchVolume: "High",
    competition: "Medium",
    type: "how_to",
    relatedIndustry: "automotive",
    existingCoverage: "partial",
    priority: "Critical",
  },
];

// ── Content Gap Analysis ──────────────────────────────────────────────────

export function analyzeContentGaps(): ContentGap[] {
  const industries = [
    "automotive", "housing", "healthcare", "banking",
    "insurance", "subscriptions", "utilities",
  ];

  return industries.map((industry) => {
    // Pages covering this industry
    const coveredPages = TRACKED_PAGES.filter(
      (p) => p.industry.includes(industry) || (industry === "general" && p.type === "landing"),
    );

    // Keywords for this industry
    const industryKeywords = KEYWORD_OPPORTUNITIES.filter((k) => k.relatedIndustry === industry);
    const underserved = industryKeywords.filter((k) => k.existingCoverage !== "full");

    // Missing topics from industry coverage
    const coverage = Object.values(INDUSTRY_COVERAGE).find(
      (c) => c.industry === industry,
    );
    const missingTopics = coverage?.gaps || [];

    // Opportunity score
    const ourCoverage = coveredPages.length;
    const competitorCoverage = Math.min(100, ourCoverage * 2 + 20); // Estimated competitor baseline
    const opportunityScore = Math.round(
      ((100 - ourCoverage / Math.max(competitorCoverage, 1) * 100) + (underserved.length * 10)) / 2,
    );

    return {
      industry,
      missingTopics,
      underservedKeywords: underserved,
      competitorCoverage: Math.round(competitorCoverage),
      ourCoverage,
      opportunityScore: Math.min(100, opportunityScore),
    };
  });
}

// ── Internal Link Recommendations ─────────────────────────────────────────

export function generateInternalLinkOpportunities(): InternalLinkOpportunity[] {
  const opportunities: InternalLinkOpportunity[] = [];

  for (const page of TRACKED_PAGES) {
    if (page.type === "legal") continue;

    // Find related pages
    const related = TRACKED_PAGES.filter(
      (p) =>
        p.url !== page.url &&
        p.industry.some((i) => page.industry.includes(i)) &&
        p.type !== "legal",
    );

    for (const target of related) {
      // Generate context-aware anchor text
      const anchorText = target.primaryKeyword;

      opportunities.push({
        fromPage: page.url,
        toPage: target.url,
        anchorText,
        context: `Internal link from "${page.title}" to "${target.title}" based on shared industry: ${page.industry.filter(i => target.industry.includes(i)).join(", ")}`,
        relevance: 85,
      });
    }
  }

  // Add cross-industry links for general topics
  const contractPage = TRACKED_PAGES.find((p) => p.url === "/review-contracts-hidden-costs");
  if (contractPage) {
    for (const page of TRACKED_PAGES) {
      if (page.type === "educational" && page.url !== contractPage.url && !opportunities.some(o => o.fromPage === contractPage.url && o.toPage === page.url)) {
        opportunities.push({
          fromPage: contractPage.url,
          toPage: page.url,
          anchorText: `learn more about ${page.primaryKeyword}`,
          context: `Contract review is relevant to ${page.title}`,
          relevance: 90,
        });
      }
    }
  }

  // Link from landing to all educational pages
  for (const page of TRACKED_PAGES) {
    if (page.type === "educational") {
      const exists = opportunities.some(o => o.fromPage === "/" && o.toPage === page.url);
      if (!exists) {
        opportunities.push({
          fromPage: "/",
          toPage: page.url,
          anchorText: page.title,
          context: `Landing page should link to educational content: ${page.title}`,
          relevance: 95,
        });
      }
    }
  }

  return opportunities;
}

// ── Keyword Coverage Stats ─────────────────────────────────────────────────

export function computeKeywordCoverage() {
  const totalKeywords = KEYWORD_OPPORTUNITIES.length;
  const covered = KEYWORD_OPPORTUNITIES.filter((k) => k.existingCoverage !== "none").length;
  const critical = KEYWORD_OPPORTUNITIES.filter((k) => k.priority === "Critical").length;
  const criticalUncovered = KEYWORD_OPPORTUNITIES.filter(
    (k) => k.priority === "Critical" && k.existingCoverage === "none",
  ).length;

  return {
    totalKeywords,
    covered,
    coveragePercent: Math.round((covered / totalKeywords) * 100),
    criticalKeywords: critical,
    criticalUncovered,
    averageCompetition: "Low-Medium",
    lowCompetitionOpportunities: KEYWORD_OPPORTUNITIES.filter((k) => k.competition === "Low").length,
  };
}

export const SEO_VERSION = "2.0.0";