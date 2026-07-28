# HiddenFeeAI Docling Engine — Deployment Guide

## CRITICAL RULES

- ❌ NEVER use `localhost` or `127.0.0.1` in production config
- ❌ NEVER use `trycloudflare.com` (temporary, breaks on restart)
- ❌ NEVER add paid services (Fly.io, Railway paid, AWS, GCP, Azure)
- ✅ USE a permanent Cloudflare Named Tunnel (free, survives restarts)
- ✅ Deploy through GitHub → Cloudflare without paid infrastructure

## Architecture

```
Cloudflare Worker (production)
       ↓
https://hiddenfee-doc-engine.hiddenfeeai.com
       ↓
Cloudflare Named Tunnel (permanent, free)
       ↓
Docling Service (uvicorn on port 8000)
```

## Setup: Cloudflare Named Tunnel (Zero Cost, Permanent)

### Step 1: Install cloudflared

```bash
# Windows
winget install cloudflare.cloudflared

# Or download from:
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/
```

### Step 2: Login to Cloudflare

```bash
cloudflared tunnel login
```
This opens a browser to authenticate with your Cloudflare account.

### Step 3: Create the Named Tunnel

```bash
cloudflared tunnel create hiddenfee-doc-engine
```

Copy the tunnel ID from the output. It looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### Step 4: Configure the Tunnel

Edit `hiddenfee-doc-engine/cloudflared-tunnel.yml`:
- Replace `<TUNNEL_ID_HERE>` with your tunnel ID
- The credentials file path will be shown in the create output

### Step 5: Add DNS Route

```bash
cloudflared tunnel route dns hiddenfee-doc-engine hiddenfee-doc-engine.hiddenfeeai.com
```

This creates a permanent CNAME record pointing to your tunnel.

### Step 6: Start the Docling Service + Tunnel

```bash
# Terminal 1: Start the Docling service
cd hiddenfee-doc-engine
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000

# Terminal 2: Start the tunnel (permanent, survives restarts)
cloudflared tunnel run hiddenfee-doc-engine
```

### Step 7: Verify

```bash
curl https://hiddenfee-doc-engine.hiddenfeeai.com/health
# Expected: {"status":"ok","service":"hiddenfee-doc-engine",...}
```

### Step 8: Update Worker Config

The `wrangler.toml` already has:
```toml
DOCLING_SERVICE_URL = "https://hiddenfee-doc-engine.hiddenfeeai.com"
```

Deploy the worker:
```bash
cd worker
npx wrangler deploy
```

## Auto-Restart (Production Reliability)

### Option A: systemd (Linux server)

```ini
# /etc/systemd/system/hiddenfee-doc-engine.service
[Unit]
Description=HiddenFeeAI Docling Engine
After=network.target

[Service]
User=www-data
WorkingDirectory=/path/to/hiddenfee-doc-engine
ExecStart=/usr/bin/python3 -m uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/hiddenfee-tunnel.service
[Unit]
Description=HiddenFeeAI Cloudflare Tunnel
After=hiddenfee-doc-engine.service

[Service]
ExecStart=/usr/bin/cloudflared tunnel run hiddenfee-doc-engine
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable hiddenfee-doc-engine hiddenfee-tunnel
sudo systemctl start hiddenfee-doc-engine hiddenfee-tunnel
```

### Option B: Docker Compose (any server)

```yaml
# docker-compose.yml
version: '3'
services:
  docling:
    build: ./hiddenfee-doc-engine
    ports:
      - "8000:8000"
    restart: always
  
  tunnel:
    image: cloudflare/cloudflared:latest
    command: tunnel run hiddenfee-doc-engine
    volumes:
      - ~/.cloudflared:/etc/cloudflared
    restart: always
    depends_on:
      - docling
```

## Resource Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| Memory | 1GB | 2GB |
| Disk | 1GB | 2GB |

## Health Check

```bash
curl https://hiddenfee-doc-engine.hiddenfeeai.com/health
# Expected: {"status":"ok","service":"hiddenfee-doc-engine","version":"2.0.0",...}
```

## Verify Extraction

```bash
curl -X POST https://hiddenfee-doc-engine.hiddenfeeai.com/parse \
  -F "file=@test.pdf"
# Expected: {"success":true,"text":"...","pages":[...],"tables":[...],...}
```

## Troubleshooting

### Tunnel not connecting
- Check tunnel ID in `cloudflared-tunnel.yml`
- Verify credentials file exists: `ls ~/.cloudflared/<tunnel-id>.json`
- Check DNS: `nslookup hiddenfee-doc-engine.hiddenfeeai.com`

### Service won't start
- Check Python: `python --version` (needs 3.11+)
- Install deps: `pip install -r requirements.txt`
- Check port: `netstat -tlnp | grep 8000`

### Worker can't reach Docling
- Verify URL: `curl https://hiddenfee-doc-engine.hiddenfeeai.com/health`
- Check wrangler secret: `npx wrangler secret list`
