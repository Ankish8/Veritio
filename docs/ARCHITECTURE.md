# Architecture Guide

Comprehensive architectural patterns, conventions, and guidelines for the Veritio UX Research Platform.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Directory Structure](#directory-structure)
4. [Monorepo Packages](#monorepo-packages)
5. [System Architecture](#system-architecture)
6. [Backend Architecture (Motia)](#backend-architecture-motia)
7. [Frontend Architecture (Next.js)](#frontend-architecture-nextjs)
8. [Admin Panel](#admin-panel)
9. [Builder Save Strategy](#builder-save-strategy)
10. [Multi-Tenant Collaboration System](#multi-tenant-collaboration-system)
11. [Authentication & Authorization](#authentication--authorization)
12. [Data Layer](#data-layer)
13. [Services Layer](#services-layer)
14. [State Management](#state-management)
15. [Study Types](#study-types)
16. [Panel Management System](#panel-management-system)
17. [PDF Export Pipeline](#pdf-export-pipeline)
18. [Recording System](#recording-system)
19. [Real-time Collaboration (Yjs)](#real-time-collaboration-yjs)
20. [Analysis Algorithms](#analysis-algorithms)
21. [Performance Patterns](#performance-patterns)
22. [AI Assistant System](#ai-assistant-system)
23. [Third-Party Integrations](#third-party-integrations)

---

## Project Overview

**Stack:** Next.js 16 (App Router) + Motia Backend + Supabase + Zustand + SWR + Better Auth

**Study Types Supported:**
- Card Sort (open, closed, hybrid)
- Tree Test (hierarchical navigation)
- Survey (questionnaire with branching logic)
- Prototype Test (Figma prototype click testing)
- First-Click Test (single-click task analysis)
- First Impression (5-second test for initial reactions)
- Live Website Test (task-based testing on real websites via URL redirect or JS snippet)

**Architecture Pattern:** Split frontend/backend with event-driven processing

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Next.js (4001)    │────▶│   Motia (4000)      │────▶│   Supabase (DB)     │
│   - App Router      │     │   - API Steps       │     │   - PostgreSQL      │
│   - React/Zustand   │     │   - Event Steps     │     │   - Storage         │
│   - SWR             │     │   - Cron Steps      │     │   - Auth (session)  │
│   - Better Auth     │     │   - Streams         │     │                     │
└────────┬────────────┘     └─────────────────────┘     └─────────────────────┘
         │                            │
         │ WebSocket                  ▼
         ▼                  ┌─────────────────────┐
┌─────────────────────┐     │   Redis (BullMQ)    │
│   Yjs Server (4002) │     │   - Event Queue     │
│   - Doc sync (CRDT) │     │   - Rate Limiting   │
│   - Awareness       │     │   - Caching         │
└─────────────────────┘     └─────────────────────┘

┌─────────────────────┐
│ Landing Page (4003) │
│   - Standalone Vite │
└─────────────────────┘
```

---

## Technology Stack

### Core Frameworks
- **Frontend**: Next.js 16.x (App Router, Turbopack, SSR)
- **Backend**: Motia (Event-driven framework)
- **React**: 19.x (Concurrent features, Server Components)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Event Queue**: BullMQ + Redis

### State Management & Data
- **Zustand**: Client-side state (with `skipHydration: true` for SSR)
- **SWR**: Data fetching with caching
- **Zod**: Type-safe validation (v3 - use `.issues`, not `.errors`)

### UI & Styling
- **Tailwind CSS**: v4 (Utility-first styling)
- **Radix UI**: Headless components
- **Lucide React**: Icon library
- **Framer Motion**: Animations

### Data Visualization
- **Recharts**: Charts & graphs
- **D3**: Advanced visualizations
- **Heatmap.js**: Heatmap visualization

### Media & Recording
- **@vidstack/react**: Video playback
- **Wavesurfer.js**: Audio waveform
- **Puppeteer Core**: Headless browser for PDF
- **@ffmpeg/ffmpeg**: Video processing

### Cloud Services
- **AWS SDK S3**: Cloudflare R2 compatible
- **Deepgram SDK**: Speech-to-text
- **Better Auth**: Authentication
- **Resend**: Email delivery

---

## Directory Structure

```
src/
├── app/                              # Next.js App Router
│   ├── (admin)/                      # Superadmin panel (isolated layout)
│   │   └── admin/
│   │       ├── page.tsx              # Admin overview dashboard
│   │       ├── audit-log/            # Audit log viewer
│   │       ├── feature-flags/        # Feature flag management
│   │       ├── participants/         # All participants across orgs
│   │       ├── studies/              # All studies across orgs
│   │       ├── system-health/        # System monitoring (cost, performance)
│   │       └── usage/                # Usage analytics
│   ├── (auth)/                       # Auth routes (sign-in, sign-up, invite)
│   ├── (dashboard)/                  # Authenticated dashboard routes
│   │   ├── projects/[projectId]/studies/[studyId]/
│   │   │   ├── builder/              # Study builder page
│   │   │   │   └── hooks/save-strategies/  # Per-study-type save strategies
│   │   │   ├── preview/              # Preview page
│   │   │   ├── recruit/              # Participant recruitment page
│   │   │   └── results/              # Results/analysis page
│   │   ├── archive/                  # Archived studies
│   │   ├── demo/                     # Demo showcase
│   │   ├── monitoring/               # System monitoring dashboard
│   │   ├── panel/                    # Participant panel management
│   │   │   ├── participants/         # Panel participants + [id] detail
│   │   │   ├── segments/             # Panel segments + [id] detail
│   │   │   ├── incentives/           # Incentive management
│   │   │   ├── links/                # Recruitment links
│   │   │   └── widget/               # Embeddable recruitment widget
│   │   ├── settings/                 # User settings + team/[id]
│   │   └── studies/                  # All studies (flat view)
│   ├── (participant)/                # Participant-facing routes
│   │   └── s/[studyCode]/            # Study player + /complete
│   ├── (public)/                     # Public routes (no auth)
│   │   ├── results/public/[token]    # Public results sharing
│   │   ├── share/recording/[shareCode]
│   │   ├── widget-preview/           # Widget preview + multi-device
│   │   └── widget-test/              # Widget testing sandbox
│   ├── api/auth/                     # Better Auth API routes
│   ├── render/pdf/[studyId]/         # Server-rendered PDF pages
│   │   ├── correlation/              # Correlation matrix
│   │   ├── dendrogram/               # Cluster dendrogram
│   │   ├── nps/                      # NPS score
│   │   ├── pietree/[taskId]/         # Pie-tree visualization
│   │   ├── responses/[questionId]/   # Question responses
│   │   ├── results-matrix/           # Results matrix
│   │   ├── similarity-matrix/        # Similarity matrix
│   │   └── task-performance/         # Task performance
│   └── share/[token]/                # Direct share token route
│
├── components/
│   ├── builders/                     # Study builder components
│   │   ├── card-sort/                # Card sort builder
│   │   ├── first-click/              # First click builder
│   │   ├── first-impression/         # First impression builder
│   │   ├── live-website/             # Live website test builder (tasks-tab, snippet-tab, settings-panel)
│   │   ├── tree-test/                # Tree test builder
│   │   ├── panels/                   # Shared builder panels
│   │   ├── shared/                   # Shared builder components
│   │   └── save-status.tsx           # Save indicator
│   ├── players/                      # Participant player components
│   │   ├── card-sort/                # Card sort player
│   │   ├── first-click/              # First click player
│   │   ├── first-impression/         # First impression player
│   │   ├── live-website/             # Live website test player (task-instructions-screen, task-complete-screen)
│   │   ├── tree-test/                # Tree test player
│   │   └── shared/                   # Shared player components
│   ├── analysis/                     # Results analysis components
│   │   ├── card-sort/                # Card sort analysis
│   │   ├── first-click/              # First click analysis
│   │   ├── first-impression/         # First impression analysis
│   │   ├── prototype-test/           # Prototype test analysis
│   │   ├── survey/                   # Survey analysis
│   │   ├── tree-test/                # Tree test analysis
│   │   ├── recordings/               # Recording analysis
│   │   └── shared/                   # Shared analysis (click-maps, tagging, etc.)
│   ├── admin/                        # Superadmin panel components
│   │   ├── admin-guard.tsx           # Superadmin ID check guard
│   │   ├── admin-providers.tsx       # Admin context providers
│   │   ├── admin-sidebar.tsx         # Admin navigation sidebar
│   │   ├── shared/                   # Reusable admin UI (stat-card, filters-bar, data-table, etc.)
│   │   ├── system-health/            # System monitoring components
│   │   └── users/                    # User/org detail sheets
│   ├── ai-refine/                    # AI text refinement UI (ai-refine-button, ai-refine-popover-content)
│   ├── auth/                         # Auth-related components
│   ├── collaboration/                # Organization & member UI
│   ├── dashboard/                    # Dashboard components
│   ├── panel/                        # Panel management UI
│   ├── players/shared/               # Shared player infrastructure
│   ├── providers/                    # Context providers
│   ├── recruit/                      # Recruitment UI components
│   ├── settings/                     # Settings UI
│   ├── shared/                       # Cross-cutting shared components
│   ├── study-flow/                   # Survey builder/player
│   ├── study-tags/                   # Study tag management
│   ├── team-settings/                # Team settings UI
│   ├── ui/                           # shadcn/ui components
│   ├── validation/                   # Validation UI components
│   └── yjs/                          # Real-time collaboration
│
├── hooks/                            # 127+ custom hooks
│   ├── use-*.ts                      # Data & behavior hooks
│   ├── analysis/                     # Analysis-specific hooks
│   ├── card-sort/                    # Card sort hooks
│   └── panel/                        # Panel hooks
│
├── services/                         # Business logic layer
│   ├── assistant/shared-enrichment.ts # Shared context enrichment for AI assistant
│   ├── figma/                        # Modular Figma integration (9 modules)
│   ├── participant/                  # Participant services
│   │   ├── submissions/              # Type-specific submission handlers (incl. live-website.ts)
│   │   ├── session.ts                # Session management
│   │   ├── study-access.ts           # Access control
│   │   └── types.ts                  # Participant types
│   ├── snippet/
│   │   └── live-website-snippet.ts   # JS snippet generator for live website testing
│   ├── recording/                    # Recording services (5 modules)
│   ├── results/                      # Results aggregation (per-type overview + clicks)
│   ├── panel/                        # Panel management services (10 modules)
│   ├── pdf/                          # PDF generation pipeline
│   ├── media/                        # Media processing (export, probe)
│   ├── storage/                      # R2 client
│   ├── transcription/                # Deepgram speech-to-text
│   └── *-service.ts                  # 30+ feature services
│
├── stores/                           # Zustand stores
│   ├── collaboration-store.ts        # Org/member state
│   ├── study-builder/                # Builder stores (re-exports from packages, incl. live-website-builder.ts)
│   ├── study-flow-builder/           # Survey builder state
│   ├── study-flow-player/            # Player runtime state
│   ├── segment-store/                # Analysis segmentation
│   ├── survey-rules/                 # Survey rules state
│   ├── history-store.ts              # Undo/redo for builders
│   ├── recording-store.ts            # Recording UI state
│   ├── keyboard-shortcuts-store.ts   # Keyboard shortcuts
│   ├── tool-store.ts                 # Analysis tool state
│   ├── validation-highlight-store.ts # Builder validation highlights
│   └── video-editor-store.ts         # Video editor state
│
├── steps/                            # Motia API/Event/Cron steps
│   ├── api/                          # REST endpoints across 47+ domains
│   │   ├── admin/                    # Superadmin endpoints (overview, users, orgs, flags, audit)
│   │   ├── organizations/            # Org management
│   │   ├── invitations/              # Invitation handling
│   │   ├── projects/                 # Project CRUD
│   │   ├── studies/                  # Study CRUD
│   │   ├── prototype-test/           # Prototype test endpoints
│   │   ├── first-click/              # First click endpoints
│   │   ├── first-impression/         # First impression endpoints
│   │   ├── card-sort/                # Card sort endpoints
│   │   ├── tree-test/                # Tree test endpoints
│   │   ├── survey/                   # Survey endpoints
│   │   ├── recordings/               # Recording endpoints
│   │   ├── panel/                    # Panel management
│   │   ├── segments/                 # Segment CRUD
│   │   ├── analytics/                # Analytics endpoints
│   │   ├── ab-tests/                 # A/B test endpoints
│   │   ├── export/                   # Data export
│   │   ├── search/                   # Cross-study search
│   │   ├── widget/                   # Widget endpoints
│   │   ├── monitoring/               # System monitoring
│   │   └── ...                       # 26+ more domains
│   ├── events/                       # 26+ event handlers
│   │   └── admin/                    # Admin event handlers (audit log writer)
│   ├── cron/                         # 11 scheduled jobs
│   └── streams/                      # Real-time streams (assistant-chat, participant-activity)
│
├── lib/
│   ├── supabase/                     # DB types & helpers
│   ├── algorithms/                   # 22 analysis algorithms
│   ├── analytics/                    # Analytics utilities
│   ├── cache/                        # Memory + metrics cache
│   ├── crud-factory/                 # Generic CRUD generators
│   ├── d3/                           # D3 visualization helpers
│   ├── export/                       # Data export utilities
│   ├── keyboard-shortcuts/           # Shortcut definitions
│   ├── monitoring/                   # Performance monitoring
│   ├── observability/                # Request tracing
│   ├── pagination/                   # Pagination helpers
│   ├── redis/                        # Redis utilities
│   ├── scheduler/                    # Job scheduling
│   ├── segment-conditions/           # Segment condition logic
│   ├── segment-matching/             # Segment matching engine
│   ├── step-factory/                 # Motia step generators
│   ├── swr/                          # SWR configuration
│   ├── tiptap/                       # Rich text editor config
│   ├── validation/                   # Validation utilities
│   ├── video-editor/                 # Video editor utilities
│   ├── widget-templates/             # Widget template definitions
│   └── workers/                      # Web worker definitions
│
└── middlewares/                      # Motia step middlewares
    ├── auth.middleware.ts            # Authentication (x-user-id extraction)
    ├── permissions.middleware.ts     # RBAC factory (requireStudyEditor, etc.)
    ├── superadmin.middleware.ts      # Superadmin access check (hardcoded user ID)
    ├── error-handler.middleware.ts   # ZodError → 400, unhandled → 500
    ├── observability.middleware.ts   # Request tracing & logging
    ├── session-auth.middleware.ts    # Session-based auth alternative
    └── rate-limit/                   # Rate limiting (Redis + in-memory fallback)
```

---

## Monorepo Packages

The project uses Turborepo for monorepo management. Packages are located in `packages/@veritio/` and use `workspace:*` protocol.

### Package Overview

| Package | Purpose | Key Exports |
|---------|---------|-------------|
| **@veritio/core** | Core utilities and shared logic | Database helpers, factories, plugins, types |
| **@veritio/ui** | UI component library | Reusable UI components (shadcn/ui based), hooks, utils |
| **@veritio/auth** | Authentication utilities | Better Auth integration, session helpers, DB pool, fetch |
| **@veritio/swr-config** | SWR configuration | Preconfigured SWR hooks, fetchers, cache keys |
| **@veritio/study-types** | Shared type definitions | Study configuration types, study-flow types |
| **@veritio/dashboard-common** | Dashboard components | StatsRow, RecentStudiesTable, shared UI |
| **@veritio/study-flow** | Survey/questionnaire system | Survey builder, player, stores, hooks, types, defaults |
| **@veritio/card-sort** | Card sort study | Types, validation schemas, plugin |
| **@veritio/yjs** | Real-time collaboration | Yjs components, hooks, lib utilities |
| **@veritio/prototype-test** | Prototype testing (largest package) | Builder, player, analysis, algorithms, stores, 25+ hooks, i18n, services, shared components, Figma integration, branding provider |
| **@veritio/analysis-shared** | Analysis components & algorithms | Click maps, heatmaps, tagging, participant panels, floating action bar, visualization base, findability/lostness algorithms |

### Package Usage

```typescript
// Import from shared packages
import { Button } from '@veritio/ui'
import { useSession } from '@veritio/auth'
import { useSWRWithAuth } from '@veritio/swr-config'
import type { StudyConfig } from '@veritio/study-types'
```

---

## System Architecture

### Request Flow

```
Browser → Next.js Edge Middleware (trace ID, session check)
            │
            ├── HTTP/REST
            ↓
Motia Backend (localhost:4000)
    ├── API Steps (280+ endpoints across 47+ domains)
    │   ├── Auth Middleware (x-user-id extraction)
    │   ├── Permission Middleware (RBAC factory: requireStudyEditor, etc.)
    │   ├── Superadmin Middleware (admin panel access)
    │   ├── Rate Limit Middleware (token bucket, Redis-backed)
    │   ├── Error Handler Middleware (ZodError → 400)
    │   └── Observability Middleware (request tracing)
    │
    ├── Service Layer (business logic)
    │   └── Permission checks, validation, DB operations
    │
    ├── Event Steps (async processing)
    │   └── Background jobs via enqueue()
    │
    └── Cron Steps (scheduled tasks)

            ├── WebSocket
            ↓
Yjs Server (localhost:4002)
    └── Document sync, awareness (cursors, presence)
```

### Event-Driven Pattern

```typescript
// Step declares enqueues upfront (Motia v1: StepConfig + triggers)
export const config = {
  name: 'CreateStudy',
  triggers: [{
    type: 'http',
    path: '/api/studies',
    method: 'POST',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['study-created'],  // Must declare before enqueue()
  flows: ['studies'],
} satisfies StepConfig

// Handler enqueues events
export const handler = async (req: ApiRequest, { enqueue }: ApiHandlerContext) => {
  const study = await studyService.create(...)
  enqueue({ topic: 'study-created', data: { studyId: study.id } }).catch(() => {})
  return { status: 201, body: study }
}

// Event step subscribes via queue trigger
export const config = {
  name: 'InitializeStudyDefaults',
  triggers: [{ type: 'queue', topic: 'study-created' }],
  enqueues: [],
  flows: ['studies'],
} satisfies StepConfig
```

---

## Backend Architecture (Motia)

### Step Types

| Type | Purpose | Location | Count |
|------|---------|----------|-------|
| **API** | REST endpoints | `src/steps/api/` | 280+ steps across 47+ domains |
| **Event** | Async processing | `src/steps/events/` | 26+ |
| **Cron** | Scheduled jobs | `src/steps/cron/` | 11 |
| **Stream** | Real-time data | `src/steps/streams/` | 2 |

### API Step Domains

| Domain | Purpose |
|--------|---------|
| `admin/` | Superadmin: overview, users, orgs, studies, participants, feature flags, audit logs, usage stats |
| `organizations/` | Organization CRUD, member management |
| `invitations/` | Email & link invitations |
| `projects/` | Project CRUD |
| `studies/` | Study CRUD, duplication, status |
| `prototype-test/` | Prototype test frames, tasks, sync |
| `first-click/` | First click tasks, events |
| `first-impression/` | First impression designs, ratings |
| `live-website/` | Live website test tasks, snippet generation, event ingestion |
| `card-sort/` | Card sort cards, categories |
| `tree-test/` | Tree test nodes, tasks |
| `survey/` | Survey sections, questions |
| `survey-rules/` | Survey branching logic |
| `survey-sections/` | Section management |
| `flow-questions/` | Survey question CRUD |
| `flow-responses/` | Survey response handling |
| `recordings/` | Session recordings |
| `panel/` | Panel participant management |
| `segments/` | Participant segments |
| `analytics/` | Usage analytics |
| `ab-tests/` | A/B test experiments |
| `export/` | Data export (CSV, PDF) |
| `search/` | Cross-study search |
| `widget/` | Embeddable widget |
| `monitoring/` | System health monitoring |
| `comments/` | Study comments |
| `share-links/` | Public sharing |
| `favorites/` | User favorites |
| `study-tags/` | Study tagging |
| `knowledge/` | Knowledge base (articles) + AI Q&A (`/api/knowledge/help`) |
| `snippet/` | JS snippet verification and task fetching for live website testing |
| `results/` | Results aggregation |
| `responses/` | Response management |
| `tasks/` | Task management |
| `participate/` | Participant session creation |
| `public/` | Public API endpoints |
| `storage/` | File upload/download |
| `user/` | User profile |
| `integrations/` | Third-party integrations |
| `internal/` | Internal utilities |
| `question-notes/` | Question annotations |
| `section-notes/` | Section annotations |

### Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `auto-close-studies` | Periodic | Close studies past their deadline |
| `cleanup-abandoned-participants` | Periodic | Remove stale participant sessions |
| `cleanup-expired-resume-tokens` | Periodic | Remove expired resume tokens |
| `cleanup-inactive-recordings` | Periodic | Remove orphaned recordings |
| `cleanup-orphaned-storage` | Periodic | Remove unreferenced storage files |
| `cleanup-stale-recordings` | Periodic | Remove stale recording data |
| `cleanup-yjs-documents` | Periodic | Remove old Yjs documents |
| `create-partitions` | Periodic | Create table partitions |
| `keep-yjs-warm` | Periodic | Keep Yjs connections alive |
| `refresh-dashboard-stats` | Periodic | Recompute dashboard statistics |
| `archive-old-data` | Periodic | Archive old study data |

### Event Handlers

| Handler | Subscribes To | Purpose |
|---------|---------------|---------|
| `initialize-user-workspace` | User created | Create personal org |
| `initialize-project-defaults` | Project created | Set default settings |
| `initialize-study-defaults` | Study created | Set study defaults |
| `process-results-analysis` | Response submitted | Compute analytics |
| `handle-study-auto-close` | Study threshold reached | Auto-close study |
| `process-study-duplication` | Duplicate requested | Clone study data |
| `compress-recording` | Recording completed | Compress video |
| `process-transcription` | Recording ready | Generate transcript |
| `validate-response` | Response submitted | Validate submission |
| `track-participant-started` | Participant started | Log activity |
| `send-notification` | Various | Send notifications |
| `refresh-dashboard-stats` | Data changed | Update cached stats |
| `invalidate-metrics-cache` | Data changed | Clear stale metrics |
| `write-audit-log` | Admin actions | Record audit trail entries |
| ... | ... | 12 more handlers |

### API Step Pattern (Motia v1)

```typescript
import type { StepConfig } from 'motia'
import type { ApiRequest, ApiHandlerContext } from '@/lib/motia/types'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { requireStudyEditor } from '@/middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '@/middlewares/error-handler.middleware'

export const config = {
  name: 'GetStudy',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId',
    method: 'GET',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['studies'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.params

  const { data, error } = await studyService.getById(supabase, studyId, userId)
  if (error) return { status: 404, body: { error: 'Study not found' } }

  return { status: 200, body: data }
}
```

### Event Step Pattern (Motia v1)

```typescript
export const config = {
  name: 'ProcessResultsAnalysis',
  triggers: [{ type: 'queue', topic: 'response-submitted' }],
  enqueues: ['results-analytics-ready'],
  flows: ['studies'],
} satisfies StepConfig

export const handler = async (
  input: z.infer<typeof inputSchema>,
  { enqueue, logger }: EventHandlerContext
) => {
  const { studyId, responseId } = input
  await computeAnalytics(studyId)
  enqueue({ topic: 'results-analytics-ready', data: { studyId } }).catch(() => {})
}
```

### Cron Step Pattern (Motia v1)

```typescript
export const config = {
  name: 'AutoCloseStudies',
  triggers: [{ type: 'cron', expression: '0 */15 * * * * *' }],  // 7-field: sec min hr dom mon dow yr
  enqueues: [],
  flows: ['maintenance'],
} satisfies StepConfig

export const handler = async (_input: unknown, { logger }: EventHandlerContext) => {
  const studies = await findStudiesToClose()
  for (const study of studies) {
    await closeStudy(study.id)
  }
}
```

---

## Frontend Architecture (Next.js)

### Route Groups

| Group | Purpose | Auth Required |
|-------|---------|---------------|
| `(admin)` | Superadmin panel (users, orgs, flags, audit) | Yes (superadmin) |
| `(auth)` | Sign in/up, invite links | No |
| `(dashboard)` | Dashboard UI, builders, results | Yes |
| `(participant)` | Study players | No |
| `(public)` | Public results, recordings, widget preview | No |
| `render/` | Server-rendered PDF pages (Puppeteer) | Internal |
| `share/` | Direct share token access | No |

### Key Dashboard Routes

| Route | Purpose |
|-------|---------|
| `/` | Dashboard home |
| `/projects` | Project list |
| `/projects/[id]` | Project detail |
| `/projects/[id]/studies/[id]/builder` | Study builder |
| `/projects/[id]/studies/[id]/preview` | Study preview |
| `/projects/[id]/studies/[id]/recruit` | Participant recruitment |
| `/projects/[id]/studies/[id]/results` | Results analysis |
| `/studies` | All studies (flat view) |
| `/archive` | Archived studies |
| `/panel` | Panel dashboard |
| `/panel/participants` | Panel participants + detail |
| `/panel/segments` | Panel segments + detail |
| `/panel/incentives` | Incentive management |
| `/panel/links` | Recruitment links |
| `/panel/widget` | Embeddable widget config |
| `/settings` | User settings |
| `/settings/team/[id]` | Team settings |
| `/admin` | Superadmin overview dashboard |
| `/admin/audit-log` | Audit log viewer |
| `/admin/feature-flags` | Feature flag management |
| `/admin/participants` | All participants (cross-org) |
| `/admin/studies` | All studies (cross-org) |
| `/admin/system-health` | System health & cost monitoring |
| `/admin/usage` | Usage analytics |

### Data Fetching Strategy

```typescript
// SWR for data fetching with caching
import useSWR from 'swr'
import { fetcher } from '@/lib/fetcher'

export function useStudy(studyId: string) {
  const { data, error, mutate } = useSWR(
    studyId ? `/api/studies/${studyId}` : null,
    fetcher
  )
  return { study: data, isLoading: !error && !data, error, mutate }
}
```

### State Management (Zustand)

```typescript
// Always use skipHydration for SSR safety
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCollaborationStore = create(
  persist(
    (set) => ({
      currentOrganizationId: null,
      setCurrentOrganization: (id) => set({ currentOrganizationId: id }),
    }),
    {
      name: 'collaboration-store',
      skipHydration: true,  // REQUIRED for SSR
    }
  )
)
```

---

## Admin Panel

### Overview

The superadmin panel provides platform-wide visibility and management for a hardcoded superadmin user. It runs as a completely isolated route group `(admin)` with its own layout, sidebar, and guard.

### Access Control

- **Guard:** `AdminGuard` checks `userId === YewJvTQkiJ8WHf4onk3PwMX1zPj3PUMa` (hardcoded superadmin ID)
- **Middleware:** All admin API steps use `[authMiddleware, requireSuperadmin, errorHandlerMiddleware]`
- **Sidebar link:** Appears in dashboard sidebar footer, visible only to superadmin

### Architecture

```
Admin Panel (/admin)
    │
    ├── Overview Dashboard        # Signup charts, study counts by type, participant trends
    │
    ├── Users & Organizations     # Paginated user list, org detail sheets, analytics cards
    │   ├── User Detail Sheet     # AI message counts, study counts, last active
    │   └── Org Detail Sheet      # Member/study counts, creation date
    │
    ├── Studies                   # All studies across all orgs
    │
    ├── Participants              # All participants across all orgs
    │
    ├── Feature Flags             # CRUD for feature toggles (upsert/delete)
    │
    ├── Audit Log                 # Filterable action log (async write via event step)
    │
    ├── Usage Analytics           # Platform usage stats
    │
    └── System Health             # Cost tracking, storage breakdown, slow queries, table scans
```

### API Steps (`steps/api/admin/`)

| Step | Purpose |
|------|---------|
| `get-overview` | Dashboard stats (signups, study counts, participant trends) |
| `list-users` | Paginated user listing with org/study counts |
| `get-user-detail` | Individual user analytics |
| `get-users-page-stats` | Analytics cards for users page |
| `list-organizations` | Paginated org listing |
| `get-organization-detail` | Individual org details |
| `list-studies` | All studies across orgs |
| `list-participants` | All participants across orgs |
| `list-feature-flags` | Feature flag listing |
| `upsert-feature-flag` | Create/update feature flag |
| `delete-feature-flag` | Remove feature flag |
| `list-audit-logs` | Filterable audit log entries |
| `get-usage-stats` | Platform usage statistics |

### Services

| Service | Purpose |
|---------|---------|
| `admin-service.ts` | Overview stats, user/org listing, feature flags, usage stats |
| `audit-log-service.ts` | Audit entry writing and filtered retrieval |

### Event Handlers

| Handler | Topic | Purpose |
|---------|-------|---------|
| `write-audit-log` | `admin-audit-log` | Asynchronously records audit trail entries |

---

## Builder Save Strategy

### Overview

Each study type has a dedicated save strategy that handles serializing builder state to the backend. Save strategies are located in `src/app/(dashboard)/projects/[projectId]/studies/[studyId]/builder/hooks/save-strategies/`.

### Strategy Pattern

```
save-strategies/
├── index.ts                          # Strategy registry & factory
├── types.ts                          # SaveStrategy interface
├── save-utils.ts                     # Shared save utilities
├── pathway-sanitizer.ts              # Pathway data sanitization
├── card-sort-save-strategy.ts        # Card sort save logic
├── tree-test-save-strategy.ts        # Tree test save logic
├── survey-save-strategy.ts           # Survey save logic
├── prototype-test-save-strategy.ts   # Prototype test save logic
├── first-click-save-strategy.ts      # First click save logic
├── first-impression-save-strategy.ts # First impression save logic
└── live-website-save-strategy.ts     # Live website test save logic
```

Each strategy reads from its corresponding Zustand store, sanitizes the data (removing invalid enum values, normalizing formats), and submits to the API. The `use-builder-auto-save` hook triggers saves on a debounced interval, using dirty-tracking from the store to skip no-op saves.

### Retry Resilience

All save strategies use `authFetch` wrapped with `withRetry` (3 attempts, exponential backoff). The `throwOnServerError(response)` utility converts 5xx responses into thrown errors so `withRetry` actually retries transient failures.

---

## Multi-Tenant Collaboration System

### Overview

The platform supports multi-tenant workspaces with role-based access control (RBAC).

```
Organization (workspace)
    │
    ├── Members (users with roles)
    │
    └── Projects
            │
            └── Studies
                    │
                    └── Results, Comments, Share Links
```

### Role Hierarchy

| Role | Level | Capabilities |
|------|-------|--------------|
| **owner** | 4 | Full control, delete org, transfer ownership |
| **admin** | 3 | Manage members, all editor permissions |
| **editor** | 2 | Create/edit studies, view all projects |
| **viewer** | 1 | View-only access to shared resources |

### Permission Matrix

| Action | viewer | editor | admin | owner |
|--------|--------|--------|-------|-------|
| View studies | ✓ | ✓ | ✓ | ✓ |
| Create studies | | ✓ | ✓ | ✓ |
| Edit studies | | ✓ | ✓ | ✓ |
| Delete studies | | | ✓ | ✓ |
| Invite members | | | ✓ | ✓ |
| Manage roles | | | ✓ | ✓ |
| Delete organization | | | | ✓ |

### Database Tables

```
organizations
    │
    ├──< organization_members (user_id, role)
    │
    ├──< organization_invitations (email or link-based)
    │
    └──< projects (organization_id)
            │
            ├──< project_members (optional role override)
            │
            └──< studies
                    │
                    ├──< study_comments (threaded, mentions)
                    │
                    └──< study_share_links (public access)
```

### Organization Types

| Type | Description | Use Case |
|------|-------------|----------|
| `personal` | Single-user workspace | Individual researchers |
| `team` | Multi-user workspace | Research teams, agencies |

### Permission Resolution Flow

```typescript
// Permission is resolved in this order:
// 1. Project-level override (if exists)
// 2. Organization membership role
// 3. Public share link (view-only)

async function getEffectiveRole(userId: string, projectId: string) {
  // Check project-level override first
  const projectMember = await getProjectMember(userId, projectId)
  if (projectMember) return projectMember.role

  // Fall back to organization role
  const project = await getProject(projectId)
  const orgMember = await getOrgMember(userId, project.organization_id)
  return orgMember?.role || null
}
```

### Invitation System

**Email Invitations:**
```typescript
// Direct email invitation
await invitationService.createEmailInvitation({
  organizationId,
  email: 'user@example.com',
  role: 'editor',
  expiresInDays: 7,
})
```

**Link Invitations:**
```typescript
// Shareable invite link
const { invite_token } = await invitationService.createLinkInvitation({
  organizationId,
  role: 'viewer',
  maxUses: 10,  // null = unlimited
  expiresInDays: 30,
})
// URL: /invite/{invite_token}
```

### Collaboration Types

```typescript
// src/lib/supabase/collaboration-types.ts

// Role levels for comparison
const ROLE_LEVELS = { owner: 4, admin: 3, editor: 2, viewer: 1 }

// Permission flags calculated from role
interface PermissionFlags {
  canView: boolean      // viewer+
  canComment: boolean   // editor+
  canEdit: boolean      // editor+
  canManage: boolean    // admin+
  canDelete: boolean    // owner only
  canInvite: boolean    // admin+
}

// Helper function
function calculatePermissions(role: OrganizationRole): PermissionFlags
function hasRequiredRole(userRole: OrganizationRole, required: OrganizationRole): boolean
```

### Services

| Service | Purpose |
|---------|---------|
| `organization-service.ts` | CRUD operations for organizations |
| `permission-service.ts` | Permission checking & resolution |
| `invitation-service.ts` | Email & link invitation handling |
| `comments-service.ts` | Study comments with threading |
| `share-link-service.ts` | Public share link management |

---

## Authentication & Authorization

### Authentication Flow (Better Auth)

```
1. User signs in via /sign-in (email/password or OAuth)
2. Better Auth creates session token (cookie: better-auth.session_token)
3. Next.js middleware checks session on protected routes
4. Motia API receives x-user-id header from auth middleware
```

### Auth Middleware

```typescript
// src/middlewares/auth.middleware.ts

export const authMiddleware: MiddlewareFunction = async (req, next) => {
  // 1. Check x-user-id header (already authenticated)
  const userId = req.headers['x-user-id']
  if (userId) return next()

  // 2. Verify Bearer token against session table
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) {
    const session = await verifySession(token)
    if (session) {
      req.headers['x-user-id'] = session.userId
      return next()
    }
  }

  // 3. Reject unauthorized
  return { status: 401, body: { error: 'Unauthorized' } }
}
```

### Permission Middleware

The permission middleware uses factory functions that create middleware for specific resource levels. Results are cached for 30 seconds.

```typescript
// Factory functions create middleware for each resource level
// Usage in API step config:
middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware]

// Superadmin (src/middlewares/superadmin.middleware.ts):
requireSuperadmin               // Hardcoded superadmin user ID check

// Available factories (src/middlewares/permissions.middleware.ts):
requireOrgViewer(paramName)     // Organization viewer+
requireOrgEditor(paramName)     // Organization editor+
requireOrgAdmin(paramName)      // Organization admin+
requireOrgOwner(paramName)      // Organization owner only
requireProjectViewer(paramName) // Project viewer+
requireProjectEditor(paramName) // Project editor+
requireProjectAdmin(paramName)  // Project admin+
requireStudyViewer(paramName)   // Study viewer+
requireStudyEditor(paramName)   // Study editor+
requireStudyAdmin(paramName)    // Study admin+

// The paramName matches the URL param (e.g., ':studyId' → 'studyId')
// Extracts resource ID from req.params[paramName] or req.body[paramName]
```

### Rate Limiting Middleware

```typescript
// Per-endpoint rate limiting with Redis-backed token bucket
// Falls back to in-memory limiter if Redis unavailable
import { rateLimitMiddleware } from '../middlewares/rate-limit'

middleware: [rateLimitMiddleware({ maxRequests: 100, windowMs: 60000 })]
```

---

## Data Layer

### Supabase Types

```typescript
// Auto-generated types from Supabase
import { Database } from '@/lib/supabase/types'

type Study = Database['public']['Tables']['studies']['Row']
type StudyInsert = Database['public']['Tables']['studies']['Insert']
type StudyUpdate = Database['public']['Tables']['studies']['Update']
```

### JSON Column Casting

```typescript
// IMPORTANT: Cast JSON columns for type safety
const { data } = await supabase
  .from('studies')
  .select('*, settings')
  .single()

// Cast the JSON field
const settings = data.settings as unknown as CardSortSettings
```

### Key Tables

| Table | Purpose |
|-------|---------|
| `organizations` | Workspaces/teams |
| `organization_members` | User-org relationships |
| `organization_invitations` | Pending invitations |
| `projects` | Project containers |
| `project_members` | Project-level role overrides |
| `studies` | Study metadata |
| `participants` | Participant sessions |
| `cards`, `categories` | Card sort data |
| `card_sort_responses` | Card sort placements |
| `tree_nodes`, `tasks` | Tree test data (use `tree_nodes`, NOT `nodes`) |
| `survey_sections`, `survey_questions` | Survey structure |
| `survey_rules` | Survey branching logic |
| `prototype_test_prototypes` | Prototype test prototypes |
| `prototype_test_frames` | Prototype test frames |
| `prototype_test_tasks` | Prototype test tasks |
| `first_click_tasks`, `first_click_events` | First click data |
| `first_impression_designs`, `first_impression_ratings` | First impression data |
| `live_website_tasks`, `live_website_responses`, `live_website_events` | Live website test data |
| `recordings` | Session recordings |
| `study_comments` | Threaded comments |
| `study_share_links` | Public sharing |
| `panel_participants` | Panel participant profiles |
| `panel_segments` | Panel segment definitions |
| `panel_tags` | Panel tag definitions |

---

## Services Layer

### Service Pattern

```typescript
// All services return { data, error } tuple
export async function getStudyById(
  supabase: SupabaseClient,
  studyId: string,
  userId: string
): Promise<{ data: Study | null; error: Error | null }> {
  // Permission check
  const hasAccess = await permissionService.canViewStudy(userId, studyId)
  if (!hasAccess) {
    return { data: null, error: new Error('Access denied') }
  }

  // Database operation
  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()

  return { data, error }
}
```

### Core Services

| Service | Responsibility |
|---------|----------------|
| `study-service.ts` | Study CRUD, duplication |
| `project-service.ts` | Project CRUD |
| `organization-service.ts` | Organization management |
| `permission-service.ts` | RBAC permission resolution |
| `participant-service.ts` | Participant session management |
| `response-prevention-service.ts` | Duplicate response detection |
| `comments-service.ts` | Study comments with threading |
| `share-link-service.ts` | Public share link management |

### Study-Type Services

| Service | Responsibility |
|---------|----------------|
| `prototype-service.ts` | Prototype CRUD |
| `prototype-task-service.ts` | Prototype task management |
| `task-service.ts` | Generic task management |
| `card-service.ts` | Card sort card management |
| `category-service.ts` | Card sort category management |
| `tree-node-service.ts` | Tree test node management |
| `flow-question-service.ts` | Survey question CRUD |
| `survey-sections-service.ts` | Survey section CRUD |
| `survey-rules-service.ts` | Survey branching rules |
| `first-impression-service.ts` | First impression design management |
| `live-website-service.ts` | Live website test task CRUD |

### Platform Services

| Service | Responsibility |
|---------|----------------|
| `admin-service.ts` | Superadmin: overview, users, orgs, flags, usage |
| `audit-log-service.ts` | Audit log entry writing and retrieval |
| `analytics-service.ts` | Usage analytics |
| `ab-test-service.ts` | A/B test experiment management |
| `dashboard-service.ts` | Dashboard statistics |
| `email-service.ts` | Email delivery (Resend) |
| `favorite-service.ts` | User favorites |
| `knowledge-service.ts` | Knowledge base articles + RAG context selection for AI Q&A |
| `assistant/shared-enrichment.ts` | Shared context enrichment (org/study context injection) for AI assistant |
| `cross-study-search-service.ts` | Cross-study search |
| `segment-service.ts` | Participant segmentation |
| `study-tags-service.ts` | Study tagging |
| `user-service.ts` | User profile management |
| `user-preferences-service.ts` | User preference storage |
| `scheduler-service.ts` | Job scheduling |
| `health-service.ts` | System health checks |
| `performance-monitoring-service.ts` | Performance metrics |
| `cost-estimation-service.ts` | Study cost estimation |
| `link-analytics-service.ts` | Link click analytics |
| `question-note-service.ts` | Question annotations |
| `section-note-service.ts` | Section annotations |

### Results Services

Per-study-type results aggregation (`src/services/results/`):

| Service | Purpose |
|---------|---------|
| `base-results-service.ts` | Shared results logic |
| `card-sort.ts` / `card-sort-overview.ts` | Card sort results |
| `tree-test.ts` / `tree-test-overview.ts` | Tree test results |
| `survey.ts` / `survey-overview.ts` | Survey results |
| `prototype-test.ts` / `prototype-test-overview.ts` / `prototype-test-clicks.ts` | Prototype results |
| `first-click.ts` / `first-click-overview.ts` / `first-click-clicks.ts` | First click results |
| `first-impression.ts` / `first-impression-overview.ts` | First impression results |

### Panel Services

Panel management services (`src/services/panel/`):

| Service | Purpose |
|---------|---------|
| `participant-service.ts` | Panel participant CRUD |
| `segment-service.ts` | Panel segment management |
| `tag-service.ts` | Panel tag management |
| `tag-assignment-service.ts` | Tag-to-participant assignment |
| `incentive-service.ts` | Incentive management |
| `participation-service.ts` | Participation tracking |
| `widget-service.ts` | Widget configuration |
| `note-service.ts` | Participant notes |
| `study-completion-sync.ts` | Sync study completion to panel |

### Participant Services

```
src/services/participant/
├── index.ts             # Main participant operations
├── session.ts           # Session management
├── study-access.ts      # Participant access control
├── types.ts             # Participant type definitions
└── submissions/         # Type-specific submission handlers
    ├── card-sort.ts
    ├── tree-test.ts
    ├── survey.ts
    ├── prototype-test.ts
    ├── first-click.ts
    ├── first-impression.ts
    ├── verification.ts
    └── index.ts
```

### PDF Services

PDF export pipeline (`src/services/pdf/`):

| Module | Purpose |
|--------|---------|
| `puppeteer-capture.ts` | Headless browser screenshot capture |
| `pdf-assembler.ts` | Assemble screenshots into PDF |
| `render-token.ts` | Secure render token generation |
| `types.ts` | PDF pipeline types |

### Media Services

Media processing (`src/services/media/`):

| Module | Purpose |
|--------|---------|
| `export-service.ts` | Media export (video, audio) |
| `probe-service.ts` | Media probing (duration, dimensions) |

---

## State Management

### Store Organization

**App-level stores** (`apps/veritio/src/stores/`):

| Store | Purpose |
|-------|---------|
| `collaboration-store.ts` | Current org, member selection |
| `study-builder/*.ts` | Builder UI state (re-exports from package) |
| `study-meta-store.ts` | Study metadata state |
| `recording-store.ts` | Recording UI state |
| `segment-store/` | Analysis segmentation (directory with selectors) |
| `survey-rules/` | Survey rules state (directory with hooks, API client) |
| `survey-rules-store.ts` | Survey rules state |
| `survey-rules-ui-store.ts` | Survey rules UI state |
| `survey-sections-ui-store.ts` | Survey sections UI state |
| `history-store.ts` | Undo/redo for builders |
| `keyboard-shortcuts-store.ts` | Keyboard shortcut bindings |
| `tool-store.ts` | Analysis tool selection state |
| `validation-highlight-store.ts` | Builder validation highlight state |
| `video-editor-store.ts` | Video editor state |
| `timeline-store.ts` | Recording timeline state |
| `first-click-library.ts` | First click image library |

**Package-level stores** (`packages/@veritio/prototype-test/src/stores/`):

| Store | Purpose |
|-------|---------|
| `factory/` | Builder store factory (creates typed stores with post-task question support) |
| `prototype-test-builder.ts` | Prototype test builder state |
| `card-sort-builder.ts` | Card sort builder state |
| `tree-test-builder.ts` | Tree test builder state |
| `first-click-builder.ts` | First click builder state |
| `first-impression-builder.ts` | First impression builder state |
| `study-flow-builder/` | Survey builder state (with demographic actions, question actions) |
| `study-flow-player/` | Player runtime state (navigation, rules engine, progressive reveal) |
| `study-meta-store.ts` | Study metadata state |
| `segment-store.tsx` | Segmentation state |

### Builder Store Factory

The builder store factory (`packages/@veritio/prototype-test/src/stores/factory/`) provides a typed `createBuilderStore()` that generates Zustand stores with shared capabilities (dirty tracking, post-task questions mixin, save/load).

### Store Re-Export Pattern (Critical)

**IMPORTANT:** When a store is defined in a `@veritio/*` package, the app MUST re-export from the package — not create its own store. Two `createBuilderStore()` calls with the same name create **separate in-memory instances**, causing UI to write to one and save to read from the other (silent data loss).

```typescript
// apps/veritio/src/stores/study-builder/prototype-test-builder.ts
// CORRECT: Re-export from package
export { usePrototypeTestBuilderStore } from '@veritio/prototype-test/stores'

// WRONG: Creates a duplicate store instance
// export const usePrototypeTestBuilderStore = createBuilderStore(...)
```

**Current status:** All builder stores are FIXED — app files are pure re-exports from packages:
- `prototype-test-builder`, `study-flow-builder`, `card-sort-builder`, `tree-test-builder`, `first-click-builder`, `first-impression-builder`, `study-meta-store` — All use re-export pattern
- `live-website-builder` — App-only (uses package factory but no package counterpart, single instantiation)

### SSR Safety

```typescript
// ALWAYS use skipHydration for Zustand with persist
export const useStore = create(
  persist(
    (set) => ({ ... }),
    {
      name: 'store-name',
      skipHydration: true,  // REQUIRED
    }
  )
)
```

---

## Study Types

### Card Sort

- **Modes:** open, closed, hybrid
- **Tables:** `cards`, `categories`, `card_sort_responses`
- **Response:** `card_placements` (cardId → categoryId mapping)
- **Analysis:** Similarity matrix, dendrograms, PCA

### Tree Test

- **Table:** `tree_nodes` (NOT `nodes`), `tasks`
- **Response:** Path taken, selected node, correctness
- **Analysis:** Success rate, directness, lostness, findability

### Survey

- **Tables:** `survey_sections`, `survey_questions`, `survey_rules`, `insights`, `evidence`
- **Features:** Branching logic, piping, display logic, evidence marking, insight management
- **Question Types:** Multiple choice, open text, rating scale, semantic differential, constant sum, matrix, ranking
- **Analysis:** Cross-tabulation, correlations, semantic differential analysis, constant sum analysis, evidence-to-insight linking

### Prototype Test

- **Tables:** `prototype_test_prototypes`, `prototype_test_frames`, `prototype_test_tasks`
- **Integration:** Figma import (OAuth, frame extraction, library component detection)
- **Analysis:** Click paths, heatmaps, success funnels, path matching, advanced metrics

**Package structure** (`packages/@veritio/prototype-test/src/`):

```
├── builder/                          # Builder UI components
│   ├── pathway-builder-modal.tsx     # Multi-step pathway builder (Figma embed)
│   ├── hooks/                        # Builder-specific hooks
│   │   └── use-pathway-builder-state.ts  # Unified builder state (1500+ lines)
│   ├── panels/                       # Settings panels (Figma account, options, etc.)
│   ├── shared/                       # Shared builder components (settings, post-task questions)
│   ├── tabs/                         # Builder tab components (prototype, tasks)
│   ├── task-list.tsx                 # Task list management
│   ├── task-item.tsx                 # Individual task display
│   ├── composite-thumbnail.tsx       # Multi-frame composite thumbnails
│   └── path-management-modal.tsx     # Path management UI
│
├── player/                           # Participant player
│   ├── prototype-test-player.tsx     # Main player component
│   ├── components/                   # Player sub-components
│   │   ├── figma-embed.tsx           # Figma embed with postMessage bridge
│   │   ├── figma-preloader.tsx       # Iframe preloading
│   │   ├── task-panel.tsx            # Task instruction panel
│   │   ├── task-overlay.tsx          # Click target overlay
│   │   └── success-modal.tsx         # Task completion modal
│   ├── hooks/                        # Player hooks
│   │   ├── use-figma-frame-mapping.ts
│   │   └── use-prototype-task-tracking.ts
│   └── utils/                        # Player utilities
│       ├── check-task-success.ts     # Unified success criteria checking
│       └── scale-mode.ts             # Responsive scaling
│
├── algorithms/                       # Analysis algorithms
│   ├── path-matching.ts              # Click path similarity & matching
│   ├── prototype-test-analysis.ts    # Task-level analysis computations
│   ├── advanced-metrics.ts           # Advanced statistical metrics
│   └── statistics.ts                 # Base statistical functions
│
├── stores/                           # Zustand stores (see State Management)
├── hooks/                            # 25+ shared hooks
│   ├── use-prototype-controls.ts     # Prototype playback controls
│   ├── use-figma-connection.ts       # Figma embed communication
│   ├── use-yjs-flow-sync.ts         # Yjs collaboration sync
│   ├── use-yjs-tree-sync.ts         # Yjs tree data sync
│   ├── use-advanced-metrics.ts       # Analysis metrics hook
│   └── ...                           # Sessions, participants, results, etc.
│
└── lib/
    ├── constants/figma.ts            # FIGMA_ORIGIN and embed constants
    ├── utils/pathway-migration.ts    # V1→V2→V3 pathway format migration
    └── figma-frame-matching.ts       # Frame ID resolution
```

### First Click

- **Tables:** `first_click_tasks`, `first_click_events`
- **Analysis:** First click accuracy, element popularity

### First Impression

- **Tables:** `first_impression_designs`, `first_impression_ratings`
- **Analysis:** Initial reaction scores, sentiment

### Live Website Test

- **Tables:** `live_website_tasks`, `live_website_responses`, `live_website_events`
- **Modes:** `url_only` (redirect to target URL) or `snippet` (JS snippet injected into researcher's site)
- **Success Criteria:** `self_reported` or `url_match` (auto-detected by snippet)
- **Snippet System:** Self-contained JS snippet creates a Shadow DOM task widget, captures DOM events (clicks, scrolls, rage clicks, errors, SPA navigation), batches and sends to `/api/snippet/*` and `/api/live-website/ingest-events`
- **Components:**
  - Builder: `components/builders/live-website/` (tasks-tab, snippet-tab, settings-panel)
  - Player: `components/players/live-website/` (task-instructions-screen, task-complete-screen, live-website-player)
  - Store: `stores/study-builder/live-website-builder.ts`
  - Service: `services/live-website-service.ts`, `services/snippet/live-website-snippet.ts`
  - API Steps: `steps/api/live-website/` (get-tasks, update-tasks, generate-snippet, serve-snippet, ingest-events)
  - Public snippet API: `steps/api/snippet/` (verify-snippet, get-snippet-tasks)
- **Doc:** `docs/LIVE_WEBSITE_TESTING.md`

---

## Panel Management System

### Overview

The panel system manages a persistent participant database for recruiting across studies. Participants can be tagged, segmented, and tracked across multiple study participations.

### Architecture

```
Panel Dashboard (/panel)
    │
    ├── Participants           # Participant profiles with demographics
    │   ├── Tags               # Custom tag assignment
    │   ├── Notes              # Researcher annotations
    │   └── Participation      # Cross-study participation history
    │
    ├── Segments               # Dynamic participant segments
    │   └── Conditions         # Rule-based segment matching
    │
    ├── Incentives             # Incentive tracking
    │
    ├── Links                  # Recruitment link management
    │
    └── Widget                 # Embeddable recruitment widget
        └── Templates          # Configurable widget templates
```

### Services

See [Panel Services](#panel-services) in the Services Layer section.

### Widget Embed System

The widget system allows embedding a recruitment widget on external sites:
- Widget configuration via `/panel/widget`
- Preview at `/widget-preview` (single + multi-device)
- Testing sandbox at `/widget-test`
- Server-side template rendering via `src/lib/widget-templates/`

---

## PDF Export Pipeline

### Overview

The platform generates PDF reports from analysis views using a server-rendered capture pipeline.

### Architecture

```
Export Request
    │
    ├── Generate secure render token
    │
    ├── Puppeteer navigates to /render/pdf/[studyId]/[type]
    │   └── Server renders full-page chart/visualization
    │
    ├── Screenshot capture (PNG)
    │
    └── PDF assembly (multi-page)
```

### Render Pages

Each chart type has a dedicated server-rendered page at `src/app/render/pdf/[studyId]/`:

| Page | Visualization |
|------|---------------|
| `correlation/` | Correlation matrix |
| `dendrogram/` | Cluster dendrogram |
| `nps/` | NPS score display |
| `pietree/[taskId]/` | Pie-tree task visualization |
| `responses/[questionId]/` | Question response distribution |
| `results-matrix/` | Full results matrix |
| `similarity-matrix/` | Card sort similarity matrix |
| `task-performance/` | Task performance summary |

### Shared Analysis Package (`@veritio/analysis-shared`)

This package contains reusable analysis components shared across all study types:

| Component Area | Purpose |
|----------------|---------|
| `click-maps/` | Heatmap renderer, grid renderer, click filter controls, settings panels |
| `floating-action-bar/` | Context-sensitive toolbar with keyboard shortcuts, mobile panel support |
| `tagging/` | Tag badge, dropdown, manager modal, color picker, bulk tag toolbar |
| `participants-tab-container/` | Shared participant filtering and status configs |
| `participant-detail-panel/` | Participant detail with response renderers |
| `participants-grid.tsx` | Grid view for participant display |
| `participants-list-base.tsx` | List view for participant display |
| `visualization-base/` | Visualization table, progress cell, response aggregation |
| `analysis-table.tsx` | Shared analysis data table |
| `findability-badge.tsx` / `findability-gauge.tsx` | Tree test findability display |
| `lostness-indicator.tsx` | Tree test lostness display |
| `downloads-tab-base.tsx` | Base for download/export tabs |
| `pdf-export-dialog.tsx` | PDF export configuration dialog |
| `lib/algorithms/` | Findability score, lostness score, statistics |
| `lib/analytics/` | Coordinate normalization, heatmap export/presets |

---

## Recording System

### Architecture

```
Recording Capture (Browser)
    │
    ├── MediaRecorder API → Chunks
    │
    ├── DOM Events → Recording events
    │
    └── Deepgram → Live transcription

Chunk Upload → R2 Storage → Playback
```

### Services

| Service | Purpose |
|---------|---------|
| `recording/index.ts` | Core recording operations |
| `recording-clip-service.ts` | Clip creation/management |
| `recording-comment-service.ts` | Recording annotations |
| `recording-share-service.ts` | Public share links |
| `recording-export-service.ts` | Export transcripts |

---

## Real-time Collaboration (Yjs)

### Overview

Yjs provides CRDT-based real-time collaboration for concurrent editing. The Yjs infrastructure is in the `@veritio/yjs` package.

### Components

```typescript
// Collaborative text editing
import { CollaborativeEditor } from '@/components/yjs/collaborative-editor'
import { CollaborativeInput } from '@/components/yjs/collaborative-input'
import { CollaborativeTextarea } from '@/components/yjs/collaborative-textarea'

// Usage
<CollaborativeEditor
  ydoc={doc}
  field="description"
  placeholder="Enter description..."
/>
```

### Hooks

Yjs hooks have been consolidated into the `@veritio/prototype-test` package:

```typescript
// Flow-level sync (survey sections, questions)
import { useYjsFlowSync } from '@veritio/prototype-test/hooks'

// Tree-level sync (tree test nodes)
import { useYjsTreeSync } from '@veritio/prototype-test/hooks'
```

### Yjs WebSocket Server

A dedicated Yjs WebSocket server runs on port 4002, handling document synchronization and awareness (cursor positions, user presence).

---

## Analysis Algorithms

### Locations

Algorithms are split across the app and shared packages:

- `src/lib/algorithms/` — 22 app-level algorithms
- `packages/@veritio/analysis-shared/src/lib/algorithms/` — Shared algorithms (findability, lostness, statistics)
- `packages/@veritio/prototype-test/src/algorithms/` — Prototype-specific algorithms (path matching, advanced metrics)

### Key Algorithms

| Algorithm | Location | Purpose |
|-----------|----------|---------|
| Similarity Matrix | `src/lib/algorithms/` | Card sort card similarity |
| Hierarchical Clustering | `src/lib/algorithms/` | Dendrograms (average/ward) |
| Cross-tabulation | `src/lib/algorithms/` | Survey response analysis |
| PCA Analysis | `src/lib/algorithms/` | Principal component analysis |
| Correlation Statistics | `src/lib/algorithms/` | Statistical correlations |
| Statistical Significance | `src/lib/algorithms/` | P-values, confidence intervals |
| Click Clustering | `src/lib/algorithms/` | First click cluster detection |
| Spatial Statistics | `src/lib/algorithms/` | Spatial distribution analysis |
| Element Recognition | `src/lib/algorithms/` | UI element detection from clicks |
| Participant Flagging | `src/lib/algorithms/` | Flag suspicious participant behavior |
| A/B Test Analysis | `src/lib/algorithms/` | A/B test statistical analysis |
| First Impression Score | `src/lib/algorithms/` | First impression rating analysis |
| First Impression Flagging | `src/lib/algorithms/` | Flag first impression outliers |
| Tree Test Analysis | `src/lib/algorithms/` | Tree test path analysis |
| Category Standardization | `src/lib/algorithms/` | Card sort category normalization |
| Findability Score | `@veritio/analysis-shared` | Tree test item discoverability |
| Lostness Score | `@veritio/analysis-shared` | Navigation inefficiency |
| Path Matching | `@veritio/prototype-test` | Click path similarity & matching |
| Advanced Metrics | `@veritio/prototype-test` | Prototype test statistical analysis |
| Prototype Analysis | `@veritio/prototype-test` | Task-level analysis computations |

### Clustering Methods

| Method | Best For |
|--------|----------|
| `average` (UPGMA) | Large datasets (≥30 participants) |
| `ward` (BMM) | Small datasets (<30 participants) |

---

## Performance Patterns

### List Memoization

```typescript
// Wrap list items with memo()
import { memo } from 'react'

export const ParticipantRow = memo(function ParticipantRow({ participant }) {
  return <TableRow>...</TableRow>
})
```

### Virtualization

```typescript
// Use for 100+ items
import { useVirtualList, VIRTUAL_LIST_PRESETS } from '@/hooks'

const { parentRef, virtualItems, totalSize } = useVirtualList({
  items,
  ...VIRTUAL_LIST_PRESETS.tableRow,
})
```

### Lazy Loading

```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic'

const LazyChart = dynamic(
  () => import('@/components/analysis/chart'),
  { loading: () => <Skeleton /> }
)
```

---

## AI Assistant System

### Overview

The AI assistant is a streaming chat system powered by OpenAI that operates across dashboard, builder, and analysis contexts.

### Architecture

```
Frontend (use-assistant-chat.ts / SSE stream)
    │
    ├── POST /api/assistant/chat       → chat.step.ts (main entry point)
    │   ├── Tool executor              → services/assistant/tool-executor.ts
    │   │   ├── Study tools            → study-tools.ts
    │   │   ├── Builder write tools    → builder-write-tools.ts
    │   │   ├── Dashboard tools        → dashboard-tools.ts
    │   │   └── Composio tools         → composio execution
    │   └── Shared enrichment          → shared-enrichment.ts
    │
    ├── POST /api/assistant/refine-text → Single-turn text refinement (simplify, improve_clarity, expand, etc.)
    │
    └── POST /api/knowledge/help       → RAG Q&A using knowledge base articles as context
```

### Key Services (`src/services/assistant/`)

| Service | Purpose |
|---------|---------|
| `builder-tools.ts` | Read-only builder query tools |
| `builder-write-tools.ts` | Write tools (add/update/replace questions, tasks, etc.) with LLM output normalization |
| `dashboard-tools.ts` | Dashboard-level tools (list studies, create study, etc.) |
| `study-tools.ts` | Study metadata and participant tools |
| `project-tools.ts` | Project-level tools |
| `create-tool-definitions.ts` | Tool schema definitions sent to the LLM |
| `create-tools.ts` | Tool factory (Composio + study tools combined) |
| `tool-executor.ts` | Routes tool calls to correct handler (study tools vs Composio) |
| `pending-events-service.ts` | Async event queue for non-blocking notifications |
| `rate-limit.ts` | Per-user rate limiting for assistant messages |
| `system-prompt.ts` | Dynamic system prompt construction |
| `shared-enrichment.ts` | Shared org/study context injection |

### AI Refine Text

Single-turn LLM endpoint for in-place text improvement in builder rich-text editors.

- **Endpoint:** `POST /api/assistant/refine-text`
- **Actions:** `simplify`, `improve_clarity`, `make_concise`, `expand`, `fix_grammar`
- **Format:** `html` or `plain`
- **UI:** `components/ai-refine/` (ai-refine-button, ai-refine-popover-content)
- **Hook:** `hooks/use-refine-text.ts`

### Knowledge Base Q&A

RAG-based Q&A that streams an answer using knowledge articles as context.

- **Endpoint:** `POST /api/knowledge/help`
- **Input:** `question` + optional `context` description
- **RAG:** `selectContextArticles()` in `knowledge-service.ts` selects relevant articles
- **Hook:** `hooks/use-knowledge-qa.ts`

### Composio Integration

See [Third-Party Integrations → Composio](#composio) for the full Composio integration details.

---

## Third-Party Integrations

### Composio

The Composio integration (`@composio/core@0.6.3`) provides access to 200+ external tools (Google Sheets, Slack, Notion, etc.) that the AI assistant can execute.

**Key patterns:**
- `services/composio/` — Client initialization, auth, caching, triggers, types
- OAuth flow: `client.create(userId)` → `session.authorize(toolkit, {callbackUrl})` → `connectionRequest.redirectUrl`
- Tool execution: `tools.execute()` returns `{ data, error, successful, logId }` — unwrap `.data`
- Toolkit version: read from `getRawComposioTools()[0].version` (NOT toolkit metadata)
- Triggers: register via `steps/api/integrations/composio/` endpoints; webhook delivery requires `COMPOSIO_WEBHOOK_URL` env var in production

### Figma

The Figma service was modularized into focused modules (`src/services/figma/`):

| Module | Purpose |
|--------|---------|
| `api.ts` | REST API client (file data, images, component sets) |
| `frames.ts` | Frame import, extraction, and dimension processing |
| `components.ts` | Library component detection and variant export |
| `sync.ts` | Full prototype sync orchestration (frames + overlays) |
| `embed.ts` | Embed URL generation for iframe previews |
| `storage.ts` | Image download from Figma, PNG parse, upload to R2 |
| `graph.ts` | Frame graph traversal for connection mapping |
| `figma-oauth.ts` | OAuth token exchange and refresh |
| `types.ts` | Shared Figma type definitions |

**Figma Embed API:** Uses `postMessage` with origin `https://www.figma.com`. Events: `INITIAL_LOAD`, `PRESENTED_NODE_CHANGED`, `NEW_STATE`, `MOUSE_PRESS_OR_RELEASE`.

### Deepgram

- **Client:** `src/services/transcription/deepgram-client.ts`
- **Use:** Live speech-to-text for recordings

### Cloudflare R2

- **Client:** `src/services/storage/r2-client.ts`
- **Use:** Recording chunk storage, media assets

### Resend

- **Service:** `src/services/email-service.ts`
- **Use:** Email notifications, invitations

---

## Development Commands

| Command | Purpose |
|---------|---------|
| `cd apps/veritio && ./scripts/dev.sh` | **Start all 4 servers** (Motia, Next.js, Yjs, Landing Page) |
| `bun run dev:motia` | Backend only (Motia on port 4000) |
| `bun run dev:next` | Frontend only (Next.js on port 4001) |
| `bun test path/to/file.test.ts` | Run single test file |
| `bun run test:vitest -t "pattern"` | Run tests matching pattern |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run type-check` | TypeScript check without emitting |
| `bun run storybook` | UI component development (port 6006) |

**Ports:**
- Backend (Motia): 4000
- Frontend (Veritio): 4001
- Yjs WebSocket: 4002
- Landing Page: 4003

**Routing:** `/api/*` → Backend (4000), except `/api/auth/*` → Next.js (Better Auth)

---

## Critical Rules

1. **Steps:** Export `config` (declare `enqueues` before calling `enqueue()`) + `handler`. Use `satisfies StepConfig` with `triggers` array.
2. **Zustand:** Add `skipHydration: true` for SSR
3. **Supabase JSON:** Cast with `as unknown as Type[]`
4. **Zod v3:** Use `.issues`, not `.errors`
5. **Tree Test:** Use `tree_nodes` table, NOT `nodes`
6. **Fire-and-forget:** Use `enqueue({...}).catch(() => {})` for low-frequency handlers. Use `await enqueue({...}).catch(() => {})` for high-frequency save handlers to prevent EPIPE cascade.
7. **Player branding:** No `text-stone-*`, `bg-stone-*`, or hex colors - use CSS vars (`var(--style-text-primary)`, `var(--brand)`)
8. **Permissions:** Use middleware factories (`requireStudyEditor('studyId')`, etc.) — always include in API step middleware chain
9. **Shared Packages:** Import from `@veritio/*` packages for shared utilities, types, and components (avoid duplication)
10. **Store Re-Export:** When a Zustand store lives in a `@veritio/*` package, the app MUST re-export it — never create a duplicate `createBuilderStore()` call
11. **Motia ESM Imports:** Use explicit `from '../services/figma/index'` for directory imports (Motia compiler appends `.js`)
12. **Logging:** Use `logger` from context (not `console`). Log with context: `logger.info('message', { data })`
13. **Middleware Chain:** API steps use `[authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware]`. Admin steps use `[authMiddleware, requireSuperadmin, errorHandlerMiddleware]`.
14. **Three-layer enum validation:** When adding new enum values, check ALL THREE layers: TypeScript types, ALL Zod schemas (frontend sanitization + API validation), AND database constraints (CHECK constraints, foreign keys).
15. **Stale state in persistent components:** When a component stays mounted but has "session" semantics (opens/closes), ALL `useState` values must be reset in the "open" effect. `useState(initial)` only runs on mount.
16. **Stale closure pattern:** When a callback calls `setState` then immediately calls another callback that reads that state, the second callback sees stale data. Use a ref mirror (`useRef`) updated synchronously.
17. **Supabase `.in()` guard:** Never call `.in('id', [])` with an empty array — it generates an invalid PostgREST query. Always guard with `array.length > 0`.
18. **Tailwind v4 — no `prose` classes:** `@tailwindcss/typography` is NOT installed. Use `[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc` instead of `prose` classes.
19. **No parallel state arrays:** Never use multiple parallel arrays for related state. Use a single unified type array. Derive old views via `useMemo` during migration.

---

## Extended Documentation

For more detailed documentation, see:

- `DATABASE.md` — Full database schema reference
- `COMPONENTS.md` — UI component inventory
- `docs/STATE_MANAGEMENT_GUIDE.md` — Zustand store patterns and state management
- `docs/TESTING_GUIDE.md` — Testing patterns and conventions
- `docs/CARD_SORT_DEPENDENCIES.md` — Card sort dependency analysis
- `docs/SUPABASE_OPTIMIZATION.md` — Database query optimization
- `docs/BASE_RESULTS_SERVICE_GUIDE.md` — Results service base class guide
- `docs/CACHE_ORCHESTRATOR_GUIDE.md` — Cache orchestration patterns
- `docs/MONITORING_DASHBOARD_GUIDE.md` — Monitoring dashboard setup
- `docs/V3-PATHWAY-DETECTION.md` — V3 pathway format specification
- `docs/LIVE_WEBSITE_TESTING.md` — Live website test architecture and snippet system
- `.cursor/rules/motia/*.mdc` — Detailed Motia step guides
