import type { VerifiedFinding, ExecutiveSummary as ExistingSummary, StructuredDocument, AuditReport, Finding } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Enhanced Executive Summary Engine
 * 
 * Transforms raw findings into a consumer-friendly narrative:
 * "Here's what matters most, why it matters, what it could cost you,
 * and what you should do next."
 */

export interface EnhancedExecutiveSummary {
  riskLevel: string;
  riskScore: number;
  riskSummary: string;
  totalFindings: number;
  criticalFindings: number;
  highFindings: number;
  potentialCostImpact: string;
  oneTimeCosts: number;
  recurringMonthly: number;
  recurringAnnual: number;
  totalFirstYear: number;
  topConcerns: TopConcern[];
  recommendedNextSteps: string[];
  confidenceLevel: number;
  keyTakeaways: string[];
  mode: 'review' | 'negotiation' | 'decision';
}

export interface TopConcern {
  rank: number;
  title: string;
  severity: string;
  amount: number | null;
  consumerMeaning: string;
  negotiationPossible: boolean;
  urgency: 'now' | 'soon' | 'before_signing' | 'monitor';
}

/**
 * Generate an enhanced executive summary from verified findings.
 */
export function generateEnhancedSummary(
  findings: VerifiedFinding[],
  doc: StructuredDocument,
  mode: 'review' | 'negotiation' | 'decision' = 'review',
): EnhancedExecutiveSummary {
  const nonSuppressed = findings.filter(f => !f.suppressed);
  
  // Sort by importance
  const ranked = [...nonSuppressed].sort((a, b) => 
    (b.confidenceScore * (b.amount || 1)) - (a.confidenceScore * (a.amount || 1))
  );

  // Critical/high counts
  const critical = ranked.filter(f => f.severity === 'Critical').length;
  const high = ranked.filter(f => f.severity === 'High').length;

  // Financial calculations
  const oneTimeCosts = ranked
    .filter(f => !f.explanation.toLowerCase().includes('recurring'))
    .reduce((sum, f) => sum + (f.amount || 0), 0);
  
  const recurringMonthly = ranked
    .filter(f => f.explanation.toLowerCase().includes('monthly') || 
                 f.explanation.toLowerCase().includes('recurring'))
    .reduce((sum, f) => sum + (f.amount || 0), 0);

  const recurringAnnual = recurringMonthly * 12;
  const totalFirstYear = oneTimeCosts + recurringAnnual;

  // Build top concerns (top 5)
  const topConcerns: TopConcern[] = ranked.slice(0, 5).map((f, i) => {
    const knowledge = lookupFee(f.title);
    return {
      rank: i + 1,
      title: f.title,
      severity: f.severity,
      amount: f.amount,
      consumerMeaning: knowledge?.consumerExplanation || f.explanation,
      negotiationPossible: knowledge 
        ? knowledge.negotiability !== 'not_negotiable' 
        : !!f.negotiationMessage,
      urgency: determineUrgency(f),
    };
  });

  // Build recommended next steps
  const nextSteps = buildNextSteps(ranked, mode);

  // Build risk summary
  const riskScore = calculateCompositeRisk(ranked);
  const riskSummary = buildRiskSummary(riskScore, critical, high, ranked.length);

  // Key takeaways
  const keyTakeaways = buildKeyTakeaways(ranked, totalFirstYear, mode);

  // Confidence
  const confidence = nonSuppressed.length > 0
    ? Math.round(nonSuppressed.reduce((s, f) => s + f.confidenceScore, 0) / nonSuppressed.length)
    : 0;

  return {
    riskLevel: riskScore <= 25 ? 'Low' : riskScore <= 50 ? 'Review Recommended' : riskScore <= 75 ? 'Elevated' : 'High',
    riskScore,
    riskSummary,
    totalFindings: nonSuppressed.length,
    criticalFindings: critical,
    highFindings: high,
    potentialCostImpact: totalFirstYear > 0
      ? `$${totalFirstYear.toLocaleString()} in identified charges (one-time + first year recurring)`
      : 'No significant cost impact identified within the document',
    oneTimeCosts,
    recurringMonthly,
    recurringAnnual,
    totalFirstYear,
    topConcerns,
    recommendedNextSteps: nextSteps,
    confidenceLevel: confidence,
    keyTakeaways,
    mode,
  };
}

function determineUrgency(finding: VerifiedFinding): TopConcern['urgency'] {
  if (finding.severity === 'Critical') return 'now';
  if (finding.severity === 'High' && finding.amount && finding.amount > 500) return 'before_signing';
  if (finding.severity === 'High') return 'soon';
  if (finding.severity === 'Medium' && finding.amount && finding.amount > 100) return 'before_signing';
  return 'monitor';
}

function calculateCompositeRisk(findings: VerifiedFinding[]): number {
  if (findings.length === 0) return 5;
  
  const severityScore = findings.reduce((s, f) => {
    const w = { Critical: 25, High: 15, Medium: 8, Low: 3 }[f.severity] || 5;
    return s + w;
  }, 0);
  
  const amountScore = Math.min(
    findings.reduce((s, f) => s + (f.amount || 0), 0) / 100,
    30
  );
  
  const confidenceBonus = findings.length > 0
    ? (100 - findings.reduce((s, f) => s + f.confidenceScore, 0) / findings.length) / 3
    : 0;
  
  return Math.round(Math.min(severityScore + amountScore + confidenceBonus, 100));
}

