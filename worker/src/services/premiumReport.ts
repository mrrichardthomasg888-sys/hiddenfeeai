import type { AuditReport, Finding, ReportInsightItem } from "../types.js";

export type PremiumDecision = "Accept" | "Negotiate" | "Escalate" | "Request Clarification" | "Avoid";

export type PremiumReportSectionKey =
  | "executive-dashboard"
  | "executive-decision"
  | "negotiation-playbook"
  | "executive-insights"
  | "financial-impact"
  | "risk-scorecard"
  | "timeline"
  | "prioritized-findings"
  | "detailed-evidence"
  | "positive-terms"
  | "missing-protections"
  | "watch-later"
  | "professional-checklists"
  | "action-plan"
  | "provider-guidance"
  | "methodology";

export interface PremiumReportSection {
  key: PremiumReportSectionKey;
  eyebrow: string;
  title: string;
  description: string;
}

export const PREMIUM_REPORT_SECTIONS: PremiumReportSection[] = [
  { key: "executive-dashboard", eyebrow: "Audit command center", title: "Executive Dashboard", description: "The financial stakes, attention level, document coverage, and strongest decision signals in one view." },
  { key: "executive-decision", eyebrow: "Leadership brief", title: "Executive Decision Brief", description: "The recommended decision, reasoning, and three actions that matter most right now." },
  { key: "negotiation-playbook", eyebrow: "Premium negotiation assets", title: "Negotiation Playbook", description: "One consolidated strategy and script set for the entire document, personalized to the evidence and financial exposure." },
  { key: "executive-insights", eyebrow: "Decision intelligence", title: "AI Executive Insights", description: "The most important patterns, surprises, quick wins, consequences, and long-term implications surfaced by the audit." },
  { key: "financial-impact", eyebrow: "Cost intelligence", title: "Financial Impact and Cost Forecast", description: "Confirmed amounts, recurring exposure, possible savings, and forecast values with the calculation basis kept visible." },
  { key: "risk-scorecard", eyebrow: "Risk architecture", title: "Risk, Health, and Benchmark Scorecard", description: "Risk, contract health, negotiation readiness, priority distribution, fee concentration, and best-practice gaps." },
  { key: "timeline", eyebrow: "Important dates", title: "Timeline and Deadlines", description: "Renewal, cancellation, notice, price-change, trial, and other dates appear only when supporting evidence was returned." },
  { key: "prioritized-findings", eyebrow: "Executive issue register", title: "Prioritized Findings", description: "Every issue begins with a concise executive summary and is ranked by severity and evidence confidence." },
  { key: "detailed-evidence", eyebrow: "Evidence room", title: "Detailed Evidence", description: "Exact quotes, locations, financial impact, actions, questions, negotiability, and replacement language for every finding." },
  { key: "positive-terms", eyebrow: "Terms worth preserving", title: "Positive Terms and Protections", description: "Favorable language and protections to retain through revisions, negotiation, signing, and renewal." },
  { key: "missing-protections", eyebrow: "Protection gaps", title: "What Is Missing?", description: "Absent or unclear pricing, definitions, service protections, renewal language, and cancellation instructions to request." },
  { key: "watch-later", eyebrow: "Ongoing monitoring", title: "What to Watch Later", description: "Future invoices, renewals, usage limits, late fees, add-ons, and policy changes that deserve continued attention." },
  { key: "professional-checklists", eyebrow: "Execution controls", title: "Professional Review Checklists", description: "Procurement, attorney review, negotiation, renewal readiness, and invoice monitoring controls tailored to this audit." },
  { key: "action-plan", eyebrow: "Ranked next steps", title: "Start Here Action Plan", description: "Actions organized by contract stage: today, before signing, during negotiation, after signing, and before renewal." },
  { key: "provider-guidance", eyebrow: "Provider strategy", title: "Provider Questions and Escalation", description: "Focused questions, escalation steps, and the written record needed when the first answer is not enough." },
  { key: "methodology", eyebrow: "Evidence and reliability", title: "Methodology, Confidence, and Limitations", description: "Document coverage, uncertainty, assumptions, unreadable areas, and items requiring human confirmation." },
];

