import { apiUrl } from "@/config/api";

export interface AttributionContext {
  dhf_landing?: string;
  dhf_referrer?: string;
  dhf_session?: string;
  dhf_source?: string;
  dhf_cta_id?: string;
  dhf_cta_type?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

const STORAGE_KEY = "hiddenfeeai_attribution_v1";
const ARRIVAL_KEY = "hiddenfeeai_arrival_event_v1";
const FIELDS: Array<keyof AttributionContext> = [
  "dhf_landing", "dhf_referrer", "dhf_session", "dhf_source", "dhf_cta_id", "dhf_cta_type",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
];

function clean(value: string | null | undefined): string | undefined {
  const normalized = value?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 240);
  return normalized || undefined;
}

export function getAttribution(): AttributionContext {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as (AttributionContext & { capturedAt?: number }) | null;
    if (!saved || !saved.capturedAt || Date.now() - saved.capturedAt > 30 * 24 * 60 * 60 * 1000) return {};
    const output: AttributionContext = {};
    for (const field of FIELDS) {
      const value = clean(saved[field]);
      if (value) output[field] = value;
    }
    return output;
  } catch {
    return {};
  }
}

export function captureAttribution(): AttributionContext {
  const current = getAttribution();
  const incoming: AttributionContext = {};
  const params = new URLSearchParams(window.location.search);
  for (const field of FIELDS) {
    const value = clean(params.get(field));
    if (value) incoming[field] = value;
  }
  const merged = { ...current, ...incoming };
  if (merged.dhf_landing) {
    try {
      const url = new URL(merged.dhf_landing, "https://detecthiddenfees.com");
      if (url.hostname === "detecthiddenfees.com" || url.hostname.endsWith(".detecthiddenfees.com")) merged.dhf_landing = url.pathname || "/";
      else delete merged.dhf_landing;
    } catch { delete merged.dhf_landing; }
  }
  if (Object.keys(merged).length > 0) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...merged, capturedAt: Date.now() })); } catch { /* storage is optional */ }
  }
  return merged;
}

export function appendAttribution(formData: FormData): void {
  const attribution = getAttribution();
  for (const field of FIELDS) if (attribution[field]) formData.append(field, attribution[field]!);
}

export async function recordArrival(): Promise<void> {
  const attribution = captureAttribution();
  let eventId: string;
  try {
    eventId = sessionStorage.getItem(ARRIVAL_KEY) || crypto.randomUUID();
    sessionStorage.setItem(ARRIVAL_KEY, eventId);
  } catch { eventId = crypto.randomUUID(); }
  await fetch(apiUrl("/analytics/events"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_name: "hiddenfeeai_arrival", event_id: eventId, attribution }),
    keepalive: true,
  }).catch(() => undefined);
}
