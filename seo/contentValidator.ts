// HiddenFeeAI — Programmatic Content Quality Checker
// Evaluates pages for search intent match, E-E-A-T signals,
// schema availability, internal links, duplicate content risk,
// and helpful content compliance.

import { TRACKED_PAGES, type TrackedPage } from "./contentAuthority";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContentQualityScore {
  url: string;
  overallScore: number;            // 0-100
  searchIntentMatch: number;       // 0-100
  eeatSignals: EEATScore;
  schemaScore: number;             // 0-100
  internalLinksScore: number;      // 0-100
  duplicateRiskScore: number;      // 0-100 (lower is better)
  helpfulContentScore: number;     // 0-100
  readabilityScore: number;        // 0-100
  issues: QualityIssue[];
  recommendations: string[];
}

export interface EEATScore {
  experience: number;    // First-hand experience signals
  expertise: number;     // Demonstrated knowledge
  authoritativeness: number; // Industry recognition
  trustworthiness: number;   // Accuracy and transparency
  overall: number;
}

export interface QualityIssue {
  severity: "Critical" | "High" | "Medium" | "Low";
  category: "schema" | "content" | "eeat" | "linking" | "duplicate" | "helpful_content" | "readability";
  description: string;
  fix: string;
}

// ── Content Quality Validator ─────────────────────────────────────────────

export function validatePage(page: TrackedPage): ContentQualityScore {
  const issues: QualityIssue[] = [];
  const recommendations: string[] = [];

  // 1. Search Intent Match (0-100)
  const searchIntentMatch = evaluateSearchIntent(page);

  // 2. E-E-A-T Signals
  const eeatScore = evaluateEEAT(page, recommendations);

  // 3. Schema Score
  const schemaScore = evaluateSchema(page, issues, recommendations);

  // 4. Internal Links Score
  const internalLinksScore = evaluateInternalLinks(page, issues, recommendations);

  // 5. Duplicate Risk
  const duplicateRiskScore = evaluateDuplicateRisk(page, issues, recommendations);

  // 6. Helpful Content Compliance
  const helpfulContentScore = evaluateHelpfulContent(page, issues, recommendations);

  // 7. Readability
  const readabilityScore = evaluateReadability(page, issues, recommendations);

  // Overall score
  const overallScore = Math.round(
    (searchIntentMatch * 0.2) +
    (eeatScore.overall * 0.2) +
    (schemaScore * 0.15) +
    (internalLinksScore * 0.1) +
    ((100 - duplicateRiskScore) * 0.1) +
    (helpfulContentScore * 0.15) +
    (readabilityScore * 0.1),
  );

  return {
    url: page.url,
    overallScore,
    searchIntentMatch,
    eeatScore,
    schemaScore,
    internalLinksScore,
    duplicateRiskScore,
    helpfulContentScore,
    readabilityScore,
    issues,
    recommendations,
  };
}

// ── Individual Evaluators ──────────────────────────────────────────────────

function evaluateSearchIntent(page: TrackedPage): number {
  let score = 80; // Base score

  // Educational pages should have clear "learn" intent
  if (page.type === "educational" && page.wordCount >= 1500) score += 10;
  if (page.type === "educational" && page.wordCount < 1000) score -= 20;

  // Landing page should have conversion intent
  if (page.type === "landing" && page.relatedKeywords.length >= 5) score += 10;
  if (page.type === "landing" && page.relatedKeywords.length < 3) score -= 15;

  // Legal pages need comprehensive coverage
  if (page.type === "legal" && page.wordCount >= 800) score += 5;

  return Math.min(100, Math.max(0, score));
}

