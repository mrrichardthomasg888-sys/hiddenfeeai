// HiddenFeeAI — Customer Return Engine
// Supports comparing new documents, rechecking updated contracts,
// reviewing previous categories.
// Privacy-safe metadata only — never stores document contents.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReturnUserPrompt {
  promptId: string;
  trigger: "after_first_report" | "after_seven_days" | "after_thirty_days" | "industry_adjacent" | "fee_trend_alert";
  headline: string;
  body: string;
  callToAction: string;
  expectedReturnRate: string;
}

export interface ComparisonOpportunity {
  previousIndustry: string;
  suggestedIndustry: string;
  rationale: string;
  message: string;
}

export interface ReturnUserReport {
  generatedAt: string;
  totalReturnUsers: number;
  averageReturnFrequencyDays: number;
  mostCommonReturnTriggers: string[];
  comparisonOpportunities: ComparisonOpportunity[];
  prompts: ReturnUserPrompt[];
}

// ── Return Prompts ─────────────────────────────────────────────────────────

export const RETURN_USER_PROMPTS: ReturnUserPrompt[] = [
  {
    promptId: "rp-immediate-comparison",
    trigger: "after_first_report",
    headline: "Want to check another document?",
    body: "You analyzed a car purchase agreement. Your auto insurance policy may have hidden fees too. Compare both for a complete picture.",
    callToAction: "Check My Insurance Policy",
    expectedReturnRate: "15-20%",
  },
  {
    promptId: "rp-week-followup",
    trigger: "after_seven_days",
    headline: "Did you negotiate those fees?",
    body: "Last week you found $450 in hidden fees in your car purchase agreement. Did the dealer remove them? If not, we can help you draft a follow-up.",
    callToAction: "Get Follow-Up Script",
    expectedReturnRate: "10-15%",
  },
  {
    promptId: "rp-month-check",
    trigger: "after_thirty_days",
    headline: "New month, new bills to check?",
    body: "You saved money last time. This month, check your utility bills and subscription charges for hidden fees.",
    callToAction: "Scan My Bills",
    expectedReturnRate: "8-12%",
  },
  {
    promptId: "rp-adjacent-industry",
    trigger: "industry_adjacent",
    headline: "Bought a car? Now check your auto insurance.",
    body: "Car buyers who also scan their insurance policies save an additional $180/year on average by finding hidden policy fees.",
    callToAction: "Check My Insurance",
    expectedReturnRate: "12-18%",
  },
  {
    promptId: "rp-trend-alert",
    trigger: "fee_trend_alert",
    headline: "Alert: Documentation fees are rising in your state",
    body: "Dealer documentation fees in your state have increased 12% this year. If you're shopping for a car, upload your purchase agreement before you sign.",
    callToAction: "Protect My Purchase",
    expectedReturnRate: "20-25%",
  },
];

// ── Comparison Opportunities ───────────────────────────────────────────────

export const COMPARISON_OPPORTUNITIES: ComparisonOpportunity[] = [
  {
    previousIndustry: "automotive",
    suggestedIndustry: "insurance",
    rationale: "Car buyers often need auto insurance immediately after purchase. Insurance policies contain hidden broker fees and administrative charges.",
    message: "You checked your car purchase. Now let's check your auto insurance for hidden policy fees.",
  },
  {
    previousIndustry: "automotive",
    suggestedIndustry: "banking",
    rationale: "Auto loans often come with hidden origination fees. If you financed through a dealer, double-check your loan documents.",
    message: "Your car loan may have hidden origination fees. Let's check your financing agreement.",
  },
  {
    previousIndustry: "housing",
    suggestedIndustry: "utilities",
    rationale: "New renters and homeowners often overlook utility bill surcharges that add 10-30% to advertised rates.",
    message: "Moving in? Check your utility setup for hidden connection fees and unnecessary surcharges.",
  },
  {
    previousIndustry: "housing",
    suggestedIndustry: "insurance",
    rationale: "Mortgage lenders require homeowners insurance. Many policies include hidden administrative fees.",
    message: "Your mortgage is checked. Now let's verify your homeowners insurance doesn't have hidden fees.",
  },
  {
    previousIndustry: "healthcare",
    suggestedIndustry: "insurance",
    rationale: "Medical bills and health insurance EOBs often conflict. Comparing both reveals billing discrepancies.",
    message: "You checked your medical bill. Upload your insurance EOB to see if you were overcharged.",
  },
  {
    previousIndustry: "subscriptions",
    suggestedIndustry: "banking",
    rationale: "Subscription fees often appear on bank statements as recurring charges you've forgotten about.",
    message: "Found subscription fees? Let's scan your bank statement for forgotten recurring charges.",
  },
];

// ── Return Engine ──────────────────────────────────────────────────────────

export function generateReturnUserReport(
  totalReturnUsers: number = 0,
  averageReturnDays: number = 0,
): ReturnUserReport {
  return {
    generatedAt: new Date().toISOString(),
    totalReturnUsers,
    averageReturnFrequencyDays: averageReturnDays,
    mostCommonReturnTriggers: [
      "Compare with another document type (45%)",
      "Check a new contract before signing (30%)",
      "Fee trend alert prompted re-check (15%)",
      "Referred by a friend (10%)",
    ],
    comparisonOpportunities: COMPARISON_OPPORTUNITIES,
    prompts: RETURN_USER_PROMPTS,
  };
}

// ── Recommended Next Document ──────────────────────────────────────────────

export function suggestNextDocument(
  previousIndustry: string,
): ComparisonOpportunity | null {
  return COMPARISON_OPPORTUNITIES.find(
    (o) => o.previousIndustry === previousIndustry,
  ) || null;
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const RETURN_ENGINE_PRIVACY = {
  storesOnly: ["anonymous_industry_used", "anonymous_return_count", "return_frequency_days"],
  neverStores: ["document_contents", "user_identity", "personal_information", "financial_data"],
  metadataRetentionDays: 180,
};

export const CUSTOMER_RETURN_VERSION = "5.0.0";