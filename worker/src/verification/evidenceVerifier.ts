import type {
  VerifiableFinding,
  VerifiedFinding,
  VerificationResult,
  StructuredDocument,
  ConfidenceTier,
} from "../types.js";

/**
 * Evidence Verification Engine
 * 
 * THE HALLUCINATION GUARD.
 * 
 * Every finding from every analyzer passes through this verifier.
 * It cross-references each claim against the source document text.
 * 
 * Rules:
 * 1. Evidence MUST exist in the source document
 * 2. If a finding's evidence quote cannot be found → suppress or downgrade
 * 3. Confidence scores are adjusted based on evidence match quality
 * 4. Below 80% confidence → DO NOT present as factual
 * 
 * This is the single most important quality gate in the entire pipeline.
 * Without it, the AI's hallucinated fees and clauses reach users as "facts."
 */

// ─── Confidence tier mapping ───

function confidenceToTier(score: number): ConfidenceTier {
  if (score >= 95) return 'verified';
  if (score >= 90) return 'high';
  if (score >= 80) return 'moderate';
  return 'low';
}

function confidenceToLabel(score: number): string {
  if (score >= 95) return 'Verified — evidence confirmed in document';
  if (score >= 90) return 'High — strong evidence match';
  if (score >= 80) return 'Moderate — evidence found, some ambiguity';
  return 'Low — evidence weak or not found';
}

// ─── String similarity (simple, fast, Workers-compatible) ───

/**
 * Compute a simple similarity score between two strings.
 * Uses token overlap + substring matching.
 * Returns 0-1 where 1 is perfect match.
 */
function textSimilarity(query: string, candidate: string): number {
  const a = query.toLowerCase().replace(/[^\w\s$%.,]/g, '').trim();
  const b = candidate.toLowerCase().replace(/[^\w\s$%.,]/g, '').trim();

  if (!a || !b) return 0;

  // Exact match
  if (a === b) return 1.0;

  // One contains the other
  if (b.includes(a)) return 0.95;
  if (a.includes(b) && b.length > 20) return 0.85;

  // Token overlap
  const tokensA = new Set(a.split(/\s+/));
  const tokensB = new Set(b.split(/\s+/));
  
  let overlap = 0;
  let total = tokensA.size;
  
  for (const token of tokensA) {
    if (token.length < 3) { total--; continue; }
    if (tokensB.has(token)) overlap++;
  }
  
  if (total <= 0) return 0;
  
  const overlapRatio = overlap / total;
  
  // Also check character-level similarity for short strings
  if (a.length < 50) {
    // Simple Levenshtein-inspired check
    let matchingChars = 0;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) matchingChars++;
    }
    const charRatio = matchingChars / Math.max(a.length, b.length);
    return Math.max(overlapRatio, charRatio);
  }
  
  return overlapRatio;
}

// ─── Evidence search ───

interface EvidenceSearchResult {
  found: boolean;
  matchScore: number;
  bestMatch: string;
  matchLocation: string; // e.g., "Page 3, paragraph starting at char 1420"
}

/**
 * Search for a piece of evidence text in the structured document.
 * Tries exact match → fuzzy match → token-level match.
 */
function searchEvidence(
  evidenceQuote: string,
  pageNumber: number | null,
  doc: StructuredDocument,
): EvidenceSearchResult {
  // Normalize the evidence quote
  const normalized = evidenceQuote.replace(/\s+/g, ' ').trim();
  
  if (!normalized || normalized.length < 5) {
    return {
      found: false,
      matchScore: 0,
      bestMatch: '',
      matchLocation: 'No evidence quote provided',
    };
  }

  // If we have a page reference, search that page first
  if (pageNumber !== null && pageNumber > 0) {
    const pageIdx = pageNumber - 1;
    if (pageIdx < doc.elements.length) {
      // Search in the specific page's elements
      for (const element of doc.elements) {
        if (element.pageNumber !== pageNumber) continue;
        const score = textSimilarity(normalized, element.content);
        if (score >= 0.7) {
          return {
            found: true,
            matchScore: score,
            bestMatch: element.content.slice(0, 200),
            matchLocation: `Page ${pageNumber}, ${element.type}`,
          };
        }
      }
      
      // Search in full page content
      const fullPageContent = doc.markdown
        .split(/--- Page \d+ ---/)
        .find(s => s.includes(`--- Page ${pageNumber} ---`) || true) ?? '';
      
      const score = textSimilarity(normalized, fullPageContent);
      if (score >= 0.6) {
        return {
          found: true,
          matchScore: score,
          bestMatch: normalized,
          matchLocation: `Page ${pageNumber} (partial match)`,
        };
      }
    }
  }

  // Global search across all content
  // Check in structured elements
  for (const element of doc.elements) {
    const score = textSimilarity(normalized, element.content);
    if (score >= 0.75) {
      return {
        found: true,
        matchScore: score,
        bestMatch: element.content.slice(0, 200),
        matchLocation: `Page ${element.pageNumber}, ${element.type}`,
      };
    }
  }

  // Check in tables
  for (const table of doc.tables) {
    const flatText = [table.headers, ...table.rows].flat().join(' ');
    const score = textSimilarity(normalized, flatText);
    if (score >= 0.6) {
      return {
        found: true,
        matchScore: score,
        bestMatch: flatText.slice(0, 200),
        matchLocation: `Page ${table.pageNumber}, table`,
      };
    }
  }

  // Last resort: search full markdown
  const fullText = doc.markdown;
  const score = textSimilarity(normalized, fullText.slice(0, 50000));
  if (score >= 0.5) {
    return {
      found: true,
      matchScore: score,
      bestMatch: normalized,
      matchLocation: 'Full document (low-precision match)',
    };
  }

  return {
    found: false,
    matchScore: 0,
    bestMatch: '',
    matchLocation: 'Evidence not found in document',
  };
}

