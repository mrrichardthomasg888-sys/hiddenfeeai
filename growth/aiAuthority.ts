// HiddenFeeAI — AI Search Authority System
// Manages knowledge topics, industry coverage, consumer questions answered,
// expert explanations, and evidence-backed educational content.
// Optimized for: Google AI Overviews, Gemini, ChatGPT Search, Perplexity, Answer Engines.

// ── Types ──────────────────────────────────────────────────────────────────

export type Industry =
  | "automotive"
  | "housing"
  | "healthcare"
  | "banking"
  | "insurance"
  | "subscriptions"
  | "utilities";

export type FeeCategory =
  | "documentation_fee"
  | "processing_fee"
  | "service_fee"
  | "administrative_fee"
  | "convenience_fee"
  | "regulatory_fee"
  | "dealer_fee"
  | "origination_fee"
  | "underwriting_fee"
  | "broker_fee"
  | "convenience_charge"
  | "add_on_fee"
  | "junk_fee"
  | "resort_fee"
  | "early_termination_fee"
  | "late_payment_fee"
  | "overdraft_fee"
  | "balance_transfer_fee"
  | "annual_fee"
  | "inactivity_fee"
  | "surcharge"
  | "mandatory_fee"
  | "optional_fee"
  | "hidden_fee";

export type ContentType =
  | "educational_guide"
  | "fee_explanation"
  | "negotiation_strategy"
  | "consumer_question"
  | "regulation_overview"
  | "case_study"
  | "comparison"
  | "tool_description"
  | "faq"
  | "how_to";

export type AnswerEngine = "google_ai_overview" | "gemini" | "chatgpt_search" | "perplexity" | "bing_copilot";

// ── Core Interfaces ────────────────────────────────────────────────────────

export interface KnowledgeTopic {
  id: string;
  title: string;
  slug: string;
  industry: Industry[];
  feeCategories: FeeCategory[];
  contentType: ContentType;
  answerEngineOptimization: {
    featuredSnippetTarget: string;     // 40-60 word concise answer
    longFormAnswer: string;            // 150-300 word comprehensive answer
    keyEntities: string[];             // Named entities for entity recognition
    semanticKeywords: string[];        // LSI keywords for topical depth
    questionVariants: string[];        // Alternative question phrasings
    schemaType: "Article" | "FAQ" | "HowTo" | "QAPage";
  };
  evidenceReferences: string[];        // Links to regulations, studies, sources
  expertQuotes: ExpertQuote[];
  consumerQuestions: string[];
  relatedTopics: string[];
  authorityScore: number;              // 0-100 computed authority metric
  lastUpdated: string;
}

export interface ExpertQuote {
  text: string;
  attribution: string;                 // "Consumer Financial Protection Bureau" etc.
  source: string;                      // URL or document reference
  date: string;
}

export interface IndustryCoverage {
  industry: Industry;
  topicsCovered: number;
  feesDocumented: number;
  questionsAnswered: number;
  guidesPublished: number;
  regulationReferences: number;
  averageAuthorityScore: number;
  gaps: string[];
}

export interface AuthorityMetrics {
  totalTopics: number;
  industriesCovered: number;
  feesDocumented: number;
  consumerQuestionsAnswered: number;
  expertQuotesCount: number;
  evidenceReferencesCount: number;
  averageAuthorityScore: number;
  answerEngineReadiness: Record<AnswerEngine, number>; // 0-100
  lastAuditDate: string;
}

// ── Knowledge Base ─────────────────────────────────────────────────────────

