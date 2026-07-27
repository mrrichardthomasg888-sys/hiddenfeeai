import type {
  VerifiedFinding,
  DecisionResult,
  ExecutiveSummary,
  AuditReport,
  StructuredDocument,
  VerificationResult,
  RiskAssessmentResult,
  FinancialImpactResult,
  NegotiationResult,
  FeeDetectionResult,
  ClauseAnalysisResult,
} from "../types.js";

/**
 * Decision Engine
 * 
 * The final intelligence layer before reporting.
 * 
 * Responsibilities:
 * 1. Merge duplicate findings from multiple analyzers
 * 2. Resolve conflicting findings (e.g., FeeDetector says $50, ClauseAnalyzer says $75)
 * 3. Rank findings by importance (severity × confidence × amount)
 * 4. Calculate overall risk score
 * 5. Calculate financial impact
 * 6. Generate executive summary
 * 
 * This is the LAST processing step before the report is generated.
 * All findings must have passed through verification first.
 */

// ─── Finding deduplication ───

interface DuplicateGroup {
  canonical: VerifiedFinding;
  duplicates: VerifiedFinding[];
}

/**
 * Group duplicate findings that refer to the same thing.
 * Two findings are duplicates if they share:
 * - Same category AND
 * - Similar title (token overlap > 60%) OR similar evidence quote OR same amount
 */
function groupDuplicates(findings: VerifiedFinding[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const assigned = new Set<string>();

  for (const finding of findings) {
    if (assigned.has(finding.id)) continue;

    const group: VerifiedFinding[] = [finding];
    assigned.add(finding.id);

    for (const other of findings) {
      if (assigned.has(other.id)) continue;
      if (other.category !== finding.category) continue;

      // Check similarity
      const sameAmount = finding.amount !== null && other.amount !== null &&
        Math.abs(finding.amount - other.amount) < 0.01;
      
      const titleOverlap = tokenOverlap(finding.title, other.title);
      const evidenceOverlap = tokenOverlap(
        finding.evidenceQuote.slice(0, 100),
        other.evidenceQuote.slice(0, 100)
      );

      const isDuplicate = sameAmount || titleOverlap > 0.6 || evidenceOverlap > 0.7;

      if (isDuplicate) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    // Pick the canonical finding (highest confidence, most detailed)
    const canonical = selectCanonical(group);
    groups.push({ canonical, duplicates: group.filter(f => f.id !== canonical.id) });
  }

  return groups;
}

function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(t => t.length > 2));
  
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap++;
  }
  
  return overlap / Math.min(tokensA.size, tokensB.size);
}

function selectCanonical(group: VerifiedFinding[]): VerifiedFinding {
  if (group.length === 1) return group[0];
  
  // Sort by: not suppressed first, then highest confidence, then most detail
  return group.sort((a, b) => {
    if (a.suppressed !== b.suppressed) return a.suppressed ? 1 : -1;
    if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore;
    const aDetail = a.evidenceQuote.length + (a.negotiationMessage?.length ?? 0);
    const bDetail = b.evidenceQuote.length + (b.negotiationMessage?.length ?? 0);
    return bDetail - aDetail;
  })[0];
}

// ─── Finding ranking ───

/**
 * Calculate an importance score for a finding.
 * Higher = more important (should appear first in reports).
 */
function importanceScore(finding: VerifiedFinding): number {
  const severityWeight = {
    Critical: 10,
    High: 7,
    Medium: 4,
    Low: 2,
  }[finding.severity] ?? 1;

  const confidenceWeight = finding.confidenceScore / 100;
  const amountWeight = finding.amount ? Math.min(Math.log10(finding.amount + 1) / 5, 1) : 0.3;

  return severityWeight * confidenceWeight * (0.5 + amountWeight);
}

/**
 * Rank findings by importance.
 */
function rankFindings(findings: VerifiedFinding[]): VerifiedFinding[] {
  return [...findings].sort((a, b) => importanceScore(b) - importanceScore(a));
}

// ─── Risk score calculation ───

interface RiskScoreInput {
  findings: VerifiedFinding[];
  riskAssessment?: RiskAssessmentResult;
  financialImpact?: FinancialImpactResult;
  documentMeta?: { pageCount: number };
}

