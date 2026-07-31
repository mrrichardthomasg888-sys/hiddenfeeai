// HiddenFeeAI — Client Audit Report Types
// Mirrors server/src/types/audit.ts exactly
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

// ── Negotiation Strategy ───────────────────────────────────────────────────
export interface NegotiationStrategy {
  difficulty: "Easy" | "Medium" | "Hard";
  successProbability: number;
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

// ── Hidden Fee ─────────────────────────────────────────────────────────────
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
  premiumReport: PremiumReport;
  documentMetadata: DocumentMetadata;
  executiveSummary: ExecutiveSummary;
  overallRiskScore: number;
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
  confidence: number;
  allFindings: HiddenFee[];
}

export interface PremiumFinding {
  id: string;
  title: string;
  category: string;
  severity: Severity | "Informational";
  confidence: number;
  amount: number | null;
  executiveSummary: string;
  explanation: string;
  whyItMatters: string;
  evidenceQuote: string;
  location: string;
  financialImpact: string;
  recommendedAction: string;
  questionsToAsk: string[];
  negotiability: string;
  betterAlternativeLanguage: string;
  talkingPoint: string;
}

export type PremiumReportSectionKey = "executive-dashboard" | "executive-decision" | "negotiation-playbook" | "executive-insights" | "financial-impact" | "risk-scorecard" | "timeline" | "prioritized-findings" | "detailed-evidence" | "positive-terms" | "missing-protections" | "watch-later" | "professional-checklists" | "action-plan" | "provider-guidance" | "methodology";

export interface PremiumReportSection {
  key: PremiumReportSectionKey;
  eyebrow: string;
  title: string;
  description: string;
}

export interface PremiumInsightItem {
  title: string;
  explanation: string;
  source_reference?: string;
  evidence?: string;
  recommended_action?: string;
}

export interface PremiumReport {
  sectionOrder: PremiumReportSection[];
  reportId: string;
  documentType: string;
  issuer: string;
  payer: string;
  analysisDate: string;
  executiveOverview: {
    riskScore: number;
    riskLevel: string;
    potentialSavings: number;
    totalFindings: number;
    pagesReviewed: number;
    confidence: number;
    documentSummary: string;
    urgentActions: string[];
    decision: "Accept" | "Negotiate" | "Escalate" | "Request Clarification" | "Avoid";
    decisionReasoning: string;
  };
  executiveDashboard: {
    metrics: Array<{ key: string; label: string; displayValue: string; supportingText: string; tone: "gold" | "red" | "blue" | "green" }>;
    deliverables: Array<{ label: string; displayValue: string }>;
    attentionScore: number;
    contractHealthScore: number;
    negotiationSuccessReadiness: number;
    negotiationReadinessExplanation: string;
    highPriorityFindings: number;
    hiddenFeeCount: number;
    financialExposure: number;
  };
  executiveInsights: {
    insights: string[];
    surprise: { title: string; explanation: string };
    quickWins: string[];
    riskIfIgnored: string[];
    longTermCostProjection: string;
    industryBenchmarkSummary: string;
  };
  financialImpact: {
    originalTotal: number;
    confirmedCharges: number;
    recurringMonthlyExposure: number;
    estimatedAnnualExposure: number;
    contractTermExposure: number | null;
    possibleSavings: number;
    correctedTotal: number;
    explanation: string;
  };
  negotiationPlaybook: {
    objective: string;
    estimatedSavingsRange: string;
    leveragePoints: string[];
    priorityItems: string[];
    openingStatement: string;
    likelyObjections: { objection: string; response: string }[];
    concessions: string[];
    unacceptableTerms: string[];
    escalationPath: string[];
    walkAwayThreshold: string;
    followUpSchedule: string[];
    phoneScript: string;
    shortEmail: string;
    detailedEmail: string;
    renewalScript?: string;
    cancellationScript?: string;
  };
  visualizations: {
    costForecast: Array<{ label: string; value: number | null; displayValue: string; basis: string }>;
    savingsTimeline: Array<{ label: string; value: number; displayValue: string; basis: string }>;
    contractScorecard: Array<{ label: string; score: number; explanation: string }>;
    hiddenFeeHeatMap: Array<{ category: string; count: number; amount: number; severity: string }>;
    priorityMatrix: Array<{ findingId: string; title: string; urgency: string; financialImpact: string; quadrant: string }>;
    industryBenchmark: Array<{ dimension: string; documentPosition: string; professionalBestPractice: string; gap: string }>;
  };
  timeline: Array<{ event: string; date: string; location: string; evidence: string; recommendedAction: string }>;
  findings: PremiumFinding[];
  positiveTerms: PremiumInsightItem[];
  missingProtections: PremiumInsightItem[];
  watchLater: PremiumInsightItem[];
  actionPlan: { today: string[]; beforeSigning: string[]; duringNegotiation: string[]; afterSigning: string[]; beforeRenewal: string[] };
  providerQuestions: string[];
  escalationSteps: string[];
  checklists: {
    procurement: string[];
    attorneyReview: string[];
    negotiation: string[];
    renewalReadiness: string[];
    invoiceMonitoring: string[];
  };
  methodology: { coverage: string; limitations: string[]; unreadableAreas: string[]; assumptions: string[]; humanConfirmation: string[] };
}

// ── Job Status ─────────────────────────────────────────────────────────────
export type JobStatus =
  | "idle"
  | "uploading"
  | "reading"
  | "processing"
  | "building_report"
  | "extracted"
  | "awaiting_payment"
  | "paid"
  | "analyzing"
  | "complete"
  | "error";

// ── Job State (client) ─────────────────────────────────────────────────────
export interface JobState {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  error?: string;
  report?: AuditReport;
}
