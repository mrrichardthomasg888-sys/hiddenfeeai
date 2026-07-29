// HiddenFeeAI — Canonical Audit Report Schema
// Powered by Google Gemini 2.5 Flash-Lite (single document intelligence engine)

export type Severity = "Low" | "Medium" | "High" | "Critical";
export type FindingStatus = "confirmed" | "possible" | "needs_review";

// ── Document Metadata ──────────────────────────────────────────────────────
export interface DocumentMetadata {
  documentType: string;
  issuer?: string;
  payer?: string;
  analysisDate: string;
  pagesReviewed: number;
  lineItemsReviewed: number;
  reportId: string;
  fileName?: string;
  fileType?: string;
}

// ── Executive Summary ──────────────────────────────────────────────────────
export interface ExecutiveSummary {
  headline: string;
  overview: string;
  criticalFindings: string;
  immediateActions: string;
  totalFindings: number;
}

// ── Financial Impact ───────────────────────────────────────────────────────
export interface FinancialImpact {
  originalTotal: number;
  questionableChargesTotal: number;
  correctedTotal: number;
  potentialOvercharge: number;
  description: string;
}

// ── Estimated Savings ──────────────────────────────────────────────────────
export interface EstimatedSavings {
  conservative: number;
  optimistic: number;
  mostLikely: number;
  description: string;
}

// ── Negotiation Strategy (per finding) ────────────────────────────────────
export interface NegotiationStrategy {
  difficulty: "Easy" | "Medium" | "Hard";
  successProbability: number; // 0-100
  priority: "Immediate" | "High" | "Medium" | "Low";
  estimatedSavings: number;
  steps: string[];
  script: string;
  keyPoints: string[];
  alternativeWording?: string;
  escalationPath?: string;
  managerEscalation?: string;
  writtenDisputeRecommendation?: string;
  documentsToRequest?: string[];
  expectedCompanyResponse?: string;
  bestCounterResponse?: string;
}

// ── Hidden Fee Finding ─────────────────────────────────────────────────────
export interface HiddenFee {
  id: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  confidenceScore: number;
  amount: number | null;
  pageNumber: number | null;
  lineReference?: string;
  evidence: string;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  negotiationMessage?: string;
  negotiationStrategy?: NegotiationStrategy;
}

// ── Questionable Charge ────────────────────────────────────────────────────
export interface QuestionableCharge {
  id: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  confidenceScore: number;
  amount: number | null;
  pageNumber: number | null;
  lineReference?: string;
  evidence: string;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  negotiationStrategy?: NegotiationStrategy;
}

// ── Line Item Finding ──────────────────────────────────────────────────────
export interface LineItemFinding {
  id: string;
  lineItem: string;
  chargedAmount: number | null;
  expectedAmount: number | null;
  discrepancy: number | null;
  pageNumber: number | null;
  evidence: string;
  explanation: string;
  severity: Severity;
}

// ── Contract Risk ──────────────────────────────────────────────────────────
export interface ContractRisk {
  id: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  confidenceScore: number;
  pageNumber: number | null;
  clauseText: string;
  evidence: string;
  explanation: string;
  whyItMatters: string;
  recommendedAction: string;
  negotiationStrategy?: NegotiationStrategy;
}

// ── Mathematical Error ─────────────────────────────────────────────────────
export interface MathematicalError {
  id: string;
  title: string;
  severity: Severity;
  pageNumber: number | null;
  expectedValue: number | null;
  actualValue: number | null;
  discrepancy: number | null;
  evidence: string;
  explanation: string;
  recommendedAction: string;
}

// ── Negotiation Leverage ───────────────────────────────────────────────────
export interface NegotiationLeverage {
  id: string;
  title: string;
  leverage: string;
  whyItMatters: string;
  whyCompanyMayAgree: string;
  priority: "Immediate" | "High" | "Medium" | "Low";
  successProbability: number;
  estimatedSavings: number;
  suggestedWording: string;
  alternativeWording?: string;
  escalationStrategy?: string;
  consumerProtectionAngle?: string;
  documentsToRequest?: string[];
}

// ── Consumer Right ─────────────────────────────────────────────────────────
export interface ConsumerRight {
  id: string;
  right: string;
  description: string;
  howToExercise: string;
  applicableLaw?: string;
  relevantToFinding?: string;
}

// ── Recommended Action ─────────────────────────────────────────────────────
export interface RecommendedAction {
  id: string;
  priority: number;
  action: string;
  timeframe: "Immediate" | "This Week" | "This Month" | "Ongoing";
  estimatedSavings?: number;
  difficulty: "Easy" | "Medium" | "Hard";
  phase: "Before Contact" | "During Negotiation" | "After Negotiation";
  details: string;
}

// ── Main AuditReport ───────────────────────────────────────────────────────
export interface AuditReport {
  documentMetadata: DocumentMetadata;
  executiveSummary: ExecutiveSummary;
  overallRiskScore: number;     // 0-100
  riskCategory: "Low" | "Review Recommended" | "Elevated" | "High";
  financialImpact: FinancialImpact;
  estimatedSavings: EstimatedSavings;
  hiddenFees: HiddenFee[];
  questionableCharges: QuestionableCharge[];
  lineItemFindings: LineItemFinding[];
  contractRisks: ContractRisk[];
  mathematicalErrors: MathematicalError[];
  negotiationLeverage: NegotiationLeverage[];
  consumerRights: ConsumerRight[];
  recommendedActions: RecommendedAction[];
  questionsToAsk: string[];
  phoneNegotiationScript: string[];
  emailNegotiationTemplate: string[];
  confidence: number; // 0-100 overall confidence

  // Aggregated for easy access
  allFindings: HiddenFee[];        // union of hiddenFees + questionableCharges mapped to HiddenFee shape
}

// ── Job Status ─────────────────────────────────────────────────────────────
export type JobStatus =
  | "idle"
  | "uploading"
  | "reading"
  | "processing"
  | "building_report"
  | "extracted"        // legacy compat
  | "awaiting_payment"
  | "paid"
  | "analyzing"
  | "complete"
  | "error";

// ── Job ────────────────────────────────────────────────────────────────────
export interface Job {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  filePath?: string;
  fileMimeType?: string;
  paid: boolean;
  createdAt: number;
  error?: string;
  report?: AuditReport;
}