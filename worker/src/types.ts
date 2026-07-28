// Shared types mirroring the frontend contract
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type FindingStatus = "confirmed" | "possible" | "needs_review";
export type JobStatus =
  | "idle"
  | "uploading"
  | "extracting"
  | "extracted"
  | "awaiting_payment"
  | "paid"
  | "analyzing"
  | "complete"
  | "error";

export interface DocumentMeta {
  document_type: string;
  issuer?: string;
  payer?: string;
  analysis_date: string;
  pages_reviewed: number;
  line_items_reviewed: number;
  report_id: string;
}

export interface FinancialImpact {
  original_total: number;
  questionable_charges_total: number;
  corrected_total: number;
}

export interface NegotiationStrategy {
  difficulty: "Easy" | "Medium" | "Hard";
  steps: string[];
  script: string;
  key_points: string[];
}

export interface Finding {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  status: FindingStatus;
  confidence_score: number;
  amount: number | null;
  page: number | null;
  line_reference?: string;
  evidence: string;
  explanation: string;
  why_it_matters: string;
  recommended_action: string;
  negotiation_message?: string;
  negotiation_strategy?: NegotiationStrategy;
}

export interface CleanDocumentSummary {
  spending_breakdown: { category: string; amount: number }[];
  cost_categories: string[];
  key_terms: string[];
  negotiation_opportunities: string[];
  questions_to_ask: string[];
  money_saving_suggestions: string[];
}

export interface AuditReport {
  document_meta: DocumentMeta;
  risk_score: number;
  risk_level: "Low" | "Review Recommended" | "Elevated" | "High";
  potential_savings: number;
  confidence_level: number;
  financial_impact: FinancialImpact;
  findings: Finding[];
  math_errors: Finding[];
  duplicate_charges: Finding[];
  hidden_fees: Finding[];
  contract_risks: Finding[];
  clean_document_summary: CleanDocumentSummary | null;
}

// ─── NEW INTERFACES for Document Processing Pipeline ───

export interface PageBlock {
  text: string;
  confidence: number; // 0-1
  bbox?: { x: number; y: number; w: number; h: number };
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  textBlocks: PageBlock[];
  tables?: string[][][];
  ocrEngine: string;
  ocrConfidence: number;
}

export interface ExtractedDocument {
  fileName: string;
  fileType: 'pdf' | 'jpg' | 'png' | 'webp' | 'heic' | 'docx' | 'xlsx' | 'txt' | 'csv';
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
  extractionConfidence: number;
  warnings: string[];
}