function evaluateEEAT(page: TrackedPage, recommendations: string[]): EEATScore {
  const scores = {
    experience: 70,
    expertise: 70,
    authoritativeness: 60,
    trustworthiness: 75,
    overall: 0,
  };

  // Experience signals
  if (page.wordCount >= 2000) scores.experience += 10;
  if (page.type === "educational") scores.experience += 10;
  if (page.type === "tool") scores.experience += 5;

  // Expertise signals
  if (page.wordCount >= 1500) scores.expertise += 10;
  if (page.relatedKeywords.length >= 5) scores.expertise += 10;
  if (page.relatedKeywords.length >= 8) scores.expertise += 5;

  // Authoritativeness signals
  if (page.authorityScore >= 80) scores.authoritativeness += 15;
  if (page.authorityScore >= 70) scores.authoritativeness += 10;
  // Pages need external citations (not available on these pages)
  if (page.type === "educational") {
    recommendations.push(`Add authoritative citations and references to "${page.title}"`);
    scores.authoritativeness -= 10;
  }

  // Trustworthiness signals
  if (page.hasSchema) scores.trustworthiness += 10;
  if (page.lastUpdated && new Date(page.lastUpdated).getTime() > Date.now() - 90 * 24 * 60 * 60 * 1000) {
    scores.trustworthiness += 10;
  } else {
    recommendations.push(`Update "${page.title}" — content is more than 90 days old`);
    scores.trustworthiness -= 5;
  }
  // Privacy and contact information availability
  if (page.type !== "legal") scores.trustworthiness += 5;

  // Cap all at 100
  for (const key of Object.keys(scores) as (keyof EEATScore)[]) {
    if (key !== "overall") {
      scores[key] = Math.min(100, Math.max(0, scores[key]));
    }
  }

  scores.overall = Math.round(
    (scores.experience + scores.expertise + scores.authoritativeness + scores.trustworthiness) / 4,
  );

  return scores;
}

function evaluateSchema(
  page: TrackedPage,
  issues: QualityIssue[],
  _recommendations: string[],
): number {
  let score = 0;

  if (page.hasSchema) {
    score = 100;
  } else {
    score = 0;
    if (page.type === "educational") {
      issues.push({
        severity: "High",
        category: "schema",
        description: `"${page.title}" is missing Article schema markup`,
        fix: `Add JSON-LD Article schema to ${page.url}`,
      });
    }
    if (page.type === "landing") {
      issues.push({
        severity: "High",
        category: "schema",
        description: `Landing page is missing WebApplication schema markup`,
        fix: `Add JSON-LD WebApplication schema to ${page.url}`,
      });
    }
    if (page.type === "blog") {
      issues.push({
        severity: "High",
        category: "schema",
        description: `FAQ page is missing FAQPage schema markup`,
        fix: `Add JSON-LD FAQPage schema to ${page.url}`,
      });
    }
  }

  return score;
}

function evaluateInternalLinks(
  page: TrackedPage,
  issues: QualityIssue[],
  _recommendations: string[],
): number {
  if (page.hasInternalLinks) return 85;

  issues.push({
    severity: "Medium",
    category: "linking",
    description: `"${page.title}" has no internal links identified`,
    fix: `Generate internal link recommendations for ${page.url}`,
  });

  return 30;
}

function evaluateDuplicateRisk(
  page: TrackedPage,
  issues: QualityIssue[],
  _recommendations: string[],
): number {
  let risk = 10; // Low base risk

  // Pages with similar keywords to others
  const similarPages = TRACKED_PAGES.filter(
    (p) =>
      p.url !== page.url &&
      p.relatedKeywords.some((k) => page.relatedKeywords.includes(k)),
  );

  if (similarPages.length > 0) {
    risk += similarPages.length * 5;
    if (similarPages.length >= 2) {
      issues.push({
        severity: "Medium",
        category: "duplicate",
        description: `"${page.title}" shares keywords with ${similarPages.length} other pages`,
        fix: "Differentiate content angles and canonicalize where appropriate",
      });
    }
  }

  // Low word count pages risk being thin content
  if (page.wordCount < 600) {
    risk += 20;
    issues.push({
      severity: "High",
      category: "duplicate",
      description: `"${page.title}" is thin content (${page.wordCount} words)`,
      fix: `Expand content to at least 800 words for ${page.url}`,
    });
  }

  return Math.min(100, risk);
}

