// HiddenFeeAI — Growth Analytics
// Privacy-safe tracking of organic visitors, landing pages,
// upload conversion, paid conversion, returning users,
// and most valuable topics.
// No PII. No fingerprinting. Aggregate only.

// ── Types ──────────────────────────────────────────────────────────────────

export interface DailyMetrics {
  date: string;
  organicVisitors: number;
  landingPageViews: number;
  uploadsStarted: number;
  uploadsCompleted: number;
  paymentsInitiated: number;
  paymentsCompleted: number;
  reportsGenerated: number;
  returningUsers: number;
}

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  pageViews: number;
  averageTimeOnPage: number;    // seconds
  bounceRate: number;           // 0-100
  conversionToUpload: number;   // 0-100
  featuredSnippetImpressions: number;
}

export interface ConversionFunnel {
  step: string;
  count: number;
  dropoffPercent: number;
}

export interface GrowthSummary {
  totalOrganicVisitors: number;       // trailing 30 days
  totalUploads: number;
  totalReportsGenerated: number;
  conversionRate: number;             // upload → payment
  returningUserRate: number;          // 0-100
  topPerformingTopics: TopicPerformance[];
  funnel: ConversionFunnel[];
  organicTrend: "up" | "stable" | "down";
}

// ── Privacy-Safe Data Collection (NO PII) ──────────────────────────────────

// This module is designed to be called from both client and server.
// ALL data is aggregate and anonymized. No IP addresses, no user IDs beyond anonymous session.

export function createEmptyDailyMetrics(date?: string): DailyMetrics {
  return {
    date: date || new Date().toISOString().split("T")[0],
    organicVisitors: 0,
    landingPageViews: 0,
    uploadsStarted: 0,
    uploadsCompleted: 0,
    paymentsInitiated: 0,
    paymentsCompleted: 0,
    reportsGenerated: 0,
    returningUsers: 0,
  };
}

// ── Estimator Functions (Server uses real analytics data) ──────────────────

// These are placeholder estimation functions that would be replaced
// with real analytics (Plausible, Simple Analytics, or server-side counters).
// They demonstrate the metric model without collecting PII.

export function estimateConversionFunnel(metrics: DailyMetrics[]): ConversionFunnel[] {
  const totals = metrics.reduce(
    (acc, m) => ({
      landingViews: acc.landingViews + m.landingPageViews,
      uploadsStarted: acc.uploadsStarted + m.uploadsStarted,
      uploadsCompleted: acc.uploadsCompleted + m.uploadsCompleted,
      paymentsInitiated: acc.paymentsInitiated + m.paymentsInitiated,
      paymentsCompleted: acc.paymentsCompleted + m.paymentsCompleted,
      reportsGenerated: acc.reportsGenerated + m.reportsGenerated,
    }),
    { landingViews: 0, uploadsStarted: 0, uploadsCompleted: 0, paymentsInitiated: 0, paymentsCompleted: 0, reportsGenerated: 0 },
  );

  const steps: { name: string; count: number }[] = [
    { name: "Landing Page View", count: totals.landingViews },
    { name: "Upload Started", count: totals.uploadsStarted },
    { name: "Upload Completed", count: totals.uploadsCompleted },
    { name: "Payment Initiated", count: totals.paymentsInitiated },
    { name: "Payment Completed", count: totals.paymentsCompleted },
    { name: "Report Generated", count: totals.reportsGenerated },
  ];

  return steps.map((step, i) => {
    const previous = i > 0 ? steps[i - 1].count : step.count;
    const dropoff = previous > 0 ? Math.round(((previous - step.count) / previous) * 100) : 0;

    return {
      step: step.name,
      count: step.count,
      dropoffPercent: Math.max(0, dropoff),
    };
  });
}

// ── Topic Performance Analysis ─────────────────────────────────────────────

