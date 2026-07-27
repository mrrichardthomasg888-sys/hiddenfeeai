// HiddenFeeAI — Internal Linking Intelligence
// Recommends links between educational pages, tool pages,
// industry guides, and analysis pages.
// Goal: Increase topical authority through strategic internal linking.

import { TRACKED_PAGES, generateInternalLinkOpportunities, type InternalLinkOpportunity } from "./contentAuthority";
import { CONSUMER_QUESTIONS } from "../knowledge/consumerQuestions";
import { NODES as GRAPH_NODES, findFeesByIndustry } from "../knowledge/knowledgeGraph";

// ── Types ──────────────────────────────────────────────────────────────────

export interface LinkRecommendation {
  fromUrl: string;
  fromTitle: string;
  toUrl: string;
  toTitle: string;
  anchorText: string;
  linkType: "educational" | "tool_cta" | "related_topic" | "faq" | "navigation" | "cross_industry";
  priority: "Critical" | "High" | "Medium" | "Low";
  rationale: string;
}

export interface LinkCoverageMetrics {
  totalPages: number;
  totalLinksRecommended: number;
  linksPerPage: number;
  orphanPages: string[];
  crossIndustryLinks: number;
  topicHubPages: string[];
}

// ── Link Recommendation Engine ─────────────────────────────────────────────

function getLinkType(page: { type: string }, target: { type: string }): LinkRecommendation["linkType"] {
  if (target.type === "tool" || target.type === "landing") return "tool_cta";
  if (target.type === "blog") return "faq";
  if (page.type === "educational" && target.type === "educational") {
    return "educational";
  }
  return "related_topic";
}

export function generateLinkRecommendations(): LinkRecommendation[] {
  const recommendations: LinkRecommendation[] = [];
  const opportunities = generateInternalLinkOpportunities();

  // Core: educational pages link to each other based on shared industries
  for (const page of TRACKED_PAGES) {
    if (page.type === "legal") continue;

    const relatedPages = TRACKED_PAGES.filter(
      (p) =>
        p.url !== page.url &&
        p.type !== "legal" &&
        p.industry.some((i) => page.industry.includes(i)),
    );

    for (const target of relatedPages) {
      const anchor = target.primaryKeyword || target.title;

      // Determine priority based on relevance
      let priority: LinkRecommendation["priority"] = "Medium";
      const overlappingIndustries = page.industry.filter((i) => target.industry.includes(i));
      if (overlappingIndustries.length >= 2) priority = "High";
      if (
        page.type === "landing" && target.type === "educational" ||
        target.url.includes("contract") && !page.url.includes("contract")
      ) {
        priority = "Critical";
      }

      recommendations.push({
        fromUrl: page.url,
        fromTitle: page.title,
        toUrl: target.url,
        toTitle: target.title,
        anchorText: anchor,
        linkType: getLinkType(page, target),
        priority,
        rationale: `Shared industries: ${overlappingIndustries.join(", ")}`,
      });
    }
  }

  // Landing page → all educational pages (critical path)
  const landingPage = TRACKED_PAGES.find((p) => p.url === "/");
  if (landingPage) {
    for (const eduPage of TRACKED_PAGES.filter((p) => p.type === "educational")) {
      const exists = recommendations.some(
        (r) => r.fromUrl === "/" && r.toUrl === eduPage.url,
      );
      if (!exists) {
        recommendations.push({
          fromUrl: "/",
          fromTitle: "HiddenFeeAI",
          toUrl: eduPage.url,
          toTitle: eduPage.title,
          anchorText: eduPage.title,
          linkType: "educational",
          priority: "Critical",
          rationale: "Landing page must link to all educational content for topical authority",
        });
      }
    }
  }

  // Contract review page → all industry pages (topical hub)
  const contractPage = TRACKED_PAGES.find((p) => p.url === "/review-contracts-hidden-costs");
  if (contractPage) {
    for (const page of TRACKED_PAGES.filter((p) => p.type === "educational" && p.url !== contractPage.url)) {
      recommendations.push({
        fromUrl: contractPage.url,
        fromTitle: contractPage.title,
        toUrl: page.url,
        toTitle: page.title,
        anchorText: `learn about ${page.primaryKeyword}`,
        linkType: "cross_industry",
        priority: "Critical",
        rationale: "Contract review is the hub page — it should link to all industry-specific guides",
      });
    }
  }

  // FAQ → educational pages
  const faqPage = TRACKED_PAGES.find((p) => p.url === "/faq");
  if (faqPage) {
    for (const eduPage of TRACKED_PAGES.filter((p) => p.type === "educational")) {
      recommendations.push({
        fromUrl: "/faq",
        fromTitle: "FAQ",
        toUrl: eduPage.url,
        toTitle: eduPage.title,
        anchorText: `detailed guide on ${eduPage.primaryKeyword}`,
        linkType: "faq",
        priority: "High",
        rationale: "FAQ questions should link to detailed educational guides",
      });
    }
  }

  // Navigation context: educational pages link back to landing
  for (const eduPage of TRACKED_PAGES.filter((p) => p.type === "educational")) {
    const exists = recommendations.some(
      (r) => r.fromUrl === eduPage.url && r.toUrl === "/",
    );
    if (!exists) {
      recommendations.push({
        fromUrl: eduPage.url,
        fromTitle: eduPage.title,
        toUrl: "/",
        toTitle: "HiddenFeeAI",
        anchorText: "audit your document for hidden fees",
        linkType: "navigation",
        priority: "High",
        rationale: "Educational pages should drive users to the tool",
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return recommendations.filter((r) => {
    const key = `${r.fromUrl}|${r.toUrl}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Coverage Analysis ──────────────────────────────────────────────────────

export function analyzeLinkCoverage(): LinkCoverageMetrics {
  const recommendations = generateLinkRecommendations();
  const allUrls = TRACKED_PAGES.map((p) => p.url);
  const linkedToUrls = new Set(recommendations.map((r) => r.toUrl));
  const orphanPages = allUrls.filter((url) => !linkedToUrls.has(url));

  const crossIndustryLinks = recommendations.filter(
    (r) => r.linkType === "cross_industry",
  ).length;

  const topicHubPages = TRACKED_PAGES
    .filter((p) => {
      const outgoing = recommendations.filter((r) => r.fromUrl === p.url);
      return outgoing.length >= 3;
    })
    .map((p) => p.url);

  return {
    totalPages: allUrls.length,
    totalLinksRecommended: recommendations.length,
    linksPerPage: Math.round(recommendations.length / Math.max(allUrls.length, 1)),
    orphanPages,
    crossIndustryLinks,
    topicHubPages,
  };
}

// ── Priority Links (top 10 most critical) ──────────────────────────────────

export function getCriticalLinks(): LinkRecommendation[] {
  return generateLinkRecommendations()
    .filter((r) => r.priority === "Critical")
    .sort((a, b) => {
      const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })
    .slice(0, 10);
}

// ── JSON-LD ItemList for "Related Pages" ───────────────────────────────────

export function generateRelatedPagesStructuredData(pageUrl: string): string {
  const recommendations = generateLinkRecommendations()
    .filter((r) => r.fromUrl === pageUrl && r.linkType === "educational")
    .slice(0, 5);

  if (recommendations.length === 0) return "";

  return JSON.stringify(
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: recommendations.map((rec, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "WebPage",
          name: rec.toTitle,
          url: `https://hiddenfeeai.com${rec.toUrl}`,
          description: rec.rationale,
        },
      })),
    },
    null,
    2,
  );
}

