// HiddenFeeAI — Commercial Readiness Report
// Generates revenue opportunities, partnership opportunities,
// API opportunities, and market expansion opportunities.
// Strategic document for business planning.

import { API_TIERS, type ApiTier } from "../api/apiDocumentation";
import { INDUSTRY_PACKAGES } from "../partnerships/industryPackages";
import { INTEGRATIONS, INTEGRATION_ROADMAP } from "../marketplaces/integrations";
import { PARTNER_TEMPLATES } from "../partners/partnerProgram";

// ── Types ──────────────────────────────────────────────────────────────────

export interface RevenueOpportunity {
  category: "direct_consumer" | "api_subscription" | "partnership" | "white_label" | "integration";
  name: string;
  estimatedMonthlyRevenue: string;
  timeToLaunch: string;          // "Now" | "Q3 2026" | "Q4 2026" | "2027"
  confidence: "High" | "Medium" | "Low";
  requirements: string[];
  risks: string[];
}

export interface PartnershipOpportunity {
  partnerName: string;
  industry: string;
  type: "referral" | "integration" | "white_label" | "co_branding";
  valueProposition: string;
  estimatedMonthlyRevenue: string;
  status: "not_started" | "researching" | "contacted" | "negotiating" | "signed";
  priority: "Critical" | "High" | "Medium" | "Low";
}

export interface ExpansionReport {
  generatedAt: string;
  totalAddressableRevenue: string;
  revenueOpportunities: RevenueOpportunity[];
  partnershipOpportunities: PartnershipOpportunity[];
  apiReadiness: {
    endpointsReady: number;
    tiersDefined: number;
    estimatedFirstApiRevenue: string;
    goLiveTarget: string;
  };
  integrationRoadmap: typeof INTEGRATION_ROADMAP;
  strategicRecommendations: string[];
}

// ── Revenue Opportunities ──────────────────────────────────────────────────

export const REVENUE_OPPORTUNITIES: RevenueOpportunity[] = [
  {
    category: "direct_consumer",
    name: "Pay-Per-Report Consumer Sales",
    estimatedMonthlyRevenue: "$5,000 - $25,000",
    timeToLaunch: "Now",
    confidence: "High",
    requirements: [
      "Existing payment flow (Stripe)",
      "SEO-driven organic traffic",
      "Content marketing for consumer acquisition",
    ],
    risks: [
      "Consumer willingness to pay $0.99/report at scale",
      "Seasonal demand fluctuations",
      "Competition from free manual alternatives",
    ],
  },
  {
    category: "api_subscription",
    name: "Developer API — Tiered Subscriptions",
    estimatedMonthlyRevenue: "$10,000 - $50,000",
    timeToLaunch: "Q4 2026",
    confidence: "Medium",
    requirements: [
      "API key management system",
      "Rate limiting infrastructure",
      "Usage-based billing",
      "Developer documentation and SDKs",
      "OpenAPI spec publication",
    ],
    risks: [
      "Developer acquisition costs",
      "API abuse and fraud prevention",
      "Support burden scaling with users",
      "Competition from free AI APIs",
    ],
  },
  {
    category: "partnership",
    name: "Industry Partner Revenue Share",
    estimatedMonthlyRevenue: "$10,000 - $60,000",
    timeToLaunch: "Q3-Q4 2026",
    confidence: "Medium",
    requirements: [
      "Partner referral infrastructure",
      "Commission tracking system",
      "Partner onboarding process",
      "Co-branded landing pages",
    ],
    risks: [
      "Partner dependency for revenue",
      "Commission margin pressure",
      "Brand dilution through white-label",
    ],
  },
  {
    category: "white_label",
    name: "Enterprise White-Label Licensing",
    estimatedMonthlyRevenue: "$20,000 - $100,000",
    timeToLaunch: "2027",
    confidence: "Low",
    requirements: [
      "Enterprise-grade infrastructure",
      "Custom branding support",
      "SLA guarantees",
      "Dedicated account management",
      "Security compliance (SOC 2, GDPR)",
    ],
    risks: [
      "Long enterprise sales cycles (6-12 months)",
      "High customer acquisition cost",
      "Customization demands from enterprises",
      "Compliance certification costs",
    ],
  },
  {
    category: "integration",
    name: "Platform Integrations (Plaid, Zapier, WordPress)",
    estimatedMonthlyRevenue: "$5,000 - $20,000",
    timeToLaunch: "Q4 2026 - Q2 2027",
    confidence: "Medium",
    requirements: [
      "Zapier Platform integration",
      "Plaid API integration",
      "WordPress plugin development",
      "Chrome Extension publication",
    ],
    risks: [
      "Platform approval delays",
      "Maintenance burden across platforms",
      "Low conversion from free integrations",
    ],
  },
];

// ── Partnership Opportunities ──────────────────────────────────────────────