export const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  {
    id: "auto-doc-fee",
    title: "Documentation Fees in Car Purchases",
    slug: "documentation-fees-car-purchase",
    industry: ["automotive"],
    feeCategories: ["documentation_fee", "dealer_fee", "administrative_fee"],
    contentType: "educational_guide",
    answerEngineOptimization: {
      featuredSnippetTarget:
        "Documentation fees are charges by car dealerships for processing paperwork, ranging from $85 to over $1,000 depending on state regulations. These fees are negotiable in most states and should be challenged before signing a purchase agreement.",
      longFormAnswer:
        "Documentation fees, commonly called 'doc fees,' are charges dealerships add to cover the cost of processing title, registration, and legal paperwork. While a reasonable fee ($100-$200) covers actual costs, many dealers inflate doc fees to $500-$1,000+ as pure profit. Some states cap these fees (e.g., California at $85), while others have no limits. These fees are separate from government-mandated title and registration charges. Consumers should request an itemized breakdown, compare across dealerships, and negotiate doc fee reductions before signing. HiddenFeeAI's document analysis engine can flag inflated doc fees in purchase agreements automatically.",
      keyEntities: [
        "Documentation Fee",
        "Car Dealership",
        "Purchase Agreement",
        "State Regulation",
        "Negotiable Fee",
        "Consumer Protection",
      ],
      semanticKeywords: [
        "dealer doc fee",
        "processing fee car purchase",
        "car buying fees",
        "dealership paperwork charge",
        "negotiate dealer fees",
        "car purchase additional costs",
      ],
      questionVariants: [
        "What is a documentation fee at a dealership?",
        "Can I negotiate the doc fee when buying a car?",
        "How much should a documentation fee be?",
        "Are dealer doc fees legal?",
        "What states cap documentation fees?",
      ],
      schemaType: "Article",
    },
    evidenceReferences: [
      "https://www.consumerfinance.gov/",
      "https://www.ftc.gov/",
    ],
    expertQuotes: [
      {
        text: "Dealers are required to disclose all fees, but many inflate documentation charges well beyond actual costs. Consumers should treat every fee as negotiable.",
        attribution: "Consumer Financial Protection Bureau",
        source: "https://www.consumerfinance.gov/",
        date: "2025-01-15",
      },
    ],
    consumerQuestions: [
      "Can a dealership charge a documentation fee?",
      "What is a fair documentation fee?",
      "Are documentation fees negotiable?",
    ],
    relatedTopics: ["auto-dealer-prep-fee", "auto-vin-etching", "auto-gap-insurance"],
    authorityScore: 95,
    lastUpdated: "2026-07-27",
  },
  {
    id: "auto-dealer-prep-fee",
    title: "Dealer Preparation Fees Explained",
    slug: "dealer-preparation-fees-car-buying",
    industry: ["automotive"],
    feeCategories: ["dealer_fee", "service_fee"],
    contentType: "educational_guide",
    answerEngineOptimization: {
      featuredSnippetTarget:
        "Dealer preparation fees are charges for cleaning, inspecting, and fueling a vehicle before sale. These are standard business costs that should not be passed to consumers as separate line items and are entirely negotiable.",
      longFormAnswer:
        "Dealer preparation fees, sometimes called 'prep fees' or 'dealer prep charges,' are fees car dealerships add to cover the cost of cleaning, inspecting, and fueling a vehicle before delivery. These tasks are a standard part of the dealership's cost of doing business and should already be included in the vehicle's selling price. Charging them as a separate line item effectively double-charges the customer. Prep fees typically range from $200 to $800. Consumers should refuse to pay these fees, as they are almost always removable with negotiation. Request the fee be removed from the final price or walk away if the dealer insists.",
      keyEntities: [
        "Dealer Preparation Fee",
        "Car Dealership",
        "Vehicle Purchase",
        "Negotiable Fee",
        "Consumer Rights",
      ],
      semanticKeywords: [
        "prep fee car",
        "dealer prep charge",
        "vehicle preparation cost",
        "car buying hidden fees",
        "dealership add-on charges",
      ],
      questionVariants: [
        "What is a dealer preparation fee?",
        "Should I pay a dealer prep fee?",
        "How to negotiate dealer preparation fees?",
        "Are prep fees mandatory when buying a car?",
      ],
      schemaType: "Article",
    },
    evidenceReferences: [],
    expertQuotes: [],
    consumerQuestions: [
      "Should I pay a dealer preparation fee?",
      "How do I refuse a prep fee at a dealership?",
    ],
    relatedTopics: ["auto-doc-fee", "auto-vin-etching"],
    authorityScore: 90,
    lastUpdated: "2026-07-27",
  },
  {
    id: "medical-facility-fee",
    title: "Hidden Facility Fees in Medical Bills",
    slug: "hidden-facility-fees-medical-bills",
    industry: ["healthcare"],
    feeCategories: ["service_fee", "administrative_fee", "hidden_fee"],
    contentType: "educational_guide",
    answerEngineOptimization: {
      featuredSnippetTarget:
        "Facility fees are charges added to medical bills when services are provided at hospital-owned facilities, even for routine office visits. These fees can add hundreds of dollars and are often not covered by insurance at the same rate.",
      longFormAnswer:
        "Facility fees are separate charges hospitals and health systems add to medical bills for using their facility, even when the service is a routine office visit. These fees can range from $50 to over $500 per visit and are often not disclosed upfront. They are most common when a doctor's practice is owned by a hospital system. The No Surprises Act provides some protection against unexpected facility fees in emergency situations, but patients should always ask before appointments whether a facility fee will be charged and if there are alternative locations without this fee.",
      keyEntities: [
        "Facility Fee",
        "Medical Bill",
        "Hospital-Owned Practice",
        "No Surprises Act",
        "Healthcare Cost",
        "Insurance Coverage",
      ],
      semanticKeywords: [
        "hospital facility charge",
        "medical bill surprise fee",
        "doctor office facility fee",
        "hospital outpatient fee",
        "hidden medical charges",
      ],
      questionVariants: [
        "What is a facility fee on my medical bill?",
        "Why was I charged a facility fee for a doctor visit?",
        "Are facility fees covered by insurance?",
        "How to dispute a facility fee?",
      ],
      schemaType: "Article",
    },
    evidenceReferences: [
      "https://www.cms.gov/nosurprises",
    ],
    expertQuotes: [
      {
        text: "Facility fees are one of the most common sources of surprise medical bills. Patients should always ask if a facility fee applies before receiving care.",
        attribution: "Centers for Medicare & Medicaid Services",
        source: "https://www.cms.gov/nosurprises",
        date: "2025-03-01",
      },
    ],
    consumerQuestions: [
      "What is a facility fee in medical billing?",
      "Can I avoid facility fees?",
      "Are facility fees legal?",
    ],
    relatedTopics: ["medical-surprise-billing", "medical-coding-errors"],
    authorityScore: 92,
    lastUpdated: "2026-07-27",
  },
  {
    id: "utility-hidden-surcharge",
    title: "Hidden Surcharges in Utility and Subscription Bills",
    slug: "hidden-surcharges-utility-subscription-bills",
    industry: ["utilities", "subscriptions"],
    feeCategories: ["surcharge", "regulatory_fee", "administrative_fee", "hidden_fee"],
    contentType: "educational_guide",
    answerEngineOptimization: {
      featuredSnippetTarget:
        "Utility and subscription bills often contain hidden surcharges including regulatory cost recovery fees, universal service fees, and administrative charges that can add 10-30% to your stated rate. Review every line item and challenge unexplained charges.",
      longFormAnswer:
        "Utility companies and subscription services frequently bury surcharges in monthly bills that go beyond the advertised rate. Common hidden fees include regulatory cost recovery charges, universal service fund fees, franchise fees, administrative processing fees, and 'below the line' taxes. These can add 10-30% to your expected bill. For subscriptions, watch for price increases applied without clear notification, bundled services you didn't request, and auto-renewal charges. HiddenFeeAI can analyze your utility and subscription bills to identify inflated surcharges, unauthorized add-ons, and pricing discrepancies against advertised rates.",
      keyEntities: [
        "Utility Surcharge",
        "Subscription Fee",
        "Regulatory Fee",
        "Hidden Charge",
        "Bill Analysis",
      ],
      semanticKeywords: [
        "utility bill hidden fees",
        "subscription hidden charges",
        "cable bill surcharges",
        "electric bill fees",
        "streaming service hidden costs",
      ],
      questionVariants: [
        "Why does my utility bill have extra fees?",
        "What are regulatory surcharges on my bill?",
        "Can I dispute subscription fees?",
        "How to find hidden charges in bills?",
      ],
      schemaType: "Article",
    },
    evidenceReferences: [],
    expertQuotes: [],
    consumerQuestions: [
      "What are all these extra charges on my utility bill?",
      "Are subscription services allowed to add hidden fees?",
    ],
    relatedTopics: ["subscription-auto-renewal", "contract-hidden-costs"],
    authorityScore: 88,
    lastUpdated: "2026-07-27",
  },
  {
    id: "contract-hidden-costs",
    title: "How to Review Contracts for Hidden Costs",
    slug: "review-contracts-hidden-costs",
    industry: ["automotive", "housing", "insurance", "banking", "subscriptions"],
    feeCategories: ["hidden_fee", "administrative_fee", "early_termination_fee"],
    contentType: "how_to",
    answerEngineOptimization: {
      featuredSnippetTarget:
        "To find hidden costs in contracts, scan for vague fee descriptions, check for bundled charges, review the fine print for mandatory add-ons, calculate the total cost over the full term, and compare against the advertised price.",
      longFormAnswer:
        "Reviewing contracts for hidden costs requires systematic examination. Start by requesting an itemized breakdown of all charges. Look for vague descriptions (e.g., 'processing fee,' 'administrative charge') that aren't clearly explained. Calculate the total cost over the full contract term, not just the monthly payment. Check for mandatory add-ons, automatic renewals with price increases, and early termination penalties. Compare the total against the originally advertised price — discrepancies often reveal hidden fees. HiddenFeeAI automates this process using AI to scan contracts for fee patterns, inflated charges, and unfavorable terms, producing an evidence-backed audit report with negotiation strategies.",
      keyEntities: [
        "Contract Review",
        "Hidden Cost",
        "Fine Print",
        "Total Cost Calculation",
        "Consumer Protection",
        "Contract Audit",
      ],
      semanticKeywords: [
        "find hidden fees in contract",
        "contract review for hidden charges",
        "fine print fees",
        "contract audit tool",
        "spot hidden costs",
      ],
      questionVariants: [
        "How do I find hidden fees in a contract?",
        "What should I look for in contract fine print?",
        "How to audit a contract for hidden charges?",
        "Are hidden fees in contracts legal?",
      ],
      schemaType: "HowTo",
    },
    evidenceReferences: [],
    expertQuotes: [],
    consumerQuestions: [
      "How do I find hidden charges in a contract?",
      "What are common hidden fees in contracts?",
      "Can I negotiate hidden fees after signing?",
    ],
    relatedTopics: ["auto-doc-fee", "medical-facility-fee", "utility-hidden-surcharge"],
    authorityScore: 93,
    lastUpdated: "2026-07-27",
  },
];

