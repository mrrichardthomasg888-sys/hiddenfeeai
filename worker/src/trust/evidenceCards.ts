import type { VerifiedFinding, StructuredDocument } from "../types.js";

/**
 * Evidence Card System
 * 
 * Every finding gets a structured evidence card showing:
 * - Exact location (page, section)
 * - Direct quote from the document
 * - Why it was flagged
 * - Verification status
 * 
 * "Show me exactly where this came from."
 */

export interface EvidenceCard {
  findingId: string;
  title: string;
  category: string;
  severity: string;
  sourceReference: {
    page: number | null;
    section: string | null;
    quote: string;
    quoteContext: string;
  };
  detectedValue: string;
  reasonFlagged: string;
  confidence: {
    score: number;
    tier: string;
    explanation: string;
  };
  verification: {
    status: 'verified' | 'partially_matched' | 'not_found' | 'suppressed';
    matchScore: number;
    note: string;
  };
  transparency: {
    isAiGenerated: boolean;
    evidenceFound: boolean;
    humanReviewRecommended: boolean;
  };
}

/**
 * Generate evidence cards for all verified findings.
 */
export function generateEvidenceCards(
  findings: VerifiedFinding[],
  doc: StructuredDocument,
): EvidenceCard[] {
  return findings.map(f => buildCard(f, doc));
}

function buildCard(f: VerifiedFinding, doc: StructuredDocument): EvidenceCard {
  // Find surrounding context for the evidence quote
  const quoteContext = findQuoteContext(f.evidenceQuote, doc);

  return {
    findingId: f.id,
    title: f.title,
    category: f.category,
    severity: f.severity,
    sourceReference: {
      page: f.page,
      section: f.sectionHeading,
      quote: f.evidenceQuote,
      quoteContext,
    },
    detectedValue: f.amount != null ? `$${f.amount.toLocaleString()}` : 'Non-monetary finding',
    reasonFlagged: buildReasonFlagged(f),
    confidence: {
      score: f.confidenceScore,
      tier: f.confidenceTier,
      explanation: buildConfidenceExplanation(f),
    },
    verification: {
      status: f.suppressed ? 'suppressed' :
        f.evidencePresent && f.evidenceMatchScore >= 0.85 ? 'verified' :
        f.evidencePresent ? 'partially_matched' : 'not_found',
      matchScore: f.evidenceMatchScore,
      note: f.verificationNotes,
    },
    transparency: {
      isAiGenerated: f.sourceAnalyzer !== 'benchmark',
      evidenceFound: f.evidencePresent,
      humanReviewRecommended: f.confidenceScore < 85 || !f.evidencePresent,
    },
  };
}

function findQuoteContext(quote: string, doc: StructuredDocument): string {
  if (!quote || quote.length < 10) return 'No context available';
  
  const normalized = quote.replace(/\s+/g, ' ').trim().toLowerCase();
  
  // Search in document markdown for surrounding context
  const docText = doc.markdown.toLowerCase();
  const idx = docText.indexOf(normalized.slice(0, 30));
  
  if (idx !== -1) {
    const start = Math.max(0, idx - 80);
    const end = Math.min(docText.length, idx + normalized.length + 80);
    const context = docText.slice(start, end);
    return (start > 0 ? '...' : '') + context.trim() + (end < docText.length ? '...' : '');
  }
  
  return quote; // Fallback: just show the quote itself
}

function buildReasonFlagged(f: VerifiedFinding): string {
  const reasons: string[] = [];
  
  if (f.category === 'Hidden Fee' || f.category === 'Fee') {
    reasons.push('Fee identified that may not be included in advertised price');
  }
  if (f.category === 'Contract Risk' || f.category === 'Clause Risk') {
    reasons.push('Clause detected that may limit consumer rights or increase obligations');
  }
  if (f.amount && f.amount > 100) {
    reasons.push(`Significant financial amount detected: $${f.amount.toLocaleString()}`);
  }
  if (f.severity === 'Critical') {
    reasons.push('Highest severity — may significantly affect your rights or finances');
  }
  if (!f.evidencePresent) {
    reasons.push('⚠️ Evidence could not be verified in the source document');
  }
  
  return reasons.length > 0 ? reasons.join('. ') : `Flagged by automated analysis`;
}

function buildConfidenceExplanation(f: VerifiedFinding): string {
  const parts: string[] = [];
  
  if (f.evidencePresent && f.evidenceMatchScore >= 0.9) {
    parts.push('✓ Exact evidence match found in document');
  } else if (f.evidencePresent) {
    parts.push('✓ Evidence partially matched in document');
  } else {
    parts.push('✗ Evidence could not be located in source text');
  }
  
  if (f.amount != null) {
    parts.push('Amount extracted from document');
  }
  
  if (f.page != null) {
    parts.push(`Location verified: Page ${f.page}`);
  }
  
  if (f.confidenceScore >= 95) parts.push('Very high confidence');
  else if (f.confidenceScore >= 85) parts.push('High confidence');
  else parts.push('Moderate confidence — human review recommended');
  
  return parts.join('. ');
}

/**
 * Generate a transparency summary of the analysis process.
 */
export function generateTransparencySummary(result: {
  verifiedFindings: VerifiedFinding[];
  suppressedCount: number;
  overallConfidence: number;
}): {
  totalProcessed: number;
  evidenceVerified: number;
  evidenceNotFound: number;
  suppressed: number;
  aiGenerated: boolean;
  recommendedAction: string;
} {
  const vf = result.verifiedFindings;
  
  return {
    totalProcessed: vf.length,
    evidenceVerified: vf.filter(f => f.evidencePresent && !f.suppressed).length,
    evidenceNotFound: vf.filter(f => !f.evidencePresent).length,
    suppressed: result.suppressedCount,
    aiGenerated: true,
    recommendedAction: result.overallConfidence < 70
      ? 'Lower confidence analysis. Consider having a human expert review this document for additional insights.'
      : 'Analysis passed verification. Findings are supported by document evidence.',
  };
}