import type { VerifiedFinding } from "../types.js";
import type { EnhancedExecutiveSummary } from "./executiveSummary.js";
import type { PrioritizedFinding } from "./prioritizationEngine.js";
import type { SavingsEstimate } from "./savingsEstimator.js";
import type { ActionPlan } from "./actionPlanEngine.js";
import {
  generateEnhancedSummary,
} from "./executiveSummary.js";
import { prioritizeFindings } from "./prioritizationEngine.js";
import { estimateSavings, aggregateSavings } from "./savingsEstimator.js";
import { generateActionPlan } from "./actionPlanEngine.js";
import { generateNegotiationAdvice, generateNegotiationSummary } from "./negotiationEngine.js";
import { explainFindings } from "./explanationEngine.js";
import type { StructuredDocument } from "../types.js";

/**
 * Report Modes Engine
 * 
 * Curates the analysis output into different consumer perspectives:
 * 
 * - Review Mode: "What should I worry about?"
 * - Negotiation Mode: "How do I lower the cost?"
 * - Decision Mode: "Should I sign this?"
 * - Comparison Mode: "What changed from the last version?"
 */

export type ReportMode = 'review' | 'negotiation' | 'decision' | 'comparison';

export interface CuratedReport {
  mode: ReportMode;
  modeLabel: string;
  modeDescription: string;
  executiveSummary: EnhancedExecutiveSummary;
  prioritizedFindings: PrioritizedFinding[];
  savings: { estimates: SavingsEstimate[]; aggregate: ReturnType<typeof aggregateSavings> };
  actionPlan: ActionPlan;
  keyInsights: string[];
  modeSpecificGuidance: string[];
}

/**
 * Generate a mode-specific curated report.
 */
export function generateCuratedReport(
  findings: VerifiedFinding[],
  doc: StructuredDocument,
  mode: ReportMode,
): CuratedReport {
  const active = findings.filter(f => !f.suppressed);

  // Core analysis (same for all modes)
  const executiveSummary = generateEnhancedSummary(active, doc, 
    mode === 'negotiation' ? 'negotiation' : 
    mode === 'decision' ? 'decision' : 'review'
  );
  const prioritized = prioritizeFindings(active);
  const savings = estimateSavings(active);
  const savingsAggregate = aggregateSavings(savings);
  const actionPlan = generateActionPlan(active, 'document');

  // Mode-specific insights and guidance
  const { keyInsights, modeSpecificGuidance, modeLabel, modeDescription } = 
    generateModeContent(active, prioritized, executiveSummary, mode, doc);

  return {
    mode,
    modeLabel,
    modeDescription,
    executiveSummary,
    prioritizedFindings: prioritized,
    savings: { estimates: savings, aggregate: savingsAggregate },
    actionPlan,
    keyInsights,
    modeSpecificGuidance,
  };
}

function generateModeContent(
  findings: VerifiedFinding[],
  prioritized: PrioritizedFinding[],
  summary: EnhancedExecutiveSummary,
  mode: ReportMode,
  doc: StructuredDocument,
): {
  keyInsights: string[];
  modeSpecificGuidance: string[];
  modeLabel: string;
  modeDescription: string;
} {
  switch (mode) {
    case 'review':
      return {
        modeLabel: 'Document Review',
        modeDescription: 'A comprehensive review of your document, highlighting risks, hidden fees, and concerning clauses.',
        keyInsights: generateReviewInsights(findings, prioritized),
        modeSpecificGuidance: [
          'Focus on items marked 🔴 Must Address — these have the highest potential impact on your finances or rights.',
          'Read each finding\'s plain-English explanation to understand exactly what it means for you.',
          'Use the checklist below to track what you\'ve reviewed before making any decisions.',
          'Don\'t feel pressured — take your time reviewing each highlighted item.',
        ],
      };

    case 'negotiation':
      return {
        modeLabel: 'Negotiation Guide',
        modeDescription: 'A focused action plan for negotiating fees, charges, and terms to save money.',
        keyInsights: generateNegotiationInsights(findings, summary),
        modeSpecificGuidance: [
          'Start with items marked "highly negotiable" — you have the best chance of success here.',
          'Use the provided phone scripts and email templates word-for-word if you\'re unsure what to say.',
          'Be polite but persistent. The first person you speak with may not have authority to adjust fees — ask for a supervisor.',
          'Get any agreed changes in writing before signing. Verbal promises may not be honored.',
          'If one provider won\'t negotiate, use competing quotes as leverage or switch providers.',
        ],
      };

    case 'decision':
      return {
        modeLabel: 'Decision Support',
        modeDescription: 'An assessment of whether you should proceed with this document as-is, or seek changes.',
        keyInsights: generateDecisionInsights(findings, summary),
        modeSpecificGuidance: [
          `Risk Score: ${summary.riskScore}/100 — ${summary.riskLevel}. ${summary.riskSummary}`,
          `Financial Impact: ${summary.potentialCostImpact}`,
          summary.criticalFindings > 0 
            ? `⚠️ ${summary.criticalFindings} critical finding(s) detected — address these before signing.`
            : 'No critical findings detected.',
          'If you\'re unsure, sleep on it. High-pressure sales tactics are a red flag.',
          'Consider having a trusted friend or advisor review the document as well.',
        ],
      };

    case 'comparison':
      return {
        modeLabel: 'Version Comparison',
        modeDescription: 'A side-by-side comparison highlighting what changed between document versions.',
        keyInsights: [
          'Compare documents carefully — companies sometimes add fees or change terms between versions.',
          'Even small wording changes can have significant legal implications.',
          'Look for fees that appeared, disappeared, or changed in amount.',
        ],
        modeSpecificGuidance: [
          'Upload both documents (e.g., estimate vs. contract) to compare them side by side.',
          'Pay special attention to any fees that were added between the estimate and final contract.',
          'If terms have changed without explanation, ask why before signing.',
          'Save both versions for your records — you may need to reference them later.',
        ],
      };
  }
}

