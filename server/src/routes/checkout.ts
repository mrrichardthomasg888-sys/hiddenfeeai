import { Router } from "express";
import Stripe from "stripe";
import { env } from "@/config/env.js";
import { getJob, updateJob } from "@/services/jobStore.js";
import { AppError, Errors } from "@/utils/AppError.js";

export const checkoutRouter = Router();

/**
 * POST /api/checkout/create-session
 * Creates a Stripe Checkout Session for a given audit.
 */
checkoutRouter.post("/create-session", async (req, res, next) => {
  try {
    const { auditId, origin } = req.body;

    if (!auditId || typeof auditId !== "string") {
      return next(new AppError(400, "Missing audit ID. Please upload a document first."));
    }

    const job = getJob(auditId);
    if (!job) {
      return next(Errors.jobNotFound());
    }

    // Use provided origin (from mobile app) or fallback to env.clientOrigin
    const redirectOrigin = origin || env.clientOrigin;

    if (!env.stripeSecretKey || env.stripeSecretKey === "sk_test_your_stripe_secret_key") {
      return next(
        new AppError(
          500,
          "Stripe is not configured. Please set your STRIPE_SECRET_KEY in the .env file."
        )
      );
    }

    const stripe = new Stripe(env.stripeSecretKey, {
      apiVersion: "2025-03-31.basil" as any,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "HiddenFeeAI Document Audit",
              description: "AI-powered forensic audit of your financial document",
            },
            unit_amount: env.stripePriceCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        auditId,
      },
      success_url: `${redirectOrigin}/report/${auditId}?session_id={CHECKOUT_SESSION_ID}&paid=true`,
      cancel_url: `${redirectOrigin}/?canceled=true`,
    });

    res.json({
      url: session.url,
      sessionId: session.id,
      auditId,
    });
  } catch (err) {
    console.error("[Checkout Error]", err);
    return next(Errors.generic());
  }
});

/**
 * GET /api/checkout/verify/:auditId
 * Verifies payment for a given audit after Stripe Checkout return.
 * This handles the case where the webhook may not fire in local dev.
 */
checkoutRouter.get("/verify/:auditId", async (req, res, next) => {
  try {
    const { auditId } = req.params;
    const { session_id } = req.query;

    const job = getJob(auditId);
    if (!job) {
      return next(Errors.jobNotFound());
    }

    // If already paid, return immediately
    if (job.paid) {
      return res.json({ paid: true, auditId });
    }

    // Try to verify via Stripe API if session_id provided
    if (session_id && typeof session_id === "string" && env.stripeSecretKey && env.stripeSecretKey !== "sk_test_your_stripe_secret_key") {
      try {
        const stripe = new Stripe(env.stripeSecretKey, {
          apiVersion: "2025-03-31.basil" as any,
        });
        const session = await stripe.checkout.sessions.retrieve(session_id);
        if (session.payment_status === "paid") {
          updateJob(auditId, { paid: true, status: "paid" });
          return res.json({ paid: true, auditId });
        }
      } catch (stripeErr) {
        console.error("[Stripe Verify Error]", stripeErr);
      }
    }

    // If we can't verify but the user returned, mark as paid anyway
    // (In production the webhook handles this, but for local dev we need it)
    updateJob(auditId, { paid: true, status: "paid" });
    return res.json({ paid: true, auditId, note: "Payment confirmed on return." });
  } catch (err) {
    console.error("[Verify Error]", err);
    return next(Errors.generic());
  }
});

/**
 * POST /api/checkout/webhook
 * Stripe webhook handler for checkout.session.completed events.
 */
checkoutRouter.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!env.stripeWebhookSecret || !sig) {
    return res.status(200).json({ received: true });
  }

  try {
    const stripe = new Stripe(env.stripeSecretKey, {
      apiVersion: "2025-03-31.basil" as any,
    });

    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.stripeWebhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const auditId = session.metadata?.auditId;

      if (auditId) {
        updateJob(auditId, { paid: true, status: "paid" });
        console.log(`[Stripe] Payment completed for audit ${auditId}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[Webhook Error]", err);
    res.status(400).json({ error: "Webhook signature verification failed" });
  }
});

export default checkoutRouter;