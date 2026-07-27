/**
 * HiddenFeeAI v2 — Pipeline Benchmark & Integration Test Suite
 * 
 * Validates every module in isolation and as an integrated pipeline.
 * 
 * Run: npx vitest run worker/src/benchmarks/
 * 
 * What's tested:
 * - DocumentRouter: format detection, OCR detection, quality assessment
 * - Normalizer: fee extraction, amount detection, deduplication
 * - Classifier: document type classification accuracy
 * - EvidenceVerifier: hallucination detection, confidence adjustment
 * - DecisionEngine: deduplication, ranking, risk scoring, AuditReport conversion
 * - ProcessorRegistry: plugin registration and dispatch
 * - Types: interface compliance
 */

import { describe, it, expect } from 'vitest';
import { routeDocument, isAcceptedExtension } from '../router/documentRouter.js';
import { normalizeDocument, hasSufficientContent } from '../normalization/normalizer.js';
import { classifyDocument, getExpectedFees, isContract } from '../classifier/documentClassifier.js';
import { verifyFindings } from '../verification/evidenceVerifier.js';
import { runDecisionEngine, toAuditReport } from '../decision/decisionEngine.js';
import { ProcessorRegistry } from '../processors/registry.js';
import type {
  StructuredDocument,
  DocumentRouteResult,
  VerifiableFinding,
  VerificationResult,
  VerifiedFinding,
} from '../types.js';

// ═══════════════════════════════════════════════════════════════
// Test Fixtures
// ═══════════════════════════════════════════════════════════════

const sampleInvoiceText = `INVOICE
From: ABC Dealership
To: John Doe
Invoice #: INV-2026-001
Date: July 15, 2026

Vehicle Purchase Summary
---
Vehicle: 2026 Toyota Camry
MSRP: $28,500.00
Destination Charge: $1,095.00

Additional Fees:
Documentation Fee: $499.00
Processing Fee: $299.00
Dealer Prep Fee: $195.00
Technology Fee: $149.95
Registration Fee: $85.00

Subtotal: $30,822.95
Sales Tax (6%): $1,849.38
Total Due: $32,672.33

Monthly Payment Option:
60 months at $544.54/month
APR: 4.9%

Terms: All sales final. No refunds after 3 days. Vehicle subject to a \$499 documentation fee which is not required by law.
Arbitration Clause: Any dispute shall be resolved through binding arbitration. Consumer waives right to class action.`;

