import type { VerifiedFinding } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Finding Prioritization Engine
 * 
 * Ranks findings by multi-dimensional importance:
 * financial impact × consumer risk × negotiability × confidence × urgency
 */

export interface PrioritizedFinding {
  finding: VerifiedFinding;
  rank: number;
  priorityLabel: '🔴 Must Address' | '🟠 High Priority' | '🟡 Review' | '🟢 Note';
  priorityScore: number;
  reason: string;
  recommendedAction: string;
}

export function prioritizeFindings(findings: VerifiedFinding[]): PrioritizedFinding[] {
  const active = findings.filter(f => !f.suppressed);
  
  const scored = active.map(f => ({
    finding: f,
    priorityScore: calculatePriorityScore(f),
  }));

  scored.sort((a, b) => b.priorityScore - a.priorityScore);

  return scored.map((s, i) => ({
    finding: s.finding,
    rank: i + 1,
    priorityLabel: getPriorityLabel(s.priorityScore),
    priorityScore: s.priorityScore,
    reason: buildPriorityReason(s.finding, s.priorityScore),
    recommendedAction: buildRecommendedAction(s.finding),
  }));
}

function calculatePriorityScore(f: VerifiedFinding): number {
  const severityW = { Critical: 40, High: 25, Medium: 12, Low: 5 }[f.severity] || 5;
  const amountW = f.amount ? Math.min(Math.log10(f.amount + 1) * 8, 30) : 5;
  const confidenceW = (f.confidenceScore / 100) * 20;
  
  const knowledge = lookupFee(f.title);
  const negotiabilityW = knowledge?.negotiability === 'highly_negotiable' ? 15 :
    knowledge?.negotiability === 'somewhat_negotiable' ? 8 : 3;

  return Math.round(severityW + amountW + confidenceW + negotiabilityW);
}

function getPriorityLabel(score: number): PrioritizedFinding['priorityLabel'] {
  if (score >= 70) return '🔴 Must Address';
  if (score >= 45) return '🟠 High Priority';
  if (score >= 20) return '🟡 Review';
  return '🟢 Note';
}

function buildPriorityReason(f: VerifiedFinding, score: number): string {
  const parts: string[] = [];
  if (f.severity === 'Critical' || f.severity === 'High') parts.push(`${f.severity} severity`);
  if (f.amount && f.amount > 100) parts.push(`$${f.amount.toLocaleString()} financial impact`);
  
  const k = lookupFee(f.title);
  if (k?.negotiability === 'highly_negotiable') parts.push('highly negotiable');
  
  return parts.join(' + ') || 'Review for awareness';
}

function buildRecommendedAction(f: VerifiedFinding): string {
  const k = lookupFee(f.title);
  if (k?.negotiability === 'highly_negotiable') {
    return `Act now: Ask to have the "${f.title}" reduced or removed. This is frequently negotiable.`;
  }
  if (f.negotiationMessage) return f.negotiationMessage;
  if (f.recommendedAction) return f.recommendedAction;
  return `Review the "${f.title}" and ask questions before proceeding.`;
}