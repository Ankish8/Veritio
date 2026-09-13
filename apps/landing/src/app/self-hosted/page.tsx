import type { Metadata } from 'next'
import Link from 'next/link'
import GuideLines from '@/components/GuideLines'
import OpenSourceCtas from '@/components/OpenSourceCtas'
import {
  withMarketingCanonical,
} from '@veritio/marketing-routes'

export const metadata: Metadata = withMarketingCanonical('/self-hosted', {
  title: 'Self-host Veritio | Deployment requirements',
  description:
    'Understand Veritio self-hosting requirements, service boundaries, health checks, upgrades, backups, and optional provider integrations.',
})

export default function SelfHostedPage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> SELF-HOSTED</div>
          <h1 className="page-title">Operate your research stack on your terms</h1>
          <p className="page-subtitle">
            Deploy Veritio&apos;s application services on Linux, connect your own Supabase
            project, and keep control of the infrastructure that handles your studies.
          </p>
          <OpenSourceCtas path="/self-hosted" />
        </div>
      </section>

      <div className="page-body prose">
        <h2>Application topology</h2>
        <ul>
          <li>iii engine and backend steps for HTTP APIs, jobs, cron, and browser streams</li>
          <li>Next.js frontend for the dashboard, participant routes, authentication, REST API, and MCP</li>
          <li>Yjs WebSocket service for collaborative study editing</li>
          <li>Redis for iii state and streams, plus a persistent volume for the durable file queue</li>
        </ul>

        <h2>What you provide</h2>
        <p>
          A supported installation needs an external Supabase deployment for PostgreSQL,
          Storage, and realtime. Live website testing needs the repository&apos;s Cloudflare
          Worker deployed separately. Optional capabilities require your own provider
          credentials; they are not relayed through the hosted Veritio account.
        </p>

        <h2>Operational responsibilities</h2>
        <p>
          You are responsible for TLS, network isolation, secrets, database migrations,
          backups, object storage, monitoring, provider accounts, and timely security
          updates. The repository supplies distinct liveness and readiness contracts for
          the backend, frontend, Yjs service, Redis, queue persistence, browser stream
          listener, and live-test worker.
        </p>
        <p>
          The deployment guide and release notes are the source of truth. If you prefer a
          managed service, choose hosted Veritio; if infrastructure control is the goal,
          review the <Link href="/open-source">open-source edition</Link> and its AGPL-3.0 license.
        </p>
      </div>
    </main>
  )
}
