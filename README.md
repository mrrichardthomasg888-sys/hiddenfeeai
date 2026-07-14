# HiddenFeeAI

AI-powered forensic document auditing platform. Upload an invoice, bill,
receipt, or contract and receive a professional financial audit that
uncovers hidden fees, billing errors, duplicate charges, and savings
opportunities.

**Status:** Local development build (not yet deployed).

## Privacy-first architecture

- No user accounts, no login, no document history.
- Uploaded files are processed in-memory/temp storage and deleted
  immediately after text extraction.
- Extracted text is discarded after the report is generated and delivered.
- Nothing is stored long-term; nothing is used to train AI models.

## Monorepo structure

```
hiddenfeeai/
├── client/     Vite + React + TypeScript + Tailwind + shadcn/ui frontend
├── server/     Node + Express + TypeScript backend (API, AI, extraction)
├── shared/     Cross-cutting shared types/utilities (reserved)
├── .env.example
└── package.json   npm workspaces root
```

## Getting started

1. Copy the environment template and fill in your keys:
   ```
   copy .env.example .env
   ```
   At minimum set `DEEPSEEK_API_KEY` once you reach Phase 4. Stripe keys
   are optional locally — `TEST_MODE_SKIP_PAYMENT=true` bypasses payment
   for development.

2. Install dependencies (from the repo root):
   ```
   npm install
   ```

3. Run both the client and server together:
   ```
   npm run dev
   ```
   - Client: http://localhost:5173
   - Server: http://localhost:8787 (proxied under `/api` from the client)

   Or run them separately with `npm run dev:client` / `npm run dev:server`.

## Tech stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, shadcn-style
  components, Framer Motion, React Router, Lucide icons.
- **Backend:** Node.js, Express, TypeScript (strict mode), Zod validation.
- **Document processing:** pdf-parse (text-layer PDFs), tesseract.js (OCR
  for scans/images), mammoth (DOCX), SheetJS (XLSX/CSV), sharp (image
  preprocessing).
- **AI:** DeepSeek API, called only from the server — API keys are never
  exposed to the client.
- **Payments:** Stripe (test mode locally).

## Development phases

1. Project setup ✅
2. Landing page & design system
3. Upload system + extraction pipeline
4. DeepSeek multi-agent audit engine
5. Stripe payments (test mode)
6. Interactive audit report + PDF export
7. Security hardening, testing, polish

Cloudflare deployment configuration is intentionally deferred until the
application is fully working and tested locally.