function generateReviewInsights(
  findings: VerifiedFinding[],
  prioritized: PrioritizedFinding[],
): string[] {
  const insights: string[] = [];
  const critical = prioritized.filter(p => p.finding.severity === 'Critical');
  const high = prioritized.filter(p => p.finding.severity === 'High');
  const feeTotal = findings
    .filter(f => f.amount)
    .reduce((s, f) => s + (f.amount || 0), 0);

  if (critical.length > 0) {
    insights.push(`⚠️ ${critical.length} critical issue(s) demand immediate attention. These could seriously affect your rights or finances.`);
  }
  if (feeTotal > 0) {
    insights.push(`💰 $${feeTotal.toLocaleString()} in potential fees, charges, or costs were identified.`);
  }
  if (findings.some(f => f.evidenceQuote.toLowerCase().includes('arbitration'))) {
    insights.push('⚖️ This document contains an arbitration clause — you may be waiving important legal rights.');
  }
  if (findings.some(f => f.title.toLowerCase().includes('renew'))) {
    insights.push('🔄 Auto-renewal terms were detected — make sure you understand the cancellation process.');
  }
  if (findings.length === 0) {
    insights.push('✅ No significant issues were found. This document appears standard.');
  } else {
    insights.push(`Found ${findings.length} item(s) to review — see the priority list below for what to address first.`);
  }

  return insights;
}

function generateNegotiationInsights(
  findings: VerifiedFinding[],
  summary: EnhancedExecutiveSummary,
): string[] {
  const insights: string[] = [];
  const negotiable = findings.filter(f => {
    const k = f as any;
    return !k.suppressed && f.negotiationMessage;
  });

  if (negotiable.length > 0) {
    insights.push(`You have ${negotiable.length} potentially negotiable items. Prioritize those with the highest financial impact first.`);
  }

  if (summary.recurringAnnual > 0) {
    insights.push(`$${summary.recurringAnnual.toLocaleString()}/year in recurring charges — even small monthly savings add up significantly over time.`);
  }

  const highNegotiable = findings.filter(f => {
    const k = f as any;
    return f.severity === 'High' && !k.suppressed && f.amount && f.amount > 200;
  });
  if (highNegotiable.length > 0) {
    insights.push(`The most impactful negotiation target: "${highNegotiable[0].title}" at $${highNegotiable[0].amount?.toLocaleString()}.`);
  }

  if (findings.length === 0) {
    insights.push('No negotiable items were identified. The document appears competitive.');
  }

  return insights;
}

function generateDecisionInsights(
  findings: VerifiedFinding[],
  summary: EnhancedExecutiveSummary,
): string[] {
  const insights: string[] = [];
  const critical = findings.filter(f => f.severity === 'Critical');

  if (critical.length > 0) {
    insights.push(`NOT RECOMMENDED without changes — ${critical.length} critical issue(s) should be resolved before signing.`);
  } else if (summary.riskScore > 60) {
    insights.push('PROCEED WITH CAUTION — significant concerns were identified that warrant negotiation.');
  } else if (summary.riskScore > 30) {
    insights.push('CONDITIONALLY OK — minor issues found, but most are addressable through questions or negotiation.');
  } else {
    insights.push('APPEARS REASONABLE — no major red flags detected. Standard consumer review recommended.');
  }

  if (summary.totalFirstYear > 500) {
    insights.push(`The total first-year cost impact is approximately $${summary.totalFirstYear.toLocaleString()}. Consider this in your decision.`);
  }

  return insights;
}