import type { VerifiedFinding, StructuredDocument, VerificationResult } from "../types.js";
import { detectChanges, summarizeChanges } from "./changeDetector.js";
import type { DetectedChange } from "./changeDetector.js";

/**
 * Document Comparison Engine
 * 
 * Full pipeline for comparing two related documents:
 * e.g., Quote vs Contract, Estimate vs Final Bill, Original vs Amendment
 */

export interface ComparisonResult {
  documentA: { fileName: string; analyzedAt: string; findingCount: number };
  documentB: { fileName: string; analyzedAt: string; findingCount: number };
  changes: DetectedChange[];
  summary: ReturnType<typeof summarizeChanges>;
  riskChange: 'increased' | 'decreased' | 'unchanged';
  riskChangeDetail: string;
  recommendation: string;
}

/**
 * Compare two analyzed documents.
 */
export function compareDocuments(
  resultA: { findings: VerifiedFinding[]; doc: StructuredDocument; verification: VerificationResult },
  resultB: { findings: VerifiedFinding[]; doc: StructuredDocument; verification: VerificationResult },
  labelA: string = 'Original',
  labelB: string = 'Updated',
): ComparisonResult {
  const changes = detectChanges(resultA.findings, resultB.findings);
  const summary = summarizeChanges(changes);
  
  // Risk assessment
  const riskA = resultA.verification.overallConfidence > 0
    ? resultA.findings.filter(f => f.severity === 'High' || f.severity === 'Critical').length
    : 0;
  const riskB = resultB.verification.overallConfidence > 0
    ? resultB.findings.filter(f => f.severity === 'High' || f.severity === 'Critical').length
    : 0;

  const riskChange = riskB > riskA ? 'increased' : riskB < riskA ? 'decreased' : 'unchanged';
  
  const riskChangeDetail = riskChange === 'increased'
    ? `Document B has ${riskB - riskA} more high/critical finding(s) than Document A.`
    : riskChange === 'decreased'
      ? `Document B has ${riskA - riskB} fewer high/critical finding(s) than Document A.`
      : 'Risk level is similar between both documents.';

  const recommendation = buildComparisonRecommendation(changes, riskChange, labelA, labelB);

  return {
    documentA: {
      fileName: resultA.doc.fileName,
      analyzedAt: new Date().toISOString(),
      findingCount: resultA.findings.filter(f => !f.suppressed).length,
    },
    documentB: {
      fileName: resultB.doc.fileName,
      analyzedAt: new Date().toISOString(),
      findingCount: resultB.findings.filter(f => !f.suppressed).length,
    },
    changes,
    summary,
    riskChange,
    riskChangeDetail,
    recommendation,
  };
}

function buildComparisonRecommendation(
  changes: DetectedChange[],
  riskChange: string,
  labelA: string,
  labelB: string,
): string {
  const added = changes.filter(c => c.type === 'added');
  const removed = changes.filter(c => c.type === 'removed');
  const changedUp = changes.filter(c => c.type === 'changed_amount' && (c.amountDifference || 0) > 0);
  
  if (riskChange === 'increased' || added.length > 0 || changedUp.length > 0) {
    const concerns = [
      added.length > 0 ? `${added.length} new fee(s)` : null,
      changedUp.length > 0 ? `${changedUp.length} increased fee(s)` : null,
    ].filter(Boolean).join(' and ');

    return `The ${labelB} appears to have additional or increased costs compared to the ${labelA}. ` +
      `Review the ${concerns} carefully before proceeding. ` +
      `Ask why these changes were made and whether they can be reverted to the original terms.`;
  }

  if (removed.length > 0) {
    return `The ${labelB} has removed some items from the ${labelA}. ` +
      `Verify that important terms or protections weren't removed alongside fees.`;
  }

  return `No significant negative changes detected between the ${labelA} and ${labelB}. ` +
    `Standard review is still recommended before finalizing.`;
}