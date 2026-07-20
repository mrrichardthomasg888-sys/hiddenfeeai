
# HiddenFeeAI

AI-powered forensic document audits. Upload any invoice, bill, receipt, or contract and uncover hidden fees, billing errors, and savings opportunities.

## Architecture

```
┌──────────────────────┐     ┌──────────────────────┐
│   Cloudflare Pages    │     │  Cloudflare Workers   │
│   (React Frontend)    │────▶│   (Hono API Backend)  │
│   client/             │     │   worker/             │
└──────────────────────┘     └──────────────────────┘
```

- **Frontend:** Cloudflare Pages (React + Vite + Tailwind CSS + Framer Motion)
- **Backend:** Cloudflare Workers (Hono + DeepSeek AI + Stripe + pdf-lib)
- **AI Model:** DeepSeek Chat (forensic financial audit)
- **Payments:** Stripe Checkout
- **Document Processing:** Cloudflare AI OCR + native text extraction

## Local Development

### Prerequisites
- Node.js >= 20
- npm >= 9
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed via npm)

### Running the App

**Start both frontend and Express server (legacy dev mode):**
```bash
npm run dev
```

**Start only the frontend:**
```bash
npm run dev:client
```

**Start only the Express server (for legacy development):**
```bash
npm run dev:server
```

**Start the Cloudflare Worker locally:**
```bash
npm run dev:worker
```

### Testing Against the Worker Locally

1. Start the Worker:
   ```bash
   cd worker && npx wrangler dev
   ```

2. Start the frontend with the Worker URL:
   ```bash
   cd client && VITE_API_URL=http://localhost:8787 npx vite --host
   ```

Or use the Express server proxy (default dev mode):
```bash
npm run dev
```
The frontend proxies `/api/*` requests to `http://localhost:8787`.

## Environment Variables

### Cloudflare Workers (wrangler.toml)

| Variable | Description | Default |
|----------|-------------|---------|
| `ENVIRONMENT` | Environment name | `production` |
| `MAX_UPLOAD_SIZE_MB` | Max file upload size | `25` |
| `FRONTEND_URL` | Frontend origin for CORS | `https://hiddenfeeai.com` |
| `DEEPSEEK_BASE_URL` | DeepSeek API base URL | `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | DeepSeek model name | `deepseek-chat` |
| `DEEPSEEK_REASONER_MODEL` | DeepSeek reasoner model | `deepseek-reasoner` |
| `STRIPE_PRICE_USD_CENTS` | Price in USD cents | `1500` |
| `TEST_MODE_SKIP_PAYMENT` | Skip Stripe in dev | `true` (dev) / `false` (prod) |

### Secrets (set via `npx wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `DEEPSEEK_API_KEY` | DeepSeek API key |
| `STRIPE_SECRET_KEY` | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |

### Cloudflare Pages (Environment Variables)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Worker API URL for production | `https://hiddenfeeai-worker.your-name.workers.dev` |

In development, `VITE_API_URL` defaults to `/api` (proxied to the Express or Worker server).

## Production Deployment

### Step 1: Deploy the Worker

```bash
# Set secrets first
cd worker
npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET

# Deploy
npm run deploy:worker
```

### Step 2: Deploy the Frontend to Cloudflare Pages

1. Build the client:
   ```bash
   cd client && npm run build
   ```

2. Deploy the `client/dist` directory to Cloudflare Pages:
   - Connect your Git repository to Cloudflare Pages
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `client`

3. Add environment variable in Cloudflare Pages dashboard:
   - `VITE_API_URL` = `https://hiddenfeeai-worker.your-name.workers.dev`

### Step 3: Update Worker Environment

Set the production frontend URL in `wrangler.toml`:
```toml
[env.production]
vars = { ENVIRONMENT = "production", FRONTEND_URL = "https://your-domain.pages.dev", TEST_MODE_SKIP_PAYMENT = "false" }
```

Then deploy:
```bash
npx wrangler deploy --env production
```

## Important Notes

### Storage

The Worker currently uses **in-memory Map storage** for job data. This means:
- Jobs are lost on Worker cold starts
- Jobs expire after 1 hour
- Suitable for development and light usage

For production, implement a `JobStore` interface (defined in `worker/src/types.ts`) using:
- **Cloudflare KV** for simple key-value persistence
- **Durable Objects** for transactional job state

The interface is:
```typescript
interface JobStore {
  createJob(auditId: string, fileName: string): Job;
  getJob(auditId: string): Job | undefined;
  updateJob(auditId: string, patch: Partial<Job>): Job | undefined;
  deleteJob(auditId: string): void;
}
```

### Express Server (`server/` directory)

The `server/` directory contains an Express.js version of the backend. **This is NOT deployed to Cloudflare.** It is kept as a local development reference only.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/upload` | Upload a document |
| `GET` | `/api/analyze/:auditId` | Get job status/report |
| `POST` | `/api/analyze/:auditId/start` | Start AI analysis |
| `GET` | `/api/analyze/:auditId/pdf` | Download PDF report |
| `POST` | `/api/checkout/create-session` | Create Stripe checkout |
| `GET` | `/api/checkout/verify/:auditId` | Verify payment |
| `POST` | `/api/checkout/webhook` | Stripe webhook |