export interface ExtractedItem {
  id: string;
  type: 'fee' | 'charge' | 'clause' | 'term' | 'discount';
  category: string;
  description: string;
  amount: number | null;
  currency: string;
  pageReference: string;
  lineReference: string;
  evidenceText: string;
  isRecurring: boolean;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExtractedData {
  extractedItems: ExtractedItem[];
  contractTerms: Array<{
    termType: string;
    description: string;
    pageReference: string;
    evidenceText: string;
    concernLevel: 'high' | 'medium' | 'low';
  }>;
  ambiguousLanguage: Array<{
    phrase: string;
    pageReference: string;
    explanation: string;
  }>;
  summary: {
    totalDetectedAmount: number;
    itemCount: number;
    highestConcernItems: string[];
  };
}

// ─── EXISTING INTERFACES CONTINUED ───

export interface Job {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  extractedText?: string;
  extractedDocument?: ExtractedDocument;
  documentContext?: {
    pages: number;
    lineItems: number;
    fileType: string;
    extractionMethod?: string;
    confidenceScore?: number;
  };
  paid: boolean;
  createdAt: number;
  error?: string;
  report?: AuditReport;
}

export interface ExtractionResult {
  text: string;
  pages: number;
  lineItems: number;
  fileType: string;
  extractionMethod: "native" | "ocr" | "image-ocr" | "docling" | "direct";
  confidenceScore: number;
}

export interface Env {
  ENVIRONMENT: string;
  MAX_UPLOAD_SIZE_MB: string;
  FRONTEND_URL: string;
  DEEPSEEK_BASE_URL: string;
  DEEPSEEK_MODEL: string;
  DEEPSEEK_REASONER_MODEL: string;
  STRIPE_PRICE_USD_CENTS: string;
  DEEPSEEK_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  TEST_MODE_SKIP_PAYMENT?: string;
  USE_NEW_PIPELINE?: string;
  USE_V2_PIPELINE?: string;
  DOCLING_SERVICE_URL?: string;
  DOCLING_API_KEY?: string;
  ANALYSIS_KV?: KVNamespace;
  AI: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
}

// ═══════════════════════════════════════════════════════════════
// V2 PIPELINE TYPES — Phase 1: Foundation
// ═══════════════════════════════════════════════════════════════

// ─── DOCUMENT ROUTING ───

export type SupportedFileFormat =
  | 'pdf' | 'docx' | 'doc' | 'rtf' | 'txt' | 'md'
  | 'csv' | 'xlsx' | 'xls' | 'ods'
  | 'pptx' | 'ppt'
  | 'jpg' | 'jpeg' | 'png' | 'webp' | 'heic' | 'tiff' | 'tif' | 'bmp' | 'gif'
  | 'eml' | 'msg'
  | 'html' | 'xml' | 'json'
  | 'zip';

export type DocumentCategory =
  | 'auto_purchase' | 'auto_finance' | 'auto_lease'
  | 'apartment_lease' | 'rental_agreement'
  | 'mortgage' | 'loan_agreement' | 'credit_card'
  | 'bank_statement' | 'utility_bill' | 'medical_bill'
  | 'insurance_policy' | 'subscription' | 'membership'
  | 'employment_contract' | 'construction_contract'
  | 'invoice' | 'receipt' | 'estimate' | 'purchase_agreement'
  | 'terms_of_service' | 'warranty'
  | 'cell_phone' | 'internet_service' | 'cable_agreement'
  | 'travel_booking' | 'hotel_invoice' | 'airline_receipt'
  | 'government_form' | 'tax_document'
  | 'unknown';

export interface DocumentRouteResult {
  fileFormat: SupportedFileFormat;
  mimeType: string;
  isDigital: boolean;
  isScanned: boolean;
  needsOcr: boolean;
  detectedLanguage: string;
  pageCount: number;
  hasTables: boolean;
  hasImages: boolean;
  hasForms: boolean;
  hasSignatures: boolean;
  hasHandwriting: boolean;
  documentQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
  warnings: string[];
}

// ─── PROCESSOR PLUGIN SYSTEM ───

export interface StructuredElement {
  type: 'heading' | 'paragraph' | 'table' | 'list' | 'image' | 'form_field' | 'signature_block';
  pageNumber: number;
  bbox?: { x: number; y: number; w: number; h: number };
  content: string;
  metadata?: Record<string, unknown>;
  children?: StructuredElement[];
}

export interface StructuredTable {
  pageNumber: number;
  headers: string[];
  rows: string[][];
  caption?: string;
  detectedAs?: 'fee_schedule' | 'line_items' | 'summary' | 'general';
}

export interface StructuredDocument {
  fileName: string;
  fileFormat: SupportedFileFormat;
  pageCount: number;
  markdown: string;
  elements: StructuredElement[];
  tables: StructuredTable[];
  metadata: {
    title?: string;
    author?: string;
    createdAt?: string;
    modifiedAt?: string;
    pageCount: number;
    language: string;
  };
  routeResult: DocumentRouteResult;
  extractionMethod: 'docling' | 'deepseek-vision' | 'native' | 'hybrid';
  extractionConfidence: number;
  warnings: string[];
}

// ─── PROCESSOR INTERFACE ───

export interface DocumentProcessor {
  readonly format: SupportedFileFormat | SupportedFileFormat[];
  readonly priority: number;
  readonly requiresOcr: boolean;
  canProcess(buffer: ArrayBuffer, fileName: string, routeResult: DocumentRouteResult): boolean;
  process(buffer: ArrayBuffer, fileName: string, routeResult: DocumentRouteResult, env: Env): Promise<StructuredDocument>;
}

// ─── NORMALIZATION ───

export interface NormalizedAmount {
  raw: string;
  value: number;
  currency: string;
  isEstimated: boolean;
  isRecurring: boolean;
  period?: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
}

export interface NormalizedFee {
  canonicalName: string;
  rawNames: string[];
  amounts: NormalizedAmount[];
  pageReferences: number[];
  evidenceTexts: string[];
  category: string;
  isHidden: boolean;
  isMandatory: boolean;
}

export interface NormalizedDocument extends StructuredDocument {
  fees: NormalizedFee[];
  totals: NormalizedAmount[];
  dates: Date[];
  parties: string[];
  currency: string;
  language: string;
}

// ─── SPECIALIZED ANALYZER OUTPUTS ───

export type ConfidenceTier = 'verified' | 'high' | 'moderate' | 'low';

export interface VerifiableFinding {
  id: string;
  title: string;
  category: string;
  severity: Severity;
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  amount: number | null;
  page: number | null;
  sectionHeading: string | null;
  evidenceQuote: string;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  negotiationMessage?: string;
  negotiationStrategy?: NegotiationStrategy;
  sourceAnalyzer: string;
}

export interface FeeDetectionResult {
  fees: VerifiableFinding[];
  totalDetectedFees: number;
  totalDetectedAmount: number;
  confidence: number;
}

export interface ClauseAnalysisResult {
  clauses: VerifiableFinding[];
  highRiskClauses: number;
  mediumRiskClauses: number;
  confidence: number;
}

export interface RiskAssessmentResult {
  riskScore: number;
  riskLevel: AuditReport['risk_level'];
  transparencyScore: number;
  complexityScore: number;
  consumerRiskScore: number;
  financialExposureScore: number;
  missingDisclosures: string[];
  confidence: number;
}

export interface NegotiationResult {
  opportunities: VerifiableFinding[];
  negotiableFees: { name: string; amount: number; likelihood: 'high' | 'medium' | 'low' }[];
  suggestedQuestions: string[];
  talkingPoints: string[];
  confidence: number;
}

export interface FinancialImpactResult {
  oneTimeCharges: number;
  monthlyRecurring: number;
  annualRecurring: number;
  totalFirstYear: number;
  potentialSavings: number;
  questionableCharges: number;
  breakdown: { category: string; amount: number; recurring: boolean }[];
  confidence: number;
}

// ─── EVIDENCE VERIFICATION ───

export interface VerifiedFinding extends VerifiableFinding {
  evidencePresent: boolean;
  evidenceMatchScore: number;
  verificationNotes: string;
  suppressed: boolean;
  suppressionReason?: string;
}

export interface VerificationResult {
  verifiedFindings: VerifiedFinding[];
  suppressedCount: number;
  confidenceAdjustments: { findingId: string; oldConfidence: number; newConfidence: number; reason: string }[];
  overallConfidence: number;
}

// ─── DECISION ENGINE ───

export interface ExecutiveSummary {
  riskScore: number;
  riskLevel: AuditReport['risk_level'];
  totalFeesFound: number;
  estimatedHiddenCharges: number;
  estimatedRecurringCosts: number;
  negotiationOpportunities: number;
  highRiskClauses: number;
  overallConfidence: number;
  topFindings: VerifiedFinding[];
}

export interface DecisionResult {
  executiveSummary: ExecutiveSummary;
  mergedFindings: VerifiedFinding[];
  categorizedFindings: {
    hiddenFees: VerifiedFinding[];
    contractRisks: VerifiedFinding[];
    mathErrors: VerifiedFinding[];
    duplicateCharges: VerifiedFinding[];
    negotiationOpportunities: VerifiedFinding[];
  };
  financialImpact: FinancialImpactResult;
  riskAssessment: RiskAssessmentResult;
}

// ─── EXTENDED JOB ───

export interface PipelineState {
  routeResult?: DocumentRouteResult;
  structuredDocument?: StructuredDocument;
  normalizedDocument?: NormalizedDocument;
  classification?: { category: DocumentCategory; confidence: number };
  feeDetection?: FeeDetectionResult;
  clauseAnalysis?: ClauseAnalysisResult;
  riskAssessment?: RiskAssessmentResult;
  negotiationResult?: NegotiationResult;
  financialImpact?: FinancialImpactResult;
  verificationResult?: VerificationResult;
  decisionResult?: DecisionResult;
}

export interface V2Job extends Job {
  pipelineState?: PipelineState;
}

/**
 * Storage interface for job persistence.
 * Allows swapping between in-memory Map (dev) and KV/Durable Objects (production).
 */
export interface JobStore {
  createJob(auditId: string, fileName: string): Job | Promise<Job>;
  getJob(auditId: string): Job | undefined | Promise<Job | undefined>;
  updateJob(auditId: string, patch: Partial<Job>): Job | undefined | Promise<Job | undefined>;
  deleteJob(auditId: string): void | Promise<void>;
}
