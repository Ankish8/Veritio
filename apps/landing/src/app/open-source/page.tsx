import type { Metadata } from 'next'
import Link from 'next/link'
import GuideLines from '@/components/GuideLines'
import OpenSourceCtas from '@/components/OpenSourceCtas'
import {
  withMarketingCanonical,
} from '@veritio/marketing-routes'

export const metadata: Metadata = withMarketingCanonical('/open-source', {
  title: 'Open-source UX research platform | Veritio',
  description:
    'Run card sorts, tree tests, surveys, prototype tests, first-click tests, first-impression tests, and live website tests with an AGPL-3.0 platform you can inspect and self-host.',
})

export default function OpenSourcePage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> AGPL-3.0</div>
          <h1 className="page-title">UX research without vendor lock-in</h1>
          <p className="page-subtitle">
            Veritio brings seven research methods into one codebase you can inspect,
            modify, and operate on your own infrastructure.
          </p>
          <OpenSourceCtas path="/open-source" />
        </div>
      </section>

      <div className="page-body prose">
        <h2>What is included</h2>
        <p>
          The same repository contains the researcher dashboard, participant experience,
          iii backend steps, Yjs collaboration service, shared study packages, and the
          Cloudflare proxy used by live website tests.
        </p>
        <ul>
          <li>Card sorting, tree testing, surveys, prototype testing, first-click testing, first-impression testing, and live website testing</li>
          <li>Study building, publication, participant collection, analysis, REST API, and MCP access</li>
          <li>Docker Compose for the application services and documented external Supabase setup</li>
        </ul>

        <h2>Know the operating boundary</h2>
        <p>
          Self-hosting gives you control of the application and research data path, but it
          is not a zero-dependency appliance. Supabase is external. Live website tests need
          a separately deployed Cloudflare Worker. Email, AI, storage, transcription,
          translation, OAuth, billing, and integrations use credentials from your own
          provider accounts.
        </p>
        <p>
          Read the <Link href="/self-hosted">self-hosting requirements</Link> before choosing
          this route. Hosted Veritio is the managed option when you do not want to operate
          those services yourself.
        </p>

        <h2>License</h2>
        <p>
          Veritio is licensed under AGPL-3.0. Review the license before modifying or
          providing a network service based on the software. This page is a product
          overview, not legal advice.
        </p>
      </div>
    </main>
  )
}
