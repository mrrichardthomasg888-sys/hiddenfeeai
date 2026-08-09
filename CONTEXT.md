# HiddenFeeAI - Project Context

## Current State (July 2026)

### What's Been Done (All Deployed & Working)

#### Text Changes
- **Hero.tsx**: Hero paragraph updated with "negotiation leverage to challenge questionable charges with confidence"
- **TrustSection.tsx**: Actionable Results card includes "negotiation leverage" in description
- **ReportShowcase.tsx**: New descriptive paragraph about negotiation leverage below section heading

#### Backend (Cloudflare Worker)
- **Worker deployed** at: `https://hiddenfeeai-worker.mr-richardthomasg888.workers.dev`
- **UUID fix**: Replaced `uuid` npm package with `crypto.randomUUID()` in both `routes/upload.ts` and `services/ai.ts`
- **CORS fix**: Added `null` origin support for Capacitor Android WebView; removed `credentials: true` for null-origin compatibility
- **wrangler.toml**: Updated with correct Worker URL

#### Frontend (Cloudflare Pages)
- **VITE_API_URL**: Set as Cloudflare Pages secret AND hardcoded fallback in `client/src/config/api.ts`
- **Built and deployed** to Cloudflare Pages via `wrangler pages deploy`

#### Android (Capacitor)
- **Capacitor v8.4.2** installed in `client/` and root
- **Android project** at `android/` with `com.hiddenfeeai.app` package
- **SDK Platform 34** installed at `C:\Users\lynns\AppData\Local\Android\Sdk`
- **Config**: `capacitor.config.json` with `androidScheme: "https"`, `hostname: "app"`
- **Scripts**: `npm run android:sync`, `npm run android:open`, `npm run android:run`

### Known Issues

#### Android Upload "Network Error" — FIXED

The Android upload "Network Error" was caused by the Capacitor WebView loading the app from `file://` origin. Android's WebView has strict CORS handling for `null`/`file://` origins that blocks XHR requests at a networking level before CORS headers can even apply.

**Fix v2 (July 2026):**
1. **`capacitor.config.json` (root)** — Added `CapacitorHttp: { enabled: true }` plugin config. This makes all `fetch()` and `XMLHttpRequest` calls route through **native Android HTTP** (OkHttp), which has no CORS restrictions. The app still loads locally from `file://` so it works offline.
2. **Android `AndroidManifest.xml`** — Added `usesCleartextTraffic="true"` and `networkSecurityConfig="@xml/network_security_config"`.
3. **Android `res/xml/network_security_config.xml`** (NEW) — Allows HTTPS for production domains and cleartext for local dev.
4. **Reverted `server.url` approach** — The `server.url` mode caused install errors since the app requires full internet to load. The app now loads from `file://` and uses native HTTP for API calls.

**To rebuild:**
```
npm run build --workspace client && npx cap sync android
# Then open android/ in Android Studio, Build -> Clean -> Rebuild -> install on device
```

#### Image Upload OCR Fails
- Images upload successfully but OCR extraction fails
- Cloudflare Workers AI OCR model `@cf/unisys/ocr` has limited accuracy
- User gets "Could not extract text from this image" error
- Workaround: convert images to PDF or upload TXT files

### Files Modified
- `client/src/config/api.ts` — Hardcoded API URL fallback
- `client/src/components/landing/Hero.tsx` — Text change
- `client/src/components/landing/TrustSection.tsx` — Text change
- `client/src/components/landing/ReportShowcase.tsx` — New text paragraph
- `worker/src/index.ts` — CORS for null origin support
- `worker/src/routes/upload.ts` — crypto.randomUUID()
- `worker/src/services/ai.ts` — crypto.randomUUID()
- `worker/wrangler.toml` — Correct Worker URL
- `capacitor.config.json` — Android config (CapacitorHttp enabled)
- `package.json` — Added scripts, Capacitor deps
- `.gitignore` — Android entries
- `client/.gitignore` — Capacitor config
- `client/capacitor.config.json` — Android config
- `android/app/src/main/AndroidManifest.xml` — Network security attrs
- `android/app/src/main/res/xml/network_security_config.xml` — NEW

### API Endpoints (Worker)
- `GET /api/health` — Health check
- `POST /api/upload` — File upload (multipart form)
- `GET /api/analyze/:auditId` — Job status
- `POST /api/analyze/:auditId/start` — Start AI analysis
- `GET /api/analyze/:auditId/pdf` — Download PDF report
- `POST /api/checkout/create-session` — Stripe checkout
- `GET /api/checkout/verify/:auditId` — Payment verification

### Worker Secrets Needed
- `DEEPSEEK_API_KEY` — For AI analysis
- `STRIPE_SECRET_KEY` — For payments
- `STRIPE_WEBHOOK_SECRET` — For Stripe webhooks

### To Rebuild & Deploy Android
```
npm run build --workspace client && npx cap sync android
# Then open android/ in Android Studio
```

### DetectHiddenFees attribution and verified-revenue handoff (Phase 8B - 2026-08-09)
- DetectHiddenFees hands off allow-listed context through first-party query parameters: `dhf_landing`, `dhf_referrer`, `dhf_session`, `dhf_source`, `dhf_cta_id`, `dhf_cta_type`, and `utm_*` values. `dhf_cta_id` remains an opaque page/action/position label, not an identity token.
- The client stores only this short-lived attribution context in first-party session storage, emits one document-free `hiddenfeeai_arrival` event, and appends the context to the upload request. The Worker validates and sanitizes every value before storing it on the temporary audit job.
- Worker funnel events are stored in the existing `ANALYSIS_KV` namespace under `attribution:event:` with a 400-day TTL. Events are `hiddenfeeai_arrival`, `upload_started`, `upload_completed`, `analysis_started`, `analysis_completed`, `checkout_started`, `purchase_completed`, and `revenue_recorded`. No document contents, filenames, extracted text, analysis results, or card data are written to these events.
- Stripe Checkout receives the opaque attribution fields in metadata. A browser return URL cannot mark an audit paid. Production payment confirmation requires a valid Stripe webhook signature, `checkout.session.completed`, `payment_status=paid`, a matching `auditId`, and a verified amount/currency/transaction identifier.
- Purchase and revenue records use a deterministic transaction key, so duplicate webhook deliveries are idempotent. The private `GET /api/analytics/events` export is token-protected by optional `ANALYTICS_ADMIN_TOKEN`; it is never called by the browser.
- Synthetic checks passed locally: client build, Worker dry-run, scanner tests, upload integration tests, seven-event KV funnel/idempotency test, and signed duplicate Stripe webhook test. Production deployment verification is the remaining handoff step; no real-money test purchase was made.
- Do not add personal Gmail, alter pricing, change the existing Stripe secrets, redesign the product, change DetectHiddenFees Phase 4 pages, or modify `calculator-authority.css`. Next safe continuation point: deploy the verified Worker and matching client, verify `/api/health` and a document-free arrival event in production, then use a Stripe test-mode webhook/checkout if a full live test is needed.