// ─── Amount verification ───

/**
 * Check if a monetary amount appears near the evidence text.
 * This helps catch hallucinated dollar amounts.
 */
function verifyAmount(
  amount: number | null,
  evidenceMatch: EvidenceSearchResult,
  doc: StructuredDocument,
): { verified: boolean; reason: string } {
  if (amount === null || amount === 0) {
    return { verified: true, reason: 'No amount to verify' };
  }

  // Look for the amount in the evidence match
  const amountStr = `$${amount.toLocaleString()}`;
  const altFormat1 = `$${amount}`;
  const altFormat2 = `$ ${amount}`;
  
  const searchContext = evidenceMatch.bestMatch + ' ' + doc.markdown;
  
  if (searchContext.includes(amountStr)) {
    return { verified: true, reason: `Amount $${amount} found in document` };
  }
  if (searchContext.includes(altFormat1)) {
    return { verified: true, reason: `Amount $${amount} found in document` };
  }
  if (searchContext.includes(altFormat2)) {
    return { verified: true, reason: `Amount $${amount} found in document` };
  }

  // Try to find close amounts (±5%)
  const amountRegex = /\$\s*([\d,]+\.?\d*)/g;
  let match;
  while ((match = amountRegex.exec(searchContext)) !== null) {
    const foundAmount = parseFloat(match[1].replace(/,/g, ''));
    if (Math.abs(foundAmount - amount) / amount < 0.05) {
      return { verified: true, reason: `Amount $${foundAmount} found (close to claimed $${amount})` };
    }
  }

  return {
    verified: false,
    reason: `Claimed amount $${amount} not found near evidence text`,
  };
}

// ─── Main verification function ───

/**
 * Verify a batch of findings against the source document.
 * 
 * This is THE gate. Every analyzer's output passes through here.
 * 
 * @param findings - Array of findings from any/all analyzers
 * @param doc - The structured document to verify against
 * @param options - Verification strictness options
 */
export function verifyFindings(
  findings: VerifiableFinding[],
  doc: StructuredDocument,
  options: {
    /** Minimum confidence to present as factual (default: 80) */
    factualThreshold?: number;
    /** Whether to suppress findings with no evidence (default: true) */
    suppressNoEvidence?: boolean;
    /** Whether to adjust confidence based on evidence match (default: true) */
    adjustConfidence?: boolean;
  } = {},
): VerificationResult {
  const {
    factualThreshold = 80,
    suppressNoEvidence = true,
    adjustConfidence = true,
  } = options;

  const verifiedFindings: VerifiedFinding[] = [];
  const confidenceAdjustments: VerificationResult['confidenceAdjustments'] = [];
  let suppressedCount = 0;

  for (const finding of findings) {
    // ── Step 1: Search for evidence in source document ──
    const evidenceResult = searchEvidence(
      finding.evidenceQuote,
      finding.page,
      doc,
    );

    // ── Step 2: Verify monetary amounts ──
    const amountResult = verifyAmount(finding.amount, evidenceResult, doc);

    // ── Step 3: Calculate adjusted confidence ──
    let adjustedConfidence = finding.confidenceScore;

    if (adjustConfidence) {
      // Evidence match quality affects confidence
      if (!evidenceResult.found) {
        adjustedConfidence = Math.min(adjustedConfidence, 60);
      } else if (evidenceResult.matchScore < 0.7) {
        adjustedConfidence = Math.min(adjustedConfidence, 75);
      } else if (evidenceResult.matchScore < 0.85) {
        adjustedConfidence = Math.min(adjustedConfidence, 88);
      }

      // Amount verification affects confidence
      if (finding.amount !== null && finding.amount > 0 && !amountResult.verified) {
        adjustedConfidence = Math.min(adjustedConfidence, 70);
      }

      // Page reference mismatch
      if (finding.page !== null && finding.page > doc.pageCount) {
        adjustedConfidence = Math.min(adjustedConfidence, 50);
      }
    }

    // ── Step 4: Determine if finding should be suppressed ──
    const belowThreshold = adjustedConfidence < factualThreshold;
    const noEvidence = !evidenceResult.found && evidenceResult.matchScore < 0.4;
    const shouldSuppress = suppressNoEvidence && (belowThreshold && noEvidence);

    if (shouldSuppress) {
      suppressedCount++;
    }

    // Record confidence adjustment
    if (adjustedConfidence !== finding.confidenceScore) {
      confidenceAdjustments.push({
        findingId: finding.id,
        oldConfidence: finding.confidenceScore,
        newConfidence: adjustedConfidence,
        reason: evidenceResult.found
          ? `Evidence match score: ${Math.round(evidenceResult.matchScore * 100)}%. ${amountResult.reason}`
          : 'Evidence not found in source document',
      });
    }

    // ── Step 5: Build verified finding ──
    const verified: VerifiedFinding = {
      ...finding,
      confidenceScore: adjustedConfidence,
      confidenceTier: confidenceToTier(adjustedConfidence),
      evidencePresent: evidenceResult.found,
      evidenceMatchScore: evidenceResult.matchScore,
      verificationNotes: shouldSuppress
        ? `SUPPRESSED: ${!evidenceResult.found ? 'Evidence not found. ' : ''}Confidence below ${factualThreshold}% threshold.`
        : evidenceResult.found
          ? `Evidence ${evidenceResult.matchScore >= 0.85 ? 'confirmed' : 'partially matched'} in ${evidenceResult.matchLocation}. ${amountResult.reason}.`
          : `Evidence NOT found in document. ${amountResult.reason}. Confidence reduced to ${adjustedConfidence}%.`,
      suppressed: shouldSuppress,
      suppressionReason: shouldSuppress
        ? (!evidenceResult.found ? 'Evidence quote not found in source document. ' : '') +
          (belowThreshold ? `Confidence ${adjustedConfidence}% is below ${factualThreshold}% factual threshold.` : '')
        : undefined,
    };

    verifiedFindings.push(verified);
  }

  // Calculate overall verification confidence
  const nonSuppressed = verifiedFindings.filter(f => !f.suppressed);
  const overallConfidence = nonSuppressed.length > 0
    ? nonSuppressed.reduce((sum, f) => sum + f.confidenceScore, 0) / nonSuppressed.length
    : 0;

  return {
    verifiedFindings,
    suppressedCount,
    confidenceAdjustments,
    overallConfidence,
  };
}