function evaluateHelpfulContent(
  page: TrackedPage,
  issues: QualityIssue[],
  recommendations: string[],
): number {
  let score = 75;

  // Content depth (word count)
  if (page.wordCount >= 2000) score += 10;
  if (page.wordCount < 800 && page.type !== "legal") {
    score -= 20;
    issues.push({
      severity: "High",
      category: "helpful_content",
      description: `"${page.title}" may not satisfy search intent with only ${page.wordCount} words`,
      fix: "Expand content to provide comprehensive coverage of the topic",
    });
  }

  // First-hand experience indicators
  if (page.type === "educational") score += 5;
  if (page.type === "tool") score += 5;

  // People-first content indicators
  if (page.relatedKeywords.length >= 4) score += 5;
  if (page.primaryKeyword.length > 0) score += 5;

  // Check for excessive keyword targeting (penalty)
  if (page.relatedKeywords.length > 10) {
    score -= 5;
    recommendations.push(`Consider narrowing keyword focus for "${page.title}"`);
  }

  return Math.min(100, Math.max(0, score));
}

function evaluateReadability(
  page: TrackedPage,
  issues: QualityIssue[],
  _recommendations: string[],
): number {
  let score = 75;

  // Word count correlates with depth but can hurt readability
  if (page.wordCount > 3000) score -= 5;
  if (page.wordCount >= 1500 && page.wordCount <= 2500) score += 10;

  // Legal pages tend to have lower readability
  if (page.type === "legal") score -= 10;

  if (score < 70 && page.type !== "legal") {
    issues.push({
      severity: "Low",
      category: "readability",
      description: `"${page.title}" readability could be improved`,
      fix: "Use shorter paragraphs, bullet points, and clear headings for better readability",
    });
  }

  return Math.min(100, Math.max(0, score));
}

// ── Batch Validation ──────────────────────────────────────────────────────

export function validateAllPages(): {
  scores: ContentQualityScore[];
  averageScore: number;
  criticalIssues: QualityIssue[];
  highIssues: QualityIssue[];
  pagesWithoutSchema: string[];
  thinContentPages: string[];
} {
  const scores = TRACKED_PAGES.map(validatePage);
  const averageScore = Math.round(
    scores.reduce((sum, s) => sum + s.overallScore, 0) / Math.max(scores.length, 1),
  );

  const allIssues = scores.flatMap((s) => s.issues);
  const criticalIssues = allIssues.filter((i) => i.severity === "Critical");
  const highIssues = allIssues.filter((i) => i.severity === "High");

  const pagesWithoutSchema = scores
    .filter((s) => s.schemaScore === 0)
    .map((s) => s.url);

  const thinContentPages = scores
    .filter((s) => s.issues.some((i) => i.category === "duplicate" && i.severity === "High"))
    .map((s) => s.url);

  return {
    scores,
    averageScore,
    criticalIssues,
    highIssues,
    pagesWithoutSchema,
    thinContentPages,
  };
}

// ── Helpful Content Compliance Report ──────────────────────────────────────

export function generateHelpfulContentReport() {
  const results = validateAllPages();

  return {
    overallHelpfulContentScore: Math.round(
      results.scores.reduce((sum, s) => sum + s.helpfulContentScore, 0) / Math.max(results.scores.length, 1),
    ),
    pagesAtRisk: results.scores.filter((s) => s.helpfulContentScore < 60).map((s) => ({
      url: s.url,
      score: s.helpfulContentScore,
    })),
    eeatAverage: Math.round(
      results.scores.reduce((sum, s) => sum + s.eeatScore.overall, 0) / Math.max(results.scores.length, 1),
    ),
    totalIssues: results.criticalIssues.length + results.highIssues.length,
    recommendations: results.scores
      .flatMap((s) => s.recommendations)
      .filter((r, i, arr) => arr.indexOf(r) === i), // deduplicate
  };
}

export const VALIDATOR_VERSION = "2.0.0";