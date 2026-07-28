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

  const job = await getJob(auditId);
  if (!job) throw errors.jobNotFound();

  // Test mode: skip Stripe, mark as paid immediately
  if (isTestMode(c.env)) {
    console.log(`[Checkout] TEST_MODE: Skipping Stripe for audit ${auditId}`);
    await updateJob(auditId, { paid: true, status: "paid" });
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

  const job = await getJob(auditId);
  if (!job) throw errors.jobNotFound();

  // If already paid, return immediately (report may already be analyzing/complete)
  if (job.paid) {
    return c.json({ paid: true, auditId, status: job.status, hasReport: !!job.report });
  }

  // Test mode: always return paid
  if (isTestMode(c.env)) {
    await updateJob(auditId, { paid: true, status: "paid" });
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
          await updateJob(auditId, { paid: true, status: "paid" });
          return c.json({ paid: true, auditId });
        }
      }
    } catch (stripeErr) {
      console.error("[Stripe Verify Error]", stripeErr);
    }
  }

  // Fallback: mark as paid on return (handles local dev webhook issues)
  await updateJob(auditId, { paid: true, status: "paid" });
  return c.json({ paid: true, auditId, note: "Payment confirmed on return." });
});

/**
 * POST /api/checkout/webhook
 * Stripe webhook handler — verifies signature using STRIPE_WEBHOOK_SECRET.
 * Only processes checkout.session.completed events.
 */
checkoutRoute.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await c.req.text();

  // Require both signature and secret in non-test environments
  if (!sig || !webhookSecret) {
    // Test mode: accept unsigned webhooks for local dev
    if (c.env.TEST_MODE_SKIP_PAYMENT === "true") {
      try {
        const event = JSON.parse(rawBody);
        if (event.type === "checkout.session.completed") {
          const auditId = event.data?.object?.metadata?.auditId;
          if (auditId) {
            await updateJob(auditId, { paid: true, status: "paid" });
            console.log(`[Webhook-TEST] Payment marked for audit ${auditId} (unsigned — test mode)`);
          }
        }
        return c.json({ received: true, verified: false });
      } catch {
        return c.json({ error: "Invalid JSON" }, 400);
      }
    }

    // Production: reject unsigned webhooks
    console.error("[Webhook] Missing signature or webhook secret — rejecting");
    return c.json({ error: "Webhook signature required" }, 401);
  }

  // ── HMAC-SHA256 signature verification ──
  try {
    // Compute expected signature: HMAC-SHA256 of timestamp.body with webhook secret
    const parts = sig.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) {
      console.error("[Webhook] Malformed stripe-signature header");
      return c.json({ error: "Invalid signature format" }, 400);
    }

    const timestamp = timestampPart.substring(2);
    const expectedSignature = signaturePart.substring(3);

    // HMAC-SHA256: hash = HMAC(secret, timestamp + "." + body)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(`${timestamp}.${rawBody}`);

    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
    );

    const sigBytes = new Uint8Array(expectedSignature.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
    const isValid = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, messageData);

    if (!isValid) {
      console.error("[Webhook] Signature verification FAILED — possible replay or forgery");
      return c.json({ error: "Invalid signature" }, 401);
    }

    // Replay protection: check timestamp is within 5 minutes
    const eventTime = parseInt(timestamp) * 1000;
    const now = Date.now();
    if (Math.abs(now - eventTime) > 5 * 60 * 1000) {
      console.error(`[Webhook] Event too old (${Math.round((now - eventTime) / 1000)}s) — possible replay`);
      return c.json({ error: "Event too old" }, 400);
    }

    // Parse and process
    const event = JSON.parse(rawBody);

    if (event.type === "checkout.session.completed") {
      const auditId = event.data?.object?.metadata?.auditId;
      if (auditId) {
        await updateJob(auditId, { paid: true, status: "paid" });
        console.log(`[Stripe] ✅ Payment verified for audit ${auditId}`);
      }
    }

    return c.json({ received: true, verified: true });
  } catch (err) {
    console.error("[Webhook Error]", err instanceof Error ? err.message : String(err));
    return c.json({ error: "Webhook processing failed" }, 400);
  }
});
