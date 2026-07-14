// Shared audit report contract — mirrors server/src/types/audit.ts
// This is the canonical shape returned by the DeepSeek forensic audit engine.

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
  confidence_score: number; // 0-100
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
  risk_score: number; // 0-100
  risk_level: "Low" | "Review Recommended" | "Elevated" | "High";
  potential_savings: number;
  confidence_level: number; // overall 0-100
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

export interface JobState {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  error?: string;
  report?: AuditReport;
}
