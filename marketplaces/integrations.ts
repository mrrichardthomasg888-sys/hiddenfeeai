// HiddenFeeAI — Marketplace Readiness Integrations
// Prepares integration architecture for Chrome extensions,
// mobile apps, financial platforms, and consumer tools.
// Architecture only — definition of integration points.

// ── Types ──────────────────────────────────────────────────────────────────

export type IntegrationPlatform =
  | "chrome_extension"
  | "ios_app"
  | "android_app"
  | "zapier"
  | "plaid"
  | "mint"
  | "rocket_money"
  | "shopify"
  | "wordpress_plugin"
  | "custom_api";

export type IntegrationStatus = "planned" | "in_development" | "beta" | "live" | "deprecated";

export interface Integration {
  platform: IntegrationPlatform;
  name: string;
  description: string;
  status: IntegrationStatus;
  targetUsers: string;
  keyFeatures: string[];
  technicalRequirements: string[];
  estimatedDevelopmentWeeks: number;
  revenueModel: "free" | "one_time" | "subscription" | "usage_based";
  estimatedPrice: string;
}

export interface IntegrationRoadmap {
  quarter: string;
  integrations: IntegrationPlatform[];
  goals: string[];
}

// ── Integration Catalog ────────────────────────────────────────────────────

export const INTEGRATIONS: Integration[] = [
  {
    platform: "chrome_extension",
    name: "HiddenFeeAI Browser Extension",
    description: "One-click contract analysis. Highlight text on any webpage, right-click, and scan for hidden fees. Works on purchase agreements, terms of service, and billing pages.",
    status: "planned",
    targetUsers: "Online shoppers, contract signers, bill payers",
    keyFeatures: [
      "Right-click context menu integration",
      "Auto-detect contracts on page",
      "Inline fee highlighting",
      "One-click upload to full analysis",
      "Works on any website",
    ],
    technicalRequirements: [
      "Chrome Extension Manifest V3",
      "Content script for DOM parsing",
      "Background service worker",
      "OAuth for user accounts",
    ],
    estimatedDevelopmentWeeks: 6,
    revenueModel: "free",
    estimatedPrice: "Free (drives uploads to paid reports)",
  },
  {
    platform: "ios_app",
    name: "HiddenFeeAI for iOS",
    description: "Native iOS app with document scanning. Use your camera to capture bills and contracts, get instant AI analysis on your phone.",
    status: "planned",
    targetUsers: "iPhone users, mobile-first consumers",
    keyFeatures: [
      "Document camera scanner",
      "Photo library import",
      "Push notification for report ready",
      "Apple Pay integration",
      "Widget for quick access",
    ],
    technicalRequirements: [
      "SwiftUI + VisionKit for scanning",
      "Capacitor bridge to existing web app",
      "StoreKit 2 for payments",
      "CloudKit for sync",
    ],
    estimatedDevelopmentWeeks: 8,
    revenueModel: "subscription",
    estimatedPrice: "$0.99/report or $4.99/month",
  },
  {
    platform: "android_app",
    name: "HiddenFeeAI for Android",
    description: "Native Android app with Google Lens-style document capture. Scan receipts, contracts, and bills for instant analysis.",
    status: "planned",
    targetUsers: "Android users, international consumers",
    keyFeatures: [
      "Camera document capture",
      "File manager integration",
      "Google Play Billing",
      "Material You design",
      "Offline queue (analyze when online)",
    ],
    technicalRequirements: [
      "Jetpack Compose",
      "ML Kit for text recognition",
      "Capacitor bridge",
      "Google Play Billing Library",
    ],
    estimatedDevelopmentWeeks: 8,
    revenueModel: "subscription",
    estimatedPrice: "$0.99/report or $4.99/month",
  },
  {
    platform: "zapier",
    name: "HiddenFeeAI Zapier Integration",
    description: "Automate document analysis. When a new document is added to Google Drive, Dropbox, or email, automatically scan for hidden fees.",
    status: "planned",
    targetUsers: "Businesses, power users, accountants",
    keyFeatures: [
      "Trigger on new file in cloud storage",
      "Auto-analyze and email report",
      "Connect to 5000+ apps",
      "Scheduled batch processing",
      "Webhook triggers for custom workflows",
    ],
    technicalRequirements: [
      "Zapier Platform CLI",
      "OAuth2 authentication",
      "REST API triggers and actions",
      "Webhook support",
    ],
    estimatedDevelopmentWeeks: 3,
    revenueModel: "usage_based",
    estimatedPrice: "Per-analysis pricing via API tier",
  },
  {
    platform: "wordpress_plugin",
    name: "HiddenFeeAI WordPress Plugin",
    description: "Embed the 'Check for Hidden Fees' widget on any WordPress site. One-click install from the WordPress plugin directory.",
    status: "planned",
    targetUsers: "Bloggers, consumer advocacy sites, financial educators",
    keyFeatures: [
      "Gutenberg block for widget",
      "Shortcode support",
      "Customizable colors and text",
      "Analytics dashboard in wp-admin",
      "Affiliate link integration",
    ],
    technicalRequirements: [
      "WordPress Plugin API",
      "PHP 8.0+ backend",
      "React for Gutenberg block",
      "REST API endpoints",
    ],
    estimatedDevelopmentWeeks: 4,
    revenueModel: "free",
    estimatedPrice: "Free (affiliate revenue share)",
  },
  {
    platform: "plaid",
    name: "HiddenFeeAI + Plaid Banking Integration",
    description: "Connect bank accounts via Plaid to automatically scan statements for hidden fees. Monthly fee audit reports delivered to your inbox.",
    status: "planned",
    targetUsers: "Banking customers, personal finance enthusiasts",
    keyFeatures: [
      "Secure bank connection via Plaid",
      "Automatic statement analysis",
      "Monthly fee audit reports",
      "Fee trend tracking over time",
      "Opt-out guidance for each fee",
    ],
    technicalRequirements: [
      "Plaid Link integration",
      "Plaid Transactions API",
      "Secure token storage",
      "Scheduled job processing",
    ],
    estimatedDevelopmentWeeks: 6,
    revenueModel: "subscription",
    estimatedPrice: "$5.99/month for automatic monitoring",
  },
];

