// HiddenFeeAI — Referral Tracking System
// Tracks partner referral attribution from click to conversion.
// Uses anonymous session IDs — never stores PII or document data.

import type { Partner, PartnerReferral } from "./partnerProgram";
import { calculateCommission, PARTNER_PRIVACY_POLICY } from "./partnerProgram";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReferralSession {
  sessionId: string;
  partnerCode: string;
  partnerId: string;
  landingUrl: string;
  source: string;             // "partner_link" | "embed_widget" | "api_referral"
  campaign?: string;          // Optional campaign tag
  medium?: string;            // "email" | "social" | "blog" | "widget"
  clickTimestamp: string;
  lastActivityTimestamp: string;
  conversionStatus: "pending" | "uploaded" | "paid" | "completed" | "expired";
  utmParams?: Record<string, string>;
}

export interface AttributionWindow {
  clickToUpload: number;      // milliseconds (default: 30 days)
  clickToPayment: number;     // milliseconds (default: 30 days)
  lastTouchWins: boolean;     // true = last partner gets credit
}

export interface ReferralMetrics {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  averageCommission: number;
  totalCommissionsPaid: number;
  totalRevenueFromReferrals: number;
  topPartners: { partnerId: string; referrals: number; conversions: number }[];
  bySource: Record<string, { clicks: number; conversions: number }>;
  byCampaign: Record<string, { clicks: number; conversions: number }>;
}

// ── Attribution Configuration ──────────────────────────────────────────────

export const DEFAULT_ATTRIBUTION_WINDOW: AttributionWindow = {
  clickToUpload: 30 * 24 * 60 * 60 * 1000,   // 30 days
  clickToPayment: 30 * 24 * 60 * 60 * 1000,  // 30 days
  lastTouchWins: true,                        // Last partner gets credit
};

// ── Session Management ─────────────────────────────────────────────────────

