import { Hono } from "hono";
import type { Env } from "../types.js";
import { attributionFromRecord, listFunnelEvents, recordFunnelEvent } from "../attribution.js";

export const analyticsRoute = new Hono<{ Bindings: Env }>();

analyticsRoute.post("/events", async (c) => {
  const body = await c.req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || body.event_name !== "hiddenfeeai_arrival" || typeof body.event_id !== "string") {
    return c.json({ error: "Only a valid arrival event is accepted from the browser." }, 400);
  }

  const result = await recordFunnelEvent(c.env, {
    eventName: "hiddenfeeai_arrival",
    eventId: body.event_id.slice(0, 160),
    attribution: attributionFromRecord(body.attribution && typeof body.attribution === "object" ? body.attribution as Record<string, unknown> : body),
  });
  return c.json({ accepted: result.stored, duplicate: result.duplicate }, result.stored ? 202 : 503);
});

/** Private, token-protected event export for reporting; never exposed to the browser. */
analyticsRoute.get("/events", async (c) => {
  const expected = c.env.ANALYTICS_ADMIN_TOKEN;
  const supplied = c.req.header("x-analytics-admin-token");
  if (!expected || !supplied || supplied !== expected) return c.json({ error: "Not found" }, 404);
  const limit = Number(c.req.query("limit") || 100);
  return c.json({ events: await listFunnelEvents(c.env, Number.isFinite(limit) ? limit : 100) });
});
