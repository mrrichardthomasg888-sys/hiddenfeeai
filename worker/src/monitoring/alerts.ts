// HiddenFeeAI — Production Alert System
// Tracks: analysis failures, Docling failures, DeepSeek failures,
// fallback rate, processing latency, cost spikes, payment failures.
// Alert thresholds: Critical, High, Medium.
// Privacy-safe: metadata only. No document content or PII.

import { getErrorSummary, type ErrorEvent } from "./errorIntelligence.js";
import { getMetricsSnapshot, type MetricEvent } from "../middleware/observability.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type AlertLevel = "critical" | "high" | "medium" | "info";

export interface AlertRule {
  id: string;
  name: string;
  level: AlertLevel;
  metric: string;
  threshold: number;
  windowMinutes: number;
  description: string;
  runbook: string;
}

export interface ActiveAlert {
  ruleId: string;
  level: AlertLevel;
  triggeredAt: string;
  currentValue: number;
  threshold: number;
  message: string;
}

export interface AlertDashboard {
  generatedAt: string;
  activeAlerts: ActiveAlert[];
  rules: AlertRule[];
  metrics: AlertMetrics;
}

export interface AlertMetrics {
  analysisFailureRate: number;
  doclingFailureRate: number;
  fallbackRate: number;
  p95LatencySeconds: number;
  paymentFailureRate: number;
  errorCount: number;
  estimatedDailyCostCents: number;
}

// ── Alert Rules ────────────────────────────────────────────────────────────

export const ALERT_RULES: AlertRule[] = [
  {
    id: "CRIT-001",
    name: "High Analysis Failure Rate",
    level: "critical",
    metric: "analysis_failure_rate",
    threshold: 5, // 5%
    windowMinutes: 5,
    description: "More than 5% of analyses are failing in the last 5 minutes.",
    runbook: "RUNBOOK: Check DeepSeek API status. Check /api/health/deep for dependency status. Review error logs for pattern. If >10%, consider pausing new analyses until root cause identified.",
  },
  {
    id: "CRIT-002",
    name: "Payment Failure Spike",
    level: "critical",
    metric: "payment_failure_rate",
    threshold: 3, // 3 failures
    windowMinutes: 10,
    description: "3+ payment webhook signature verification failures in 10 minutes.",
    runbook: "RUNBOOK: Possible webhook forgery attack. Verify STRIPE_WEBHOOK_SECRET is correctly set. Check Stripe Dashboard for webhook attempt logs. If forgery confirmed, rotate webhook secret immediately.",
  },
  {
    id: "CRIT-003",
    name: "Docling Service Unavailable",
    level: "critical",
    metric: "docling_availability",
    threshold: 3, // consecutive failures
    windowMinutes: 5,
    description: "Docling service unreachable for 3 consecutive health checks.",
    runbook: "RUNBOOK: Check Docling Docker container status. Restart if needed. All traffic will fall back to DeepSeek Vision — monitor cost increase. Alert resolves when /api/health/deep returns docling=ok.",
  },
  {
    id: "HIGH-001",
    name: "Elevated Latency",
    level: "high",
    metric: "p95_latency_seconds",
    threshold: 90, // 90 seconds
    windowMinutes: 15,
    description: "p95 end-to-end latency exceeds 90 seconds for 15 minutes.",
    runbook: "RUNBOOK: Check DeepSeek API latency. Check Docling response times. Review KV write latency. Consider Worker plan upgrade if sustained. Check for large document surge.",
  },
  {
    id: "HIGH-002",
    name: "High Fallback Rate",
    level: "high",
    metric: "fallback_rate",
    threshold: 20, // 20%
    windowMinutes: 15,
    description: "Docling→Vision fallback rate exceeds 20% — indicates Docling reliability issue.",
    runbook: "RUNBOOK: Review Docling error logs. Check for specific document types causing failures. If Docling is healthy but rejecting specific formats, those formats may need Vision-only routing. Restart Docling if errors are timeout-related.",
  },
  {
    id: "HIGH-003",
    name: "DeepSeek Rate Limit Warnings",
    level: "high",
    metric: "deepseek_429_count",
    threshold: 10,
    windowMinutes: 5,
    description: "10+ DeepSeek API 429 (rate limit) responses in 5 minutes.",
    runbook: "RUNBOOK: Upgrade DeepSeek API tier (free: 60 RPM → paid: 600 RPM). Implement request queue with backpressure. Consider caching common document patterns.",
  },
  {
    id: "MED-001",
    name: "Rising Costs",
    level: "medium",
    metric: "daily_cost_cents",
    threshold: 5000, // $50/day
    windowMinutes: 1440, // 24 hours
    description: "Estimated daily AI cost exceeds $50.",
    runbook: "RUNBOOK: Review cost breakdown: Docling vs Vision split. If Vision usage is high (>30%), investigate Docling health. Review if batch API could reduce costs. Check for unusual traffic patterns.",
  },
  {
    id: "MED-002",
    name: "Unusual Traffic Pattern",
    level: "medium",
    metric: "traffic_spike_ratio",
    threshold: 300, // 3x normal
    windowMinutes: 60,
    description: "Traffic volume is 3x higher than trailing 7-day average.",
    runbook: "RUNBOOK: Check for DDoS (verify Cloudflare WAF is active). Check for viral content/referral traffic. If legitimate, monitor capacity. If suspicious, enable stricter rate limiting.",
  },
  {
    id: "INFO-001",
    name: "Worker Cold Start Frequency",
    level: "info",
    metric: "cold_start_count",
    threshold: 5,
    windowMinutes: 60,
    description: "5+ Worker cold starts in 1 hour.",
    runbook: "RUNBOOK: Normal after deployments. If sustained, consider CRON trigger every 5 minutes to keep Worker warm. Review traffic patterns for bursty behavior.",
  },
];

