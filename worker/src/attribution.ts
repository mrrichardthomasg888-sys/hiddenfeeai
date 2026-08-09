import type { AttributionContext, Env } from "./types.js";

export type FunnelEventName =
  | "hiddenfeeai_arrival"
  | "upload_started"
  | "upload_completed"
  | "analysis_started"
  | "analysis_completed"
  | "checkout_started"
  | "purchase_completed"
  | "revenue_recorded";

export interface FunnelEvent {
  eventName: FunnelEventName;
  eventId: string;
  occurredAt?: string;
  auditId?: string;
  attribution?: AttributionContext;
  commerce?: {
    transactionId: string;
    amountCents: number;
    currency: string;
  };
}

const FIELD_NAMES: Array<keyof AttributionContext> = [
  "dhf_landing", "dhf_referrer", "dhf_session", "dhf_source", "dhf_cta_id", "dhf_cta_type",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
];
const EVENT_PREFIX = "attribution:event:";
const EVENT_TTL_SECONDS = 60 * 60 * 24 * 400;
const MAX_VALUE_LENGTH = 240;

function clean(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_VALUE_LENGTH);
  return normalized || undefined;
}

function cleanLanding(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, "https://detecthiddenfees.com");
    if (url.hostname !== "detecthiddenfees.com" && !url.hostname.endsWith(".detecthiddenfees.com")) return undefined;
    return `${url.pathname || "/"}`.slice(0, MAX_VALUE_LENGTH);
  } catch {
    return undefined;
  }
}

function cleanReferrer(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return `${url.origin}${url.pathname}`.slice(0, MAX_VALUE_LENGTH);
  } catch {
    return undefined;
  }
}

/** Keeps only allow-listed, non-sensitive attribution fields. */
export function sanitizeAttribution(input: Partial<AttributionContext> | Record<string, unknown>): AttributionContext {
  const output: AttributionContext = {};
  for (const field of FIELD_NAMES) {
    const value = clean(input[field]);
    if (!value) continue;
    if (field === "dhf_landing") {
      const landing = cleanLanding(value);
      if (landing) output[field] = landing;
    } else if (field === "dhf_referrer") {
      const referrer = cleanReferrer(value);
      if (referrer) output[field] = referrer;
    } else {
      output[field] = value;
    }
  }
  return output;
}

export function attributionFromRecord(input: Record<string, unknown>): AttributionContext {
  return sanitizeAttribution(input);
}

export function attributionFromFormData(formData: FormData): AttributionContext {
  const input: Record<string, unknown> = {};
  for (const field of FIELD_NAMES) input[field] = formData.get(field);
  return sanitizeAttribution(input);
}

function eventKey(event: FunnelEvent): string {
  return `${EVENT_PREFIX}${encodeURIComponent(event.eventName)}:${encodeURIComponent(event.eventId)}`;
}

/**
 * Writes a document-free funnel event to the existing production KV namespace.
 * The deterministic key makes repeated webhook delivery idempotent for revenue.
 */
export async function recordFunnelEvent(env: Env, event: FunnelEvent): Promise<{ stored: boolean; duplicate: boolean }> {
  const key = eventKey(event);
  if (!env.ANALYSIS_KV) {
    if (env.ENVIRONMENT === "production") {
      console.error("[Attribution] ANALYSIS_KV is required for production funnel measurement");
    }
    return { stored: false, duplicate: false };
  }

  try {
    const existing = await env.ANALYSIS_KV.get(key);
    if (existing) return { stored: true, duplicate: true };

    const record = {
      eventName: event.eventName,
      eventId: event.eventId,
      occurredAt: event.occurredAt || new Date().toISOString(),
      auditId: event.auditId,
      attribution: sanitizeAttribution(event.attribution || {}),
      commerce: event.commerce ? {
        transactionId: clean(event.commerce.transactionId),
        amountCents: Math.max(0, Math.round(event.commerce.amountCents)),
        currency: clean(event.commerce.currency)?.toLowerCase(),
      } : undefined,
    };

    await env.ANALYSIS_KV.put(key, JSON.stringify(record), { expirationTtl: EVENT_TTL_SECONDS });
    return { stored: true, duplicate: false };
  } catch (error) {
    console.error("[Attribution] event write failed", error instanceof Error ? error.message : "unknown");
    return { stored: false, duplicate: false };
  }
}

export async function listFunnelEvents(env: Env, limit = 100): Promise<unknown[]> {
  if (!env.ANALYSIS_KV) return [];
  const listed = await env.ANALYSIS_KV.list({ prefix: EVENT_PREFIX, limit: Math.min(Math.max(limit, 1), 500) });
  const records: unknown[] = [];
  for (const key of listed.keys) {
    const value = await env.ANALYSIS_KV.get(key.name, "json");
    if (value) records.push(value);
  }
  return records;
}
