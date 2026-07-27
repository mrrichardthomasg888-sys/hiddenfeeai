// HiddenFeeAI — Report Engagement Signals
// Measures: report opened, sections viewed, findings expanded,
// PDF downloaded, actions clicked.
// Never stores document contents. Privacy-safe anonymous tracking.

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReportEngagementEvent {
  eventId: string;
  reportId: string;              // Anonymous report identifier
  eventType: ReportEventType;
  timestamp: string;
  metadata?: Record<string, string>;
}

export type ReportEventType =
  | "report_opened"
  | "report_scrolled"
  | "risk_score_viewed"
  | "financial_impact_viewed"
  | "finding_expanded"
  | "finding_read"               // User spent >10s on a finding
  | "evidence_viewed"
  | "negotiation_script_copied"
  | "recommended_action_clicked"
  | "pdf_downloaded"
  | "report_shared"
  | "comparison_requested";

export interface ReportEngagementMetrics {
  reportId: string;
  totalTimeSpentSeconds: number;
  sectionsViewed: number;
  findingsExpanded: number;
  findingsRead: number;
  scriptsCopied: number;
  actionsClicked: number;
  pdfDownloaded: boolean;
  engagementScore: number;       // 0-100
  engagementLevel: "Low" | "Medium" | "High" | "Power";
}

export interface ReportingDashboard {
  generatedAt: string;
  averageEngagementScore: number;
  averageTimePerReport: number;
  pdfDownloadRate: number;
  scriptCopyRate: number;
  mostEngagingReportSections: string[];
  leastEngagingReportSections: string[];
  recommendations: string[];
}

// ── Event Factory ──────────────────────────────────────────────────────────

export function createReportEvent(
  reportId: string,
  eventType: ReportEventType,
  metadata?: Record<string, string>,
): ReportEngagementEvent {
  return {
    eventId: `revt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    reportId,
    eventType,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

// ── Engagement Score ───────────────────────────────────────────────────────

export function computeReportEngagement(
  reportId: string,
  events: ReportEngagementEvent[],
): ReportEngagementMetrics {
  const reportEvents = events.filter((e) => e.reportId === reportId);

  const sectionsViewed = new Set(
    reportEvents
      .filter((e) => e.eventType === "risk_score_viewed" || e.eventType === "financial_impact_viewed")
      .map((e) => e.eventType),
  ).size;

  const findingsExpanded = reportEvents.filter((e) => e.eventType === "finding_expanded").length;
  const findingsRead = reportEvents.filter((e) => e.eventType === "finding_read").length;
  const scriptsCopied = reportEvents.filter((e) => e.eventType === "negotiation_script_copied").length;
  const actionsClicked = reportEvents.filter((e) => e.eventType === "recommended_action_clicked").length;
  const pdfDownloaded = reportEvents.some((e) => e.eventType === "pdf_downloaded");

  // Compute time from timestamps
  const timestamps = reportEvents.map((e) => new Date(e.timestamp).getTime());
  const totalTime = timestamps.length >= 2
    ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000)
    : 0;

  // Engagement score
  let score = 20; // Base for opening
  score += Math.min(sectionsViewed * 10, 20);
  score += Math.min(findingsExpanded * 5, 25);
  score += scriptsCopied * 10;
  score += actionsClicked * 5;
  score += pdfDownloaded ? 15 : 0;
  score = Math.min(100, score);

  let level: ReportEngagementMetrics["engagementLevel"] = "Low";
  if (score >= 75) level = "Power";
  else if (score >= 50) level = "High";
  else if (score >= 25) level = "Medium";

  return {
    reportId,
    totalTimeSpentSeconds: totalTime,
    sectionsViewed,
    findingsExpanded,
    findingsRead,
    scriptsCopied,
    actionsClicked,
    pdfDownloaded,
    engagementScore: score,
    engagementLevel: level,
  };
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export function generateReportingDashboard(
  allEvents: ReportEngagementEvent[],
  reportIds: string[],
): ReportingDashboard {
  const metrics = reportIds.map((id) => computeReportEngagement(id, allEvents));
  const avgScore = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.engagementScore, 0) / metrics.length)
    : 0;
  const avgTime = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.totalTimeSpentSeconds, 0) / metrics.length)
    : 0;

  const pdfRate = metrics.length > 0
    ? Math.round((metrics.filter((m) => m.pdfDownloaded).length / metrics.length) * 100)
    : 0;

  const scriptRate = metrics.length > 0
    ? Math.round((metrics.filter((m) => m.scriptsCopied > 0).length / metrics.length) * 100)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    averageEngagementScore: avgScore,
    averageTimePerReport: avgTime,
    pdfDownloadRate: pdfRate,
    scriptCopyRate: scriptRate,
    mostEngagingReportSections: [
      "Financial Impact Summary",
      "Hidden Fees Found",
      "Negotiation Scripts",
    ],
    leastEngagingReportSections: [
      "Document Meta Information",
      "Math Errors (when none found)",
    ],
    recommendations: [
      pdfRate < 30 ? "Make PDF download button more prominent — add at top and bottom of report" : "PDF download rate healthy",
      scriptRate < 20 ? "Add more prominent 'Copy Script' buttons near each finding" : "Script copy rate healthy",
      avgScore < 40 ? "Report engagement low — consider simplifying layout and leading with most important finding" : "",
    ].filter(Boolean),
  };
}

export const REPORT_ENGAGEMENT_VERSION = "5.0.0";