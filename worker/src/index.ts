import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import type { Env } from "./types.js";
import { uploadRoute } from "./routes/upload.js";
import { analyzeRoute } from "./routes/analyze.js";
import { checkoutRoute } from "./routes/checkout.js";

const app = new Hono<{ Bindings: Env }>();

// CORS for frontend
app.use("*", cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL || "http://localhost:5173";
    // Allow no-origin requests (curl, etc.), configured frontend, localhost dev,
    // Cloudflare Pages, and custom domains
    if (
      !origin ||
      origin === frontendUrl ||
      origin.startsWith("http://localhost") ||
      origin === "https://hiddenfeeai.pages.dev" ||
      origin.endsWith(".hiddenfeeai.pages.dev") ||
      origin === "https://hiddenfeeai.com" ||
      origin === "https://www.hiddenfeeai.com"
    ) {
      return origin || frontendUrl;
    }
    return frontendUrl;
  },
  credentials: true,
}));

// Health check
app.get("/api/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.route("/api/upload", uploadRoute);
app.route("/api/analyze", analyzeRoute);
app.route("/api/checkout", checkoutRoute);

// Error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("[Error]", err);
  return c.json({ error: "Something went wrong. Please try again." }, 500);
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

export default app;