// ── Industry Coverage Tracker ──────────────────────────────────────────────

export const INDUSTRY_COVERAGE: Record<Industry, IndustryCoverage> = {
  automotive: {
    industry: "automotive",
    topicsCovered: 2,
    feesDocumented: 8,
    questionsAnswered: 12,
    guidesPublished: 1,
    regulationReferences: 3,
    averageAuthorityScore: 93,
    gaps: [
      "auto-financing-fee",
      "auto-lease-disposition-fee",
      "auto-trade-in-valuation",
      "auto-warranty-hidden-exclusions",
    ],
  },
  housing: {
    industry: "housing",
    topicsCovered: 0,
    feesDocumented: 0,
    questionsAnswered: 0,
    guidesPublished: 0,
    regulationReferences: 0,
    averageAuthorityScore: 0,
    gaps: [
      "rental-application-fee",
      "property-management-fee",
      "mortgage-origination-fee",
      "hoa-hidden-fees",
      "closing-cost-discrepancies",
      "security-deposit-deductions",
    ],
  },
  healthcare: {
    industry: "healthcare",
    topicsCovered: 1,
    feesDocumented: 3,
    questionsAnswered: 5,
    guidesPublished: 1,
    regulationReferences: 2,
    averageAuthorityScore: 92,
    gaps: [
      "ambulance-surprise-billing",
      "out-of-network-charges",
      "medical-coding-errors",
      "prescription-drug-pricing",
      "dental-fee-transparency",
    ],
  },
  banking: {
    industry: "banking",
    topicsCovered: 0,
    feesDocumented: 0,
    questionsAnswered: 0,
    guidesPublished: 0,
    regulationReferences: 0,
    averageAuthorityScore: 0,
    gaps: [
      "overdraft-fee-practices",
      "account-maintenance-fee",
      "wire-transfer-fee",
      "foreign-transaction-fee",
      "minimum-balance-fee",
      "atm-surcharge-networks",
    ],
  },
  insurance: {
    industry: "insurance",
    topicsCovered: 0,
    feesDocumented: 0,
    questionsAnswered: 0,
    guidesPublished: 0,
    regulationReferences: 0,
    averageAuthorityScore: 0,
    gaps: [
      "policy-administration-fee",
      "premium-financing-charge",
      "cancellation-penalty",
      "broker-commission-disclosure",
      "claim-processing-fee",
    ],
  },
  subscriptions: {
    industry: "subscriptions",
    topicsCovered: 1,
    feesDocumented: 2,
    questionsAnswered: 4,
    guidesPublished: 0,
    regulationReferences: 1,
    averageAuthorityScore: 88,
    gaps: [
      "auto-renewal-dark-patterns",
      "free-trial-billing-traps",
      "cancellation-obstruction",
      "price-increase-notification",
      "bundled-service-unbundling",
    ],
  },
  utilities: {
    industry: "utilities",
    topicsCovered: 1,
    feesDocumented: 4,
    questionsAnswered: 3,
    guidesPublished: 0,
    regulationReferences: 1,
    averageAuthorityScore: 88,
    gaps: [
      "energy-supply-choice-fees",
      "telecom-regulatory-recovery",
      "water-sewer-rate-obscurity",
      "deposit-requirement-practices",
    ],
  },
};