// ── Roadmap ─────────────────────────────────────────────────────────────────

export const INTEGRATION_ROADMAP: IntegrationRoadmap[] = [
  {
    quarter: "Q3 2026",
    integrations: ["chrome_extension", "wordpress_plugin"],
    goals: [
      "Launch Chrome Extension to Chrome Web Store",
      "Publish WordPress plugin",
      "Achieve 1,000 extension installs",
      "Drive 500 widget embeds",
    ],
  },
  {
    quarter: "Q4 2026",
    integrations: ["zapier", "ios_app"],
    goals: [
      "Launch Zapier integration with 10+ triggers",
      "Submit iOS app to App Store",
      "Achieve 100 Zapier active users",
      "iOS app: 500 downloads, 4.5+ star rating",
    ],
  },
  {
    quarter: "Q1 2027",
    integrations: ["android_app", "plaid"],
    goals: [
      "Launch Android app on Google Play",
      "Plaid integration goes live",
      "Android: 1,000 downloads",
      "Plaid: 200 connected accounts",
    ],
  },
  {
    quarter: "Q2 2027",
    integrations: ["mint", "rocket_money", "custom_api"],
    goals: [
      "Partnership integrations with Mint and RocketMoney",
      "Open public API for custom integrations",
      "100+ API developers onboarded",
    ],
  },
];

// ── Revenue Projections ────────────────────────────────────────────────────

export function estimateIntegrationRevenue(integrations: Integration[]): {
  totalEstimatedMonthly: string;
  breakdown: { platform: string; estimate: string }[];
} {
  return {
    totalEstimatedMonthly: "$15,000 - $50,000 (combined platform revenue at scale)",
    breakdown: integrations.map((i) => ({
      platform: i.platform,
      estimate: i.revenueModel === "subscription" ? "$5,000 - $15,000/month" : i.revenueModel === "usage_based" ? "$2,000 - $8,000/month" : "Indirect (drives uploads)",
    })),
  };
}

export const INTEGRATIONS_VERSION = "3.0.0";