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

### Phase 8B cleanup - 2026-08-09
- DetectHiddenFees/HiddenFeeAI marketing attribution instrumentation was removed from this repository. HiddenFeeAI does not accept or persist `dhf_*`, UTM, arrival, upload, analysis, checkout, purchase, or revenue attribution events.
- HiddenFeeAI is production-critical and frozen from marketing experiments. Do not add attribution or marketing analytics without explicit owner approval.
- The payment-integrity corrections remain: browser return URLs cannot unlock unpaid audits; Stripe payment confirmation requires authoritative server verification; webhook signatures and duplicate-event protection remain enabled.
- The payment return screen remains in a safe verifying state while confirmation is retried, then keeps the report locked if payment cannot be confirmed. No product pricing, checkout price, Gemini, document processing, detection, report, PDF, design, URL, or mobile behavior was intentionally changed.
- Verification passed on 2026-08-09: client production build, client tests (35), scanner tests (18), upload integration tests (6), Worker Wrangler dry-run, live Worker health, live homepage HTTP 200, and unsigned webhook rejection (401). No real-money Stripe purchase was run.
- Cleanup commit `ac39639489d6749c9e4cd0ef2fe001a49a4626d2` is deployed. Worker version `e7b7a13d-0b34-4dc5-bc8a-265f2a65d6bf`; Pages deployment `f61fefb5.hiddenfeeai.pages.dev`; production health returned `status=ok`, `store=kv`.
- Never record secrets in this handoff. Safe continuation: return to DetectHiddenFees traffic acquisition only; do not make further HiddenFeeAI marketing or attribution changes without explicit owner approval.