function calculateRiskScore(input: RiskScoreInput): {
  score: number;
  level: AuditReport['risk_level'];
  breakdown: Record<string, number>;
} {
  const { findings, riskAssessment, financialImpact, documentMeta } = input;
  const nonSuppressed = findings.filter(f => !f.suppressed);

  let score = 0;
  const breakdown: Record<string, number> = {};

  // Factor 1: Number of findings (0-20 points)
  const findingCountScore = Math.min(nonSuppressed.length * 3, 20);
  score += findingCountScore;
  breakdown.findingCount = findingCountScore;

  // Factor 2: Severity distribution (0-30 points)
  const severityScore = nonSuppressed.reduce((acc, f) => {
    const weights = { Critical: 10, High: 6, Medium: 3, Low: 1 };
    return acc + (weights[f.severity] ?? 0);
  }, 0);
  const normalizedSeverity = Math.min(severityScore / Math.max(nonSuppressed.length, 1), 10) * 3;
  score += Math.min(normalizedSeverity, 30);
  breakdown.severity = Math.min(normalizedSeverity, 30);

  // Factor 3: Financial exposure (0-25 points)
  const totalAmount = nonSuppressed.reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const amountScore = totalAmount > 10000 ? 25 :
    totalAmount > 5000 ? 20 :
    totalAmount > 1000 ? 15 :
    totalAmount > 100 ? 10 :
    totalAmount > 0 ? 5 : 0;
  score += amountScore;
  breakdown.financialExposure = amountScore;

  // Factor 4: Contract risks (0-15 points)
  const contractRisks = nonSuppressed.filter(f =>
    f.category === 'Contract Risk' || f.category === 'Clause Risk'
  );
  const contractScore = Math.min(contractRisks.length * 5, 15);
  score += contractScore;
  breakdown.contractRisks = contractScore;

  // Factor 5: Confidence erosion (0-10 points added to risk)
  // Low confidence findings that still passed = higher uncertainty = higher risk
  const lowConfidenceCount = nonSuppressed.filter(f => f.confidenceScore < 85).length;
  const uncertaintyBonus = Math.min(lowConfidenceCount * 2, 10);
  score += uncertaintyBonus;
  breakdown.uncertainty = uncertaintyBonus;

  // Clamp and determine level
  score = Math.round(Math.min(score, 100));

  let level: AuditReport['risk_level'];
  if (score <= 25) level = 'Low';
  else if (score <= 50) level = 'Review Recommended';
  else if (score <= 75) level = 'Elevated';
  else level = 'High';

  return { score, level, breakdown };
}

// ─── Financial impact calculation ───

function calculateFinancialImpact(
  findings: VerifiedFinding[],
  financialImpactResult?: FinancialImpactResult,
): AuditReport['financial_impact'] {
  const nonSuppressed = findings.filter(f => !f.suppressed);
  
  const questionableCharges = nonSuppressed
    .filter(f => f.amount !== null)
    .reduce((sum, f) => sum + (f.amount ?? 0), 0);

  // If we have a detailed financial impact from the analyzer, use it
  if (financialImpactResult) {
    return {
      original_total: financialImpactResult.oneTimeCharges + financialImpactResult.totalFirstYear,
      questionable_charges_total: financialImpactResult.questionableCharges,
      corrected_total: (financialImpactResult.oneTimeCharges + financialImpactResult.totalFirstYear) - 
                       financialImpactResult.questionableCharges,
    };
  }

  // Otherwise, estimate from findings
  return {
    original_total: questionableCharges,
    questionable_charges_total: questionableCharges,
    corrected_total: 0,
  };
}

// ─── Executive summary generation ───

function generateExecutiveSummary(
  findings: VerifiedFinding[],
  riskScore: number,
  riskLevel: AuditReport['risk_level'],
  financialImpact: AuditReport['financial_impact'],
  doc: StructuredDocument,
): ExecutiveSummary {
  const nonSuppressed = findings.filter(f => !f.suppressed);
  const ranked = rankFindings(nonSuppressed);

  const hiddenFees = nonSuppressed.filter(f => f.category === 'Hidden Fee' || f.category === 'Fee');
  const contractRisks = nonSuppressed.filter(f => f.category === 'Contract Risk' || f.category === 'Clause Risk');
  const negotiationOpps = nonSuppressed.filter(f => f.negotiationMessage || f.recommendedAction);
  const recurringFees = nonSuppressed.filter(f =>
    f.explanation.toLowerCase().includes('recurring') ||
    f.explanation.toLowerCase().includes('monthly') ||
    f.explanation.toLowerCase().includes('annual') ||
    f.whyItMatters.toLowerCase().includes('recurring')
  );

  const estimatedRecurring = recurringFees.reduce((sum, f) => sum + (f.amount ?? 0), 0);

  const overallConfidence = nonSuppressed.length > 0
    ? Math.round(nonSuppressed.reduce((s, f) => s + f.confidenceScore, 0) / nonSuppressed.length)
    : 0;

  return {
    riskScore,
    riskLevel,
    totalFeesFound: hiddenFees.length,
    estimatedHiddenCharges: financialImpact.questionable_charges_total,
    estimatedRecurringCosts: estimatedRecurring,
    negotiationOpportunities: negotiationOpps.length,
    highRiskClauses: contractRisks.filter(f => f.severity === 'High' || f.severity === 'Critical').length,
    overallConfidence,
    topFindings: ranked.slice(0, 5),
  };
}

