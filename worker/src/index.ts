import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { Env } from "./types.js";
import { uploadRoute } from "./routes/upload.js";
import { analyzeRoute } from "./routes/analyze.js";
import { checkoutRoute } from "./routes/checkout.js";
import { rateLimiter, uploadRateLimiter, analyzeRateLimiter } from "./middleware/rateLimiter.js";
import { requestTracker, getMetricsSnapshot } from "./middleware/observability.js";
import { initJobStore } from "./jobStore.js";

const app = new Hono<{ Bindings: Env }>();

// ── Initialize production job store on first request ──
app.use("*", async (c, next) => {
  if (!c.env._storeInitialized) {
    initJobStore(c.env);
    (c.env as any)._storeInitialized = true;
  }
  await next();
});

// ── Global middleware ──
app.use("*", requestTracker);
app.use("*", rateLimiter);

// CORS: production-restricted, dev allows localhost/Capacitor
app.use("*", cors({
  origin: (origin, c) => {
    const isDev = c.env.ENVIRONMENT === "development";
    const frontendUrl = c.env.FRONTEND_URL || "http://localhost:5173";

    // Production allowed origins only
    const PRODUCTION_ORIGINS = [
      "https://hiddenfeeai.com",
      "https://www.hiddenfeeai.com",
      "https://hiddenfeeai.pages.dev",
    ];

    // Check production origins + pages.dev subdomains
    if (!origin || PRODUCTION_ORIGINS.includes(origin)) {
      return origin || frontendUrl;
    }
    if (origin.endsWith(".hiddenfeeai.pages.dev")) {
      return origin;
    }

    // Development-only origins (localhost, Capacitor, file://)
    if (isDev) {
      if (
        origin === "null" ||
        origin.startsWith("http://localhost") ||
        origin.startsWith("capacitor://")
      ) {
        return origin;
      }
    }

    // Default: return frontend URL for unknown origins (prevents CORS errors)
    return frontendUrl;
  },
}));

// ── Health check ──
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || "unknown",
    version: "2.0.0-hardened",
    pipelines: {
      legacy: true,
      new: c.env.USE_NEW_PIPELINE === "true",
      v2: c.env.USE_V2_PIPELINE === "true",
    },
    docling: {
      configured: !!c.env.DOCLING_SERVICE_URL,
      url: c.env.DOCLING_SERVICE_URL ? "[configured]" : "[not set]",
    },
    store: c.env.ANALYSIS_KV ? "kv" : "memory",
    metrics: getMetricsSnapshot(),
  });
});

// ── Deep health check (admin — pings external dependencies) ──
app.get("/api/health/deep", async (c) => {
  const results: Record<string, unknown> = {
    worker: { status: "ok", timestamp: new Date().toISOString() },
    kv: { status: "unknown" },
    docling: { status: "unknown" },
    deepseek: { status: "unknown" },
  };

  // KV check
  if (c.env.ANALYSIS_KV) {
    try {
      await c.env.ANALYSIS_KV.put("health-check", "ok", { expirationTtl: 60 });
      const val = await c.env.ANALYSIS_KV.get("health-check");
      results.kv = { status: val === "ok" ? "ok" : "degraded" };
    } catch {
      results.kv = { status: "unavailable" };
    }
  } else {
    results.kv = { status: "not_configured" };
  }

  // Docling check
  if (c.env.DOCLING_SERVICE_URL) {
    try {
      const doclingResp = await fetch(`${c.env.DOCLING_SERVICE_URL}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      results.docling = { status: doclingResp.ok ? "ok" : "degraded", code: doclingResp.status };
    } catch {
      results.docling = { status: "unavailable" };
    }
  } else {
    results.docling = { status: "not_configured" };
  }

  // DeepSeek check
  if (c.env.DEEPSEEK_API_KEY) {
    try {
      const dsResp = await fetch(`${c.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"}/v1/models`, {
        headers: { Authorization: `Bearer ${c.env.DEEPSEEK_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      results.deepseek = { status: dsResp.ok ? "ok" : "degraded", code: dsResp.status };
    } catch {
      results.deepseek = { status: "unavailable" };
    }
  } else {
    results.deepseek = { status: "not_configured" };
  }

  const allOk = Object.values(results).every((r: any) => r.status === "ok" || r.status === "not_configured");
  return c.json({ status: allOk ? "healthy" : "degraded", ...results }, allOk ? 200 : 503);
});

// ── Routes with endpoint-specific rate limiting ──
app.route("/api/upload", uploadRoute);
app.route("/api/analyze", analyzeRoute);
app.route("/api/checkout", checkoutRoute);

// Apply stricter rate limits for upload/analyze routes
app.use("/api/upload/*", uploadRateLimiter);
app.use("/api/analyze/*", analyzeRateLimiter);

// ── Error handler ──
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  // Production: don't leak stack traces
  console.error("[Error]", err instanceof Error ? err.message : String(err));
  return c.json({
    error: "Something went wrong. Please try again.",
    requestId: crypto.randomUUID(),
  }, 500);
});

// ── 404 handler ──
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

export default app;