export interface PremiumFinding {
  id: string;
  title: string;
  category: string;
  severity: Finding["severity"] | "Informational";
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
    decision: PremiumDecision;
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
  positiveTerms: ReportInsightItem[];
  missingProtections: ReportInsightItem[];
  watchLater: ReportInsightItem[];
  actionPlan: {
    today: string[];
    beforeSigning: string[];
    duringNegotiation: string[];
    afterSigning: string[];
    beforeRenewal: string[];
  };
  providerQuestions: string[];
  escalationSteps: string[];
  checklists: {
    procurement: string[];
    attorneyReview: string[];
    negotiation: string[];
    renewalReadiness: string[];
    invoiceMonitoring: string[];
  };
  methodology: {
    coverage: string;
    limitations: string[];
    unreadableAreas: string[];
    assumptions: string[];
    humanConfirmation: string[];
  };
}

const unique = (values: Array<string | null | undefined>) => Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

export function normalizeConfidence(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  const percent = numeric > 0 && numeric <= 1 ? numeric * 100 : numeric;
  return Math.round(Math.min(100, percent) * 10) / 10;
}

function locationFor(finding: Finding): string {
  return finding.source_reference || finding.line_reference || (finding.page ? `Page ${finding.page}` : "Location not returned - verify in the original document");
}

function defaultAlternative(finding: Finding): string {
  if (/renew/i.test(finding.title + finding.category)) return "Renewal requires clear advance written notice and the customer's affirmative written consent; no automatic price increase applies.";
  if (/cancel|termination|exit/i.test(finding.title + finding.category)) return "The customer may cancel with reasonable written notice and without an undisclosed or disproportionate penalty.";
  if (/price|increase|adjust/i.test(finding.title + finding.category)) return "Pricing remains fixed during the stated term; any change requires advance written notice and the customer's written approval.";
  return `Any charge described as "${finding.title}" must be itemized, disclosed before agreement, and accepted in writing before it is billed.`;
}

function premiumFinding(finding: Finding): PremiumFinding {
  const amountText = finding.amount == null ? "an amount that is not clearly quantified" : money(finding.amount);
  return {
    id: finding.id,
    title: finding.title,
    category: finding.category,
    severity: finding.severity,
    confidence: normalizeConfidence(finding.confidence_score),
    amount: finding.amount,
    executiveSummary: `${finding.title} is a ${finding.severity.toLowerCase()}-priority ${finding.category.toLowerCase()} that ${finding.amount == null ? "is not fully quantified" : `carries a stated amount of ${money(finding.amount)}`}. ${finding.recommended_action}`,
    explanation: finding.explanation,
    whyItMatters: finding.why_it_matters || finding.explanation,
    evidenceQuote: finding.evidence,
    location: locationFor(finding),
    financialImpact: finding.financial_impact || (finding.amount == null
      ? "The document does not state a complete dollar impact. Request a written calculation before agreeing or paying."
      : `${money(finding.amount)} is explicitly associated with this item. Confirm whether it repeats and how it affects the full contract term.`),
    recommendedAction: finding.recommended_action,
    questionsToAsk: unique(finding.questions_to_ask?.length ? finding.questions_to_ask : [
      `What service or obligation does "${finding.title}" pay for?`,
      `Is ${amountText} mandatory, recurring, refundable, or negotiable?`,
      "Will you confirm the answer and any adjustment in writing?",
    ]),
    negotiability: finding.negotiability_assessment || `Challenge this item with the quoted evidence. Ask first for removal or clearer replacement language; accept a reduction only if the remaining obligation is fully documented.`,
    betterAlternativeLanguage: finding.alternative_language || defaultAlternative(finding),
    talkingPoint: finding.negotiation_message || `The document includes "${finding.title}" at ${locationFor(finding)}. Please explain the basis for it and confirm in writing whether it can be removed, reduced, or replaced with clearer terms.`,
  };
}

function fallbackInsight(title: string, explanation: string, action: string): ReportInsightItem {
  return { title, explanation, recommended_action: action };
}

function decisionFor(report: AuditReport, findings: PremiumFinding[]): PremiumDecision {
  if (report.premium_insights?.final_decision) return report.premium_insights.final_decision;
  if (findings.some((finding) => finding.severity === "Critical")) return "Escalate";
  if (findings.some((finding) => finding.severity === "High" || finding.severity === "Medium")) return "Negotiate";
  if (findings.length) return "Request Clarification";
  return "Accept";
}

