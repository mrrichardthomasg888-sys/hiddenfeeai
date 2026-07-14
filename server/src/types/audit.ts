// Shared audit report contract — mirrors client/src/types/audit.ts
export type Severity = "Low" | "Medium" | "High" | "Critical";
export type FindingStatus = "confirmed" | "possible" | "needs_review";

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

export interface Job {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  filePath?: string;
  extractedText?: string;
  documentContext?: Record<string, unknown>;
  paid: boolean;
  createdAt: number;
  error?: string;
  report?: AuditReport;
}
