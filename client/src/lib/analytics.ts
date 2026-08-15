const MEASUREMENT_ID = "G-KDGZ83RRHL";
const ATTRIBUTION_KEY = "dhf_attribution_v1";
const SESSION_KEY = "dhf_session_v1";
const PURCHASE_PREFIX = "dhf_ga_purchase_";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

type AnalyticsValue = string | number | boolean;
type AnalyticsParams = Record<string, AnalyticsValue | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let initialized = false;

function clean(value: unknown, max = 160): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max);
}

function readStorage(storage: Storage, key: string): string | null {
  try { return storage.getItem(key); } catch { return null; }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try { storage.setItem(key, value); } catch { /* restricted storage */ }
}

function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const raw = readStorage(window.localStorage, ATTRIBUTION_KEY);
  let previous: Record<string, unknown> = {};
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") previous = parsed as Record<string, unknown>;
    } catch { previous = {}; }
  }
  const session = clean(params.get("dhf_session") || readStorage(window.sessionStorage, SESSION_KEY), 64);
  if (session) writeStorage(window.sessionStorage, SESSION_KEY, session);
  const firstTouch = previous.first_touch && typeof previous.first_touch === "object"
    ? previous.first_touch as Record<string, unknown>
    : { landing_page: window.location.pathname, referrer: "" };
  const current: Record<string, unknown> = {
    ...previous,
    session_id: session || previous.session_id || "",
    landing_page: clean(params.get("dhf_landing") || previous.landing_page || firstTouch.landing_page || window.location.pathname),
    original_referrer: clean(params.get("dhf_referrer") || previous.original_referrer || firstTouch.referrer || ""),
    utm: {
      ...(previous.utm && typeof previous.utm === "object" ? previous.utm as Record<string, string> : {}),
      ...Object.fromEntries(UTM_KEYS.map((key) => [key, clean(params.get(key))]).filter(([, value]) => value)),
    },
  };
  ["dhf_source", "dhf_cta_id", "dhf_cta_type"].forEach((key) => {
    const value = clean(params.get(key));
    if (value) current[key] = value;
  });
  writeStorage(window.localStorage, ATTRIBUTION_KEY, JSON.stringify(current));
}

function attributionParams(): AnalyticsParams {
  if (typeof window === "undefined") return {};
  let stored: Record<string, unknown> = {};
  const raw = readStorage(window.localStorage, ATTRIBUTION_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") stored = parsed as Record<string, unknown>;
    } catch { stored = {}; }
  }
  const utm = stored.utm && typeof stored.utm === "object" ? stored.utm as Record<string, unknown> : {};
  return {
    dhf_source: clean(stored.dhf_source || "detecthiddenfees"),
    dhf_landing: clean(stored.landing_page || window.location.pathname),
    dhf_cta_id: clean(stored.dhf_cta_id),
    dhf_cta_type: clean(stored.dhf_cta_type),
    dhf_session: clean(stored.session_id || readStorage(window.sessionStorage, SESSION_KEY), 64),
    ...Object.fromEntries(UTM_KEYS.map((key) => [key, clean(utm[key])]).filter(([, value]) => value)),
  };
}

function loadGoogleTag(): void {
  if (typeof document === "undefined" || document.querySelector(`script[data-dhf-ga4="${MEASUREMENT_ID}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.dataset.dhfGa4 = MEASUREMENT_ID;
  document.head.appendChild(script);
}

export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  captureAttribution();
  if (!Array.isArray(window.dataLayer)) window.dataLayer = [];
  if (typeof window.gtag !== "function") window.gtag = (...args: unknown[]) => window.dataLayer.push(args);
  if (!initialized) {
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      linker: { domains: ["detecthiddenfees.com", "hiddenfeeai.com"] },
    });
    initialized = true;
    loadGoogleTag();
  }
}

export function track(name: string, params: AnalyticsParams = {}): void {
  if (typeof window === "undefined") return;
  initAnalytics();
  const safeParams: AnalyticsParams = {
    ...attributionParams(),
    page_path: clean(window.location.pathname),
    funnel_route: clean(window.location.pathname),
  };
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) safeParams[key] = typeof value === "string" ? clean(value) : value;
  });
  window.gtag?.("event", name, safeParams);
}

export function trackPurchase(sessionId: string | null, auditId: string): void {
  if (typeof window === "undefined") return;
  const dedupeKey = `${PURCHASE_PREFIX}${clean(sessionId || auditId)}`;
  if (readStorage(window.localStorage, dedupeKey) === "sent") return;
  writeStorage(window.localStorage, dedupeKey, "sent");
  track("purchase", {
    ...(sessionId ? { transaction_id: clean(sessionId) } : {}),
    value: 15.00,
    currency: "USD",
    product: "before_you_sign_review",
  });
}
