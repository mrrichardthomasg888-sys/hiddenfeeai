import type { VerifiedFinding, StructuredDocument, VerificationResult } from "../types.js";
import { detectChanges, summarizeChanges } from "../comparison/changeDetector.js";

/**
 * Document Set Analyzer
 * 
 * Groups related documents and provides cross-document intelligence.
 * Use case: Contract + Invoice + Addendum + Receipt analyzed together.
 */

export interface DocumentSet {
  id: string;
  label: string;
  documents: AnalyzedDocument[];
}

export interface AnalyzedDocument {
  fileName: string;
  documentType: string;
  findings: VerifiedFinding[];
  structuredDoc: StructuredDocument;
  verification: VerificationResult;
  role: 'primary' | 'supporting' | 'addendum' | 'unknown';
}

export interface CrossDocumentFinding {
  type: 'conflict' | 'corroboration' | 'missing_info' | 'duplicate';
  title: string;
  description: string;
  documents: string[];
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
}

export interface SetAnalysisResult {
  setId: string;
  documentCount: number;
  totalFindings: number;
  uniqueFindings: number;
  conflicts: CrossDocumentFinding[];
  corroborations: CrossDocumentFinding[];
  missingInfo: CrossDocumentFinding[];
  combinedRiskScore: number;
  combinedRiskLevel: string;
  summary: string;
  recommendations: string[];
}

/**
 * Analyze a set of related documents.
 */
export function analyzeDocumentSet(
  documents: AnalyzedDocument[],
): SetAnalysisResult {
  const activeFindings = documents.flatMap(d => 
    d.findings.filter(f => !f.suppressed)
  );

  const conflicts = detectConflicts(documents);
  const corroborations = detectCorroborations(documents);
  const missingInfo = detectMissingInfo(documents);

  // Combined risk score (weighted average of individual risk indicators)
  const riskScores = documents.map(d => {
    const high = d.findings.filter(f => f.severity === 'High' || f.severity === 'Critical').length;
    const total = d.findings.filter(f => !f.suppressed).length;
    return total > 0 ? (high / total) * 100 : 0;
  });
  const combinedRiskScore = riskScores.length > 0
    ? Math.round(riskScores.reduce((s, v) => s + v, 0) / riskScores.length)
    : 0;

  const combinedRiskLevel = combinedRiskScore > 60 ? 'High' :
    combinedRiskScore > 30 ? 'Review Recommended' : 'Low';

  return {
    setId: crypto.randomUUID(),
    documentCount: documents.length,
    totalFindings: activeFindings.length,
    uniqueFindings: deduplicateAcrossDocuments(activeFindings).length,
    conflicts,
    corroborations,
    missingInfo,
    combinedRiskScore,
    combinedRiskLevel,
    summary: buildSetSummary(documents, conflicts, corroborations, missingInfo),
    recommendations: buildSetRecommendations(conflicts, missingInfo),
  };
}

function detectConflicts(docs: AnalyzedDocument[]): CrossDocumentFinding[] {
  const conflicts: CrossDocumentFinding[] = [];

  // Compare each pair of documents for conflicting amounts
  for (let i = 0; i < docs.length; i++) {
    for (let j = i + 1; j < docs.length; j++) {
      const changes = detectChanges(docs[i].findings, docs[j].findings);

      for (const change of changes) {
        if (change.type === 'changed_amount' && (change.amountDifference || 0) > 0) {
          conflicts.push({
            type: 'conflict',
            title: `Conflicting Amount: ${change.title}`,
            description: `"${change.title}" shows different amounts: ` +
              `$${change.originalAmount?.toLocaleString()} in "${docs[i].fileName}" ` +
              `vs $${change.newAmount?.toLocaleString()} in "${docs[j].fileName}"`,
            documents: [docs[i].fileName, docs[j].fileName],
            severity: change.amountDifference && change.amountDifference > 100 ? 'high' : 'medium',
            recommendation: `Clarify which amount is correct before proceeding. ` +
              `Ask why the amounts differ between these documents.`,
          });
        }
      }
    }
  }

  return conflicts;
}

