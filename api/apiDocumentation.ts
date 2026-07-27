// HiddenFeeAI — Public API Documentation
// Prepares future API products for document analysis.
// Supports API keys, usage limits, and tier architecture.
// NOT publicly exposed yet — architecture only.

// ── API Endpoint Definitions ───────────────────────────────────────────────

export interface ApiEndpoint {
  method: "POST" | "GET";
  path: string;
  name: string;
  description: string;
  requestBody?: Record<string, unknown>;
  responseBody: Record<string, unknown>;
  rateLimitPerMinute: number;
  requiresAuth: boolean;
  tier: ApiTier;
}

export type ApiTier = "free" | "starter" | "professional" | "enterprise";

export interface ApiTierConfig {
  tier: ApiTier;
  maxRequestsPerDay: number;
  maxRequestsPerMinute: number;
  maxFileSizeMB: number;
  supportedFormats: string[];
  pricePerMonthCents: number;
  pricePerRequestCents: number;
  features: string[];
}

// ── API Endpoints ──────────────────────────────────────────────────────────

export const API_ENDPOINTS: ApiEndpoint[] = [
  {
    method: "POST",
    path: "/v1/analyze",
    name: "Analyze Document",
    description: "Submit a document for AI-powered hidden fee analysis. Returns a risk summary with findings, evidence, and recommendations.",
    requestBody: {
      document: "base64-encoded file or multipart/form-data",
      document_type: "purchase_agreement | medical_bill | utility_bill | insurance_policy | contract | auto",
      language: "en-US (default)",
      detail_level: "summary | standard | comprehensive",
    },
    responseBody: {
      analysis_id: "string",
      status: "complete | processing | failed",
      risk_score: "0-100",
      risk_level: "Low | Review Recommended | Elevated | High",
      potential_savings: "number (USD cents)",
      findings: "Array<Finding>",
      summary: "string (plain-text summary)",
      processing_time_ms: "number",
    },
    rateLimitPerMinute: 10,
    requiresAuth: true,
    tier: "starter",
  },
  {
    method: "GET",
    path: "/v1/analysis/:id",
    name: "Get Analysis Result",
    description: "Retrieve the full analysis result for a previously submitted document.",
    responseBody: {
      analysis_id: "string",
      status: "string",
      report: "AuditReport (full)",
      created_at: "ISO timestamp",
      expires_at: "ISO timestamp (24h from creation)",
    },
    rateLimitPerMinute: 30,
    requiresAuth: true,
    tier: "starter",
  },
  {
    method: "GET",
    path: "/v1/fees/categories",
    name: "List Fee Categories",
    description: "Retrieve all supported fee categories and their descriptions.",
    responseBody: {
      categories: "Array<{ id: string, name: string, description: string, industries: string[] }>",
      total: "number",
    },
    rateLimitPerMinute: 60,
    requiresAuth: false,
    tier: "free",
  },
  {
    method: "GET",
    path: "/v1/industries",
    name: "List Supported Industries",
    description: "Retrieve all industries supported by the analysis engine.",
    responseBody: {
      industries: "Array<{ id: string, name: string, coverage_score: number }>",
      total: "number",
    },
    rateLimitPerMinute: 60,
    requiresAuth: false,
    tier: "free",
  },
  {
    method: "POST",
    path: "/v1/analyze/batch",
    name: "Batch Analyze Documents",
    description: "Submit multiple documents for analysis. Enterprise tier only.",
    responseBody: {
      batch_id: "string",
      analyses: "Array<{ analysis_id: string, status: string }>",
      total: "number",
    },
    rateLimitPerMinute: 2,
    requiresAuth: true,
    tier: "enterprise",
  },
  {
    method: "GET",
    path: "/v1/questions/search",
    name: "Search Consumer Questions",
    description: "Search the consumer question database for answers about hidden fees.",
    responseBody: {
      results: "Array<{ question: string, short_answer: string, industry: string }>",
      total: "number",
    },
    rateLimitPerMinute: 30,
    requiresAuth: false,
    tier: "free",
  },
];

// ── Tier Configuration ─────────────────────────────────────────────────────

export const API_TIERS: Record<ApiTier, ApiTierConfig> = {
  free: {
    tier: "free",
    maxRequestsPerDay: 50,
    maxRequestsPerMinute: 5,
    maxFileSizeMB: 5,
    supportedFormats: [".pdf", ".txt"],
    pricePerMonthCents: 0,
    pricePerRequestCents: 0,
    features: [
      "Basic document analysis",
      "Risk score only",
      "5 analyses per day",
      "Text and PDF support",
    ],
  },
  starter: {
    tier: "starter",
    maxRequestsPerDay: 200,
    maxRequestsPerMinute: 10,
    maxFileSizeMB: 15,
    supportedFormats: [".pdf", ".txt", ".png", ".jpg", ".docx"],
    pricePerMonthCents: 2900, // $29/month
    pricePerRequestCents: 0,
    features: [
      "Full findings with evidence",
      "Negotiation strategies",
      "200 analyses per month",
      "Image and DOCX support",
      "Email support",
    ],
  },
  professional: {
    tier: "professional",
    maxRequestsPerDay: 1000,
    maxRequestsPerMinute: 30,
    maxFileSizeMB: 25,
    supportedFormats: [".pdf", ".txt", ".png", ".jpg", ".docx", ".xlsx"],
    pricePerMonthCents: 9900, // $99/month
    pricePerRequestCents: 0,
    features: [
      "Comprehensive audit reports",
      "Batch processing (up to 10)",
      "Priority processing",
      "Webhook notifications",
      "API dashboard access",
      "Priority support",
    ],
  },
  enterprise: {
    tier: "enterprise",
    maxRequestsPerDay: 10000,
    maxRequestsPerMinute: 100,
    maxFileSizeMB: 50,
    supportedFormats: [".pdf", ".txt", ".png", ".jpg", ".docx", ".xlsx", ".csv"],
    pricePerMonthCents: 49900, // $499/month
    pricePerRequestCents: 0,
    features: [
      "Unlimited batch processing",
      "Custom analysis models",
      "Dedicated infrastructure",
      "SLA guarantees",
      "White-label reports",
      "Custom integrations",
      "Dedicated support",
    ],
  },
};

// ── OpenAPI Spec Generator ─────────────────────────────────────────────────

export function generateOpenAPISpec(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "HiddenFeeAI API",
      version: "1.0.0",
      description: "AI-powered document analysis for hidden fees, deceptive pricing, and consumer charges. Identify hidden charges in contracts, bills, and purchase agreements.",
      contact: { email: "api@hiddenfeeai.com" },
    },
    servers: [{ url: "https://api.hiddenfeeai.com/v1", description: "Production" }],
    paths: API_ENDPOINTS.reduce((paths, endpoint) => {
      const pathKey = endpoint.path.replace("/v1", "");
      paths[pathKey] = {
        [endpoint.method.toLowerCase()]: {
          operationId: endpoint.name.toLowerCase().replace(/\s+/g, "_"),
          summary: endpoint.name,
          description: endpoint.description,
          security: endpoint.requiresAuth ? [{ ApiKeyAuth: [] }] : [],
          responses: {
            "200": { description: "Successful response", content: { "application/json": { schema: { type: "object" } } } },
            "429": { description: "Rate limit exceeded" },
          },
        },
      };
      return paths;
    }, {} as Record<string, unknown>),
    components: {
      securitySchemes: {
        ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
      },
    },
  };
}

export const API_DOCS_VERSION = "3.0.0";