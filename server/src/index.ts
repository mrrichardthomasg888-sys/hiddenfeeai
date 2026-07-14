import express from "express";
import cors from "cors";
import { env } from "@/config/env.js";
import { healthRouter } from "@/routes/health.js";
import { errorHandler, notFoundHandler } from "@/middleware/errorHandler.js";

const app = express();

app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.use("/api/health", healthRouter);

// Additional routers (upload, analyze, checkout, webhook, report) are
// mounted here in later phases as they're built.

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`HiddenFeeAI server listening on http://localhost:${env.port}`);
  if (env.testModeSkipPayment) {
    console.log("⚠ TEST_MODE_SKIP_PAYMENT is enabled — payment gate is bypassed for local dev.");
  }
});