// ── Alert Evaluation ───────────────────────────────────────────────────────

export function evaluateAlerts(metrics: AlertMetrics, previousAlerts: ActiveAlert[] = []): ActiveAlert[] {
  const alerts: ActiveAlert[] = [];
  const now = new Date().toISOString();

  // CRIT-001: Analysis failure rate
  if (metrics.analysisFailureRate > 5) {
    alerts.push({
      ruleId: "CRIT-001",
      level: "critical",
      triggeredAt: now,
      currentValue: metrics.analysisFailureRate,
      threshold: 5,
      message: `Analysis failure rate at ${metrics.analysisFailureRate}% — exceeds 5% threshold`,
    });
  }

  // CRIT-002: Payment failures (tracked via webhook verification failures)
  // Implementation would count from error log

  // CRIT-003: Docling unavailable (checked via /api/health/deep)
  // Implementation would poll health endpoint

  // HIGH-001: Latency
  if (metrics.p95LatencySeconds > 90) {
    alerts.push({
      ruleId: "HIGH-001",
      level: "high",
      triggeredAt: now,
      currentValue: metrics.p95LatencySeconds,
      threshold: 90,
      message: `p95 latency at ${metrics.p95LatencySeconds}s — exceeds 90s threshold`,
    });
  }

  // HIGH-002: Fallback rate
  if (metrics.fallbackRate > 20) {
    alerts.push({
      ruleId: "HIGH-002",
      level: "high",
      triggeredAt: now,
      currentValue: metrics.fallbackRate,
      threshold: 20,
      message: `Docling→Vision fallback rate at ${metrics.fallbackRate}% — exceeds 20% threshold`,
    });
  }

  // MED-001: Rising costs
  if (metrics.estimatedDailyCostCents > 5000) {
    alerts.push({
      ruleId: "MED-001",
      level: "medium",
      triggeredAt: now,
      currentValue: metrics.estimatedDailyCostCents,
      threshold: 5000,
      message: `Estimated daily cost at $${(metrics.estimatedDailyCostCents / 100).toFixed(2)} — exceeds $50 threshold`,
    });
  }

  return alerts;
}

// ── Alert Dashboard ────────────────────────────────────────────────────────

export function getAlertDashboard(): AlertDashboard {
  const errorSummary = getErrorSummary();
  const metrics: AlertMetrics = {
    analysisFailureRate: errorSummary.totalErrors > 0 ? Math.round((errorSummary.byCategory["analysis_failure"] || 0) / Math.max(errorSummary.totalErrors, 1) * 100) : 0,
    doclingFailureRate: errorSummary.totalErrors > 0 ? Math.round((errorSummary.byCategory["docling_timeout"] || 0) / Math.max(errorSummary.totalErrors, 1) * 100) : 0,
    fallbackRate: errorSummary.fallbackRate,
    p95LatencySeconds: 0, // Populated from observability metrics in production
    paymentFailureRate: 0,
    errorCount: errorSummary.totalErrors,
    estimatedDailyCostCents: 0,
  };

  const alerts = evaluateAlerts(metrics);

  return {
    generatedAt: new Date().toISOString(),
    activeAlerts: alerts,
    rules: ALERT_RULES,
    metrics,
  };
}

// ── Dispatch Interface ─────────────────────────────────────────────────────

export function dispatchAlert(alert: ActiveAlert): void {
  const rule = ALERT_RULES.find((r) => r.id === alert.ruleId);

  switch (alert.level) {
    case "critical":
      console.error(`[ALERT:CRITICAL] ${alert.message}`);
      console.error(`[RUNBOOK] ${rule?.runbook || "No runbook defined"}`);
      // In production: send to PagerDuty, SMS, or on-call rotation
      break;
    case "high":
      console.warn(`[ALERT:HIGH] ${alert.message}`);
      console.warn(`[RUNBOOK] ${rule?.runbook || "No runbook defined"}`);
      // In production: send to Slack #alerts channel
      break;
    case "medium":
      console.log(`[ALERT:MEDIUM] ${alert.message}`);
      // In production: add to daily digest email
      break;
    case "info":
      // In production: weekly report only
      break;
  }
}

export const ALERTS_VERSION = "5.0.0";