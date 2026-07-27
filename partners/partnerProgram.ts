// HiddenFeeAI — Partner Program Foundation
// Supports referral links, partner IDs, conversion attribution,
// and commission tracking architecture.
// Privacy: never share uploaded documents or user analysis data.

// ── Types ──────────────────────────────────────────────────────────────────

export type PartnerType =
  | "consumer_advocacy"
  | "financial_education"
  | "auto_buying_resource"
  | "real_estate_resource"
  | "personal_finance_creator"
  | "legal_services"
  | "insurance_comparison"
  | "utility_consumer_group"
  | "healthcare_advocate"
  | "media_publisher";

export type PartnerTier = "bronze" | "silver" | "gold" | "platinum";

export type CommissionModel = "per_referral" | "revenue_share" | "hybrid";

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  tier: PartnerTier;
  websiteUrl: string;
  referralCode: string;         // Unique partner referral slug
  commissionModel: CommissionModel;
  commissionRate: number;       // Percentage (0-100) or fixed amount interpretation
  revenueSharePercent?: number; // For revenue_share/hybrid models
  flatPerConversion?: number;   // For per_referral model
  activeSince: string;
  status: "active" | "paused" | "pending" | "terminated";
  contactEmail: string;
  industriesCovered: string[];
  monthlyReferralCap?: number;  // Optional cap to manage costs
}

export interface PartnerReferral {
  referralId: string;
  partnerId: string;
  partnerReferralCode: string;
  visitorSessionId: string;     // Anonymous, no PII
  landedAt: string;             // ISO timestamp
  converted: boolean;
  conversionType?: "upload" | "payment" | "report_generated";
  conversionTimestamp?: string;
  revenueGenerated?: number;    // In cents
  commissionDue?: number;       // In cents
  commissionPaid: boolean;
  commissionPaidDate?: string;
}

export interface PartnerDashboard {
  partnerId: string;
  totalReferrals: number;
  totalConversions: number;
  conversionRate: number;       // 0-100
  totalRevenueGenerated: number;
  totalCommissionsDue: number;
  totalCommissionsPaid: number;
  activeReferrals: number;      // Last 30 days
  monthlyTrend: "up" | "stable" | "down";
}

// ── Partner Registry ───────────────────────────────────────────────────────

export const PARTNER_TEMPLATES: Omit<Partner, "id" | "referralCode" | "activeSince" | "contactEmail">[] = [
  {
    name: "Consumer Action",
    type: "consumer_advocacy",
    tier: "gold",
    websiteUrl: "https://consumer-action.org",
    commissionModel: "revenue_share",
    commissionRate: 20,
    revenueSharePercent: 20,
    status: "active",
    industriesCovered: ["automotive", "housing", "banking"],
  },
  {
    name: "NerdWallet",
    type: "financial_education",
    tier: "platinum",
    websiteUrl: "https://nerdwallet.com",
    commissionModel: "hybrid",
    commissionRate: 15,
    revenueSharePercent: 15,
    flatPerConversion: 250, // $2.50 per paid conversion
    status: "active",
    industriesCovered: ["banking", "insurance", "automotive"],
  },
  {
    name: "CarEdge",
    type: "auto_buying_resource",
    tier: "silver",
    websiteUrl: "https://caredge.com",
    commissionModel: "per_referral",
    commissionRate: 10,
    flatPerConversion: 500, // $5.00 per paid conversion
    status: "active",
    industriesCovered: ["automotive"],
  },
  {
    name: "BiggerPockets",
    type: "real_estate_resource",
    tier: "silver",
    websiteUrl: "https://biggerpockets.com",
    commissionModel: "revenue_share",
    commissionRate: 15,
    revenueSharePercent: 15,
    status: "active",
    industriesCovered: ["housing"],
  },
  {
    name: "Credit Karma",
    type: "financial_education",
    tier: "gold",
    websiteUrl: "https://creditkarma.com",
    commissionModel: "revenue_share",
    commissionRate: 18,
    revenueSharePercent: 18,
    status: "active",
    industriesCovered: ["banking", "insurance"],
  },
  {
    name: "The Penny Hoarder",
    type: "personal_finance_creator",
    tier: "bronze",
    websiteUrl: "https://thepennyhoarder.com",
    commissionModel: "per_referral",
    commissionRate: 8,
    flatPerConversion: 300,
    status: "active",
    industriesCovered: ["subscriptions", "utilities", "banking"],
  },
  {
    name: "Patient Advocate Foundation",
    type: "healthcare_advocate",
    tier: "gold",
    websiteUrl: "https://patientadvocate.org",
    commissionModel: "per_referral",
    commissionRate: 12,
    flatPerConversion: 400,
    status: "active",
    industriesCovered: ["healthcare"],
  },
];

