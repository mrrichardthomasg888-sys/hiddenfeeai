# HiddenFeeAI v2 — Operations Runbook

**Version**: 2.0-hardened  
**Last Updated**: July 27, 2026  
**Audience**: On-call engineers, SRE, platform operations

---

## QUICK REFERENCE

| Resource | URL / Command |
|----------|---------------|
| Production Worker | `https://hiddenfeeai-worker.mr-richardthomasg888.workers.dev` |
| Health Check | `GET /api/health` |
| Deep Health Check | `GET /api/health/deep` |
| Dashboard | Cloudflare Workers Dashboard |
| Logs | `npx wrangler tail` |
| Deploy | `npx wrangler deploy --env production` |
| KV Namespace | `ANALYSIS_KV` (ID: hiddenfeeai-jobs) |

---

## ALERT RESPONSE PROCEDURES

### CRIT-001: High Analysis Failure Rate (>5% in 5 min)

**Symptoms**: `/api/health` shows increased errors, users report failed analyses, error logs show `[Analyze] Audit failed`

**Response** (10 minutes):
1. Check DeepSeek API status: `curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com/v1/models`
2. Check `/api/health/deep` for dependency status
3. Review recent error logs: `npx wrangler tail | grep -i error`
4. If DeepSeek is down: No action possible — inform users, wait for recovery
5. If >10% failure rate sustained: Consider rolling back last deploy

**Escalation**: Page on-call engineer if >10% for 15 minutes

---

### CRIT-002: Payment Failure Spike (>3 failures in 10 min)

**Symptoms**: Stripe webhook returns 401, `[Webhook] Signature verification FAILED` in logs

**Response** (5 minutes):
1. Verify `STRIPE_WEBHOOK_SECRET` is set: `npx wrangler secret list --env production`
2. Check Stripe Dashboard → Webhooks → Attempt logs for failed signature events
3. If legitimate webhooks failing: Webhook secret mismatch — rotate and update
4. If unknown IPs sending webhooks: Possible forgery attack — rotate webhook secret immediately

**Escalation**: Page security engineer immediately if forgery suspected

---

### CRIT-003: Docling Service Unavailable (3 consecutive health check failures)

**Symptoms**: All extractions falling back to DeepSeek Vision, costs increasing, `[Upload V2] Docling FAILED` in logs

**Response** (10 minutes):
1. Check Docling Docker container: `docker ps | grep docling`
2. Check Docling logs: `docker logs docling-service --tail 50`
3. Restart if crashed: `docker restart docling-service`
4. Verify recovery: `GET /api/health/deep` → docling.status should return "ok"
5. If cannot recover: System auto-falls back to Vision — monitor cost increase

**Escalation**: Page infra engineer if Docling down >30 minutes

---

### HIGH-001: Elevated Latency (p95 >90s for 15 min)

**Response** (15 minutes):
1. Check DeepSeek API latency: Review recent request durations in logs
2. Check Docling response times: `docker stats docling-service`
3. Check KV latency: `/api/health/deep` → kv section
4. Check for large document surge (100+ page PDFs cause slowdowns)
5. Consider Worker plan upgrade if CPU-bound (current: Bundled, upgrade to: Unbound)

---

### HIGH-002: High Fallback Rate (>20% for 15 min)

**Response** (10 minutes):
1. Check Docling container health
2. Review which document types are failing: Check logs for `fileFormat` in Docling errors
3. If specific format (e.g., scanned PDFs): Expected — Docling may not handle some scanned docs
4. If all formats failing: Docling service issue — follow CRIT-003 procedure

---

## DEPLOYMENT PROCEDURE

### Standard Deploy

```bash
# 1. Verify tests pass
npx vitest run worker/src/benchmarks/

# 2. Deploy to dev first (if available)
npx wrangler deploy --env dev

# 3. Smoke test dev
curl -s https://dev-worker.example.com/api/health | jq .status

# 4. Deploy to production
npx wrangler deploy --env production

# 5. Verify production health
curl -s https://hiddenfeeai-worker.mr-richardthomasg888.workers.dev/api/health | jq .

# 6. Monitor for 5 minutes
npx wrangler tail --env production | grep -E "error|Error|ERROR"
```

### Rollback

```bash
# Rollback to previous version
npx wrangler rollback --env production

# Verify recovery
curl -s https://hiddenfeeai-worker.mr-richardthomasg888.workers.dev/api/health | jq .status
```

---

## SECRET MANAGEMENT

| Secret | Rotation Frequency | Method |
|--------|-------------------|--------|
| `DEEPSEEK_API_KEY` | Every 90 days | DeepSeek Dashboard → API Keys → Regenerate |
| `STRIPE_SECRET_KEY` | Every 90 days | Stripe Dashboard → Developers → API Keys → Roll |
| `STRIPE_WEBHOOK_SECRET` | Every 90 days | Stripe Dashboard → Webhooks → Reveal → Update via `wrangler secret put` |

```bash
# Update a secret
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env production
# Paste new secret at prompt
```

---

## RECOVERY PROCEDURES

### Worker Cold Start Recovery

**Symptom**: First request after deploy takes 2-5 seconds  
**Action**: None needed — this is normal Cloudflare behavior. First request initializes the JS runtime.  
**Prevention**: Set up a CRON trigger to ping `/api/health` every 5 minutes to keep Worker warm.

### KV Consistency Issues

**Symptom**: Job status not updating immediately after write  
**Action**: KV is eventually consistent (typically <1 second propagation). Job polling (every 2 seconds from frontend) accounts for this. If consistently delayed >5 seconds, check KV namespace health in Cloudflare Dashboard.

### Stripe Webhook Delivery Failure

**Symptom**: Payment marked as paid by `/verify` endpoint but webhook never received  
**Action**: The verify endpoint acts as a fallback. Check Stripe Dashboard → Webhooks → Delivery attempts. If webhooks consistently fail, verify Worker endpoint URL is correct and accessible.

---

## COST MONITORING

| Metric | Normal Range | Warning | Critical |
|--------|-------------|---------|----------|
| Daily AI cost | $1-5 | $10 | $50 |
| Docling vs Vision ratio | 80/20 | 60/40 | 40/60 |
| KV write operations/day | <100K | <500K | >1M |

---

## KEY CONTACTS

| Role | Contact | When to Page |
|------|---------|-------------|
| On-call Engineer | [TBD] | Any CRITICAL alert |
| Security Engineer | [TBD] | CRIT-002 (payment forgery suspected) |
| Infra Engineer | [TBD] | CRIT-003 (Docling >30min down) |
| AI/ML Engineer | [TBD] | Analysis failure rate >10% sustained |

---

*This runbook should be reviewed and updated after each incident. Post-mortems should be linked here for future reference.*