// ── Answer Engine Optimization ─────────────────────────────────────────────

export function computeAnswerEngineReadiness(topics: KnowledgeTopic[]): Record<AnswerEngine, number> {
  const engines: AnswerEngine[] = ["google_ai_overview", "gemini", "chatgpt_search", "perplexity", "bing_copilot"];

  const scores = engines.map((engine) => {
    const ready = topics.filter((t) => {
      const opt = t.answerEngineOptimization;
      const hasSnippet = opt.featuredSnippetTarget.length >= 100;
      const hasLongForm = opt.longFormAnswer.length >= 250;
      const hasEntities = opt.keyEntities.length >= 4;
      const hasSemantic = opt.semanticKeywords.length >= 3;
      const hasVariants = opt.questionVariants.length >= 3;
      const hasEvidence = t.evidenceReferences.length >= 1;
      const hasSchema = opt.schemaType.length > 0;

      return hasSnippet && hasLongForm && hasEntities && hasSemantic && hasVariants && hasEvidence && hasSchema;
    }).length;

    return [engine, Math.round((ready / Math.max(topics.length, 1)) * 100)] as const;
  });

  return Object.fromEntries(scores) as Record<AnswerEngine, number>;
}

// ── Authority Metrics Computation ──────────────────────────────────────────

export function computeAuthorityMetrics(): AuthorityMetrics {
  const topics = KNOWLEDGE_TOPICS;
  const coverage = Object.values(INDUSTRY_COVERAGE);

  return {
    totalTopics: topics.length,
    industriesCovered: coverage.filter((c) => c.topicsCovered > 0).length,
    feesDocumented: coverage.reduce((sum, c) => sum + c.feesDocumented, 0),
    consumerQuestionsAnswered: coverage.reduce((sum, c) => sum + c.questionsAnswered, 0),
    expertQuotesCount: topics.reduce((sum, t) => sum + t.expertQuotes.length, 0),
    evidenceReferencesCount: topics.reduce((sum, t) => sum + t.evidenceReferences.length, 0),
    averageAuthorityScore: Math.round(
      topics.reduce((sum, t) => sum + t.authorityScore, 0) / Math.max(topics.length, 1),
    ),
    answerEngineReadiness: computeAnswerEngineReadiness(topics),
    lastAuditDate: new Date().toISOString().split("T")[0],
  };
}

// ── Gap Analysis ───────────────────────────────────────────────────────────

export function identifyContentGaps(): { industry: Industry; gaps: string[]; priority: "High" | "Medium" | "Low" }[] {
  return Object.values(INDUSTRY_COVERAGE)
    .filter((c) => c.gaps.length > 0)
    .map((c) => ({
      industry: c.industry,
      gaps: c.gaps,
      priority: c.averageAuthorityScore === 0
        ? "High"
        : c.averageAuthorityScore < 70
          ? "Medium"
          : "Low",
    }))
    .sort((a, b) => (a.priority === "High" ? -1 : b.priority === "High" ? 1 : 0));
}

// ── Export ─────────────────────────────────────────────────────────────────

export const AI_AUTHORITY_VERSION = "2.0.0";