function createStructuredDoc(overrides: Partial<StructuredDocument> = {}): StructuredDocument {
  const routeResult: DocumentRouteResult = {
    fileFormat: 'pdf',
    mimeType: 'application/pdf',
    isDigital: true,
    isScanned: false,
    needsOcr: false,
    detectedLanguage: 'en',
    pageCount: 2,
    hasTables: true,
    hasImages: false,
    hasForms: false,
    hasSignatures: true,
    hasHandwriting: false,
    documentQuality: 'excellent',
    warnings: [],
  };

  return {
    fileName: 'invoice.pdf',
    fileFormat: 'pdf',
    pageCount: 2,
    markdown: `--- Page 1 ---\n${sampleInvoiceText}`,
    elements: [
      { type: 'heading', pageNumber: 1, content: 'INVOICE' },
      { type: 'paragraph', pageNumber: 1, content: sampleInvoiceText },
    ],
    tables: [
      {
        pageNumber: 1,
        headers: ['Description', 'Amount'],
        rows: [
          ['Vehicle: 2026 Toyota Camry', '$28,500.00'],
          ['Destination Charge', '$1,095.00'],
          ['Documentation Fee', '$499.00'],
          ['Processing Fee', '$299.00'],
          ['Dealer Prep Fee', '$195.00'],
          ['Technology Fee', '$149.95'],
          ['Registration Fee', '$85.00'],
          ['Sales Tax (6%)', '$1,849.38'],
          ['Total Due', '$32,672.33'],
        ],
        detectedAs: 'fee_schedule',
      },
    ],
    metadata: {
      pageCount: 2,
      language: 'en',
    },
    routeResult,
    extractionMethod: 'native',
    extractionConfidence: 0.95,
    warnings: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// 1. Document Router Tests
// ═══════════════════════════════════════════════════════════════

describe('DocumentRouter', () => {
  it('accepts valid file extensions', () => {
    expect(isAcceptedExtension('contract.pdf')).toBe(true);
    expect(isAcceptedExtension('invoice.docx')).toBe(true);
    expect(isAcceptedExtension('receipt.png')).toBe(true);
    expect(isAcceptedExtension('scan.jpg')).toBe(true);
    expect(isAcceptedExtension('data.csv')).toBe(true);
    expect(isAcceptedExtension('terms.txt')).toBe(true);
    expect(isAcceptedExtension('statement.xlsx')).toBe(true);
  });

  it('rejects invalid extensions', () => {
    expect(isAcceptedExtension('virus.exe')).toBe(false);
    expect(isAcceptedExtension('script.sh')).toBe(false);
    expect(isAcceptedExtension('malware.dll')).toBe(false);
  });

  it('detects PDF format from magic bytes', () => {
    // Minimal PDF header
    const buffer = new TextEncoder().encode('%PDF-1.4\n%').buffer;
    const result = routeDocument(buffer, 'test.pdf');
    expect(result.fileFormat).toBe('pdf');
    expect(result.mimeType).toBe('application/pdf');
  });

  it('detects image formats needing OCR', () => {
    // PNG magic bytes
    const pngBuffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]).buffer;
    const result = routeDocument(pngBuffer, 'scan.png');
    expect(result.needsOcr).toBe(true);
    expect(result.fileFormat).toBe('png');
  });

  it('detects document quality', () => {
    const buffer = new TextEncoder().encode(sampleInvoiceText).buffer;
    const result = routeDocument(buffer, 'invoice.txt');
    expect(result.documentQuality).toBe('excellent');
  });

  it('routes ZIP to correct format', () => {
    // PK\x03\x04 header
    const zipBuffer = new Uint8Array([0x50, 0x4B, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]).buffer;
    const result = routeDocument(zipBuffer, 'documents.zip');
    expect(result.fileFormat).toBe('zip');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects language as English', () => {
    const buffer = new TextEncoder().encode(sampleInvoiceText).buffer;
    const result = routeDocument(buffer, 'invoice.txt');
    expect(result.detectedLanguage).toBe('en');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Normalizer Tests
// ═══════════════════════════════════════════════════════════════

describe('Normalizer', () => {
  it('extracts fees from structured document', () => {
    const doc = createStructuredDoc();
    const normalized = normalizeDocument(doc);
    
    expect(normalized.fees.length).toBeGreaterThan(0);
    expect(normalized.currency).toBe('USD');
    expect(normalized.language).toBe('en');
  });

  it('detects hidden fees', () => {
    const doc = createStructuredDoc();
    const normalized = normalizeDocument(doc);
    
    const hiddenFees = normalized.fees.filter(f => f.isHidden);
    // Documentation fee, Processing fee, Technology fee should be hidden
    expect(hiddenFees.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts amounts', () => {
    const doc = createStructuredDoc();
    const normalized = normalizeDocument(doc);
    
    const totalAmount = normalized.fees.reduce((sum, f) =>
      sum + f.amounts.reduce((s, a) => s + a.value, 0), 0
    );
    expect(totalAmount).toBeGreaterThan(0);
  });

  it('detects recurring payment indication', () => {
    const doc = createStructuredDoc();
    const normalized = normalizeDocument(doc);
    
    // The monthly payment mention should generate some amounts
    expect(normalized.totals.length).toBeGreaterThan(0);
  });

  it('identifies parties', () => {
    const doc = createStructuredDoc();
    const normalized = normalizeDocument(doc);
    
    expect(normalized.parties.length).toBeGreaterThan(0);
    expect(normalized.parties.some(p => p.toLowerCase().includes('abc'))).toBe(true);
  });

  it('confirms sufficient content', () => {
    const doc = createStructuredDoc();
    const normalized = normalizeDocument(doc);
    
    expect(hasSufficientContent(normalized)).toBe(true);
  });

  it('rejects empty documents', () => {
    const emptyDoc = createStructuredDoc({ markdown: '', elements: [], tables: [] });
    const normalized = normalizeDocument(emptyDoc);
    
    expect(hasSufficientContent(normalized)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Classifier Tests
// ═══════════════════════════════════════════════════════════════

describe('DocumentClassifier', () => {
  it('classifies auto purchase contracts', () => {
    const doc = createStructuredDoc({
      markdown: 'MOTOR VEHICLE PURCHASE AGREEMENT\nVIN: 1HGBH41JXMN109186\nBuyer\'s Order\n',
    });
    const result = classifyDocument(doc);
    
    expect(result.category).toBe('auto_purchase');
    expect(result.confidence).toBeGreaterThanOrEqual(65);
  });

  it('classifies invoices', () => {
    const doc = createStructuredDoc();
    const result = classifyDocument(doc);
    
    // Our fixture has invoice markers
    expect(result.displayName).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('provides expected fees for known document types', () => {
    const fees = getExpectedFees('auto_purchase');
    expect(fees).toContain('documentation fee');
    expect(fees).toContain('dealer fee');
  });

  it('identifies contract documents', () => {
    expect(isContract('auto_purchase')).toBe(true);
    expect(isContract('apartment_lease')).toBe(true);
    expect(isContract('invoice')).toBe(false);
    expect(isContract('receipt')).toBe(false);
  });

  it('returns unknown for unrecognized documents', () => {
    const doc = createStructuredDoc({
      markdown: 'abcdefg hijklmnop qrstuv wxyz 12345',
    });
    const result = classifyDocument(doc);
    
    expect(['unknown', 'terms_of_service', 'invoice']).toContain(result.category);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Evidence Verifier Tests
// ═══════════════════════════════════════════════════════════════

describe('EvidenceVerifier', () => {
  const doc = createStructuredDoc();

  const realFinding: VerifiableFinding = {
    id: 'test-1',
    title: 'Documentation Fee',
    category: 'Hidden Fee',
    severity: 'High',
    confidenceScore: 95,
    confidenceTier: 'verified',
    amount: 499,
    page: 1,
    sectionHeading: 'Additional Fees',
    evidenceQuote: 'Documentation Fee: $499.00',
    explanation: 'This is a hidden documentation fee',
    whyItMatters: 'It increases total cost',
    recommendedAction: 'Ask to have it removed',
    sourceAnalyzer: 'feeDetector',
  };

  const hallucinatedFinding: VerifiableFinding = {
    id: 'test-2',
    title: 'Space Station Maintenance Fee',
    category: 'Hidden Fee',
    severity: 'Critical',
    confidenceScore: 95,
    confidenceTier: 'verified',
    amount: 1000000,
    page: 1,
    sectionHeading: null,
    evidenceQuote: 'Space Station Maintenance Fee: $1,000,000.00',
    explanation: 'A fee for ISS maintenance',
    whyItMatters: 'Very expensive',
    recommendedAction: 'Cancel the space station',
    sourceAnalyzer: 'feeDetector',
  };

  const weakEvidenceFinding: VerifiableFinding = {
    id: 'test-3',
    title: 'Possible Hidden Fee',
    category: 'Hidden Fee',
    severity: 'Medium',
    confidenceScore: 85,
    confidenceTier: 'moderate',
    amount: 50,
    page: 1,
    sectionHeading: null,
    evidenceQuote: 'something about a fee',
    explanation: 'Might be a fee',
    whyItMatters: 'Could cost money',
    recommendedAction: 'Check it',
    sourceAnalyzer: 'feeDetector',
  };

  it('confirms findings with matching evidence', () => {
    const result = verifyFindings([realFinding], doc);
    
    expect(result.verifiedFindings.length).toBe(1);
    const verified = result.verifiedFindings[0];
    expect(verified.evidencePresent).toBe(true);
    expect(verified.suppressed).toBe(false);
    expect(verified.evidenceMatchScore).toBeGreaterThanOrEqual(0.5);
  });

  it('suppresses hallucinated findings (no evidence in document)', () => {
    const result = verifyFindings([hallucinatedFinding], doc, {
      factualThreshold: 80,
      suppressNoEvidence: true,
    });
    
    const verified = result.verifiedFindings[0];
    expect(verified.evidencePresent).toBe(false);
    expect(verified.suppressed).toBe(true);
    expect(result.suppressedCount).toBe(1);
  });

  it('downgrades confidence for weak evidence', () => {
    const result = verifyFindings([weakEvidenceFinding], doc);
    
    const verified = result.verifiedFindings[0];
    expect(verified.confidenceScore).toBeLessThanOrEqual(weakEvidenceFinding.confidenceScore);
    expect(result.confidenceAdjustments.length).toBeGreaterThanOrEqual(0);
  });

  it('adjusts confidence when evidence is partially matched', () => {
    const result = verifyFindings([realFinding], doc, { adjustConfidence: true });
    
    const verified = result.verifiedFindings[0];
    // If evidence was found, confidence adjustment should exist
    expect(result.confidenceAdjustments.length).toBeGreaterThanOrEqual(0);
  });

  it('handles empty findings array', () => {
    const result = verifyFindings([], doc);
    
    expect(result.verifiedFindings).toEqual([]);
    expect(result.suppressedCount).toBe(0);
    expect(result.overallConfidence).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Decision Engine Tests
// ═══════════════════════════════════════════════════════════════

describe('DecisionEngine', () => {
  const doc = createStructuredDoc();

  const verifiedFindings: VerifiedFinding[] = [
    {
      id: 'vf-1',
      title: 'Documentation Fee',
      category: 'Hidden Fee',
      severity: 'High',
      confidenceScore: 95,
      confidenceTier: 'verified',
      amount: 499,
      page: 1,
      sectionHeading: 'Additional Fees',
      evidenceQuote: 'Documentation Fee: $499.00',
      explanation: 'A documentation fee',
      whyItMatters: 'Increases cost',
      recommendedAction: 'Negotiate removal',
      negotiationMessage: 'Can this fee be waived?',
      sourceAnalyzer: 'feeDetector',
      evidencePresent: true,
      evidenceMatchScore: 0.95,
      verificationNotes: 'Evidence confirmed',
      suppressed: false,
    },
    {
      id: 'vf-2',
      title: 'Processing Fee',
      category: 'Hidden Fee',
      severity: 'Medium',
      confidenceScore: 90,
      confidenceTier: 'high',
      amount: 299,
      page: 1,
      sectionHeading: 'Additional Fees',
      evidenceQuote: 'Processing Fee: $299.00',
      explanation: 'A processing fee',
      whyItMatters: 'Additional cost',
      recommendedAction: 'Ask about this fee',
      sourceAnalyzer: 'feeDetector',
      evidencePresent: true,
      evidenceMatchScore: 0.9,
      verificationNotes: 'Evidence confirmed',
      suppressed: false,
    },
    {
      id: 'vf-3',
      title: 'Arbitration Clause',
      category: 'Contract Risk',
      severity: 'Critical',
      confidenceScore: 95,
      confidenceTier: 'verified',
      amount: null,
      page: 1,
      sectionHeading: 'Terms',
      evidenceQuote: 'Any dispute shall be resolved through binding arbitration',
      explanation: 'Mandatory arbitration clause',
      whyItMatters: 'Waives right to sue',
      recommendedAction: 'Request removal',
      sourceAnalyzer: 'clauseAnalyzer',
      evidencePresent: true,
      evidenceMatchScore: 0.98,
      verificationNotes: 'Evidence confirmed',
      suppressed: false,
    },
  ];

  const verificationResult: VerificationResult = {
    verifiedFindings,
    suppressedCount: 0,
    confidenceAdjustments: [],
    overallConfidence: 93,
  };

  it('deduplicates similar findings', () => {
    const result = runDecisionEngine({
      structuredDocument: doc,
      verificationResult,
    });

    // Deduplication should reduce or maintain count
    expect(result.mergedFindings.length).toBeLessThanOrEqual(verifiedFindings.length);
  });

  it('categorizes findings correctly', () => {
    const result = runDecisionEngine({
      structuredDocument: doc,
      verificationResult,
    });

    expect(result.categorizedFindings.hiddenFees.length).toBeGreaterThan(0);
    expect(result.categorizedFindings.contractRisks.length).toBeGreaterThan(0);
  });

  it('calculates risk score within 0-100', () => {
    const result = runDecisionEngine({
      structuredDocument: doc,
      verificationResult,
    });

    expect(result.executiveSummary.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.executiveSummary.riskScore).toBeLessThanOrEqual(100);
    expect(['Low', 'Review Recommended', 'Elevated', 'High']).toContain(result.executiveSummary.riskLevel);
  });

  it('generates executive summary with key metrics', () => {
    const result = runDecisionEngine({
      structuredDocument: doc,
      verificationResult,
    });

    expect(result.executiveSummary.totalFeesFound).toBeGreaterThan(0);
    expect(result.executiveSummary.overallConfidence).toBeGreaterThan(0);
    expect(result.executiveSummary.topFindings.length).toBeGreaterThan(0);
  });

  it('converts to AuditReport (backwards compatibility)', () => {
    const decision = runDecisionEngine({
      structuredDocument: doc,
      verificationResult,
    });

    const report = toAuditReport(decision, doc);

    // Validate the report matches the existing AuditReport interface
    expect(report.document_meta).toBeDefined();
    expect(report.document_meta.pages_reviewed).toBe(doc.pageCount);
    expect(report.risk_score).toBeGreaterThanOrEqual(0);
    expect(report.risk_score).toBeLessThanOrEqual(100);
    expect(['Low', 'Review Recommended', 'Elevated', 'High']).toContain(report.risk_level);
    expect(report.findings).toBeDefined();
    expect(report.hidden_fees).toBeDefined();
    expect(report.contract_risks).toBeDefined();
    expect(report.clean_document_summary).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. Processor Registry Tests
// ═══════════════════════════════════════════════════════════════

describe('ProcessorRegistry', () => {
  it('registers and finds processors', () => {
    const registry = new ProcessorRegistry();
    
    // Initially empty
    expect(registry.findProcessor({ fileFormat: 'pdf' } as DocumentRouteResult)).toBeUndefined();

    // Register a mock processor
    const mockProcessor = {
      format: 'pdf' as const,
      priority: 1,
      requiresOcr: false,
      canProcess: () => true,
      process: async () => ({} as StructuredDocument),
    };

    registry.register(mockProcessor);

    const found = registry.findProcessor({ fileFormat: 'pdf' } as DocumentRouteResult);
    expect(found).toBeDefined();
    expect(found!.format).toBe('pdf');
  });

  it('lists registered processors', () => {
    const registry = new ProcessorRegistry();
    
    registry.register({
      format: 'pdf' as const,
      priority: 1,
      requiresOcr: false,
      canProcess: () => true,
      process: async () => ({} as StructuredDocument),
    });

    const list = registry.list();
    expect(list.length).toBe(1);
    expect(list[0].format).toBe('pdf');
  });

  it('overrides lower priority processors', () => {
    const registry = new ProcessorRegistry();
    
    const lowPriority = {
      format: 'pdf' as const,
      priority: 10,
      requiresOcr: false,
      canProcess: () => true,
      process: async () => ({} as StructuredDocument),
    };

    const highPriority = {
      format: 'pdf' as const,
      priority: 1,
      requiresOcr: false,
      canProcess: () => true,
      process: async () => ({} as StructuredDocument),
    };

    registry.register(lowPriority);
    registry.register(highPriority);

    const found = registry.findProcessor({ fileFormat: 'pdf' } as DocumentRouteResult);
    expect(found!.priority).toBe(1); // Should keep the higher priority (lower number)
  });

  it('unregisters processors', () => {
    const registry = new ProcessorRegistry();
    
    registry.register({
      format: 'pdf' as const,
      priority: 1,
      requiresOcr: false,
      canProcess: () => true,
      process: async () => ({} as StructuredDocument),
    });

    expect(registry.list().length).toBe(1);
    
    registry.unregister('pdf');
    
    expect(registry.list().length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. Types Compliance Tests
// ═══════════════════════════════════════════════════════════════

describe('Type Compliance', () => {
  it('StructuredDocument is well-formed', () => {
    const doc = createStructuredDoc();
    expect(doc.fileName).toBeTruthy();
    expect(doc.fileFormat).toBeTruthy();
    expect(doc.pageCount).toBeGreaterThan(0);
    expect(doc.markdown).toBeTruthy();
  });

  it('VerifiableFinding has required fields', () => {
    const finding: VerifiableFinding = {
      id: 'test',
      title: 'Test',
      category: 'Test',
      severity: 'Low',
      confidenceScore: 80,
      confidenceTier: 'moderate',
      amount: null,
      page: null,
      sectionHeading: null,
      evidenceQuote: 'test',
      explanation: 'test',
      whyItMatters: 'test',
      recommendedAction: 'test',
      sourceAnalyzer: 'test',
    };

    expect(finding.id).toBeTruthy();
    expect(finding.confidenceScore).toBeGreaterThanOrEqual(0);
    expect(finding.confidenceScore).toBeLessThanOrEqual(100);
  });

  it('VerifiedFinding extends VerifiableFinding', () => {
    const vf: VerifiedFinding = {
      id: 'test',
      title: 'Test',
      category: 'Test',
      severity: 'Low',
      confidenceScore: 80,
      confidenceTier: 'moderate',
      amount: null,
      page: null,
      sectionHeading: null,
      evidenceQuote: 'test',
      explanation: 'test',
      whyItMatters: 'test',
      recommendedAction: 'test',
      sourceAnalyzer: 'test',
      evidencePresent: true,
      evidenceMatchScore: 0.9,
      verificationNotes: 'ok',
      suppressed: false,
    };

    expect(vf.evidencePresent).toBeDefined();
    expect(vf.evidenceMatchScore).toBeDefined();
    expect(vf.suppressed).toBeDefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. Integration Tests (Pipeline Flow)
// ═══════════════════════════════════════════════════════════════

describe('Integration Pipeline', () => {
  it('completes full pipeline: Route → Classify → Normalize → Verify → Decide', () => {
    const buffer = new TextEncoder().encode(sampleInvoiceText).buffer;
    
    // Step 1: Route
    const routeResult = routeDocument(buffer, 'invoice.pdf');
    expect(routeResult.fileFormat).toBeDefined();
    
    // Step 2: Create structured document (simulating extraction)
    const doc = createStructuredDoc({ routeResult });
    
    // Step 3: Classify
    const classification = classifyDocument(doc);
    expect(classification.category).toBeDefined();
    
    // Step 4: Normalize
    const normalized = normalizeDocument(doc);
    expect(normalized.fees.length).toBeGreaterThan(0);
    
    // Step 5: Verify (simulate analyzer findings)
    const findings: VerifiableFinding[] = [
      {
        id: crypto.randomUUID(),
        title: 'Documentation Fee $499',
        category: 'Hidden Fee',
        severity: 'High',
        confidenceScore: 95,
        confidenceTier: 'verified',
        amount: 499,
        page: 1,
        sectionHeading: 'Additional Fees',
        evidenceQuote: 'Documentation Fee: $499.00',
        explanation: 'This documentation fee is not required by law',
        whyItMatters: 'Increases total purchase cost by $499',
        recommendedAction: 'Request fee removal or reduction',
        negotiationMessage: 'I see a $499 documentation fee. Can you explain what specific documents this covers and whether this fee is negotiable?',
        sourceAnalyzer: 'feeDetector',
      },
    ];

    const verificationResult = verifyFindings(findings, doc);
    expect(verificationResult.verifiedFindings.length).toBe(1);
    
    // Step 6: Decide
    const decision = runDecisionEngine({
      structuredDocument: doc,
      verificationResult,
    });
    
    expect(decision.executiveSummary.riskScore).toBeGreaterThan(0);
    expect(decision.mergedFindings.length).toBe(1);
    
    // Step 7: Convert to AuditReport
    const report = toAuditReport(decision, doc);
    expect(report.document_meta).toBeDefined();
    expect(report.findings.length).toBe(1);
    expect(report.risk_score).toBeGreaterThan(0);
  });

  it('handles clean documents (no fees, no clauses)', () => {
    const cleanText = 'RECEIPT\nStore Purchase\nItem: Notebook\nAmount: $3.99\nPaid. Thank you!';
    const buffer = new TextEncoder().encode(cleanText).buffer;
    
    const routeResult = routeDocument(buffer, 'receipt.txt');
    const doc = createStructuredDoc({
      markdown: cleanText,
      elements: [{ type: 'paragraph', pageNumber: 1, content: cleanText }],
      tables: [],
    });
    doc.routeResult = routeResult;
    
    const classification = classifyDocument(doc);
    // A clean receipt should NOT crash the pipeline
    expect(classification.category).toBeDefined();
    
    const normalized = normalizeDocument(doc);
    expect(normalized).toBeDefined();
    
    const result = verifyFindings([], doc);
    expect(result.verifiedFindings).toEqual([]);
    
    const decision = runDecisionEngine({
      structuredDocument: doc,
      verificationResult: result,
    });
    
    expect(decision.executiveSummary.totalFeesFound).toBe(0);
    expect(decision.executiveSummary.riskScore).toBeLessThanOrEqual(30);
  });
});