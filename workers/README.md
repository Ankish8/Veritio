# Proxy Worker (Cloudflare)

Reverse proxy for live website testing. Proxies target websites, injects the companion tracking script, and forwards API calls to the backend.

## Setup

1. **Configure local dev environment:**

   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your values
   ```

2. **Set production secrets** (all three are required):

   ```bash
   npx wrangler secret put VERITIO_API_BASE
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_SERVICE_KEY
   ```

3. **Deploy:**

   ```bash
   npx wrangler deploy
   ```

4. **Set `NEXT_PUBLIC_PROXY_WORKER_URL`** in your app's `.env.local` to the deployed worker URL.

## How it works

```
Browser → proxy.workers.dev/p/{studyId}/{snippetId}/{b64Origin}/{path}
  ├── /api/* → forwarded to VERITIO_API_BASE (backend)
  └── /p/*  → fetches target site, injects companion script, rewrites links
```

The companion script handles task presentation, event tracking, and response submission for live website tests. API calls from the companion are routed through the worker's `/api/*` endpoint to avoid CORS issues.

> **If `VERITIO_API_BASE` is wrong or not set, live website tests will silently fail** — participants will start but never complete, with 0 events and 0 responses recorded.
