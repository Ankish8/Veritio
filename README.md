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

## Architecture

Split architecture with a Motia backend and Next.js frontend:

| Component | Port | Technology | Purpose |
|-----------|------|------------|---------|
| **Backend** | 4000 | [Motia](https://motia.dev) | API, events, cron jobs |
| **Frontend** | 4001 | Next.js 16 + React 19 | UI, auth, SSR |
| **Yjs Server** | 4002 | WebSocket | Real-time collaboration |
| **Streams** | 4004 | WebSocket | Real-time data streams |

The frontend proxies `/api/*` requests to the backend (except `/api/auth/*` which stays in Next.js for Better Auth).

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS v4, Zustand, SWR
- **Backend:** Motia (iii engine), TypeScript step handlers
- **Database:** Supabase (PostgreSQL)
- **Auth:** Better Auth
- **Queue:** Redis (BullMQ via Motia)
- **Real-time:** Yjs, WebSocket streams
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
│   │   ├── steps/         # Motia steps (API, events, cron)
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
# Edit .env with your Supabase and Redis credentials

# Start all services
docker compose up -d
```

This starts 4 services:
- **Backend** (port 4000) — Motia API server with iii engine
- **Frontend** (port 4001) — Next.js app
- **Yjs** (port 4002) — Real-time collaboration server
- **Redis** — Queue, state, and stream backing store

You still need an external **Supabase** instance (hosted or self-hosted) for PostgreSQL and auth.

### Railway

See [`docs/RAILWAY-DEPLOYMENT.md`](docs/RAILWAY-DEPLOYMENT.md) for Railway-specific deployment instructions.

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