// ─── Main decision function ───

export interface DecisionInput {
  structuredDocument: StructuredDocument;
  feeDetection?: FeeDetectionResult;
  clauseAnalysis?: ClauseAnalysisResult;
  riskAssessment?: RiskAssessmentResult;
  negotiationResult?: NegotiationResult;
  financialImpact?: FinancialImpactResult;
  verificationResult?: VerificationResult;
}

/**
 * Run the decision engine on all verified findings.
 * This produces the final DecisionResult ready for report generation.
 */
export function runDecisionEngine(input: DecisionInput): DecisionResult {
  const {
    structuredDocument,
    feeDetection,
    clauseAnalysis,
    riskAssessment,
    negotiationResult,
    financialImpact,
    verificationResult,
  } = input;

  // ── Step 1: Collect all findings from all analyzers ──
  const allFindings: VerifiedFinding[] = [];

  // If we have verification results, use verified findings
  if (verificationResult) {
    allFindings.push(...verificationResult.verifiedFindings);
  } else {
    // Fallback: use raw findings (pre-verification — not recommended)
    if (feeDetection?.fees) {
      allFindings.push(...feeDetection.fees.map(f => ({
        ...f,
        evidencePresent: true,
        evidenceMatchScore: 1,
        verificationNotes: 'Not verified (verification engine not run)',
        suppressed: false,
      })));
    }
    if (clauseAnalysis?.clauses) {
      allFindings.push(...clauseAnalysis.clauses.map(f => ({
        ...f,
        evidencePresent: true,
        evidenceMatchScore: 1,
        verificationNotes: 'Not verified (verification engine not run)',
        suppressed: false,
      })));
    }
    if (negotiationResult?.opportunities) {
      allFindings.push(...negotiationResult.opportunities.map(f => ({
        ...f,
        evidencePresent: true,
        evidenceMatchScore: 1,
        verificationNotes: 'Not verified (verification engine not run)',
        suppressed: false,
      })));
    }
  }

  console.log(`[DecisionEngine] Processing ${allFindings.length} total findings`);

  // ── Step 2: Deduplicate findings ──
  const groups = groupDuplicates(allFindings.filter(f => !f.suppressed));
  const mergedFindings = groups.map(g => g.canonical);
  
  console.log(
    `[DecisionEngine] Deduplication: ${allFindings.length} → ${mergedFindings.length} unique ` +
    `(${allFindings.length - mergedFindings.length} duplicates merged)`
  );

  // ── Step 3: Calculate risk score ──
  const riskResult = calculateRiskScore({
    findings: mergedFindings,
    riskAssessment,
    financialImpact,
    documentMeta: { pageCount: structuredDocument.pageCount },
  });

  // ── Step 4: Calculate financial impact ──
  const finImpact = calculateFinancialImpact(mergedFindings, financialImpact);

  // ── Step 5: Categorize findings ──
  const categorizedFindings = {
    hiddenFees: mergedFindings.filter(f =>
      f.category === 'Hidden Fee' || f.category === 'Fee' ||
      f.title.toLowerCase().includes('fee')
    ),
    contractRisks: mergedFindings.filter(f =>
      f.category === 'Contract Risk' || f.category === 'Clause Risk' ||
      f.title.toLowerCase().includes('clause') || f.title.toLowerCase().includes('arbitration')
    ),
    mathErrors: mergedFindings.filter(f =>
      f.category === 'Math Error' || f.category === 'Billing Error' ||
      f.title.toLowerCase().includes('math') || f.title.toLowerCase().includes('calculation')
    ),
    duplicateCharges: mergedFindings.filter(f =>
      f.category === 'Duplicate Charge' ||
      f.title.toLowerCase().includes('duplicate')
    ),
    negotiationOpportunities: mergedFindings.filter(f =>
      f.negotiationMessage || f.recommendedAction ||
      f.category === 'Negotiation'
    ),
  };

  // ── Step 6: Generate executive summary ──
  const executiveSummary = generateExecutiveSummary(
    mergedFindings,
    riskResult.score,
    riskResult.level,
    finImpact,
    structuredDocument,
  );

  console.log(
    `[DecisionEngine] Complete: Risk ${riskResult.score}/100 (${riskResult.level}), ` +
    `${executiveSummary.totalFeesFound} fees, ${executiveSummary.negotiationOpportunities} negotiation opps`
  );

  return {
    executiveSummary,
    mergedFindings,
    categorizedFindings,
    financialImpact: financialImpact ?? {
      oneTimeCharges: finImpact.questionable_charges_total,
      monthlyRecurring: 0,
      annualRecurring: 0,
      totalFirstYear: 0,
      potentialSavings: 0,
      questionableCharges: finImpact.questionable_charges_total,
      breakdown: [],
      confidence: 0,
    },
    riskAssessment: riskAssessment ?? {
      riskScore: riskResult.score,
      riskLevel: riskResult.level,
      transparencyScore: 50,
      complexityScore: 50,
      consumerRiskScore: riskResult.score,
      financialExposureScore: finImpact.questionable_charges_total > 0 ? 70 : 30,
      missingDisclosures: [],
      confidence: 0,
    },
  };
}