export function generateTopicPerformance(
  visitors: number,
  uploads: number,
): TopicPerformance[] {
  // In production, this would pull from actual analytics.
  // This is a structure demonstration of the data model.
  return [
    {
      topicId: "auto-doc-fee",
      topicName: "Car Purchase Hidden Fees",
      pageViews: Math.round(visitors * 0.35),
      averageTimeOnPage: 245,
      bounceRate: 42,
      conversionToUpload: 12,
      featuredSnippetImpressions: 3200,
    },
    {
      topicId: "medical-facility-fee",
      topicName: "Medical Bill Hidden Charges",
      pageViews: Math.round(visitors * 0.25),
      averageTimeOnPage: 210,
      bounceRate: 48,
      conversionToUpload: 9,
      featuredSnippetImpressions: 2100,
    },
    {
      topicId: "contract-hidden-costs",
      topicName: "Contract Review for Hidden Costs",
      pageViews: Math.round(visitors * 0.20),
      averageTimeOnPage: 320,
      bounceRate: 35,
      conversionToUpload: 18,
      featuredSnippetImpressions: 1800,
    },
    {
      topicId: "utility-hidden-surcharge",
      topicName: "Utility & Subscription Hidden Fees",
      pageViews: Math.round(visitors * 0.15),
      averageTimeOnPage: 190,
      bounceRate: 55,
      conversionToUpload: 7,
      featuredSnippetImpressions: 1400,
    },
    {
      topicId: "auto-dealer-prep-fee",
      topicName: "Dealer Preparation Fees",
      pageViews: Math.round(visitors * 0.05),
      averageTimeOnPage: 165,
      bounceRate: 52,
      conversionToUpload: 5,
      featuredSnippetImpressions: 600,
    },
  ];
}

// ── Growth Summary Generator ───────────────────────────────────────────────

export function generateGrowthSummary(metrics: DailyMetrics[]): GrowthSummary {
  const totalOrganic = metrics.reduce((sum, m) => sum + m.organicVisitors, 0);
  const totalUploads = metrics.reduce((sum, m) => sum + m.uploadsCompleted, 0);
  const totalReports = metrics.reduce((sum, m) => sum + m.reportsGenerated, 0);
  const totalPayments = metrics.reduce((sum, m) => sum + m.paymentsCompleted, 0);
  const totalReturning = metrics.reduce((sum, m) => sum + m.returningUsers, 0);

  const conversionRate = totalUploads > 0 ? Math.round((totalPayments / totalUploads) * 100) : 0;
  const returningRate = totalOrganic > 0 ? Math.round((totalReturning / totalOrganic) * 100) : 0;
  const funnel = estimateConversionFunnel(metrics);
  const topics = generateTopicPerformance(totalOrganic, totalUploads);

  // Trend detection
  const recent = metrics.slice(-7);
  const older = metrics.slice(-14, -7);
  const recentAvg = recent.length > 0 ? recent.reduce((s, m) => s + m.organicVisitors, 0) / recent.length : 0;
  const olderAvg = older.length > 0 ? older.reduce((s, m) => s + m.organicVisitors, 0) / older.length : recentAvg;

  let organicTrend: "up" | "stable" | "down" = "stable";
  if (recentAvg > olderAvg * 1.05) organicTrend = "up";
  else if (recentAvg < olderAvg * 0.95) organicTrend = "down";

  return {
    totalOrganicVisitors: totalOrganic,
    totalUploads,
    totalReportsGenerated: totalReports,
    conversionRate,
    returningUserRate: returningRate,
    topPerformingTopics: topics.sort((a, b) => b.pageViews - a.pageViews),
    funnel,
    organicTrend,
  };
}

// ── Privacy-Safe Event Tracking Interface ──────────────────────────────────

// These would be implemented server-side with a privacy-safe analytics tool.
// All events are anonymous and aggregated. No personal data is collected.

export const GROWTH_EVENTS = {
  PAGE_VIEW_LANDING: "growth:landing_view",
  PAGE_VIEW_EDUCATION: "growth:education_view",
  UPLOAD_STARTED: "growth:upload_started",
  UPLOAD_COMPLETED: "growth:upload_completed",
  PAYMENT_INITIATED: "growth:payment_initiated",
  PAYMENT_COMPLETED: "growth:payment_completed",
  REPORT_GENERATED: "growth:report_generated",
  REPORT_VIEWED: "growth:report_viewed",
  SEARCH_CLICK: "growth:search_click",
} as const;

export type GrowthEvent = typeof GROWTH_EVENTS[keyof typeof GROWTH_EVENTS];

export const GROWTH_METRICS_VERSION = "2.0.0";