// ── Internal Link Health Score ─────────────────────────────────────────────

export function computeLinkHealthScore(): {
  score: number;
  status: "Excellent" | "Good" | "Needs Improvement" | "Critical";
  details: string;
} {
  const coverage = analyzeLinkCoverage();
  const recommendations = generateLinkRecommendations();

  let score = 0;

  // Orphan pages penalty
  const orphanRatio = coverage.orphanPages.length / coverage.totalPages;
  if (orphanRatio === 0) score += 30;
  else if (orphanRatio <= 0.2) score += 20;
  else if (orphanRatio <= 0.4) score += 10;

  // Links per page
  if (coverage.linksPerPage >= 5) score += 25;
  else if (coverage.linksPerPage >= 3) score += 15;
  else if (coverage.linksPerPage >= 1) score += 10;

  // Cross-industry links
  if (coverage.crossIndustryLinks >= 3) score += 20;
  else if (coverage.crossIndustryLinks >= 1) score += 10;

  // Critical links coverage
  const criticalLinks = recommendations.filter((r) => r.priority === "Critical").length;
  if (criticalLinks >= 5) score += 25;
  else if (criticalLinks >= 3) score += 15;
  else score += 5;

  let status: "Excellent" | "Good" | "Needs Improvement" | "Critical";
  if (score >= 85) status = "Excellent";
  else if (score >= 65) status = "Good";
  else if (score >= 40) status = "Needs Improvement";
  else status = "Critical";

  return {
    score: Math.min(100, score),
    status,
    details:
      `${coverage.orphanPages.length} orphan pages, ${coverage.linksPerPage} avg links/page, ${coverage.crossIndustryLinks} cross-industry links, ${criticalLinks} critical links needed.`,
  };
}

export const LINK_ENGINE_VERSION = "2.0.0";