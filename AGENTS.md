# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Veritio is an open-source UX research platform supporting Card Sorts, Tree Tests, Surveys, Prototype Tests, First-Click Tests, First Impression Tests, and Live Website Tests. It uses a split frontend/backend architecture within a Turborepo + Bun monorepo.

## Development Commands

```bash
# Install dependencies (always use bun, not npm)
bun install

# Start all dev servers (motia:4000, next:4001, yjs:4002, streams:4004,
# + a Composio trigger listener when COMPOSIO_API_KEY is set)
cd apps/veritio && ./scripts/dev.sh

# Individual servers
bun run dev:motia        # Motia backend only
bun run dev:next         # Next.js frontend only
bun run dev:yjs          # Yjs collaboration server only

# Build, lint, type-check (from repo root)
bun run build:full       # Build all packages
bun run lint             # ESLint across all packages
bun run type-check       # TypeScript check all packages
bun run format           # Prettier format all files

# Testing
cd apps/veritio
bun test path/to/file.test.ts          # Single test file
bun run test:vitest                    # All vitest tests
bun run test:vitest -t "pattern"       # Tests matching pattern
bun run test:e2e                       # All e2e suites (custom Bun runner, e2e/index.ts)
bun run test:e2e auth                  # Single suite (auth|builder|player|dashboard|survey-*)
bun run test:e2e:headed                # E2e with visible browser

# Storybook
bun run storybook        # Component dev at :6006

# Bundle analysis
bun run build:analyze    # Next.js bundle analyzer
```

## Architecture

### Services (4 processes)

| Service | Port | Role |
|---------|------|------|
| Motia (iii engine) | 4000 | Backend API, event processing, cron jobs via BullMQ/Redis |
| Next.js | 4001 | App Router frontend, SSR, Better Auth |
| Yjs WebSocket | 4002 | CRDT-based real-time collaboration |
| Streams | 4004 | Real-time data streaming WebSocket |

Next.js proxies `/api/*` requests to Motia at :4000 via rewrites (except `/api/auth/*` which is handled by Better Auth in Next.js). See `next.config.ts` rewrites.

### Monorepo Structure

- `apps/veritio/` — Main application (Next.js frontend + Motia backend in same app)
- `apps/landing/` — Standalone marketing/landing Next.js app (port 4003; `turbo --filter=landing`)
- `workers/` — Cloudflare Worker (Wrangler) reverse proxy for Live Website Tests; deployed separately
- `packages/@veritio/ui` — shadcn/ui component library
- `packages/@veritio/auth` — Better Auth integration
- `packages/@veritio/core` — Common utilities
- `packages/@veritio/study-types` — Shared TypeScript type definitions
- `packages/@veritio/study-flow` — Survey builder & player components
- `packages/@veritio/card-sort` — Card sort builder/player/analysis
- `packages/@veritio/prototype-test` — Prototype test components
- `packages/@veritio/analysis-shared` — Analysis algorithms & visualization
- `packages/@veritio/dashboard-common` — Dashboard shared components
- `packages/@veritio/swr-config` — SWR hooks & fetcher configuration
- `packages/@veritio/yjs` — Yjs collaboration utilities

### Backend: Motia Steps

API endpoints are defined as Motia "steps" in `apps/veritio/src/steps/`. Files **must** end with `.step.ts` for auto-discovery. Three step types:

- `src/steps/api/` — HTTP endpoints (REST API handlers)
- `src/steps/events/` — Async event handlers (BullMQ consumers)
- `src/steps/cron/` — Scheduled tasks

Each step exports a `config` (with triggers, name, enqueues) and a `handler` function. Business logic lives in `src/services/`, not in step handlers.

### Frontend: Next.js App Router

Route groups in `src/app/`:
- `(dashboard)/` — Authenticated dashboard (projects, studies, builder, results)
- `(participant)/` — Participant-facing study player (`/s/[studyCode]`)
- `(auth)/` — Sign-in, sign-up, invite flows
- `(admin)/` — Superadmin panel (guarded by `SUPERADMIN_USER_ID`)
- `(public)/` — Public routes (shared results, widget preview)
- `render/pdf/` — Server-rendered pages for PDF export via Puppeteer

### Live Website Tests: Cloudflare Proxy Worker

Live Website Tests run through `workers/proxy-worker.ts` (deployed via `wrangler deploy`, configured in `workers/wrangler.toml`). The worker proxies the target site at `/p/{studyId}/{snippetId}/{b64Origin}/{path}`, injects the companion tracking script, rewrites links, and forwards companion `/api/*` calls to the backend (`VERITIO_API_BASE`) to avoid CORS. The app must set `NEXT_PUBLIC_PROXY_WORKER_URL` to the deployed worker URL. **If `VERITIO_API_BASE` is misconfigured, live tests silently fail** — participants start but record 0 events/responses.

### State Management

Choose based on this decision tree (see `docs/STATE_MANAGEMENT_GUIDE.md`):

1. **SWR CRUD Factory** — Server data with simple CRUD. Use `createCRUDHook` + `createScopedArrayCRUDConfig` from `@/lib/swr/crud-factory`. This is the preferred pattern.
2. **Raw SWR + Cache Orchestrator** — Complex server queries, pagination, filtering.
3. **Zustand** — Complex client-side state. Always use `skipHydration: true` with `persist()`.
4. **Context API** — Component-tree scoped state.
5. **useState** — Local component state.

### Path Aliases

`@/*` maps to `apps/veritio/src/*`. Workspace packages use `@veritio/*` imports with deep paths configured in `tsconfig.json`.

## Key Conventions

- **Package manager**: Bun 1.3+ (never npm/yarn)
- **Tailwind CSS v4**: CSS-based config, not `tailwind.config.js`
- **Zod v3**: Use `.issues` not `.errors` for validation errors
- **Commits**: Conventional format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`)
- **TypeScript**: Strict mode, use `import type` for type-only imports
- **Environment**: Copy `.env.example` to `apps/veritio/.env.local`
- **Agent guidance sync**: `CLAUDE.md` (Claude Code) mirrors this file — keep both in sync when editing either

## Database

PostgreSQL via Supabase with Row-Level Security (RLS) for multi-tenant isolation. Migrations in `supabase/migrations/`. Use `apps/veritio/scripts/apply-migration-safely.ts` for safe migration application.

## Documentation

Detailed guides in `docs/`:
- `ARCHITECTURE.md` — Comprehensive architecture reference
- `STATE_MANAGEMENT_GUIDE.md` — State pattern decision tree
- `COMPONENTS.md` — Component inventory
- `TESTING_GUIDE.md` — Testing conventions
- `DATABASE.md` — Schema & relationships
- `BASE_RESULTS_SERVICE_GUIDE.md` — Analysis service patterns
- `SECURITY_BEST_PRACTICES.md` — Security conventions
- `V3-PATHWAY-DETECTION.md` — Tree-test pathway detection logic
