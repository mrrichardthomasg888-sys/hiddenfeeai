// HiddenFeeAI — Embed Widget Analytics
// Privacy-safe tracking of widget views, upload starts, and conversions.
// No PII, no document contents, no user identity.

import type { WidgetInstance } from "./widgetConfig";

// ── Types ──────────────────────────────────────────────────────────────────

export interface WidgetEvent {
  eventId: string;
  instanceId: string;
  viewerToken: string;        // Anonymous
  eventType: "widget_view" | "widget_click" | "upload_start" | "upload_complete" | "conversion";
  timestamp: string;
  domain: string;
  partnerId: string;
  partnerReferralCode: string;
  metadata?: Record<string, string>;
}

export interface WidgetAnalytics {
  instanceId: string;
  totalViews: number;
  totalClicks: number;
  uploadStarts: number;
  uploadCompletes: number;
  conversions: number;
  clickThroughRate: number;      // views → clicks
  uploadRate: number;            // clicks → upload starts
  conversionRate: number;        // uploads → conversions
  viewsByDomain: Record<string, number>;
  eventsByDay: Record<string, number>;
}

// ── Event Factory ──────────────────────────────────────────────────────────

export function createWidgetEvent(
  instance: WidgetInstance,
  eventType: WidgetEvent["eventType"],
  metadata?: Record<string, string>,
): WidgetEvent {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    instanceId: instance.instanceId,
    viewerToken: instance.viewerToken,
    eventType,
    timestamp: new Date().toISOString(),
    domain: instance.domain,
    partnerId: instance.config.partnerId,
    partnerReferralCode: instance.config.partnerReferralCode,
    metadata,
  };
}

// ── Analytics Aggregation ──────────────────────────────────────────────────

export function aggregateWidgetAnalytics(
  instance: WidgetInstance,
  events: WidgetEvent[],
): WidgetAnalytics {
  const instanceEvents = events.filter((e) => e.instanceId === instance.instanceId);
  const views = instanceEvents.filter((e) => e.eventType === "widget_view").length;
  const clicks = instanceEvents.filter((e) => e.eventType === "widget_click").length;
  const uploadStarts = instanceEvents.filter((e) => e.eventType === "upload_start").length;
  const uploadCompletes = instanceEvents.filter((e) => e.eventType === "upload_complete").length;
  const conversions = instanceEvents.filter((e) => e.eventType === "conversion").length;

  const viewsByDomain: Record<string, number> = {};
  for (const e of instanceEvents.filter((ev) => ev.eventType === "widget_view")) {
    viewsByDomain[e.domain] = (viewsByDomain[e.domain] || 0) + 1;
  }

  const eventsByDay: Record<string, number> = {};
  for (const e of instanceEvents) {
    const day = e.timestamp.split("T")[0];
    eventsByDay[day] = (eventsByDay[day] || 0) + 1;
  }

  return {
    instanceId: instance.instanceId,
    totalViews: views,
    totalClicks: clicks,
    uploadStarts,
    uploadCompletes,
    conversions,
    clickThroughRate: views > 0 ? Math.round((clicks / views) * 100) : 0,
    uploadRate: clicks > 0 ? Math.round((uploadStarts / clicks) * 100) : 0,
    conversionRate: uploadStarts > 0 ? Math.round((conversions / uploadStarts) * 100) : 0,
    viewsByDomain,
    eventsByDay,
  };
}

// ── Partner-Level Aggregation ──────────────────────────────────────────────

export function aggregatePartnerWidgetAnalytics(
  partnerId: string,
  instances: WidgetInstance[],
  allEvents: WidgetEvent[],
) {
  const partnerInstances = instances.filter((i) => i.config.partnerId === partnerId);
  const partnerEvents = allEvents.filter((e) => e.partnerId === partnerId);

  const views = partnerEvents.filter((e) => e.eventType === "widget_view").length;
  const conversions = partnerEvents.filter((e) => e.eventType === "conversion").length;

  return {
    partnerId,
    totalInstances: partnerInstances.length,
    activeInstances: partnerInstances.filter((i) => i.status === "active").length,
    totalWidgetViews: views,
    totalConversions: conversions,
    conversionRate: views > 0 ? Math.round((conversions / views) * 100) : 0,
    topDomains: partnerInstances
      .map((i) => ({ domain: i.domain, views: partnerEvents.filter((e) => e.domain === i.domain && e.eventType === "widget_view").length }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10),
  };
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const EMBED_ANALYTICS_PRIVACY = {
  anonymousOnly: true,
  noCookies: true,
  retentionDays: 90,
  aggregatesOnly: true,
};

export const EMBED_ANALYTICS_VERSION = "3.0.0";