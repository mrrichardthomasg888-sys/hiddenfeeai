import express from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { healthRouter } from "@/routes/health.js";
import { uploadRouter } from "@/routes/upload.js";
import { analyzeRouter } from "@/routes/analyze.js";
import { checkoutRouter } from "@/routes/checkout.js";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);

// Stripe webhook requires raw body — mount before express.json()
app.use("/api/checkout/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/health", healthRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/checkout", checkoutRouter);

app.listen(env.port, () => {
  console.log(`HiddenFeeAI server listening on http://localhost:${env.port}`);
  if (env.testModeSkipPayment) {
    console.log("⚠ TEST_MODE_SKIP_PAYMENT is enabled — payment gate is bypassed for local dev.");
  }
});