export const PARTNERSHIP_OPPORTUNITIES: PartnershipOpportunity[] = [
  {
    partnerName: "NerdWallet",
    industry: "banking",
    type: "co_branding",
    valueProposition: "Co-branded 'Hidden Fee Scanner' widget on NerdWallet's banking comparison pages. Revenue share on premium reports.",
    estimatedMonthlyRevenue: "$8,000 - $25,000",
    status: "not_started",
    priority: "Critical",
  },
  {
    partnerName: "CarEdge",
    industry: "automotive",
    type: "integration",
    valueProposition: "Integrated car purchase agreement analyzer within CarEdge's car buying platform. Real-time fee detection before signing.",
    estimatedMonthlyRevenue: "$5,000 - $15,000",
    status: "not_started",
    priority: "Critical",
  },
  {
    partnerName: "Credit Karma",
    industry: "banking",
    type: "referral",
    valueProposition: "Refer Credit Karma users to HiddenFeeAI for document analysis. Revenue share: 20% per converted user.",
    estimatedMonthlyRevenue: "$3,000 - $10,000",
    status: "not_started",
    priority: "High",
  },
  {
    partnerName: "Patient Advocate Foundation",
    industry: "healthcare",
    type: "integration",
    valueProposition: "Free medical bill analysis for PAF members. Sponsored access model with PAF covering per-analysis fees.",
    estimatedMonthlyRevenue: "$2,000 - $8,000",
    status: "not_started",
    priority: "High",
  },
  {
    partnerName: "BiggerPockets",
    industry: "housing",
    type: "co_branding",
    valueProposition: "Rental agreement scanner for BiggerPockets' landlord and tenant community. Subscription upsell model.",
    estimatedMonthlyRevenue: "$3,000 - $12,000",
    status: "not_started",
    priority: "High",
  },
  {
    partnerName: "Zapier",
    industry: "general",
    type: "integration",
    valueProposition: "Listed on Zapier App Directory. Usage-based pricing through Zapier's billing. 5,000+ app ecosystem exposure.",
    estimatedMonthlyRevenue: "$1,000 - $5,000",
    status: "not_started",
    priority: "Medium",
  },
  {
    partnerName: "The Penny Hoarder",
    industry: "subscriptions",
    type: "referral",
    valueProposition: "Content partnership: '10 Hidden Fees Draining Your Bank Account' article with embedded analysis widget.",
    estimatedMonthlyRevenue: "$1,000 - $3,000",
    status: "not_started",
    priority: "Medium",
  },
];

// ── Expansion Report Generator ─────────────────────────────────────────────

export function generateExpansionReport(): ExpansionReport {
  const totalLow = REVENUE_OPPORTUNITIES.reduce((s, o) => {
    const match = o.estimatedMonthlyRevenue.match(/\$([\d,]+)/);
    return s + (match ? parseInt(match[1].replace(/,/g, "")) : 0);
  }, 0);
  const totalHigh = REVENUE_OPPORTUNITIES.reduce((s, o) => {
    const matches = o.estimatedMonthlyRevenue.match(/\$([\d,]+) - \$([\d,]+)/);
    return s + (matches ? parseInt(matches[2].replace(/,/g, "")) : 0);
  }, 0);

  const apiTiers = Object.keys(API_TIERS).length;
  const endpoints = 6;

  return {
    generatedAt: new Date().toISOString(),
    totalAddressableRevenue: `$${totalLow.toLocaleString()} - $${totalHigh.toLocaleString()}/month (all opportunities combined at scale)`,
    revenueOpportunities: REVENUE_OPPORTUNITIES,
    partnershipOpportunities: PARTNERSHIP_OPPORTUNITIES,
    apiReadiness: {
      endpointsReady: endpoints,
      tiersDefined: apiTiers,
      estimatedFirstApiRevenue: "$5,000 - $15,000/month (Year 1, Professional + Enterprise tiers)",
      goLiveTarget: "Q4 2026 (after security hardening and rate limiting infrastructure)",
    },
    integrationRoadmap: INTEGRATION_ROADMAP,
    strategicRecommendations: [
      "Priority 1: Activate automotive partnerships (CarEdge, Edmunds) — highest consumer awareness of hidden fees in car buying, strongest product-market fit.",
      "Priority 2: Launch Chrome Extension as free acquisition channel — builds user base, drives paid conversions, establishes browser presence.",
      "Priority 3: Develop API tier infrastructure — recurring revenue, developer ecosystem, platform expansion foundation.",
      "Priority 4: Pursue NerdWallet and Credit Karma partnerships — established audiences, high trust, immediate traffic injection.",
      "Priority 5: Publish 'Hidden Fee Trends Report' (powered by consumerInsights.ts) — PR opportunity, authority building, media coverage.",
      "Phase 2 (2027): Enterprise white-label deals — highest revenue potential but requires compliance certifications, dedicated infrastructure, and long sales cycles.",
    ],
  };
}

export const EXPANSION_REPORT_VERSION = "3.0.0";