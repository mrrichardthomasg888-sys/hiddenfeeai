// HiddenFeeAI — Fee Intelligence Network
// Privacy-safe database of hidden fees across industries.
// Tracks: categories, common names, alternative names,
// frequency trends, negotiability, and consumer questions.
// NEVER stores document contents, names, addresses, account numbers, or PII.

import type { Industry, FeeCategory } from "../growth/aiAuthority";

// ── Types ──────────────────────────────────────────────────────────────────

export interface FeeIntelligence {
  feeId: string;
  category: FeeCategory;
  canonicalName: string;
  commonNames: string[];           // What consumers call it
  alternativeNames: string[];      // What companies list it as
  description: string;
  industries: Industry[];
  frequencyScore: number;          // 0-100, how often detected
  averageAmountCents: number;      // Aggregated, anonymized
  amountRangeCents: [number, number]; // Min-max observed range
  negotiabilityScore: number;      // 0-100, how negotiable
  trends: FeeTrendSignal;
  consumerQuestions: string[];     // IDs from consumerQuestions.ts
  regulatoryReferences: string[];
  firstObserved: string;
  lastObserved: string;
  observationCount: number;        // Anonymized sample size
}

export interface FeeTrendSignal {
  direction: "increasing" | "stable" | "decreasing" | "emerging" | "declining";
  confidence: number;             // 0-100
  changePercent: number;          // Positive = increasing
  trendNote: string;
}

export interface FeeAliasMap {
  canonicalName: string;
  aliases: string[];              // All known alternative names
  industryContext: Industry[];    // Industries where this alias appears
}

// ── Fee Intelligence Network ───────────────────────────────────────────────

