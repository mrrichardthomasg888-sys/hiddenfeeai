// HiddenFeeAI — Trust Conversion Layer
// Improves privacy explanations, evidence explanations,
// AI transparency messaging, and security reassurance.
// Never makes unsupported claims.
// Privacy-safe: no PII, no document data.

// ── Types ──────────────────────────────────────────────────────────────────

export interface TrustSignal {
  signalId: string;
  placement: "landing_page" | "upload_area" | "payment_gate" | "report_header" | "report_footer" | "email";
  type: "privacy" | "security" | "ai_transparency" | "evidence" | "refund_policy" | "social_proof";
  message: string;
  currentTrustScore: number;    // 0-100, user trust perception
  optimization: string;
  mustNotClaim: string[];       // Claims we must NEVER make
}

export interface TrustConversionReport {
  generatedAt: string;
  overallTrustScore: number;
  signals: TrustSignal[];
  criticalGaps: string[];
  trustTips: string[];
}

// ── Trust Signals ──────────────────────────────────────────────────────────

export const TRUST_SIGNALS: TrustSignal[] = [
  {
    signalId: "ts-privacy-landing",
    placement: "landing_page",
    type: "privacy",
    message: "Your documents are encrypted and automatically deleted after processing.",
    currentTrustScore: 65,
    optimization: "Add specific detail: 'Documents deleted within 1 hour of analysis. We never store, share, or sell your data.' Specifics beat generic promises.",
    mustNotClaim: ["We never see your documents", "Your data is 100% safe", "Military-grade encryption without specifics"],
  },
  {
    signalId: "ts-privacy-upload",
    placement: "upload_area",
    type: "privacy",
    message: "We respect your privacy.",
    currentTrustScore: 50,
    optimization: "Replace with: 'Your document is encrypted during upload (TLS 1.3). After analysis, it's automatically deleted. Nobody at HiddenFeeAI reads your documents — only our AI processes them.'",
    mustNotClaim: ["Nobody can see your documents", "End-to-end encrypted", "Zero-knowledge without proof"],
  },
  {
    signalId: "ts-security-payment",
    placement: "payment_gate",
    type: "security",
    message: "Secure payment",
    currentTrustScore: 60,
    optimization: "Add Stripe + SSL badges. Add: 'Payments processed by Stripe — we never see your card details. 30-day refund if you're not satisfied.'",
    mustNotClaim: ["PCI DSS Level 1 unless certified", "Bank-level security without specifics"],
  },
  {
    signalId: "ts-ai-transparency",
    placement: "report_header",
    type: "ai_transparency",
    message: "AI-powered analysis",
    currentTrustScore: 55,
    optimization: "Replace with: 'Our AI scans your document line by line, comparing each charge against market benchmarks. Every finding includes the exact page and line where the fee was found.' — Shows the METHOD, not just the result.",
    mustNotClaim: ["100% accurate", "Never misses anything", "Better than a human lawyer"],
  },
  {
    signalId: "ts-evidence",
    placement: "report_header",
    type: "evidence",
    message: "Evidence-backed findings",
    currentTrustScore: 60,
    optimization: "Add audit trail: 'Found on page 3, line 42.' Include regulatory citations. Show comparison against benchmarks: 'This fee is 3x the state average.'",
    mustNotClaim: ["Legally binding", "Court-admissible", "Guaranteed to win disputes"],
  },
  {
    signalId: "ts-refund",
    placement: "payment_gate",
    type: "refund_policy",
    message: "30-day refund policy",
    currentTrustScore: 70,
    optimization: "Make refund policy prominent: 'Not satisfied? Get a full refund within 30 days — no questions asked.' Trust is built by making guarantees easy to find.",
    mustNotClaim: ["Lifetime guarantee", "Money-back forever"],
  },
  {
    signalId: "ts-social-proof",
    placement: "landing_page",
    type: "social_proof",
    message: "Trusted by consumers",
    currentTrustScore: 40,
    optimization: "Replace generic with specific: 'HiddenFeeAI has helped consumers identify over $X in hidden fees.' Use real aggregate numbers. Show testimonials with permission.",
    mustNotClaim: ["#1 rated without source", "Most trusted in America without data", "Millions of users unless verified"],
  },
  {
    signalId: "ts-how-it-works",
    placement: "landing_page",
    type: "ai_transparency",
    message: "Upload your document and get results",
    currentTrustScore: 50,
    optimization: "Add a simple 3-step visual: '1. Upload your document → 2. AI scans every line → 3. Get your audit report with negotiation guidance.' Show, don't just tell.",
    mustNotClaim: ["Instant results unless genuinely instant", "Works on any document without qualifying"],
  },
];

// ── Trust Gap Analysis ─────────────────────────────────────────────────────

export function analyzeTrustGaps(signals: TrustSignal[] = TRUST_SIGNALS): {
  criticalGaps: string[];
  lowestScoring: TrustSignal[];
  recommendations: string[];
} {
  const lowScoring = signals
    .filter((s) => s.currentTrustScore < 60)
    .sort((a, b) => a.currentTrustScore - b.currentTrustScore);

  const criticalGaps = lowScoring
    .filter((s) => s.currentTrustScore < 50)
    .map((s) => `${s.placement}: ${s.optimization}`);

  const recommendations = lowScoring.map(
    (s) => `[${s.placement}] ${s.message} → ${s.optimization}`,
  );

  return { criticalGaps, lowestScoring: lowScoring, recommendations };
}

// ── Trust Report ───────────────────────────────────────────────────────────

export function generateTrustConversionReport(): TrustConversionReport {
  const gaps = analyzeTrustGaps();
  const avgScore = Math.round(
    TRUST_SIGNALS.reduce((s, t) => s + t.currentTrustScore, 0) / TRUST_SIGNALS.length,
  );

  return {
    generatedAt: new Date().toISOString(),
    overallTrustScore: avgScore,
    signals: TRUST_SIGNALS,
    criticalGaps: gaps.criticalGaps,
    trustTips: [
      "Specifics beat generic promises. 'Deleted within 1 hour' > 'We respect your privacy'",
      "Show the method, not just the result. Explain HOW the AI works, not just THAT it works",
      "Evidence is the strongest trust signal. Page numbers, line references, regulatory citations",
      "Refund guarantees should be prominent and no-questions-asked — hidden policies breed suspicion",
      "Social proof must be specific and verifiable. 'Over $X found in hidden fees' beats 'Trusted by many'",
      "Never claim perfection. 'Our AI scans for common patterns' beats 'We catch everything'",
    ],
  };
}

export const CONVERSION_TRUST_VERSION = "5.0.0";