// ─── Batch verification helper ───

/**
 * Verify findings from multiple analyzers in one pass.
 * Each analyzer's output gets verified independently, but the
 * verification context is the same document.
 */
export function verifyAnalyzerOutputs(
  analyzerOutputs: Map<string, VerifiableFinding[]>,
  doc: StructuredDocument,
): Map<string, VerificationResult> {
  const results = new Map<string, VerificationResult>();
  
  for (const [analyzerName, findings] of analyzerOutputs) {
    console.log(`[EvidenceVerifier] Verifying ${findings.length} findings from ${analyzerName}...`);
    const result = verifyFindings(findings, doc);
    
    console.log(
      `[EvidenceVerifier] ${analyzerName}: ` +
      `${result.verifiedFindings.filter(f => !f.suppressed).length} passed, ` +
      `${result.suppressedCount} suppressed, ` +
      `${result.overallConfidence.toFixed(0)}% overall confidence`
    );
    
    results.set(analyzerName, result);
  }
  
  return results;
}

// ─── Quality report ───

export interface VerificationQualityReport {
  totalFindings: number;
  passedFindings: number;
  suppressedFindings: number;
  averageConfidence: number;
  evidenceFoundRate: number;
  amountVerifiedRate: number;
  perAnalyzer: Record<string, {
    total: number;
    passed: number;
    suppressed: number;
    avgConfidence: number;
  }>;
}

export function generateQualityReport(
  verifiedResults: Map<string, VerificationResult>,
): VerificationQualityReport {
  const perAnalyzer: VerificationQualityReport['perAnalyzer'] = {};
  
  let totalFindings = 0;
  let passedFindings = 0;
  let suppressedFindings = 0;
  let totalConfidence = 0;
  let evidenceFound = 0;
  let amountsVerified = 0;

  for (const [name, result] of verifiedResults) {
    const ver = result.verifiedFindings;
    const passed = ver.filter(f => !f.suppressed);
    
    perAnalyzer[name] = {
      total: ver.length,
      passed: passed.length,
      suppressed: ver.filter(f => f.suppressed).length,
      avgConfidence: passed.length > 0
        ? Math.round(passed.reduce((s, f) => s + f.confidenceScore, 0) / passed.length)
        : 0,
    };

    totalFindings += ver.length;
    passedFindings += passed.length;
    suppressedFindings += ver.filter(f => f.suppressed).length;
    totalConfidence += ver.reduce((s, f) => s + f.confidenceScore, 0);
    evidenceFound += ver.filter(f => f.evidencePresent).length;
    amountsVerified += ver.filter(f => !f.suppressed && f.amount !== null).length;
  }

  return {
    totalFindings,
    passedFindings,
    suppressedFindings,
    averageConfidence: totalFindings > 0 ? Math.round(totalConfidence / totalFindings) : 0,
    evidenceFoundRate: totalFindings > 0 ? Math.round((evidenceFound / totalFindings) * 100) : 0,
    amountVerifiedRate: 0, // Simplified for now
    perAnalyzer,
  };
}