// HiddenFeeAI — Industry Partnership Packages
// Defines future partnership packages for each industry vertical.
// Architecture only — defines what could be offered.

// ── Types ──────────────────────────────────────────────────────────────────

export interface IndustryPackage {
  industry: string;
  packageName: string;
  targetPartners: string[];
  valueProposition: string;
  features: string[];
  pricingModel: "per_analysis" | "monthly_license" | "revenue_share" | "white_label";
  estimatedMonthlyRevenue: string; // Range
}

export interface PartnershipPipeline {
  industry: string;
  totalAddressablePartners: number;
  contactedPartners: number;
  activePartners: number;
  revenueFromPartners: number; // cents
  stage: "research" | "outreach" | "negotiation" | "active" | "scaling";
}

// ── Industry Packages ──────────────────────────────────────────────────────

export const INDUSTRY_PACKAGES: IndustryPackage[] = [
  {
    industry: "automotive",
    packageName: "Dealer Fee Transparency Suite",
    targetPartners: ["CarEdge", "Edmunds", "Kelley Blue Book", "TrueCar", "CarGurus", "AutoTrader"],
    valueProposition: "Give car buyers instant AI analysis of purchase agreements before they sign. Reduce buyer remorse by catching hidden dealer fees in real time.",
    features: [
      "White-label document analyzer for car purchase agreements",
      "Dealer fee comparison database integration",
      "State-by-state doc fee cap reference",
      "Negotiation script generator for specific fees",
      "Co-branded consumer education landing pages",
    ],
    pricingModel: "revenue_share",
    estimatedMonthlyRevenue: "$5,000 - $25,000",
  },
  {
    industry: "housing",
    packageName: "Lease & Mortgage Review Toolkit",
    targetPartners: ["Zillow", "Apartments.com", "Redfin", "Rocket Mortgage", "Better.com", "BiggerPockets"],
    valueProposition: "Help renters and homebuyers identify hidden fees in leases and closing documents. Build trust by showing fee transparency upfront.",
    features: [
      "Rental agreement hidden fee scanner",
      "Mortgage closing cost analyzer",
      "HOA fee transparency checker",
      "Security deposit deduction predictor",
      "Lease renewal negotiation assistant",
    ],
    pricingModel: "monthly_license",
    estimatedMonthlyRevenue: "$3,000 - $15,000",
  },
  {
    industry: "healthcare",
    packageName: "Medical Bill Clarity Platform",
    targetPartners: ["Patient Advocate Foundation", "GoodRx", "HealthCare.com", "medical billing advocates", "hospital price transparency tools"],
    valueProposition: "Empower patients to understand and challenge medical bills. Reduce surprise billing anxiety with AI-powered bill analysis.",
    features: [
      "Medical bill line-item analyzer",
      "Facility fee detection in hospital bills",
      "CPT code explanation engine",
      "Insurance EOB comparison tool",
      "No Surprises Act compliance checker",
    ],
    pricingModel: "per_analysis",
    estimatedMonthlyRevenue: "$2,000 - $10,000",
  },
  {
    industry: "banking",
    packageName: "Consumer Banking Fee Analyzer",
    targetPartners: ["Credit Karma", "NerdWallet", "Bankrate", "Mint", "personal finance apps"],
    valueProposition: "Help consumers identify and eliminate unnecessary bank fees. Save users an average of $300/year in hidden charges.",
    features: [
      "Bank statement fee scanner",
      "Overdraft fee analysis and opt-out guidance",
      "Account comparison (fee structures)",
      "Monthly fee audit reports",
      "Fee-free bank recommendation engine",
    ],
    pricingModel: "revenue_share",
    estimatedMonthlyRevenue: "$4,000 - $20,000",
  },
  {
    industry: "insurance",
    packageName: "Insurance Policy Fee Detector",
    targetPartners: ["Policygenius", "The Zebra", "Insurify", "insurance comparison sites"],
    valueProposition: "Show consumers the true cost of insurance policies by revealing hidden policy fees, broker commissions, and administrative charges.",
    features: [
      "Policy fee line-item analysis",
      "Broker commission disclosure checker",
      "Premium vs. fees breakdown",
      "Cancellation penalty calculator",
      "Multi-policy discount verifier",
    ],
    pricingModel: "revenue_share",
    estimatedMonthlyRevenue: "$2,000 - $12,000",
  },
  {
    industry: "subscriptions",
    packageName: "Subscription Audit Service",
    targetPartners: ["Truebill/RocketMoney", "Trim", "subscription management apps", "consumer advocacy blogs"],
    valueProposition: "Detect hidden subscription fees, auto-renewal traps, and dark pattern pricing. Save consumers from unwanted recurring charges.",
    features: [
      "Subscription terms analyzer",
      "Auto-renewal detection and alert",
      "Hidden fee clause scanner",
      "Cancellation path guidance",
      "Free trial conversion trap detection",
    ],
    pricingModel: "per_analysis",
    estimatedMonthlyRevenue: "$3,000 - $18,000",
  },
  {
    industry: "utilities",
    packageName: "Utility Bill Transparency Engine",
    targetPartners: ["Arcadia", "WattBuy", "utility consumer advocacy groups", "energy choice platforms"],
    valueProposition: "Help consumers understand complex utility bills. Identify surcharges, regulatory fees, and rate discrepancies.",
    features: [
      "Utility bill line-item explanation",
      "Regulatory fee breakdown",
      "Energy choice rate comparison",
      "Paper bill fee elimination guide",
      "Seasonal rate change detection",
    ],
    pricingModel: "monthly_license",
    estimatedMonthlyRevenue: "$1,000 - $8,000",
  },
];

// ── Pipeline Tracker ───────────────────────────────────────────────────────

export function createPartnershipPipeline(industry: string): PartnershipPipeline {
  return {
    industry,
    totalAddressablePartners: 0,
    contactedPartners: 0,
    activePartners: 0,
    revenueFromPartners: 0,
    stage: "research",
  };
}

// ── Business Opportunity (white-label) ─────────────────────────────────────

export interface WhiteLabelConfig {
  clientName: string;
  clientDomain: string;
  customBranding: boolean;
  customPricing: boolean;
  revenueSharePercent: number;
  minimumMonthlyGuarantee: number; // cents
  contractLengthMonths: number;
}

export const ENTERPRISE_WHITE_LABEL: Record<string, WhiteLabelConfig> = {
  // Templates for enterprise white-label deals
  standard: {
    clientName: "{{CLIENT}}",
    clientDomain: "{{DOMAIN}}",
    customBranding: true,
    customPricing: true,
    revenueSharePercent: 25,
    minimumMonthlyGuarantee: 500000, // $5,000/month
    contractLengthMonths: 12,
  },
};

export const INDUSTRY_PACKAGES_VERSION = "3.0.0";