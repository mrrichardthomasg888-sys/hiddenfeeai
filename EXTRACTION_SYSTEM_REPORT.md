# HiddenFeeAI — Document Extraction System Rebuild Report

## Final Safety Checklist

- ✅ No UI files modified
- ✅ No branding modified
- ✅ No payment code modified
- ✅ No report design modified
- ✅ No Fly.io added
- ✅ No paid services added
- ✅ No localhost/127.0.0.1 in production config
- ✅ No trycloudflare.com temporary tunnels
- ✅ Permanent Cloudflare Named Tunnel configured
- ✅ Existing Cloudflare deployment preserved
- ✅ IBM Docling remains primary extractor
- ✅ Deploys through GitHub → Cloudflare without paid infrastructure

---

## Architecture

```
Customer Upload
      ↓
Cloudflare Worker API (POST /api/upload)
      ↓
Create Audit Job (KV) → status: uploading
      ↓
State: uploading → extracting
      ↓
Extraction Router (ONE router, no competing pipelines)
      ↓
IBM Docling (PRIMARY) — via permanent Cloudflare Named Tunnel
      ↓
  ├── Success → Extraction Contract: { success, text, pages, tables, metadata, structured, confidence }
  │         ↓
  │   State: extracting → extracted
  │         ↓
  │   AI Financial Analyzer → State: analyzing → complete → Report
  │
  └── Failure → Retry (exponential backoff) → Format-specific fallback
                ↓
                Final failure → "We couldn't read this document. Please try uploading a clearer copy."
                ↓
                State: extracting → error
```

---

## Problems Fixed

| # | Problem | Fix |
|---|---------|-----|
| 1 | `trycloudflare.com` tunnel (breaks on restart) | Replaced with permanent Cloudflare Named Tunnel |
| 2 | Docling only configured for PDF | Added all formats: PDF, DOCX, PPTX, XLSX, HTML, images, MD, CSV |
| 3 | Extraction Contract schema mismatch | Rewrote `/parse` endpoint to return `{ success, text, pages, tables, metadata, structured, confidence }` |
| 4 | Fixed 120s timeout | Size-aware: 60s (<1MB) / 120s (1-10MB) / 180s (>10MB) |
| 5 | Empty structured JSON | Now populates headings, tables, pages |
| 6 | Wrong customer messages | Fixed to: "We couldn't read this document. Please try uploading a clearer copy." |
| 7 | No job safety timeout | Added 5-minute `Promise.race()` safety timeout |
| 8 | localhost in production config | Replaced with permanent `https://hiddenfee-doc-engine.hiddenfeeai.com` |

---

## Files Modified

| File | Change |
|------|--------|
| `hiddenfee-doc-engine/app.py` | All Docling formats + Extraction Contract schema + OCR/table/layout config |
| `hiddenfee-doc-engine/Dockerfile` | Pre-download models, 2 workers, production deps |
| `hiddenfee-doc-engine/requirements.txt` | Pinned dependencies |
| `worker/wrangler.toml` | Permanent Cloudflare Named Tunnel URL (no localhost, no trycloudflare) |
| `worker/src/services/doclingClient.ts` | New contract parsing, size-aware timeout, all formats |
| `worker/src/services/extraction/doclingExtractor.ts` | Pass timeout param, removed dead code |
| `worker/src/services/extraction/extractionTypes.ts` | Correct customer messages |
| `worker/src/routes/upload.ts` | Safety timeout, state transitions, sanitized errors |

## Files Created

| File | Purpose |
|------|---------|
| `hiddenfee-doc-engine/cloudflared-tunnel.yml` | Permanent Cloudflare Named Tunnel config |
| `hiddenfee-doc-engine/DEPLOYMENT.md` | Zero-cost deployment guide with Named Tunnel setup |
| `tests/test-extraction.ts` | Integration test script |

## Files Deleted

| File | Reason |
|------|--------|
| `hiddenfee-doc-engine/fly.toml` | No paid services |

---

## Test Results

| Test | Result |
|------|--------|
| Simple PDF (3KB) | ✅ 1 page, 1 table, confidence=0.90 |
| Contract PDF (3.5KB) | ✅ 1476 chars, 10 headings, confidence=0.85 |
| PNG Image (835B) | ✅ OCR used, text extracted |
| Text file (65B) | ✅ Text extracted |
| Worker build | ✅ 1175 KiB, permanent tunnel URL |

---

## Deployment (Zero Cost)

1. Set up Cloudflare Named Tunnel (see `DEPLOYMENT.md`)
2. `cloudflared tunnel create hiddenfee-doc-engine`
3. `cloudflared tunnel route dns hiddenfee-doc-engine hiddenfee-doc-engine.hiddenfeeai.com`
4. Start Docling service + tunnel
5. `cd worker && npx wrangler deploy`

No paid services. Deploys through GitHub → Cloudflare.
