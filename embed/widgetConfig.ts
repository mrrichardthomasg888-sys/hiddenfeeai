// HiddenFeeAI — Embeddable Analyzer Widget Configuration
// Prepares a "Check your contract for hidden fees" widget
// for external websites, blogs, and partner pages.
// Privacy: only tracks widget views, upload starts, and conversions.

// ── Types ──────────────────────────────────────────────────────────────────

export type WidgetSize = "compact" | "standard" | "expanded";

export type WidgetTheme = "dark" | "light" | "auto";

export type WidgetTrigger = "on_load" | "on_scroll" | "on_exit_intent" | "manual" | "on_button_click";

export interface WidgetConfig {
  partnerId: string;
  partnerReferralCode: string;
  size: WidgetSize;
  theme: WidgetTheme;
  trigger: WidgetTrigger;
  triggerDelayMs: number;
  headline: string;
  subheadline: string;
  callToAction: string;
  primaryColor: string;
  allowedDomains: string[];
  showBranding: boolean;
  acceptedFileTypes: string[];
  maxFileSizeMB: number;
  redirectUrl: string;
  trackingEnabled: boolean;
  language: string;
}

export interface WidgetInstance {
  instanceId: string;
  config: WidgetConfig;
  domain: string;
  createdAt: string;
  status: "active" | "paused" | "blocked";
  viewerToken: string;
}

// ── Default Configurations ─────────────────────────────────────────────────

export const DEFAULT_WIDGET_CONFIG: Omit<WidgetConfig, "partnerId" | "partnerReferralCode" | "allowedDomains"> = {
  size: "standard",
  theme: "auto",
  trigger: "on_load",
  triggerDelayMs: 3000,
  headline: "Find Hidden Fees in Your Contract",
  subheadline: "Upload your document. Our AI finds hidden charges in seconds.",
  callToAction: "Check for Hidden Fees",
  primaryColor: "#7c3aed",
  showBranding: true,
  acceptedFileTypes: [".pdf", ".png", ".jpg", ".jpeg", ".txt", ".docx"],
  maxFileSizeMB: 25,
  redirectUrl: "https://hiddenfeeai.com/upload",
  trackingEnabled: true,
  language: "en-US",
};

// ── Widget Factory ─────────────────────────────────────────────────────────

export function createWidgetConfig(
  partnerId: string,
  partnerReferralCode: string,
  domain: string,
  overrides?: Partial<WidgetConfig>,
): WidgetConfig {
  return { ...DEFAULT_WIDGET_CONFIG, partnerId, partnerReferralCode, allowedDomains: [domain], ...overrides };
}

export function createWidgetInstance(config: WidgetConfig, domain: string): WidgetInstance {
  const id = () => Math.random().toString(36).slice(2, 10);
  return {
    instanceId: `widget-${Date.now()}-${id()}`,
    config,
    domain,
    createdAt: new Date().toISOString(),
    status: "active",
    viewerToken: `viewer-${id()}`,
  };
}

export function generateWidgetSnippet(instance: WidgetInstance): string {
  const { config } = instance;
  return [
    `<!-- HiddenFeeAI Widget — ${instance.instanceId} -->`,
    `<div id="hiddenfeeai-widget-${instance.instanceId}"`,
    `  data-partner="${config.partnerReferralCode}"`,
    `  data-token="${instance.viewerToken}"></div>`,
    `<script async src="https://hiddenfeeai.com/widget/v3/embed.js"></script>`,
    `<!-- End HiddenFeeAI Widget -->`,
  ].join("\n");
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const WIDGET_PRIVACY = {
  collectsNoPII: true,
  tracksOnly: ["widget_view", "upload_start", "conversion"],
  neverTracks: ["user_identity", "document_contents", "analysis_results", "personal_information"],
  cookieRequired: false,
  gdprCompliant: true,
};

export const WIDGET_VERSION = "3.0.0";