function email(report: AuditReport, findings: PremiumFinding[], detailed: boolean): string {
  const issuer = report.document_meta?.issuer || "Customer Service Team";
  const priorities = findings.slice(0, detailed ? 5 : 2);
  const bullets = priorities.map((finding) => `- ${finding.title} (${finding.location}): ${finding.recommendedAction}`).join("\n");
  return `Subject: Written review request for ${report.document_meta?.document_type || "document"}\n\nDear ${issuer},\n\nI reviewed the document and need written clarification and proposed corrections for the following items:\n${bullets || "- Please confirm the complete pricing, renewal, cancellation, and fee terms in writing."}\n\n${detailed ? "Please identify the contractual basis and full-term cost for each item, then provide a revised document showing every agreed change. I am not authorizing disputed or unclear charges while this review is open.\n\n" : ""}Please respond in writing within five business days.\n\nThank you,\n[Your Name]\n[Account or contract number]`;
}

export function buildPremiumReport(report: AuditReport): PremiumReport {
  const sourceFindings = Array.isArray(report.findings) ? report.findings : [];
  const severityRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3, Informational: 4 };
  const findings = sourceFindings.map(premiumFinding).sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.confidence - a.confidence);
  const insights = report.premium_insights ?? {};
  const recurringMonthly = Number.isFinite(insights.recurring_monthly_exposure) ? Number(insights.recurring_monthly_exposure) : sourceFindings.filter((finding) => finding.charge_timing === "recurring").reduce((sum, finding) => sum + (finding.amount ?? 0), 0);
  const annual = Number.isFinite(insights.estimated_annual_exposure) ? Number(insights.estimated_annual_exposure) : recurringMonthly * 12;
  const savings = Math.max(0, Number(report.potential_savings) || 0);
  const conservative = Math.round(savings * 0.5 * 100) / 100;
  const optimistic = Math.round(savings * 1.5 * 100) / 100;
  const decision = decisionFor(report, findings);
  const urgentActions = unique(findings.slice(0, 3).map((finding) => finding.recommendedAction));
  if (!urgentActions.length) urgentActions.push("Confirm the complete fee schedule, renewal terms, cancellation process, and current pricing in writing before relying on the document.");
  const priorityItems = findings.slice(0, 5).map((finding) => `${finding.title}: ${finding.talkingPoint}`);
  const providerQuestions = unique([...(insights.provider_questions ?? []), ...findings.flatMap((finding) => finding.questionsToAsk)]).slice(0, 15);
  const modelPlaybook = insights.negotiation_playbook;
  const phoneScript = modelPlaybook?.phone_script || `Hello, I am calling about my ${report.document_meta?.document_type || "document"}. I reviewed the written terms and need clarification on ${findings.slice(0, 3).map((finding) => finding.title).join(", ") || "the complete pricing, renewal, and cancellation terms"}. Please explain the contractual basis and full-term cost of each item. I would like disputed charges removed or the language revised, and I need any agreement confirmed in writing. If you cannot make that change, please connect me with someone authorized to review pricing and contract terms.`;
  const positiveTerms = insights.positive_terms?.length ? insights.positive_terms : [
    fallbackInsight("Preserve clear written pricing", "Keep any fixed prices, included services, discounts, credits, and caps that are stated unambiguously in the source document.", "Ask the provider to carry these protections into every revision and renewal."),
    fallbackInsight("Preserve written notice rights", "Keep any clause requiring advance written notice before renewal, cancellation deadlines, or pricing changes.", "Save the final signed version and all notices with the report."),
  ];
  const missingProtections = insights.missing_protections?.length ? insights.missing_protections : [
    fallbackInsight("Complete fee schedule", "Confirm whether every mandatory, optional, recurring, pass-through, usage, tax, and cancellation charge is listed with a calculation method.", "Request an attached fee schedule that controls over conflicting marketing or invoice language."),
    fallbackInsight("Price-change protection", "Confirm whether pricing can change during the term and what notice or consent is required.", "Request fixed pricing or a defined cap plus an opt-out right."),
    fallbackInsight("Clear cancellation instructions", "Confirm the exact method, address, deadline, notice period, and proof required to cancel or prevent renewal.", "Request a written cancellation procedure and calendar the deadline."),
  ];
  const watchLater = insights.watch_items?.length ? insights.watch_items : [
    fallbackInsight("Future invoices", "Compare each invoice with the agreed fee schedule for new, renamed, duplicated, or increased charges.", "Keep the first invoice as a baseline and dispute changes promptly."),
    fallbackInsight("Renewal and policy notices", "Watch email, portal, and billing notices for renewal, usage, pricing, and policy changes.", "Calendar a review at least 60 days before renewal unless the document requires earlier notice."),
    fallbackInsight("Usage and late-fee triggers", "Monitor thresholds, minimum commitments, overages, late fees, and add-ons that can change the effective price.", "Ask for alerts before a threshold or penalty is triggered."),
  ];
  const escalationSteps = unique(insights.escalation_steps?.length ? insights.escalation_steps : [
    "Ask the first representative to identify the written basis for each disputed item.",
    "Request a billing or contract specialist with authority to revise pricing and terms.",
    "Send the detailed email and request a written response with a revised document.",
    "If the response conflicts with the source document, escalate to a supervisor or formal dispute channel and preserve all records.",
  ]);
  const clampScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
  const riskScore = Math.max(0, Math.min(100, Number(report.risk_score) || 0));
  const confidence = normalizeConfidence(report.confidence_level);
  const highPriorityFindings = findings.filter((finding) => finding.severity === "Critical" || finding.severity === "High").length;
  const hiddenFeeCount = findings.filter((finding) => /fee|charge|surcharge|assessment|tax/i.test(`${finding.category} ${finding.title}`)).length;
  const evidenceLinked = findings.filter((finding) => finding.evidenceQuote && !finding.location.startsWith("Location not returned")).length;
  const evidenceCoverage = findings.length ? evidenceLinked / findings.length : 1;
  const negotiationSuccessReadiness = Math.min(95, clampScore(confidence * 0.45 + evidenceCoverage * 35 + (findings.length ? 20 : 15)));
  const contractHealthScore = clampScore(100 - riskScore);
  const financialExposure = insights.contract_term_exposure != null
    ? Math.max(0, Number(insights.contract_term_exposure) || 0)
    : annual > 0 ? annual : Number(report.financial_impact?.questionable_charges_total) || 0;
  const scorecard = [
    { label: "Pricing clarity", score: clampScore(100 - findings.filter((finding) => finding.amount == null).length * 14 - hiddenFeeCount * 5), explanation: "Rewards quantified pricing and penalizes unpriced or fee-related findings." },
    { label: "Renewal safety", score: clampScore(100 - findings.filter((finding) => /renew|price change/i.test(`${finding.title} ${finding.category}`)).length * 24), explanation: "Reflects auto-renewal, notice-window, and renewal-price findings." },
    { label: "Cancellation flexibility", score: clampScore(100 - findings.filter((finding) => /cancel|termination|exit/i.test(`${finding.title} ${finding.category}`)).length * 28), explanation: "Reflects cancellation instructions, exit rights, and termination penalties." },
    { label: "Fee transparency", score: clampScore(100 - hiddenFeeCount * 13), explanation: "Reflects the number of fee, surcharge, assessment, tax, and charge findings." },
    { label: "Evidence quality", score: clampScore(confidence), explanation: "Uses the normalized document-analysis confidence shown throughout this report." },
  ];
  const heatMap = Array.from(findings.reduce((groups, finding) => {
    const current = groups.get(finding.category) ?? { category: finding.category, count: 0, amount: 0, severity: finding.severity };
    current.count += 1;
    current.amount += finding.amount ?? 0;
    if ((severityRank[finding.severity] ?? 9) < (severityRank[current.severity] ?? 9)) current.severity = finding.severity;
    groups.set(finding.category, current);
    return groups;
  }, new Map<string, { category: string; count: number; amount: number; severity: string }>()).values())
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || b.amount - a.amount);
  const positionFor = (score: number) => score >= 80 ? "Strong" : score >= 60 ? "Watch" : score >= 40 ? "Material gap" : "Critical gap";
  const benchmark = scorecard.map((item) => ({
    dimension: item.label,
    documentPosition: `${positionFor(item.score)} (${item.score}/100)`,
    professionalBestPractice: item.label === "Pricing clarity" ? "All mandatory, optional, recurring, and conditional costs are itemized and calculable."
      : item.label === "Renewal safety" ? "Renewal requires clear notice, known pricing, and a practical opt-out."
        : item.label === "Cancellation flexibility" ? "Cancellation steps and deadlines are explicit, reasonable, and proportionate."
          : item.label === "Fee transparency" ? "No vague, duplicated, pass-through, or undefined fee categories remain."
            : "Every decision-critical conclusion links to readable source evidence.",
    gap: item.score >= 80 ? "No material best-practice gap indicated by the structured findings." : `Improve the ${item.label.toLowerCase()} controls identified in this report before acceptance or renewal.`,
  }));
  const immediateSavings = savings ? Math.min(savings, Number(report.financial_impact?.questionable_charges_total) || savings) : 0;
  const firstYearSavings = savings ? Math.min(savings, immediateSavings + Math.max(0, annual)) : 0;
  const highestImpactFinding = [...findings].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0) || severityRank[a.severity] - severityRank[b.severity])[0];
  const riskIfIgnored = unique(findings.slice(0, 4).map((finding) => `${finding.title}: ${finding.whyItMatters}`));
  if (!riskIfIgnored.length) riskIfIgnored.push("A clean finding set does not remove future risk: verify renewal pricing, cancellation mechanics, usage thresholds, and every invoice against the final agreement.");
  const longTermCostProjection = insights.contract_term_exposure != null
    ? `The supported full-contract exposure is ${money(Number(insights.contract_term_exposure))}. The report does not extend that figure beyond the documented term.`
    : annual > 0
      ? `The supported recurring amounts project to ${money(annual)} over 12 months. A full-contract total is not shown because the submitted evidence did not support both duration and frequency.`
      : `No reliable recurring or full-term total can be calculated from the structured evidence. Request the charge frequency and contract duration in writing before relying on a long-term estimate.`;
  const actionPlan = {
    today: unique(urgentActions),
    beforeSigning: unique(["Do not sign until all critical and high findings are resolved in a revised document.", ...findings.slice(0, 3).map((finding) => finding.recommendedAction)]),
    duringNegotiation: unique(["Use the consolidated opening statement, then work through the priority items one at a time.", "Ask for every concession and explanation in writing."]),
    afterSigning: unique(["Save the signed agreement, fee schedule, order form, and all written exceptions together.", "Compare the first invoice with the agreed totals and dispute differences promptly."]),
    beforeRenewal: unique(["Review the renewal price, notice window, cancellation method, and any policy changes before the earliest stated deadline.", "Re-run the cost forecast using current usage and the next-term fee schedule."]),
  };
  const actionCount = Object.values(actionPlan).reduce((count, items) => count + items.length, 0);
  const negotiationAssetCount = 3 + Number(Boolean(modelPlaybook?.renewal_script || findings.some((finding) => /renew/i.test(finding.title + finding.category)))) + Number(Boolean(modelPlaybook?.cancellation_script || findings.some((finding) => /cancel|termination|exit/i.test(finding.title + finding.category))));

  return {
    sectionOrder: PREMIUM_REPORT_SECTIONS.map((section) => ({ ...section })),
    reportId: report.document_meta?.report_id || "",
    documentType: report.document_meta?.document_type || "Document",
    issuer: report.document_meta?.issuer || "",
    payer: report.document_meta?.payer || "",
    analysisDate: report.document_meta?.analysis_date || new Date().toISOString(),
    executiveOverview: {
      riskScore,
      riskLevel: report.risk_level || "Review Recommended",
      potentialSavings: savings,
      totalFindings: findings.length,
      pagesReviewed: Math.max(0, Number(report.document_meta?.pages_reviewed) || 0),
      confidence,
      documentSummary: insights.document_summary || (findings.length
        ? `The review identified ${findings.length} evidence-linked item${findings.length === 1 ? "" : "s"}. Use the prioritized findings and consolidated playbook before accepting or paying disputed terms.`
        : "No major hidden fee was confirmed in the structured findings. The health-check sections below still identify protections to preserve, details to verify, and future risks to monitor."),
      urgentActions,
      decision,
      decisionReasoning: insights.decision_reasoning || (findings.length
        ? `${decision} because the document contains ${findings.filter((finding) => finding.severity === "Critical" || finding.severity === "High").length} critical or high-priority item(s) and ${findings.length} total finding(s) that should be resolved in writing.`
        : "Accept only after confirming the pricing, renewal, cancellation, and service details in the original document; no major hidden fee was confirmed by this audit."),
    },
    executiveDashboard: {
      metrics: [
        { key: "potential-savings", label: "Potential Savings", displayValue: money(savings), supportingText: "Estimated opportunity from the evidence reviewed", tone: "gold" },
        { key: "attention-score", label: "Attention Score", displayValue: `${riskScore}/100`, supportingText: `${report.risk_level || "Review Recommended"} attention level`, tone: riskScore >= 70 ? "red" : "gold" },
        { key: "high-priority", label: "High Priority Findings", displayValue: String(highPriorityFindings), supportingText: "Critical and high-severity items", tone: highPriorityFindings ? "red" : "green" },
        { key: "hidden-fees", label: "Hidden Fees", displayValue: String(hiddenFeeCount), supportingText: "Fee, charge, surcharge, tax, or assessment findings", tone: hiddenFeeCount ? "gold" : "green" },
        { key: "financial-exposure", label: "Financial Exposure", displayValue: money(financialExposure), supportingText: insights.contract_term_exposure != null ? "Supported full-contract exposure" : annual > 0 ? "Supported 12-month recurring exposure" : "Confirmed questionable charges", tone: "red" },
        { key: "evidence-confidence", label: "Evidence Confidence", displayValue: `${confidence}%`, supportingText: `${evidenceLinked} of ${findings.length || 0} findings linked to evidence`, tone: "blue" },
        { key: "pages-reviewed", label: "Pages Reviewed", displayValue: String(Math.max(0, Number(report.document_meta?.pages_reviewed) || 0)), supportingText: `${Math.max(0, Number(report.document_meta?.line_items_reviewed) || 0)} line items reported reviewed`, tone: "blue" },
      ],
      deliverables: [
        { label: "Evidence-linked findings", displayValue: String(evidenceLinked) },
        { label: "Prioritized actions", displayValue: String(actionCount) },
        { label: "Negotiation assets", displayValue: String(negotiationAssetCount) },
        { label: "Pages reviewed", displayValue: String(Math.max(0, Number(report.document_meta?.pages_reviewed) || 0)) },
      ],
      attentionScore: riskScore,
      contractHealthScore,
      negotiationSuccessReadiness,
      negotiationReadinessExplanation: "A readiness indicator based on evidence confidence, finding-to-source coverage, and whether the audit identified concrete negotiation targets. It is not a guarantee of provider acceptance.",
      highPriorityFindings,
      hiddenFeeCount,
      financialExposure,
    },
    executiveInsights: {
      insights: unique([
        insights.document_summary || (findings.length ? `${findings.length} evidence-linked finding(s) require a documented response before the decision is final.` : "No major hidden fee was confirmed, but the contract-health controls still require verification."),
        `${highPriorityFindings} critical or high-priority finding(s) drive the current ${report.risk_level || "review"} attention level.`,
        `${evidenceLinked} of ${findings.length || 0} finding(s) include a usable source quote and location; uncertain areas remain explicitly listed in Methodology.`,
      ]),
      surprise: highestImpactFinding
        ? { title: highestImpactFinding.title, explanation: `${highestImpactFinding.amount == null ? "The financial amount is not stated, which is itself a decision gap." : `${money(highestImpactFinding.amount)} is the largest stated single-item amount in the findings.`} ${highestImpactFinding.whyItMatters}` }
        : { title: "No major hidden fee was confirmed", explanation: "The strongest value is preventive: preserve favorable terms, close missing protections, verify future pricing, and calendar renewal and cancellation controls." },
      quickWins: urgentActions,
      riskIfIgnored,
      longTermCostProjection,
      industryBenchmarkSummary: "This comparison uses transparent professional contract-review best practices, not an invented proprietary industry average. Any external market-price comparison requires verified peer data for the same service, geography, volume, and term.",
    },
    financialImpact: {
      originalTotal: Number(report.financial_impact?.original_total) || 0,
      confirmedCharges: Number.isFinite(insights.confirmed_charges) ? Number(insights.confirmed_charges) : Number(report.financial_impact?.questionable_charges_total) || 0,
      recurringMonthlyExposure: recurringMonthly,
      estimatedAnnualExposure: annual,
      contractTermExposure: insights.contract_term_exposure == null ? null : Number(insights.contract_term_exposure),
      possibleSavings: savings,
      correctedTotal: Number(report.financial_impact?.corrected_total) || 0,
      explanation: insights.calculation_explanation || "Confirmed charges use amounts explicitly returned from the document review. Annual exposure multiplies confirmed monthly recurring amounts by 12. Contract-term exposure is omitted unless the document supplies enough term and frequency information.",
    },
    negotiationPlaybook: {
      objective: modelPlaybook?.objective || `Resolve the highest-impact charges and clauses in writing before payment, signature, renewal, or the next cancellation deadline.`,
      estimatedSavingsRange: savings ? `${money(conservative)} - ${money(optimistic)} estimated; ${money(savings)} most likely` : "No reliable dollar range can be calculated until the provider confirms the disputed amounts and frequency.",
      leveragePoints: unique(modelPlaybook?.leverage_points?.length ? modelPlaybook.leverage_points : [
        `${findings.filter((finding) => finding.evidenceQuote).length} finding(s) include source evidence you can quote directly.`,
        "A written request creates a record and makes it easier to compare the response with the original terms.",
        "Requesting full-term cost and calculation details forces vague fees and unilateral terms into specific numbers.",
      ]),
      priorityItems: modelPlaybook?.priority_items?.length ? modelPlaybook.priority_items : (priorityItems.length ? priorityItems : ["Verify the complete price, renewal, cancellation, and fee schedule in writing."]),
      openingStatement: modelPlaybook?.opening_statement || phoneScript.split(". ").slice(0, 2).join(". ") + ".",
      likelyObjections: modelPlaybook?.likely_objections?.length ? modelPlaybook.likely_objections : [
        { objection: "The charge is standard or system-generated.", response: "Please show me where it was disclosed and agreed, explain what it pays for, and identify who can authorize a waiver or credit." },
        { objection: "The contract cannot be changed.", response: "Please escalate this to someone authorized to issue an amendment, addendum, account credit, or written exception." },
        { objection: "The amount is small.", response: "Please calculate the monthly, annual, and full-term total. I am evaluating the cumulative cost and the clarity of the agreement." },
      ],
      concessions: modelPlaybook?.concessions?.length ? modelPlaybook.concessions : ["Offer prompt signature or payment only after the agreed correction is documented.", "Consider a reasonable commitment only in exchange for fixed pricing, clear service levels, and a clean exit right."],
      unacceptableTerms: modelPlaybook?.unacceptable_terms?.length ? modelPlaybook.unacceptable_terms : ["Undisclosed or undefined fees", "Unilateral price changes without notice and an opt-out", "Automatic renewal without a clear cancellation method and deadline", "Verbal promises that are not added to the written agreement"],
      escalationPath: modelPlaybook?.escalation_path?.length ? modelPlaybook.escalation_path : escalationSteps,
      walkAwayThreshold: modelPlaybook?.walk_away_threshold || "Do not accept unresolved critical findings, unquantified recurring exposure, or a refusal to document promised corrections. Seek an alternative or qualified review if those remain.",
      followUpSchedule: modelPlaybook?.follow_up_schedule?.length ? modelPlaybook.follow_up_schedule : ["Send a written recap the same day.", "Follow up after two business days if no owner is assigned.", "Request a final written decision within five business days.", "Recheck the next invoice and calendar renewal/cancellation dates."],
      phoneScript,
      shortEmail: modelPlaybook?.short_email || email(report, findings, false),
      detailedEmail: modelPlaybook?.detailed_email || email(report, findings, true),
      renewalScript: modelPlaybook?.renewal_script || (findings.some((finding) => /renew/i.test(finding.title + finding.category)) ? "Before renewal, I need the complete next-term price, every recurring or one-time fee, and the cancellation deadline in writing. I will not authorize renewal until the disputed terms are resolved and the revised agreement is provided." : undefined),
      cancellationScript: modelPlaybook?.cancellation_script || (findings.some((finding) => /cancel|termination|exit/i.test(finding.title + finding.category)) ? "I am giving notice that I want to cancel or opt out. Please confirm the effective date, final amount, return requirements, and that no additional renewal or termination charge will be applied unless you identify the exact agreed clause in writing." : undefined),
    },
    visualizations: {
      costForecast: [
        { label: "Monthly recurring", value: recurringMonthly, displayValue: money(recurringMonthly), basis: "Only amounts identified as recurring." },
        { label: "Estimated annual", value: annual, displayValue: money(annual), basis: "Monthly recurring exposure multiplied by 12 unless a supported annual figure was returned." },
        { label: "Full contract", value: insights.contract_term_exposure == null ? null : Number(insights.contract_term_exposure), displayValue: insights.contract_term_exposure == null ? "Not reliably calculable" : money(Number(insights.contract_term_exposure)), basis: "Shown only when both duration and charge frequency are supported." },
      ],
      savingsTimeline: [
        { label: "Immediate corrections", value: immediateSavings, displayValue: money(immediateSavings), basis: "Potential savings capped by confirmed questionable charges where available." },
        { label: "First 12 months", value: firstYearSavings, displayValue: money(firstYearSavings), basis: "Adds supported annual recurring exposure without exceeding the total savings estimate." },
        { label: "Full-term opportunity", value: savings, displayValue: money(savings), basis: "The canonical potential-savings estimate used throughout this report." },
      ],
      contractScorecard: scorecard,
      hiddenFeeHeatMap: heatMap,
      priorityMatrix: findings.map((finding) => ({ findingId: finding.id, title: finding.title, urgency: finding.severity, financialImpact: finding.amount == null ? "Amount not stated" : money(finding.amount), quadrant: finding.severity === "Critical" || finding.severity === "High" ? (finding.amount == null || finding.amount > 0 ? "Act now" : "Clarify now") : finding.amount && finding.amount > 0 ? "Plan and negotiate" : "Monitor and clarify" })),
      industryBenchmark: benchmark,
    },
    timeline: (insights.timeline ?? []).map((item) => ({ event: item.event, date: item.date, location: item.source_reference, evidence: item.evidence, recommendedAction: item.recommended_action })),
    findings,
    positiveTerms,
    missingProtections,
    watchLater,
    actionPlan,
    providerQuestions,
    escalationSteps,
    checklists: {
      procurement: unique(["Reconcile the order form, master agreement, fee schedule, statements of work, and referenced policies.", "Require a complete pricing exhibit covering mandatory, optional, recurring, pass-through, usage, tax, renewal, and exit charges.", "Document the business owner, service need, alternatives considered, total cost, renewal owner, and approval authority.", ...findings.slice(0, 2).map((finding) => `Resolve procurement item: ${finding.title}.`)]),
      attorneyReview: unique(["Review liability, indemnification, arbitration, venue, warranty, privacy, security, data ownership, and unilateral amendment rights.", "Confirm that defined terms, incorporated documents, precedence clauses, termination rights, and remedies do not conflict.", "Verify every critical or high finding and any replacement language before signature.", ...findings.filter((finding) => finding.severity === "Critical").map((finding) => `Prioritize legal review of ${finding.title}.`)]),
      negotiation: unique(["Lead with the consolidated opening statement and work through priority items one at a time.", "Ask for removal first, then a cap, credit, fixed price, or clearer replacement language.", "Do not trade away cancellation, notice, pricing, or evidence protections for an undocumented promise.", "Send a same-day written recap and require a revised document before treating a concession as final."]),
      renewalReadiness: unique(["Confirm the renewal date, notice window, cancellation method, next-term price, and any minimum commitment.", "Set an internal owner and calendar reminders before the earliest possible notice deadline.", "Compare renewal pricing and service levels with the signed agreement, current invoices, usage, and alternative providers.", "Use the renewal script and preserve proof of every notice or opt-out."]),
      invoiceMonitoring: unique(["Compare each invoice against the approved fee schedule and first clean invoice baseline.", "Flag renamed, duplicated, new, increased, usage, overage, late, tax, surcharge, and pass-through items.", "Recalculate subtotals, taxes, credits, discounts, and the final total.", "Dispute unexplained differences promptly and preserve the invoice, supporting evidence, and provider response."]),
    },
    methodology: {
      coverage: `${Math.max(0, Number(report.document_meta?.pages_reviewed) || 0)} page(s) and ${Math.max(0, Number(report.document_meta?.line_items_reviewed) || 0)} line item(s) were reported as reviewed. Findings retain the source quote and location returned by the document analysis.`,
      limitations: ["This report is decision support, not legal, tax, accounting, or financial advice.", "Estimates are labeled and depend on the amounts, frequency, and term visible in the submitted file."],
      unreadableAreas: insights.unreadable_areas?.length ? insights.unreadable_areas : ["No unreadable area was specifically reported. Verify scans, handwriting, cropped images, and faint fine print against the original."],
      assumptions: insights.assumptions?.length ? insights.assumptions : ["Amounts are treated as one-time unless the source analysis explicitly identifies them as recurring.", "No contract-term total is shown unless both duration and charge frequency are supported."],
      humanConfirmation: unique(findings.filter((finding) => finding.confidence < 85 || finding.location.startsWith("Location not returned")).map((finding) => `${finding.title}: confirm the quote, amount, and location in the original document.`).concat(["Confirm all deadlines and revised terms directly with the provider in writing."])),
    },
  };
}