// ── Partner Program Functions ──────────────────────────────────────────────

export function generateReferralCode(partnerName: string): string {
  const slug = partnerName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 30);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${slug}-${suffix}`;
}

export function createPartnerLink(partnerCode: string, landingPath = "/"): string {
  const base = "https://hiddenfeeai.com";
  const params = new URLSearchParams({ ref: partnerCode });
  return `${base}${landingPath}?${params.toString()}`;
}

export function parseReferralFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("ref") || null;
  } catch {
    return null;
  }
}

export function calculateCommission(
  partner: Partner,
  revenue: number,
): number {
  switch (partner.commissionModel) {
    case "per_referral":
      return partner.flatPerConversion || 0;
    case "revenue_share":
      return Math.round(revenue * ((partner.revenueSharePercent || partner.commissionRate) / 100));
    case "hybrid":
      const flat = partner.flatPerConversion || 0;
      const share = Math.round(revenue * ((partner.revenueSharePercent || 0) / 100));
      return flat + share;
    default:
      return 0;
  }
}

export function computePartnerDashboard(
  partner: Partner,
  referrals: PartnerReferral[],
): PartnerDashboard {
  const partnerReferrals = referrals.filter((r) => r.partnerId === partner.id);
  const converted = partnerReferrals.filter((r) => r.converted);
  const recentReferrals = partnerReferrals.filter(
    (r) => new Date(r.landedAt).getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000,
  );
  const previousReferrals = partnerReferrals.filter(
    (r) => {
      const t = new Date(r.landedAt).getTime();
      return t > Date.now() - 60 * 24 * 60 * 60 * 1000 && t <= Date.now() - 30 * 24 * 60 * 60 * 1000;
    },
  );

  const monthlyTrend: "up" | "stable" | "down" =
    recentReferrals.length > previousReferrals.length * 1.05
      ? "up"
      : recentReferrals.length < previousReferrals.length * 0.95
        ? "down"
        : "stable";

  return {
    partnerId: partner.id,
    totalReferrals: partnerReferrals.length,
    totalConversions: converted.length,
    conversionRate: partnerReferrals.length > 0
      ? Math.round((converted.length / partnerReferrals.length) * 100)
      : 0,
    totalRevenueGenerated: converted.reduce((s, r) => s + (r.revenueGenerated || 0), 0),
    totalCommissionsDue: converted
      .filter((r) => !r.commissionPaid)
      .reduce((s, r) => s + (r.commissionDue || 0), 0),
    totalCommissionsPaid: converted
      .filter((r) => r.commissionPaid)
      .reduce((s, r) => s + (r.commissionDue || 0), 0),
    activeReferrals: recentReferrals.length,
    monthlyTrend,
  };
}

// ── Privacy Guarantee ──────────────────────────────────────────────────────

export const PARTNER_PRIVACY_POLICY = {
  shared: ["referral_source", "conversion_event", "commission_amount"],
  neverShared: [
    "uploaded_documents",
    "document_contents",
    "analysis_results",
    "user_personal_information",
    "financial_data",
    "report_details",
  ],
  dataRetentionDays: 90, // Referral data retained for reconciliation only
};

export const PARTNER_PROGRAM_VERSION = "3.0.0";