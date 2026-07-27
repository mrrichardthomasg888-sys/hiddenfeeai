// HiddenFeeAI — Customer Value Optimization
// Improves value summary wording, savings explanations,
// risk explanations, and recommended actions.
// Goal: Users immediately understand "What did I get for my money?"
// Privacy-safe: anonymous engagement data only. No document contents.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ValueMessage {
  messageId: string;
  context: "payment_prompt" | "report_header" | "finding_card" | "summary_section" | "email_subject" | "share_text";
  currentWording: string;
  optimizedWording: string;
  rationale: string;
  expectedLift: string;        // e.g., "+15% conversion"
}

export interface ValuePerception {
  category: "financial_impact" | "actionability" | "education" | "trust" | "convenience";
  currentScore: number;        // 0-100, user perception
  targetScore: number;
  improvementSuggestions: string[];
}

export interface ValueOptimizationReport {
  generatedAt: string;
  overallValueScore: number;
  perceptions: ValuePerception[];
  messageOptimizations: ValueMessage[];
  quickWins: string[];
}

// ── Value Message Optimizations ────────────────────────────────────────────

export const VALUE_MESSAGE_OPTIMIZATIONS: ValueMessage[] = [
  {
    messageId: "vm-payment-headline",
    context: "payment_prompt",
    currentWording: "Unlock Your Full Report",
    optimizedWording: "Your Report Found $450 in Hidden Fees — See Every Finding",
    rationale: "Generic headlines don't convey value. Specific dollar amounts create urgency and demonstrate concrete value.",
    expectedLift: "+20-30% payment conversion",
  },
  {
    messageId: "vm-payment-subhead",
    context: "payment_prompt",
    currentWording: "Get the complete analysis with all findings",
    optimizedWording: "3 hidden fees found totaling $450. Get the full audit with negotiation scripts to challenge every charge.",
    rationale: "Quantify what the user gets. 'Negotiation scripts' is a concrete, actionable deliverable.",
    expectedLift: "+15-25% payment conversion",
  },
  {
    messageId: "vm-report-header",
    context: "report_header",
    currentWording: "Audit Report",
    optimizedWording: "You Could Save $450 — Here's How",
    rationale: "Lead with the outcome, not the process. 'Audit Report' is a label; savings is a result.",
    expectedLift: "+10% report completion rate",
  },
  {
    messageId: "vm-finding-card",
    context: "finding_card",
    currentWording: "Documentation Fee: $450 — Severity: High",
    optimizedWording: "⚠️ $450 Documentation Fee — 3x the State Average. This is Negotiable.",
    rationale: "Context and actionability: tell the user the fee is high relative to benchmark AND what to do about it.",
    expectedLift: "+25% negotiation script copies",
  },
  {
    messageId: "vm-summary-risk",
    context: "summary_section",
    currentWording: "Risk Score: 72/100 — Elevated",
    optimizedWording: "This contract has a 72% risk of containing unnecessary fees. Bottom line: you're paying ~$450 more than you should.",
    rationale: "Risk scores without interpretation are meaningless. Translate to dollars and plain language.",
    expectedLift: "+15% report engagement",
  },
  {
    messageId: "vm-email-subject",
    context: "email_subject",
    currentWording: "Your HiddenFeeAI Report is Ready",
    optimizedWording: "We found $450 in fees you can challenge — here's how",
    rationale: "Tease the value. The word 'challenge' implies agency and actionability.",
    expectedLift: "+30% email open rate",
  },
  {
    messageId: "vm-share-text",
    context: "share_text",
    currentWording: "I used HiddenFeeAI to check my contract",
    optimizedWording: "HiddenFeeAI found $450 in hidden fees in my car purchase agreement. You should check yours too.",
    rationale: "Specific dollar amounts make word-of-mouth compelling. Social proof with concrete numbers.",
    expectedLift: "+40% share rate",
  },
  {
    messageId: "vm-convenience",
    context: "payment_prompt",
    currentWording: "One-time payment of $0.99",
    optimizedWording: "Save $450 for $0.99 — 450x return on a 99¢ investment",
    rationale: "Frame price as ROI, not cost. '450x return' reframes the purchase as a no-brainer.",
    expectedLift: "+15% payment conversion",
  },
];

// ── Value Perception Scoring ───────────────────────────────────────────────

export function assessValuePerception(
  signals: {
    paymentConversionRate: number;
    reportEngagementScore: number;
    scriptCopyRate: number;
    repeatRate: number;
  },
): ValuePerception[] {
  return [
    {
      category: "financial_impact",
      currentScore: Math.round(signals.paymentConversionRate * 0.8),
      targetScore: 60,
      improvementSuggestions: [
        "Show specific dollar amounts in payment prompt",
        "Add 'You could save $X' in report header",
        "Display total savings prominently at report top",
      ],
    },
    {
      category: "actionability",
      currentScore: Math.round(signals.scriptCopyRate * 1.5),
      targetScore: 50,
      improvementSuggestions: [
        "Add one-click 'Copy Negotiation Script' buttons",
        "Show step-by-step 'What to do next' checklist",
        "Include deadline urgency: 'Challenge this fee within 30 days'",
      ],
    },
    {
      category: "education",
      currentScore: Math.round(signals.reportEngagementScore * 0.7),
      targetScore: 55,
      improvementSuggestions: [
        "Add 'Why this matters' section to each finding",
        "Link fee explanations to industry-specific guides",
        "Include regulatory references for credibility",
      ],
    },
    {
      category: "trust",
      currentScore: 65,
      targetScore: 80,
      improvementSuggestions: [
        "Add 'How our AI works' transparency section",
        "Display audit trail: 'This fee was found on page 3, line 42'",
        "Show evidence citations with each finding",
      ],
    },
    {
      category: "convenience",
      currentScore: 70,
      targetScore: 75,
      improvementSuggestions: [
        "Add PDF download with one click",
        "Enable email report delivery",
        "Add 'Compare with another document' feature",
      ],
    },
  ];
}

// ── Report ─────────────────────────────────────────────────────────────────

export function generateValueOptimizationReport(
  signals: {
    paymentConversionRate: number;
    reportEngagementScore: number;
    scriptCopyRate: number;
    repeatRate: number;
  },
): ValueOptimizationReport {
  const perceptions = assessValuePerception(signals);
  const overallScore = Math.round(
    perceptions.reduce((s, p) => s + p.currentScore, 0) / Math.max(perceptions.length, 1),
  );

  return {
    generatedAt: new Date().toISOString(),
    overallValueScore: overallScore,
    perceptions,
    messageOptimizations: VALUE_MESSAGE_OPTIMIZATIONS,
    quickWins: [
      "Change payment headline to include specific savings amount — highest impact, easiest change",
      "Rephrase risk score as dollar impact — makes abstract numbers concrete",
      "Add 'Copy Script' buttons to all findings — increases actionability",
      "Optimize email subject lines with savings teasers",
    ],
  };
}

export const CUSTOMER_VALUE_VERSION = "5.0.0";