export function createReferralSession(
  partnerCode: string,
  partnerId: string,
  landingUrl: string,
  source: ReferralSession["source"] = "partner_link",
  campaign?: string,
  medium?: string,
): ReferralSession {
  return {
    sessionId: crypto.randomUUID?.() || `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    partnerCode,
    partnerId,
    landingUrl,
    source,
    campaign,
    medium,
    clickTimestamp: new Date().toISOString(),
    lastActivityTimestamp: new Date().toISOString(),
    conversionStatus: "pending",
  };
}

export function touchSession(session: ReferralSession): ReferralSession {
  return {
    ...session,
    lastActivityTimestamp: new Date().toISOString(),
  };
}

export function isSessionExpired(
  session: ReferralSession,
  window: AttributionWindow = DEFAULT_ATTRIBUTION_WINDOW,
): boolean {
  const elapsed = Date.now() - new Date(session.clickTimestamp).getTime();
  return elapsed > window.clickToUpload;
}

export function advanceConversionStatus(
  session: ReferralSession,
  newStatus: ReferralSession["conversionStatus"],
): ReferralSession {
  const validOrder: ReferralSession["conversionStatus"][] = [
    "pending", "uploaded", "paid", "completed",
  ];
  const currentIdx = validOrder.indexOf(session.conversionStatus);
  const newIdx = validOrder.indexOf(newStatus);
  if (newIdx > currentIdx) {
    return { ...session, conversionStatus: newStatus, lastActivityTimestamp: new Date().toISOString() };
  }
  return session;
}

// ── Referral Record Creation ───────────────────────────────────────────────

export function createReferralRecord(
  session: ReferralSession,
  partner: Partner,
  conversionType?: PartnerReferral["conversionType"],
  revenueGenerated?: number,
): PartnerReferral {
  const commission = revenueGenerated
    ? calculateCommission(partner, revenueGenerated)
    : undefined;

  return {
    referralId: `ref-${session.sessionId}-${Date.now()}`,
    partnerId: session.partnerId,
    partnerReferralCode: session.partnerCode,
    visitorSessionId: session.sessionId,
    landedAt: session.clickTimestamp,
    converted: !!conversionType,
    conversionType,
    conversionTimestamp: conversionType ? new Date().toISOString() : undefined,
    revenueGenerated,
    commissionDue: commission,
    commissionPaid: false,
  };
}

// ── Attribution Logic ──────────────────────────────────────────────────────

export function attributeConversion(
  sessions: ReferralSession[],
  window: AttributionWindow = DEFAULT_ATTRIBUTION_WINDOW,
): ReferralSession | null {
  const active = sessions.filter((s) => !isSessionExpired(s, window));

  if (active.length === 0) return null;

  // Last-touch attribution (most recent click wins)
  if (window.lastTouchWins) {
    return active.sort(
      (a, b) => new Date(b.clickTimestamp).getTime() - new Date(a.clickTimestamp).getTime(),
    )[0];
  }

  // First-touch attribution
  return active.sort(
    (a, b) => new Date(a.clickTimestamp).getTime() - new Date(b.clickTimestamp).getTime(),
  )[0];
}

// ── Metrics Aggregation ────────────────────────────────────────────────────

export function aggregateReferralMetrics(referrals: PartnerReferral[]): ReferralMetrics {
  const converted = referrals.filter((r) => r.converted);
  const totalRevenue = converted.reduce((s, r) => s + (r.revenueGenerated || 0), 0);
  const totalCommissions = converted.reduce((s, r) => s + (r.commissionDue || 0), 0);

  // Top partners
  const partnerMap = new Map<string, { referrals: number; conversions: number }>();
  for (const ref of referrals) {
    const existing = partnerMap.get(ref.partnerId) || { referrals: 0, conversions: 0 };
    existing.referrals++;
    if (ref.converted) existing.conversions++;
    partnerMap.set(ref.partnerId, existing);
  }
  const topPartners = [...partnerMap.entries()]
    .map(([partnerId, stats]) => ({ partnerId, ...stats }))
    .sort((a, b) => b.conversions - a.conversions);

  // By campaign
  const campaignMap = new Map<string, { clicks: number; conversions: number }>();
  // Campaign tracking would be linked from sessions
  // This is aggregate only — no session data stored

  return {
    totalClicks: referrals.length,
    totalConversions: converted.length,
    conversionRate: referrals.length > 0
      ? Math.round((converted.length / referrals.length) * 100)
      : 0,
    averageCommission: converted.length > 0
      ? Math.round(totalCommissions / converted.length)
      : 0,
    totalCommissionsPaid: converted
      .filter((r) => r.commissionPaid)
      .reduce((s, r) => s + (r.commissionDue || 0), 0),
    totalRevenueFromReferrals: totalRevenue,
    topPartners: topPartners.slice(0, 10),
    bySource: {},     // Populated from session data in production
    byCampaign: {},   // Populated from session data in production
  };
}

// ── UTM Parameter Parser ───────────────────────────────────────────────────

export function parseUTMParams(url: string): Record<string, string> {
  try {
    const parsed = new URL(url);
    const utmParams: Record<string, string> = {};
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    for (const key of utmKeys) {
      const value = parsed.searchParams.get(key);
      if (value) utmParams[key] = value;
    }
    return utmParams;
  } catch {
    return {};
  }
}

// ── Privacy & Compliance ───────────────────────────────────────────────────

export const REFERRAL_DATA_RETENTION = {
  sessionDataDays: 30,        // Delete session data after 30 days
  referralRecordsDays: 90,    // Keep referral records 90 days for reconciliation
  aggregatedMetricsIndefinite: true, // Aggregated stats can persist
};

export function sanitizeReferralData(referral: PartnerReferral): Omit<PartnerReferral, "visitorSessionId"> {
  // Remove any session identifiers before sharing with partners
  const { visitorSessionId, ...safe } = referral;
  return safe;
}

export const REFERRAL_TRACKING_VERSION = "3.0.0";