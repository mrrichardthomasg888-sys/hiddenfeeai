import type { VerifiedFinding } from "../types.js";

/**
 * Document Change Detector
 * 
 * Compares two sets of findings to detect:
 * - ADDED: new fees/clauses in the second document
 * - REMOVED: fees/clauses that disappeared
 * - CHANGED: same item but different amount
 * - MODIFIED: same clause type but wording changed
 */

export type ChangeType = 'added' | 'removed' | 'changed_amount' | 'changed_wording' | 'unchanged';

export interface DetectedChange {
  type: ChangeType;
  title: string;
  category: string;
  originalAmount: number | null;
  newAmount: number | null;
  amountDifference: number | null;
  originalEvidence: string;
  newEvidence: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  confidence: number;
  consumerImpact: string;
}

/**
 * Compare findings from two document analyses.
 * @param before - Findings from the earlier document (quote/estimate/previous bill)
 * @param after - Findings from the later document (contract/final bill/renewal)
 */
export function detectChanges(
  before: VerifiedFinding[],
  after: VerifiedFinding[],
): DetectedChange[] {
  const beforeActive = before.filter(f => !f.suppressed);
  const afterActive = after.filter(f => !f.suppressed);
  
  const changes: DetectedChange[] = [];

  // Track matches
  const matchedBefore = new Set<string>();
  const matchedAfter = new Set<string>();

  // Step 1: Find matches (same item in both documents)
  for (const b of beforeActive) {
    for (const a of afterActive) {
      if (matchedAfter.has(a.id)) continue;
      
      const isMatch = isSameItem(b, a);
      
      if (isMatch) {
        matchedBefore.add(b.id);
        matchedAfter.add(a.id);
        
        // Detect what changed
        if (b.amount !== a.amount && b.amount !== null && a.amount !== null) {
          changes.push({
            type: 'changed_amount',
            title: b.title,
            category: b.category,
            originalAmount: b.amount,
            newAmount: a.amount,
            amountDifference: a.amount - b.amount,
            originalEvidence: b.evidenceQuote,
            newEvidence: a.evidenceQuote,
            severity: a.amount > b.amount
              ? (a.amount - b.amount > 500 ? 'high' : 'medium')
              : 'info',
            confidence: Math.min(b.confidenceScore, a.confidenceScore),
            consumerImpact: a.amount > b.amount
              ? `This fee increased by $${(a.amount - b.amount).toLocaleString()} compared to the original document.`
              : `This fee decreased by $${(b.amount - a.amount).toLocaleString()} from the original.`,
          });
        } else if (b.evidenceQuote !== a.evidenceQuote) {
          changes.push({
            type: 'changed_wording',
            title: b.title,
            category: b.category,
            originalAmount: b.amount,
            newAmount: a.amount,
            amountDifference: null,
            originalEvidence: b.evidenceQuote,
            newEvidence: a.evidenceQuote,
            severity: 'medium',
            confidence: Math.min(b.confidenceScore, a.confidenceScore),
            consumerImpact: 'The wording of this item has changed. Review the new language carefully.',
          });
        } else {
          changes.push({
            type: 'unchanged',
            title: b.title,
            category: b.category,
            originalAmount: b.amount,
            newAmount: a.amount,
            amountDifference: null,
            originalEvidence: b.evidenceQuote,
            newEvidence: a.evidenceQuote,
            severity: 'low',
            confidence: Math.min(b.confidenceScore, a.confidenceScore),
            consumerImpact: 'This item appears unchanged between documents.',
          });
        }
        break;
      }
    }
  }

  // Step 2: Items only in AFTER (added)
  for (const a of afterActive) {
    if (!matchedAfter.has(a.id)) {
      changes.push({
        type: 'added',
        title: a.title,
        category: a.category,
        originalAmount: null,
        newAmount: a.amount,
        amountDifference: a.amount,
        originalEvidence: '',
        newEvidence: a.evidenceQuote,
        severity: a.amount && a.amount > 100 ? 'high' : 'medium',
        confidence: a.confidenceScore,
        consumerImpact: a.amount
          ? `New fee of $${a.amount.toLocaleString()} added that was not in the original document.`
          : 'New item added that was not in the original document.',
      });
    }
  }

  // Step 3: Items only in BEFORE (removed)
  for (const b of beforeActive) {
    if (!matchedBefore.has(b.id)) {
      changes.push({
        type: 'removed',
        title: b.title,
        category: b.category,
        originalAmount: b.amount,
        newAmount: null,
        amountDifference: b.amount ? -b.amount : null,
        originalEvidence: b.evidenceQuote,
        newEvidence: '',
        severity: 'info',
        confidence: b.confidenceScore,
        consumerImpact: b.amount
          ? `Fee of $${b.amount.toLocaleString()} from the original document is no longer present.`
          : 'Item from the original is no longer present.',
      });
    }
  }

  // Sort: most impactful changes first
  changes.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return changes;
}

/**
 * Determine if two findings refer to the same underlying item.
 */
function isSameItem(a: VerifiedFinding, b: VerifiedFinding): boolean {
  // Exact title match
  if (a.title.toLowerCase() === b.title.toLowerCase()) return true;
  
  // Same category + similar title
  if (a.category === b.category) {
    const titleOverlap = tokenOverlap(a.title, b.title);
    if (titleOverlap > 0.6) return true;
  }
  
  // Same amount + similar evidence
  if (a.amount !== null && b.amount !== null && Math.abs(a.amount - b.amount) < 0.01) {
    const evidenceOverlap = tokenOverlap(
      a.evidenceQuote.slice(0, 100),
      b.evidenceQuote.slice(0, 100),
    );
    if (evidenceOverlap > 0.5) return true;
  }
  
  return false;
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let overlap = 0;
  for (const t of tokensA) { if (tokensB.has(t)) overlap++; }
  return overlap / Math.min(tokensA.size, tokensB.size);
}

/**
 * Generate a human-readable comparison summary.
 */
export function summarizeChanges(changes: DetectedChange[]): {
  added: number;
  removed: number;
  changed: number;
  netFinancialChange: number;
  summary: string;
  topChanges: DetectedChange[];
} {
  const added = changes.filter(c => c.type === 'added');
  const removed = changes.filter(c => c.type === 'removed');
  const changed = changes.filter(c => c.type === 'changed_amount' || c.type === 'changed_wording');
  
  const netFinancial = changes.reduce((sum, c) => sum + (c.amountDifference || 0), 0);

  const summaryParts: string[] = [];
  if (added.length > 0) summaryParts.push(`${added.length} new fee(s) added`);
  if (removed.length > 0) summaryParts.push(`${removed.length} fee(s) removed`);
  if (changed.length > 0) summaryParts.push(`${changed.length} item(s) changed`);

  return {
    added: added.length,
    removed: removed.length,
    changed: changed.length,
    netFinancialChange: netFinancial,
    summary: summaryParts.length > 0
      ? summaryParts.join(', ') + `. Net financial impact: $${netFinancial.toLocaleString()}.`
      : 'No significant changes detected between documents.',
    topChanges: changes.filter(c => c.severity === 'critical' || c.severity === 'high').slice(0, 5),
  };
}