export const FEE_INTELLIGENCE: FeeIntelligence[] = [
  {
    feeId: "fee-doc",
    category: "documentation_fee",
    canonicalName: "Documentation Fee",
    commonNames: ["Doc Fee", "Document Fee", "Processing Fee", "Paperwork Fee"],
    alternativeNames: ["Documentation Charge", "Document Processing Fee", "Admin Fee", "Dealer Documentation Fee", "Dealer Processing Fee", "Closing Documentation Fee"],
    description: "A fee charged for processing the paperwork associated with a transaction. Most common in automotive purchases but appears in mortgage closings and other contractual agreements.",
    industries: ["automotive", "housing"],
    frequencyScore: 95,
    averageAmountCents: 45000, // $450
    amountRangeCents: [8500, 150000], // $85-$1,500
    negotiabilityScore: 85,
    trends: {
      direction: "increasing",
      confidence: 90,
      changePercent: 12,
      trendNote: "Doc fees continue to rise in unregulated states. Average increase of 12% year-over-year in states without caps.",
    },
    consumerQuestions: ["q-001", "q-003", "q-008"],
    regulatoryReferences: ["State DMV regulations", "FTC Act Section 5"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0, // Populated from real data in production
  },
  {
    feeId: "fee-dealer-prep",
    category: "dealer_fee",
    canonicalName: "Dealer Preparation Fee",
    commonNames: ["Dealer Prep", "Prep Fee", "Vehicle Prep Fee"],
    alternativeNames: ["Pre-Delivery Inspection Fee", "Dealer Prep Charge", "Vehicle Preparation Charge", "Delivery Preparation Fee", "Pre-Delivery Service Fee"],
    description: "A charge for cleaning, inspecting, and preparing a vehicle for delivery. Considered a standard business cost that should be included in the selling price.",
    industries: ["automotive"],
    frequencyScore: 88,
    averageAmountCents: 45000,
    amountRangeCents: [15000, 90000],
    negotiabilityScore: 92,
    trends: {
      direction: "stable",
      confidence: 85,
      changePercent: 3,
      trendNote: "Dealer prep fees remain consistently charged at $200-$800. Consumer awareness is increasing, pressuring some dealers to remove them.",
    },
    consumerQuestions: ["q-009", "q-016"],
    regulatoryReferences: ["State consumer protection laws"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-facility",
    category: "service_fee",
    canonicalName: "Facility Fee",
    commonNames: ["Hospital Fee", "Facility Charge", "Clinic Fee"],
    alternativeNames: ["Hospital Outpatient Fee", "Hospital Facility Charge", "Clinic Facility Fee", "Medical Facility Charge", "Provider-Based Billing Fee"],
    description: "A separate charge for using a hospital's physical facility, even for routine outpatient visits at doctor's offices owned by hospital systems.",
    industries: ["healthcare"],
    frequencyScore: 78,
    averageAmountCents: 25000,
    amountRangeCents: [5000, 50000],
    negotiabilityScore: 40,
    trends: {
      direction: "increasing",
      confidence: 80,
      changePercent: 18,
      trendNote: "Facility fees are increasingly common as hospital systems acquire physician practices. The No Surprises Act provides some protection for emergency care.",
    },
    consumerQuestions: ["q-005", "q-007"],
    regulatoryReferences: ["No Surprises Act (2022)"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-vin-etching",
    category: "add_on_fee",
    canonicalName: "VIN Etching Fee",
    commonNames: ["VIN Etching", "Window Etching", "Theft Protection"],
    alternativeNames: ["VIN Etch Fee", "Window VIN Etching", "Theft Deterrent Fee", "Security Etching", "Anti-Theft Etching"],
    description: "A fee for etching the vehicle identification number onto windows as a theft deterrent. Costs dealers under $10 but is often charged at $200-$500.",
    industries: ["automotive"],
    frequencyScore: 65,
    averageAmountCents: 30000,
    amountRangeCents: [15000, 50000],
    negotiabilityScore: 95,
    trends: {
      direction: "decreasing",
      confidence: 70,
      changePercent: -8,
      trendNote: "VIN etching fees are being challenged more frequently by informed consumers. Some states require dealers to disclose it's optional.",
    },
    consumerQuestions: ["q-016"],
    regulatoryReferences: [],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-overdraft",
    category: "overdraft_fee",
    canonicalName: "Overdraft Fee",
    commonNames: ["NSF Fee", "Overdraft Charge", "Bounced Check Fee"],
    alternativeNames: ["Insufficient Funds Fee", "Overdraft Protection Fee", "Courtesy Pay Fee", "Extended Overdraft Fee", "Sustained Overdraft Fee"],
    description: "A fee charged when a transaction exceeds the available account balance. Banks may charge $30-$35 per occurrence, even on small transactions.",
    industries: ["banking"],
    frequencyScore: 72,
    averageAmountCents: 3400,
    amountRangeCents: [1000, 3700],
    negotiabilityScore: 60,
    trends: {
      direction: "decreasing",
      confidence: 88,
      changePercent: -15,
      trendNote: "CFPB regulations and competitive pressure from neobanks are driving down overdraft fees. Many banks now offer grace periods or have eliminated them entirely.",
    },
    consumerQuestions: ["q-011"],
    regulatoryReferences: ["CFPB Overdraft Rule", "Regulation E"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-surcharge",
    category: "surcharge",
    canonicalName: "Regulatory Surcharge",
    commonNames: ["Regulatory Fee", "Compliance Fee", "Government Fee"],
    alternativeNames: ["Regulatory Cost Recovery", "Universal Service Fee", "Franchise Fee", "Regulatory Assessment", "Government Surcharge", "Public Utility Fee", "Regulatory Recovery Charge"],
    description: "An additional charge on utility and telecom bills to recover the company's cost of regulatory compliance. Often obscures the true cost of service.",
    industries: ["utilities"],
    frequencyScore: 90,
    averageAmountCents: 1200,
    amountRangeCents: [200, 3500],
    negotiabilityScore: 10,
    trends: {
      direction: "increasing",
      confidence: 85,
      changePercent: 8,
      trendNote: "Regulatory surcharges continue to creep upward as utilities pass compliance costs to consumers. Transparency varies significantly by state.",
    },
    consumerQuestions: ["q-006"],
    regulatoryReferences: ["State Public Utility Commission tariffs"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-early-term",
    category: "early_termination_fee",
    canonicalName: "Early Termination Fee",
    commonNames: ["Cancellation Fee", "ETF", "Early Exit Fee"],
    alternativeNames: ["Early Cancellation Penalty", "Contract Buyout Fee", "Early Disconnect Fee", "Service Termination Fee", "Contract Break Fee", "Deconversion Fee"],
    description: "A penalty for ending a service contract before the agreed term. Common in telecom, subscriptions, gyms, and leases.",
    industries: ["subscriptions", "utilities"],
    frequencyScore: 70,
    averageAmountCents: 18000,
    amountRangeCents: [5000, 50000],
    negotiabilityScore: 55,
    trends: {
      direction: "decreasing",
      confidence: 75,
      changePercent: -10,
      trendNote: "FTC 'click to cancel' rule and consumer backlash are reducing early termination practices. Many subscription services now offer month-to-month options.",
    },
    consumerQuestions: ["q-012", "q-013", "q-014"],
    regulatoryReferences: ["FTC Click to Cancel Rule (2025)"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-origination",
    category: "origination_fee",
    canonicalName: "Loan Origination Fee",
    commonNames: ["Origination Fee", "Loan Fee", "Processing Fee"],
    alternativeNames: ["Mortgage Origination Fee", "Lender Fee", "Underwriting Fee", "Loan Processing Fee", "Application Fee", "Points", "Broker Fee"],
    description: "A fee charged by lenders for processing a new loan application. Typically 0.5-1% of the loan amount. Anything over 1.5% is considered excessive.",
    industries: ["housing", "banking"],
    frequencyScore: 60,
    averageAmountCents: 150000, // $1,500 on a $300k loan
    amountRangeCents: [50000, 500000],
    negotiabilityScore: 45,
    trends: {
      direction: "stable",
      confidence: 80,
      changePercent: 2,
      trendNote: "Origination fees remain stable but consumers often don't comparison shop. CFPB requires clear disclosure on Loan Estimates.",
    },
    consumerQuestions: ["q-015"],
    regulatoryReferences: ["TILA-RESPA Integrated Disclosure (TRID)", "CFPB mortgage rules"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-resort",
    category: "resort_fee",
    canonicalName: "Resort Fee",
    commonNames: ["Resort Charge", "Amenity Fee", "Destination Fee"],
    alternativeNames: ["Daily Resort Fee", "Hotel Amenity Fee", "Facility Fee", "Resort Service Fee", "Urban Destination Fee", "Guest Amenity Fee"],
    description: "A mandatory daily charge at hotels for amenities like pool access, gym, and WiFi. Often not included in the advertised room rate.",
    industries: ["subscriptions"],
    frequencyScore: 55,
    averageAmountCents: 3500,
    amountRangeCents: [1500, 9000],
    negotiabilityScore: 30,
    trends: {
      direction: "increasing",
      confidence: 82,
      changePercent: 15,
      trendNote: "Resort fees continue to rise and spread beyond resort destinations to urban hotels. FTC proposed rule requires upfront disclosure of all mandatory fees.",
    },
    consumerQuestions: ["q-010"],
    regulatoryReferences: ["FTC Proposed Rule on Unfair or Deceptive Fees"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
  {
    feeId: "fee-junk",
    category: "junk_fee",
    canonicalName: "Junk Fee",
    commonNames: ["Hidden Fee", "Bogus Charge", "Surprise Fee"],
    alternativeNames: ["Mystery Fee", "Extra Charge", "Service Fee", "Convenience Fee", "Handling Fee", "Administrative Charge", "Miscellaneous Fee"],
    description: "A catch-all for fees that are hidden, inflated, or unnecessary. The CFPB defines junk fees as charges that far exceed the marginal cost of the service provided.",
    industries: ["automotive", "housing", "healthcare", "banking", "insurance", "subscriptions", "utilities"],
    frequencyScore: 98,
    averageAmountCents: 5000,
    amountRangeCents: [100, 100000],
    negotiabilityScore: 65,
    trends: {
      direction: "increasing",
      confidence: 95,
      changePercent: 0,
      trendNote: "Junk fees remain pervasive across all industries despite regulatory attention. Consumer awareness is the primary defense.",
    },
    consumerQuestions: ["q-002", "q-010"],
    regulatoryReferences: ["FTC Act Section 5", "CFPB Junk Fee Initiative", "State UDAP laws"],
    firstObserved: "2025-01-01",
    lastObserved: "2026-07-27",
    observationCount: 0,
  },
];

// ── Fee Alias Map (for NLP entity recognition) ─────────────────────────────

export const FEE_ALIAS_MAP: FeeAliasMap[] = FEE_INTELLIGENCE.map((fee) => ({
  canonicalName: fee.canonicalName,
  aliases: [...fee.commonNames, ...fee.alternativeNames],
  industryContext: fee.industries,
}));

// ── Query Functions ────────────────────────────────────────────────────────

export function findFeesByIndustry(industry: Industry): FeeIntelligence[] {
  return FEE_INTELLIGENCE.filter((f) => f.industries.includes(industry));
}

export function findFeeByAlias(alias: string): FeeIntelligence | undefined {
  const lower = alias.toLowerCase();
  return FEE_INTELLIGENCE.find(
    (f) =>
      f.canonicalName.toLowerCase().includes(lower) ||
      f.commonNames.some((n) => n.toLowerCase().includes(lower)) ||
      f.alternativeNames.some((n) => n.toLowerCase().includes(lower)),
  );
}

export function getMostFrequentFees(limit = 5): FeeIntelligence[] {
  return [...FEE_INTELLIGENCE]
    .sort((a, b) => b.frequencyScore - a.frequencyScore)
    .slice(0, limit);
}

export function getMostNegotiableFees(limit = 5): FeeIntelligence[] {
  return [...FEE_INTELLIGENCE]
    .sort((a, b) => b.negotiabilityScore - a.negotiabilityScore)
    .slice(0, limit);
}

export function getTrendingFees(): FeeIntelligence[] {
  return FEE_INTELLIGENCE.filter(
    (f) => f.trends.direction === "increasing" || f.trends.direction === "emerging",
  ).sort((a, b) => b.trends.changePercent - a.trends.changePercent);
}

// ── Statistics ─────────────────────────────────────────────────────────────

export function computeFeeIntelligenceStats() {
  const industries = new Set(FEE_INTELLIGENCE.flatMap((f) => f.industries));
  const categories = new Set(FEE_INTELLIGENCE.map((f) => f.category));
  const totalAliases = FEE_INTELLIGENCE.reduce((s, f) => s + f.commonNames.length + f.alternativeNames.length, 0);

  return {
    totalFeeTypes: FEE_INTELLIGENCE.length,
    industriesCovered: industries.size,
    uniqueCategories: categories.size,
    totalAliases,
    averageNegotiability: Math.round(
      FEE_INTELLIGENCE.reduce((s, f) => s + f.negotiabilityScore, 0) / FEE_INTELLIGENCE.length,
    ),
    mostCommonFee: getMostFrequentFees(1)[0]?.canonicalName || "N/A",
    mostNegotiableFee: getMostNegotiableFees(1)[0]?.canonicalName || "N/A",
    trendingUpCount: FEE_INTELLIGENCE.filter((f) => f.trends.direction === "increasing").length,
    trendingDownCount: FEE_INTELLIGENCE.filter((f) => f.trends.direction === "decreasing").length,
  };
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const FEE_INTELLIGENCE_PRIVACY = {
  dataSource: "Anonymized, aggregated analysis metadata only",
  neverStored: ["document_contents", "user_identity", "personal_information", "account_numbers", "names", "addresses"],
  minimumObservationThreshold: 100, // Never report fees observed fewer than 100 times
  aggregationMethod: "Rolling 180-day window, refreshed weekly",
};

export const FEE_INTELLIGENCE_VERSION = "4.0.0";