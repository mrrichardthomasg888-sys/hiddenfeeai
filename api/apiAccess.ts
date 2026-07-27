// HiddenFeeAI — API Access Management
// API key generation, validation, usage tracking, and tier enforcement.
// Architecture only — NOT exposed publicly yet.

import type { ApiTier } from "./apiDocumentation";
import { API_TIERS } from "./apiDocumentation";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiKey {
  keyId: string;
  keyHash: string;            // Hashed — never store raw key
  keyPrefix: string;          // First 8 chars for display: "hfai_sk_..."
  tier: ApiTier;
  ownerId: string;            // Organization or developer ID
  name: string;               // Human-readable label
  createdAt: string;
  expiresAt: string | null;   // null = no expiration
  status: "active" | "revoked" | "expired";
  lastUsedAt: string | null;
  allowedDomains: string[];   // CORS origins
  ipWhitelist: string[];
}

export interface ApiKeyUsage {
  keyId: string;
  date: string;
  requestsToday: number;
  requestsThisMinute: number;
  totalRequests: number;
  errorsToday: number;
  averageLatencyMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  retryAfterMs: number;
  limit: number;
}

// ── Key Generation ─────────────────────────────────────────────────────────

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const random = Array.from({ length: 32 }, () =>
    Math.random().toString(36)[2] || "0",
  ).join("");
  const raw = `hfai_sk_${random}`;
  const prefix = raw.substring(0, 15) + "...";
  // In production: use crypto.createHash('sha256').update(raw).digest('hex')
  const hash = `sha256:${raw.split("").reverse().join("")}:placeholder`;
  return { raw, prefix, hash };
}

export function createApiKey(
  tier: ApiTier,
  ownerId: string,
  name: string,
  expiresAt?: string,
): Omit<ApiKey, "lastUsedAt"> {
  const { prefix, hash } = generateApiKey();
  return {
    keyId: `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    keyHash: hash,
    keyPrefix: prefix,
    tier,
    ownerId,
    name,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    status: "active",
    allowedDomains: [],
    ipWhitelist: [],
  };
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

export function checkRateLimit(usage: ApiKeyUsage, tier: ApiTier): RateLimitResult {
  const config = API_TIERS[tier];
  const remaining = Math.max(0, config.maxRequestsPerDay - usage.requestsToday);
  const minuteRemaining = Math.max(0, config.maxRequestsPerMinute - usage.requestsThisMinute);
  const allowed = remaining > 0 && minuteRemaining > 0;
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    allowed,
    remaining: Math.min(remaining, minuteRemaining),
    resetAt: endOfDay.toISOString(),
    retryAfterMs: allowed ? 0 : 60000, // 1 minute
    limit: config.maxRequestsPerDay,
  };
}

// ── Access Validation ──────────────────────────────────────────────────────

export function validateApiKey(key: ApiKey): { valid: boolean; reason?: string } {
  if (key.status === "revoked") return { valid: false, reason: "API key has been revoked" };
  if (key.status === "expired") return { valid: false, reason: "API key has expired" };
  if (key.expiresAt && new Date(key.expiresAt) < new Date()) return { valid: false, reason: "API key has expired" };
  return { valid: true };
}

export const API_ACCESS_VERSION = "3.0.0";