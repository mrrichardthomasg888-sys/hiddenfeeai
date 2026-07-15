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

export interface Job {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  extractedText?: string;
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
  extractionMethod: "native" | "ocr" | "image-ocr";
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
  AI: {
    run: (model: string, inputs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
}

/**
 * Storage interface for job persistence.
 * Allows swapping between in-memory Map (dev) and KV/Durable Objects (production).
 */
export interface JobStore {
  createJob(auditId: string, fileName: string): Job;
  getJob(auditId: string): Job | undefined;
  updateJob(auditId: string, patch: Partial<Job>): Job | undefined;
  deleteJob(auditId: string): void;
}