// HiddenFeeAI — Affiliate & Referral Intelligence
// Tracks source, campaign, conversion rate, and revenue attribution.
// Privacy-safe only — no PII, no document data.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReferralSource {
  sourceId: string;
  sourceType: "partner" | "affiliate" | "social" | "email" | "blog" | "direct" | "widget" | "organic" | "paid";
  name: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface CampaignMetrics {
  campaignId: string;
  source: ReferralSource;
  impressions: number;
  clicks: number;
  uploads: number;
  payments: number;
  revenueCents: number;
  spendCents: number;
  roi: number;               // revenue / spend
  conversionRate: number;    // click → payment
  startDate: string;
  endDate: string | null;
}

export interface AttributionSummary {
  totalRevenue: number;
  totalConversions: number;
  bySource: Record<string, { revenue: number; conversions: number; percentage: number }>;
  byCampaign: Record<string, { revenue: number; conversions: number }>;
  topPerformingSources: { name: string; revenue: number; conversions: number }[];
}

// ── Campaign Tracker ───────────────────────────────────────────────────────

export function createCampaign(
  source: ReferralSource,
  spendCents: number,
  startDate: string,
): CampaignMetrics {
  return {
    campaignId: `camp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source,
    impressions: 0,
    clicks: 0,
    uploads: 0,
    payments: 0,
    revenueCents: 0,
    spendCents,
    roi: 0,
    conversionRate: 0,
    startDate,
    endDate: null,
  };
}

// ── Attribution ────────────────────────────────────────────────────────────

export function attributeRevenue(
  campaigns: CampaignMetrics[],
): AttributionSummary {
  const totalRevenue = campaigns.reduce((s, c) => s + c.revenueCents, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.payments, 0);

  const bySource: Record<string, { revenue: number; conversions: number; percentage: number }> = {};
  for (const c of campaigns) {
    const key = c.source.sourceType;
    bySource[key] = bySource[key] || { revenue: 0, conversions: 0, percentage: 0 };
    bySource[key].revenue += c.revenueCents;
    bySource[key].conversions += c.payments;
  }
  for (const key of Object.keys(bySource)) {
    bySource[key].percentage = totalRevenue > 0 ? Math.round((bySource[key].revenue / totalRevenue) * 100) : 0;
  }

  const topSources = campaigns
    .map((c) => ({ name: `${c.source.name} (${c.source.sourceType})`, revenue: c.revenueCents, conversions: c.payments }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return { totalRevenue, totalConversions, bySource, byCampaign: {}, topPerformingSources: topSources };
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const REFERRAL_ANALYTICS_PRIVACY = {
  tracksOnly: ["source_type", "campaign_id", "conversion_event", "revenue_amount"],
  neverTracks: ["user_identity", "document_contents", "analysis_results"],
  aggregateOnly: true,
  retentionDays: 365, // Campaign data for annual comparison
};

export const REFERRAL_ANALYTICS_VERSION = "3.0.0";