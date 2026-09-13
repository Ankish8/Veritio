# Veritio

Open-source UX research platform for running Card Sorts, Tree Tests, Surveys, Prototype Tests, First-Click Tests, First Impression Tests, and Web App Tests.

[![CI](https://github.com/Ankish8/Veritio/actions/workflows/ci.yml/badge.svg)](https://github.com/Ankish8/Veritio/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## Features

- **Card Sort** -- Discover how users naturally organize and categorize content
- **Tree Test** -- Validate navigation structure and information architecture
- **Survey** -- Collect feedback with customizable questionnaires and branching logic
- **Figma Prototype Test** -- Test interactive Figma prototypes with real users
- **First Click Test** -- Measure where users click first on designs
- **First Impression Test** -- Capture immediate reactions to brief design exposure
- **Web App Test** -- Heatmaps, session recordings, and JS tracking on live websites

### Platform Capabilities

- **Study Flow Builder** -- Drag-and-drop study flow with welcome screens, instructions, consent forms, demographic questions, and thank-you pages
- **Real-time Collaboration** -- Yjs-powered collaborative editing across all study types
- **Results & Analysis** -- Built-in analysis dashboards with export capabilities
- **Participant Management** -- Share links, response prevention, and session tracking
- **Team Workspaces** -- Multi-user organizations with role-based access control
- **Branding** -- Customizable colors, logos, and styling for participant-facing pages
- **Session Recording** -- Optional screen, webcam, and audio recording

### Build on it

- **[REST API](docs/API.md)** -- Everything the dashboard does, over HTTPS. Create studies of any
  methodology, launch them, read the analysis back. OpenAPI 3.1, scoped API keys or OAuth 2.1.
  Reference at **[veritio.io/docs/api](https://veritio.io/docs/api)**.
- **[MCP server](docs/MCP.md)** -- The same capability for AI agents, at `https://veritio.io/mcp`.
  Write-capable, not read-only: an agent can design a study, launch it to real participants, and
  read the results.

Both sit on one authorization core, so a scope means the same thing on either, and the same key
works on both.

## Architecture

Split architecture with an [iii](https://iii.dev)-engine backend and Next.js frontend:

| Component      | Port | Technology                    | Purpose                 |
| -------------- | ---- | ----------------------------- | ----------------------- |
| **Backend**    | 4000 | [iii engine](https://iii.dev) | API, events, cron jobs  |
| **Frontend**   | 4001 | Next.js 16 + React 19         | UI, auth, SSR           |
| **Yjs Server** | 4002 | WebSocket                     | Real-time collaboration |
| **Streams**    | 4004 | WebSocket (iii RBAC listener) | Real-time data streams  |

The frontend proxies `/api/*` requests to the backend (except `/api/auth/*` which stays in Next.js for Better Auth). The backend app connects to the engine's trusted worker bridge on :49134 (loopback only).

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Zustand, SWR
- **Backend:** iii engine + iii-sdk (v0.23.x), TypeScript step handlers
- **Database:** Supabase (PostgreSQL)
- **Auth:** Better Auth
- **Queue:** iii durable queue (builtin file store); Redis backs iii state + streams
- **Real-time:** Yjs, WebSocket streams (iii-browser-sdk)
- **Monorepo:** Turborepo, Bun

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Node.js](https://nodejs.org) 20+
- [Supabase](https://supabase.com) account (or self-hosted)
- [Redis](https://redis.io) (local or cloud)

### Setup

```bash
# Clone the repository
git clone https://github.com/Ankish8/Veritio.git
cd veritio

# Install dependencies
bun install

# Copy environment template and configure
cp .env.example apps/veritio/.env.local
# Edit apps/veritio/.env.local with your Supabase and Redis credentials

# Start all development servers
cd apps/veritio && ./scripts/dev.sh
```

The app will be available at `http://localhost:4001`.

### Environment Variables

See [`.env.example`](.env.example) for all configuration options. At minimum you need:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Supabase project credentials
- `SUPABASE_SERVICE_ROLE_KEY` -- Supabase service role key (server-side)
- `DATABASE_URL` -- PostgreSQL connection string
- `BETTER_AUTH_SECRET` -- Authentication secret key
- `REDIS_URL` -- Redis connection URL

## Project Structure

```
veritio/
├── apps/veritio/          # Main application
│   ├── src/
│   │   ├── steps/         # Backend steps (API, events, cron)
│   │   ├── services/      # Business logic
│   │   ├── components/    # React components
│   │   ├── hooks/         # SWR & custom hooks
│   │   ├── stores/        # Zustand state management
│   │   └── middlewares/   # Auth & error handling
│   └── scripts/           # Dev & deployment scripts
├── packages/@veritio/     # Shared packages
│   ├── core/              # Common utilities
│   ├── ui/                # Shadcn/ui components
│   ├── auth/              # Better Auth integration
│   ├── swr-config/        # SWR hooks & fetchers
│   ├── study-types/       # Shared type definitions
│   ├── study-flow/        # Survey builder & player
│   ├── card-sort/         # Card sort components
│   ├── prototype-test/    # Prototype test components
│   ├── analysis-shared/   # Analysis algorithms
│   ├── dashboard-common/  # Dashboard components
│   └── ...
├── workers/               # Cloudflare Worker (proxy)
├── docs/                  # Technical documentation
└── supabase/              # Database migrations
```

## Self-Hosting

### Docker Compose (Recommended)

The easiest way to self-host Veritio:

```bash
# Copy environment template and configure
cp .env.example .env
# Replace every required placeholder. In particular, generate independent
# BETTER_AUTH_SECRET, PDF_RENDER_SECRET, REDIS_PASSWORD, and YJS_INTERNAL_API_KEY values.

# Bootstrap a clean external Supabase database (use its direct/session URL)
cd apps/veritio
DATABASE_DIRECT_URL='postgresql://...' bun run self-host:migrate
cd ../..

# Build and start the local services
docker compose up -d --build
docker compose ps
```

This starts four containers that expose five runtime entrypoints:

- **Backend** (port 4000) — iii engine + step handlers
- **Frontend** (port 4001) — Next.js app
- **Yjs** (port 4002) — Real-time collaboration server
- **Streams** (port 4004) — RBAC-gated browser stream listener inside the backend container
- **Redis** — iii state + stream backing store (the durable queue uses a file-based store on a volume)

You still need an external **Supabase** instance (hosted or self-hosted) for PostgreSQL, storage, and realtime. The Cloudflare live-test proxy is also a separate deployment and is required only for live website tests. This is not a one-command full infrastructure stack.

The Compose images support Linux `amd64` and `arm64`; the backend build selects the matching pinned iii engine binaries.

Read the [Docker guide](apps/docs/content/docs/self-hosting/docker.mdx) and [operations runbook](docs/SELF_HOSTING_OPERATIONS.md) before exposing an installation to the internet.

### Railway

See the [self-hosting guide](apps/docs/content/docs/self-hosting/railway.mdx) for Railway-specific deployment instructions.

### Vercel (Frontend)

The Next.js frontend can be deployed to Vercel. Configure the API proxy to point to your backend deployment.

## Development

```bash
# Run a single test file
bun test path/to/file.test.ts

# Run tests matching a pattern
bun run test:vitest -t "pattern"

# Build all packages
bun run build

# Lint
bun run lint

# Type check
bun run type-check

# Storybook (component development)
bun run storybook
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development guidelines.

## Documentation

Full documentation is available at **[docs.veritio.dev](https://docs.veritio.dev)** (or run locally — see below).

Key sections:

- [Prerequisites](apps/docs/content/docs/getting-started/prerequisites.mdx) -- Tools and setup requirements
- [Quick Start](apps/docs/content/docs/getting-started/quickstart.mdx) -- Get running from a fresh clone
- [Environment Variables](apps/docs/content/docs/getting-started/environment-variables.mdx) -- Complete configuration reference
- [Architecture Overview](apps/docs/content/docs/architecture/overview.mdx) -- Service map, request flow, port map
- [Self-Hosting (Docker)](apps/docs/content/docs/self-hosting/docker.mdx) -- Docker Compose deployment
- [Troubleshooting](apps/docs/content/docs/guides/troubleshooting.mdx) -- Common issues and fixes
- [REST API](docs/API.md) -- Conventions, authorization model, adding an endpoint
- [MCP server](docs/MCP.md) -- Endpoints, auth, tool surface, authorization model

### Run Docs Locally

```bash
cd apps/docs
bun install   # first time only
bun run dev   # opens at http://localhost:3000
```

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

Copyright (c) 2026 Veritio