function detectCorroborations(docs: AnalyzedDocument[]): CrossDocumentFinding[] {
  const findings: CrossDocumentFinding[] = [];

  // Find findings that appear in multiple documents (corroboration = stronger evidence)
  const allFindings = docs.flatMap(d =>
    d.findings.filter(f => !f.suppressed).map(f => ({ ...f, sourceDoc: d.fileName }))
  );

  const seen = new Map<string, string[]>();
  for (const f of allFindings) {
    const key = f.title.toLowerCase();
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(f.sourceDoc);
  }

  for (const [title, sourceDocs] of seen) {
    if (sourceDocs.length > 1) {
      findings.push({
        type: 'corroboration',
        title: `Confirmed: ${title}`,
        description: `This item appears in ${sourceDocs.length} documents, strengthening the evidence.`,
        documents: sourceDocs,
        severity: 'low',
        recommendation: 'No action needed — multiple documents confirm this finding.',
      });
    }
  }

  return findings;
}

function detectMissingInfo(docs: AnalyzedDocument[]): CrossDocumentFinding[] {
  const missing: CrossDocumentFinding[] = [];

  // Check if the primary document references items not in supporting docs
  const primary = docs.find(d => d.role === 'primary');
  if (primary) {
    const primaryFees = primary.findings.filter(f =>
      !f.suppressed && (f.category === 'Hidden Fee' || f.category === 'Fee')
    );

    for (const fee of primaryFees) {
      const inSupporting = docs
        .filter(d => d.role === 'supporting' || d.role === 'addendum')
        .some(d => d.structuredDoc.markdown.toLowerCase().includes(
          fee.title.toLowerCase()
        ));

      if (!inSupporting && fee.amount && fee.amount > 50) {
        missing.push({
          type: 'missing_info',
          title: `Missing Detail: ${fee.title}`,
          description: `"${fee.title}" ($${fee.amount.toLocaleString()}) appears in the primary document but not in supporting documents. Detail may be missing.`,
          documents: [primary.fileName],
          severity: 'medium',
          recommendation: 'Ask for documentation that explains this charge in detail.',
        });
      }
    }
  }

  return missing;
}

function deduplicateAcrossDocuments(findings: VerifiedFinding[]): VerifiedFinding[] {
  const unique = new Map<string, VerifiedFinding>();
  for (const f of findings) {
    const key = f.title.toLowerCase();
    if (!unique.has(key) || (f.confidenceScore > (unique.get(key)?.confidenceScore || 0))) {
      unique.set(key, f);
    }
  }
  return Array.from(unique.values());
}

function buildSetSummary(
  docs: AnalyzedDocument[],
  conflicts: CrossDocumentFinding[],
  corroborations: CrossDocumentFinding[],
  missing: CrossDocumentFinding[],
): string {
  const parts: string[] = [];
  parts.push(`${docs.length} documents analyzed together.`);

  const allFindings = docs.flatMap(d => d.findings.filter(f => !f.suppressed));
  parts.push(`${allFindings.length} total findings, ${deduplicateAcrossDocuments(allFindings).length} unique.`);

  if (conflicts.length > 0) parts.push(`${conflicts.length} conflict(s) detected.`);
  if (corroborations.length > 0) parts.push(`${corroborations.length} finding(s) confirmed across documents.`);
  if (missing.length > 0) parts.push(`${missing.length} item(s) may be missing supporting detail.`);

  return parts.join(' ');
}

function buildSetRecommendations(
  conflicts: CrossDocumentFinding[],
  missing: CrossDocumentFinding[],
): string[] {
  const recs: string[] = [];

  if (conflicts.length > 0) {
    recs.push(`Resolve ${conflicts.length} conflicting items between documents before signing.`);
  }
  if (missing.length > 0) {
    recs.push('Request complete documentation for items that appear incomplete.');
  }
  if (recs.length === 0) {
    recs.push('Documents appear consistent. Standard review recommended.');
  }

  return recs;
}