// ─── Convert DecisionResult to AuditReport (backwards compatibility) ───

/**
 * Convert the new DecisionResult into the existing AuditReport format.
 * This ensures the existing PDF generator and frontend continue to work
 * with the upgraded pipeline output.
 */
export function toAuditReport(
  decision: DecisionResult,
  structuredDocument: StructuredDocument,
): AuditReport {
  const { executiveSummary, categorizedFindings, financialImpact, riskAssessment } = decision;

  // Convert VerifiedFinding[] to Finding[] (the existing format)
  const toFindings = (vfs: VerifiedFinding[]) =>
    vfs.map(f => ({
      id: f.id,
      title: f.title,
      category: f.category,
      severity: f.severity,
      status: f.suppressed ? 'needs_review' as const : f.confidenceTier === 'verified' ? 'confirmed' as const : 'possible' as const,
      confidence_score: f.confidenceScore,
      amount: f.amount,
      page: f.page,
      line_reference: f.sectionHeading ?? undefined,
      evidence: f.evidenceQuote,
      explanation: f.explanation,
      why_it_matters: f.whyItMatters,
      recommended_action: f.recommendedAction,
      negotiation_message: f.negotiationMessage,
      negotiation_strategy: f.negotiationStrategy,
    }));

  const allFindings = toFindings(decision.mergedFindings);

  return {
    document_meta: {
      document_type: structuredDocument.fileFormat,
      issuer: structuredDocument.metadata.author,
      analysis_date: new Date().toISOString(),
      pages_reviewed: structuredDocument.pageCount,
      line_items_reviewed: structuredDocument.elements.length,
      report_id: crypto.randomUUID(),
    },
    risk_score: executiveSummary.riskScore,
    risk_level: executiveSummary.riskLevel,
    potential_savings: financialImpact.potentialSavings || executiveSummary.estimatedHiddenCharges,
    confidence_level: executiveSummary.overallConfidence,
    financial_impact: {
      original_total: 0, // Will be populated from financial impact
      questionable_charges_total: executiveSummary.estimatedHiddenCharges,
      corrected_total: 0,
    },
    findings: allFindings,
    math_errors: toFindings(categorizedFindings.mathErrors),
    duplicate_charges: toFindings(categorizedFindings.duplicateCharges),
    hidden_fees: toFindings(categorizedFindings.hiddenFees),
    contract_risks: toFindings(categorizedFindings.contractRisks),
    clean_document_summary: {
      spending_breakdown: financialImpact.breakdown.map(b => ({
        category: b.category,
        amount: b.amount,
      })),
      cost_categories: financialImpact.breakdown.map(b => b.category),
      key_terms: categorizedFindings.contractRisks.slice(0, 5).map(f => f.title),
      negotiation_opportunities: categorizedFindings.negotiationOpportunities
        .filter(f => f.recommendedAction)
        .map(f => f.recommendedAction),
      questions_to_ask: categorizedFindings.negotiationOpportunities
        .filter(f => f.negotiationMessage)
        .map(f => f.negotiationMessage ?? ''),
      money_saving_suggestions: categorizedFindings.hiddenFees
        .filter(f => f.recommendedAction)
        .map(f => f.recommendedAction),
    },
  };
}