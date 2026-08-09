import { Hono } from "hono";
import type { Env } from "../types.js";
import { getJob, updateJob } from "../jobStore.js";
import * as errors from "../utils/errors.js";

export const checkoutRoute = new Hono<{ Bindings: Env }>();

function isTestMode(env: Env): boolean {
  return env.TEST_MODE_SKIP_PAYMENT === "true";
}

checkoutRoute.post("/create-session", async (c) => {
  const { auditId, origin } = await c.req.json().catch(() => ({ auditId: null, origin: null }));

  if (!auditId || typeof auditId !== "string") {
    throw errors.badFile("Missing audit ID. Please upload a document first.");
  }

  const job = await getJob(auditId);
  if (!job) throw errors.jobNotFound();

  if (isTestMode(c.env)) {
    console.log(`[Checkout] TEST_MODE: Skipping Stripe for audit ${auditId}`);
    await updateJob(auditId, { paid: true, status: "paid" });
    return c.json({
      url: `${origin || c.env.FRONTEND_URL || "http://localhost:5173"}/report/${auditId}?paid=true`,
      sessionId: "test-mode-skip-payment",
      auditId,
      testMode: true,
    });
  }

  const apiKey = c.env.STRIPE_SECRET_KEY;
  if (!apiKey || apiKey === "sk_test_your_stripe_secret_key") {
    console.error("[Checkout Error] STRIPE_SECRET_KEY is missing or unconfigured.");
    throw errors.generic("Payment system is not configured yet. Please contact support.");
  }

  const frontendUrl = origin || c.env.FRONTEND_URL || "http://localhost:5173";
  const priceCents = Number(c.env.STRIPE_PRICE_USD_CENTS || 1500);

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${apiKey}`,
      },
      body: new URLSearchParams({
        mode: "payment",
        success_url: `${frontendUrl}/report/${auditId}?session_id={CHECKOUT_SESSION_ID}&paid=true`,
        cancel_url: `${frontendUrl}/?canceled=true`,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": "HiddenFeeAI Document Audit",
        "line_items[0][price_data][product_data][description]": "AI-powered forensic audit of your financial document",
        "line_items[0][price_data][unit_amount]": String(priceCents),
        "line_items[0][quantity]": "1",
        client_reference_id: auditId,
        "metadata[auditId]": auditId,
      }),
    });

    if (!stripeResponse.ok) {
      const errorText = await stripeResponse.text().catch(() => "Unknown");
      console.error("[Stripe] Checkout session creation failed", stripeResponse.status, errorText.slice(0, 300));
      return c.json({ error: `Stripe error ${stripeResponse.status}: ${errorText.slice(0, 300)}` }, 400);
    }

    const session = await stripeResponse.json() as { url?: string; id?: string };
    if (!session.url || !session.id) return c.json({ error: "Stripe did not return a usable checkout session." }, 502);
    return c.json({ url: session.url, sessionId: session.id, auditId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Checkout] request failed", msg);
    return c.json({ error: `Checkout error: ${msg}` }, 500);
  }
});

/** A browser return is never payment proof. */
checkoutRoute.get("/verify/:auditId", async (c) => {
  const { auditId } = c.req.param();
  const sessionId = c.req.query("session_id");
  const job = await getJob(auditId);
  if (!job) throw errors.jobNotFound();

  if (job.paid) return c.json({ paid: true, auditId, status: job.status, hasReport: !!job.report });

  if (isTestMode(c.env)) {
    await updateJob(auditId, { paid: true, status: "paid" });
    return c.json({ paid: true, auditId, testMode: true });
  }

  const apiKey = c.env.STRIPE_SECRET_KEY;
  if (sessionId && apiKey && apiKey !== "sk_test_your_stripe_secret_key") {
    try {
      const verifyResponse = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (verifyResponse.ok) {
        const session = await verifyResponse.json() as { payment_status?: string; metadata?: { auditId?: string } };
        if (session.payment_status === "paid" && session.metadata?.auditId === auditId) {
          await updateJob(auditId, { paid: true, status: "paid" });
          return c.json({ paid: true, auditId });
        }
      }
    } catch (stripeErr) {
      console.error("[Stripe Verify Error]", stripeErr instanceof Error ? stripeErr.message : "unknown");
    }
  }

  return c.json({ paid: false, auditId, error: "Payment has not been confirmed yet." }, 402);
});

function parseHex(value: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(value)) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function verifyStripeSignature(header: string, body: string, secret: string): Promise<boolean> {
  const timestamp = header.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const signatures = header.split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => parseHex(part.slice(3)))
    .filter((value): value is Uint8Array => !!value);
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(Date.now() - Number(timestamp) * 1000) > 5 * 60 * 1000) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const message = new TextEncoder().encode(`${timestamp}.${body}`);
  for (const signature of signatures) {
    if (await crypto.subtle.verify("HMAC", key, signature, message)) return true;
  }
  return false;
}

checkoutRoute.post("/webhook", async (c) => {
  const signature = c.req.header("stripe-signature");
  const secret = c.env.STRIPE_WEBHOOK_SECRET;
  const rawBody = await c.req.text();
  if (!signature || !secret) return c.json({ error: "Webhook signature required" }, 401);
  if (!await verifyStripeSignature(signature, rawBody, secret)) return c.json({ error: "Invalid signature" }, 401);

  try {
    const event = JSON.parse(rawBody) as {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object as {
        payment_status?: string;
        metadata?: { auditId?: string };
      };
      const auditId = session.metadata?.auditId;

      // Only a paid Checkout Session with matching server-created metadata can unlock an audit.
      if (auditId && session.payment_status === "paid") {
        const paymentEventKey = event.id ? `payment:event:${event.id}` : undefined;
        const alreadyProcessed = paymentEventKey && c.env.ANALYSIS_KV
          ? await c.env.ANALYSIS_KV.get(paymentEventKey)
          : null;
        if (!alreadyProcessed) {
          const updated = await updateJob(auditId, { paid: true, status: "paid" });
          if (updated && paymentEventKey && c.env.ANALYSIS_KV) {
            await c.env.ANALYSIS_KV.put(paymentEventKey, "processed", { expirationTtl: 60 * 60 * 24 * 400 });
          }
        }
      }
    }

    return c.json({ received: true, verified: true });
  } catch (err) {
    console.error("[Webhook Error]", err instanceof Error ? err.message : "unknown");
    return c.json({ error: "Webhook processing failed" }, 400);
  }
});

export default checkoutRoute;
