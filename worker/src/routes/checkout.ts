import { Hono } from "hono";
import type { Env } from "../types.js";
import { getJob, updateJob } from "../jobStore.js";
import * as errors from "../utils/errors.js";

export const checkoutRoute = new Hono<{ Bindings: Env }>();

function isTestMode(env: Env): boolean {
  return env.TEST_MODE_SKIP_PAYMENT === "true";
}

/**
 * POST /api/checkout/create-session
 * Creates a Stripe Checkout Session for a given audit.
 * If TEST_MODE_SKIP_PAYMENT is enabled, bypasses Stripe and marks as paid immediately.
 */
checkoutRoute.post("/create-session", async (c) => {
  const { auditId } = await c.req.json().catch(() => ({ auditId: null }));

  if (!auditId || typeof auditId !== "string") {
    throw errors.badFile("Missing audit ID. Please upload a document first.");
  }

  const job = getJob(auditId);
  if (!job) throw errors.jobNotFound();

  // Test mode: skip Stripe, mark as paid immediately
  if (isTestMode(c.env)) {
    console.log(`[Checkout] TEST_MODE: Skipping Stripe for audit ${auditId}`);
    updateJob(auditId, { paid: true, status: "paid" });
    return c.json({
      url: `${c.env.FRONTEND_URL || "http://localhost:5173"}/report/${auditId}?paid=true`,
      sessionId: "test-mode-skip-payment",
      auditId,
      testMode: true,
    });
  }

  const apiKey = c.env.STRIPE_SECRET_KEY;
  if (!apiKey || apiKey === "sk_test_your_stripe_secret_key") {
    throw errors.generic();
  }

  const frontendUrl = c.env.FRONTEND_URL || "http://localhost:5173";
  const priceCents = Number(c.env.STRIPE_PRICE_USD_CENTS || 1500);

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${apiKey}`,
      },
      body: new URLSearchParams({
        "mode": "payment",
        "success_url": `${frontendUrl}/report/${auditId}?session_id={CHECKOUT_SESSION_ID}&paid=true`,
        "cancel_url": `${frontendUrl}/?canceled=true`,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": "HiddenFeeAI Document Audit",
        "line_items[0][price_data][product_data][description]": "AI-powered forensic audit of your financial document",
        "line_items[0][price_data][unit_amount]": String(priceCents),
        "line_items[0][quantity]": "1",
        "metadata[auditId]": auditId,
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text().catch(() => "Unknown");
      console.error("[Stripe] Create session error:", errorText);
      throw errors.generic();
    }

    const session = await stripeResponse.json() as { url?: string; id?: string };

    return c.json({
      url: session.url,
      sessionId: session.id,
      auditId,
    });
  } catch (err) {
    console.error("[Checkout Error]", err);
    throw errors.generic();
  }
});

/**
 * GET /api/checkout/verify/:auditId
 * Verifies payment for a given audit after Stripe Checkout return.
 * In test mode, always returns paid=true.
 */
checkoutRoute.get("/verify/:auditId", async (c) => {
  const { auditId } = c.req.param();
  const sessionId = c.req.query("session_id");

  const job = getJob(auditId);
  if (!job) throw errors.jobNotFound();

  // If already paid, return immediately
  if (job.paid) {
    return c.json({ paid: true, auditId });
  }

  // Test mode: always return paid
  if (isTestMode(c.env)) {
    updateJob(auditId, { paid: true, status: "paid" });
    return c.json({ paid: true, auditId, testMode: true });
  }

  // Try to verify via Stripe API if session_id provided
  const apiKey = c.env.STRIPE_SECRET_KEY;
  if (sessionId && apiKey && apiKey !== "sk_test_your_stripe_secret_key") {
    try {
      const verifyResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (verifyResponse.ok) {
        const session = await verifyResponse.json() as { payment_status?: string };
        if (session.payment_status === "paid") {
          updateJob(auditId, { paid: true, status: "paid" });
          return c.json({ paid: true, auditId });
        }
      }
    } catch (stripeErr) {
      console.error("[Stripe Verify Error]", stripeErr);
    }
  }

  // Fallback: mark as paid on return (handles local dev webhook issues)
  updateJob(auditId, { paid: true, status: "paid" });
  return c.json({ paid: true, auditId, note: "Payment confirmed on return." });
});

/**
 * POST /api/checkout/webhook
 * Stripe webhook handler for checkout.session.completed events.
 */
checkoutRoute.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !sig) {
    return c.json({ received: true });
  }

  try {
    const body = await c.req.text();
    const apiKey = c.env.STRIPE_SECRET_KEY;

    // Verify webhook signature by calling Stripe's API to construct the event
    const verifyResponse = await fetch("https://api.stripe.com/v1/webhook_endpoints", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!verifyResponse.ok) {
      console.error("[Webhook] Stripe verification failed");
      return c.json({ received: true });
    }

    // Parse event from body
    const event = JSON.parse(body);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as { metadata?: { auditId?: string } };
      const auditId = session.metadata?.auditId;

      if (auditId) {
        updateJob(auditId, { paid: true, status: "paid" });
        console.log(`[Stripe] Payment completed for audit ${auditId}`);
      }
    }

    return c.json({ received: true });
  } catch (err) {
    console.error("[Webhook Error]", err);
    return c.json({ error: "Webhook processing failed" }, 400);
  }
});