function buildRiskSummary(score: number, critical: number, high: number, total: number): string {
  if (score <= 15) return `This document appears straightforward with minimal concerns. ` +
    `${total} minor items were identified, but none require immediate action.`;
  if (score <= 40) return `This document warrants review. ` +
    `${total} items were found including ${critical + high} that deserve attention before proceeding.`;
  if (score <= 70) return `There are concerning elements in this document. ` +
    `${critical + high} issues of elevated concern were identified that could affect your finances or rights. ` +
    `Review before signing.`;
  return `This document contains significant concerns. ` +
    `${critical} critical and ${high} high-severity issues were found. ` +
    `Strongly recommend thorough review and negotiation before proceeding.`;
}

function buildNextSteps(findings: VerifiedFinding[], mode: string): string[] {
  const steps: string[] = [];
  const critical = findings.filter(f => f.severity === 'Critical');

  if (critical.length > 0) {
    steps.push(`Address ${critical.length} critical concern(s) immediately: ${critical.map(f => f.title).join(', ')}`);
  }

  const negotiable = findings.filter(f => {
    const k = lookupFee(f.title);
    return k && k.negotiability !== 'not_negotiable';
  });

  if (mode === 'negotiation' || mode === 'decision') {
    if (negotiable.length > 0) {
      steps.push(`Negotiate ${negotiable.length} potentially negotiable items — start with those marked "Easy" difficulty`);
    }
    steps.push('Request an itemized breakdown of all fees in writing');
    steps.push('Compare total cost to competing offers before committing');
  }

  if (mode === 'review') {
    steps.push('Review all highlighted items carefully');
    steps.push('Ask questions about any charges you don\'t understand');
    steps.push('Don\'t feel pressured to sign immediately — take time to review');
  }

  steps.push('Keep a copy of this analysis and any correspondence for your records');

  return steps;
}

function buildKeyTakeaways(
  findings: VerifiedFinding[],
  totalFirstYear: number,
  mode: string,
): string[] {
  const takeaways: string[] = [];

  const totalHidden = findings.filter(f => f.category === 'Hidden Fee' || f.category === 'Fee').reduce((s, f) => s + (f.amount || 0), 0);
  if (totalHidden > 0) {
    takeaways.push(`$${totalHidden.toLocaleString()} in potentially hidden fees were identified`);
  }

  const maxFee = findings.reduce((max, f) => (f.amount || 0) > (max?.amount || 0) ? f : max, findings[0]);
  if (maxFee?.amount) {
    takeaways.push(`The largest single fee found is "${maxFee.title}" at $${maxFee.amount.toLocaleString()}`);
  }

  if (mode === 'negotiation') {
    const negotiable = findings.filter(f => {
      const k = lookupFee(f.title);
      return k?.negotiability === 'highly_negotiable' || k?.negotiability === 'somewhat_negotiable';
    });
    if (negotiable.length > 0) {
      takeaways.push(`${negotiable.length} fees appear negotiable — you may be able to reduce these costs`);
    }
  }

  if (totalFirstYear > 1000) {
    takeaways.push(`Total identified charges over one year: $${totalFirstYear.toLocaleString()}`);
  }

  if (findings.some(f => f.evidenceQuote.toLowerCase().includes('arbitration'))) {
    takeaways.push('This document contains an arbitration clause — you may be waiving your right to sue');
  }

  return takeaways.length > 0 ? takeaways : ['No significant issues identified. The document appears standard.'];
}

/**
 * Adapter wrapper for analyze.ts — accepts an AuditReport and returns
 * an EnhancedExecutiveSummary by converting Findings to VerifiedFindings.
 */
export function generateExecutiveSummary(report: AuditReport): EnhancedExecutiveSummary {
  const verified: VerifiedFinding[] = (report.findings ?? []).map((f: Finding) => ({
    id: f.id,
    title: f.title,
    category: f.category,
    severity: f.severity,
    confidenceScore: f.confidence_score,
    confidenceTier: 'high' as const,
    amount: f.amount,
    page: f.page,
    sectionHeading: null,
    evidenceQuote: f.evidence,
    explanation: f.explanation,
    whyItMatters: f.why_it_matters,
    recommendedAction: f.recommended_action,
    negotiationMessage: f.negotiation_message,
    negotiationStrategy: f.negotiation_strategy,
    sourceAnalyzer: 'legacy',
    evidencePresent: !!f.evidence,
    evidenceMatchScore: 1,
    verificationNotes: '',
    suppressed: false,
  }));

  const docStub: StructuredDocument = {
    fileName: 'document',
    fileFormat: 'txt',
    pageCount: report.document_meta.pages_reviewed ?? 1,
    markdown: '',
    elements: [],
    tables: [],
    metadata: { pageCount: report.document_meta.pages_reviewed ?? 1, language: 'en' },
    routeResult: {
      fileFormat: 'txt', mimeType: 'text/plain', isDigital: true, isScanned: false,
      needsOcr: false, detectedLanguage: 'en', pageCount: report.document_meta.pages_reviewed ?? 1,
      hasTables: false, hasImages: false, hasForms: false, hasSignatures: false,
      hasHandwriting: false, documentQuality: 'good', warnings: [],
    },
    extractionMethod: 'native',
    extractionConfidence: report.confidence_level ?? 80,
    warnings: [],
  };

  return generateEnhancedSummary(verified, docStub, 'review');
}
