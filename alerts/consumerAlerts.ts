// HiddenFeeAI — Consumer Alert System
// Prepares future capability for automated consumer alerts.
// Architecture only — defines alert types, triggers, and delivery methods.
// Examples: "New recurring fee detected", "Contract contains uncommon clause", "Industry fee trend changed"
// Privacy-safe: anonymous triggers. No document contents.

// ── Types ──────────────────────────────────────────────────────────────────

export type AlertType =
  | "new_fee_detected"
  | "uncommon_clause"
  | "trend_change"
  | "regulatory_update"
  | "fee_increase_warning"
  | "contract_risk_flag"
  | "negotiation_opportunity";

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertDeliveryMethod = "in_app" | "email" | "push" | "none";

export interface ConsumerAlert {
  alertId: string;
  type: AlertType;
  title: string;
  description: string;
  severity: AlertSeverity;
  industry: string;
  trigger: string;            // What condition triggered this alert
  triggeredAt: string;
  expiresAt: string;          // Stale after this date
  deliveryMethod: AlertDeliveryMethod;
  actionable: boolean;
  actionText?: string;
  actionLink?: string;
}

// ── Alert Definitions (future triggers) ────────────────────────────────────

export const ALERT_DEFINITIONS: {
  type: AlertType;
  titleTemplate: string;
  descriptionTemplate: string;
  severity: AlertSeverity;
  defaultDelivery: AlertDeliveryMethod;
}[] = [
  {
    type: "new_fee_detected",
    titleTemplate: "New Fee Detected: {feeName}",
    descriptionTemplate: "A new fee category '{feeName}' has been observed in {industry} documents. This fee was found in {observationCount}+ recent analyses.",
    severity: "info",
    defaultDelivery: "in_app",
  },
  {
    type: "uncommon_clause",
    titleTemplate: "Uncommon Clause Detected in Your Contract",
    descriptionTemplate: "Your {industry} document contains an uncommon clause type '{clauseType}' that appears in less than {threshold}% of similar documents. Review carefully before signing.",
    severity: "warning",
    defaultDelivery: "email",
  },
  {
    type: "trend_change",
    titleTemplate: "Industry Fee Trend Update: {industry}",
    descriptionTemplate: "{feeName} fees in {industry} have {trendDirection} by {changePercent}% compared to last month. Average observed amount: ${amount}.",
    severity: "info",
    defaultDelivery: "in_app",
  },
  {
    type: "regulatory_update",
    titleTemplate: "Regulatory Change Affecting {industry}",
    descriptionTemplate: "{regulation} became effective {effectiveDate}. This may affect {affectedFees} fees in your documents.",
    severity: "warning",
    defaultDelivery: "email",
  },
  {
    type: "fee_increase_warning",
    titleTemplate: "Fee Increase Warning: {feeName}",
    descriptionTemplate: "{feeName} in {industry} is trending upward. Average fees have increased from ${previousAvg} to ${currentAvg}. Consider reviewing recent documents.",
    severity: "warning",
    defaultDelivery: "push",
  },
  {
    type: "contract_risk_flag",
    titleTemplate: "High-Risk Contract Flag",
    descriptionTemplate: "Your {industry} document scored a risk level of {riskLevel}/100. {findingCount} questionable charges identified totaling ${totalAmount}. We recommend negotiation before signing.",
    severity: "critical",
    defaultDelivery: "email",
  },
  {
    type: "negotiation_opportunity",
    titleTemplate: "Negotiation Opportunity: {feeName}",
    descriptionTemplate: "Good news! {feeName} in {industry} is {negotiability}% negotiable based on observed outcomes. Average successful reduction: {reductionPercent}%.",
    severity: "info",
    defaultDelivery: "in_app",
  },
];

// ── Alert Factory ──────────────────────────────────────────────────────────

export function createConsumerAlert(
  type: AlertType,
  industry: string,
  templateVars: Record<string, string>,
  deliveryMethod?: AlertDeliveryMethod,
): ConsumerAlert {
  const def = ALERT_DEFINITIONS.find((d) => d.type === type) || ALERT_DEFINITIONS[0];
  const title = def.titleTemplate.replace(/\{(\w+)\}/g, (_, key) => templateVars[key] || _);
  const description = def.descriptionTemplate.replace(/\{(\w+)\}/g, (_, key) => templateVars[key] || _);

  return {
    alertId: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title,
    description,
    severity: def.severity,
    industry,
    trigger: `Automated detection: ${type}`,
    triggeredAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    deliveryMethod: deliveryMethod || def.defaultDelivery,
    actionable: type !== "trend_change",
    actionText: type === "contract_risk_flag" ? "View Report" : "Learn More",
    actionLink: "/report/latest",
  };
}

// ── Alert Frequency Control ────────────────────────────────────────────────

export const ALERT_FREQUENCY_LIMITS: Record<AlertType, { maxPerDay: number; cooldownHours: number }> = {
  new_fee_detected: { maxPerDay: 3, cooldownHours: 24 },
  uncommon_clause: { maxPerDay: 5, cooldownHours: 6 },
  trend_change: { maxPerDay: 2, cooldownHours: 72 },
  regulatory_update: { maxPerDay: 1, cooldownHours: 168 }, // Once a week
  fee_increase_warning: { maxPerDay: 3, cooldownHours: 24 },
  contract_risk_flag: { maxPerDay: 10, cooldownHours: 1 },
  negotiation_opportunity: { maxPerDay: 5, cooldownHours: 12 },
};

// ── Privacy ────────────────────────────────────────────────────────────────

export const CONSUMER_ALERTS_PRIVACY = {
  triggersBasedOn: "Anonymized aggregate patterns and document metadata",
  neverUses: ["document_contents", "user_identity", "personal_information", "account_numbers"],
  optInRequired: true,
  defaultStatus: "Disabled — user must opt in",
};

export const CONSUMER_ALERTS_VERSION = "4.0.0";