import type { Metadata } from 'next'
import GuideLines from '@/components/GuideLines'
import ArrowIcon from '@/components/ArrowIcon'
import { withMarketingCanonical } from '@veritio/marketing-routes'

export const metadata: Metadata = withMarketingCanonical('/demos', {
  title: 'Participant demos | Veritio',
  description:
    'Try a real Veritio study as a participant and inspect a read-only sample results report.',
})

function verifiedPublicUrl(value: string | undefined, expectedPath: RegExp) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'veritio.io' || !expectedPath.test(url.pathname)) {
      return null
    }
    return url.toString()
  } catch {
    return null
  }
}

export default function DemosPage() {
  const participantUrl = verifiedPublicUrl(
    process.env.NEXT_PUBLIC_PARTICIPANT_DEMO_URL,
    /^\/s\/[A-Za-z0-9_-]+/,
  )
  const resultsUrl = verifiedPublicUrl(
    process.env.NEXT_PUBLIC_SAMPLE_RESULTS_URL,
    /^\/results\/public\/[A-Za-z0-9_-]+/,
  )
  const ready = Boolean(participantUrl && resultsUrl)

  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> PARTICIPANT DEMOS</div>
          <h1 className="page-title">Experience the participant side</h1>
          <p className="page-subtitle">
            Complete a real sample study, then inspect a separate read-only results report.
            These links do not provide anonymous access to the researcher dashboard.
          </p>
          {ready ? (
            <div className="security-actions">
              <a href={participantUrl!} className="security-button security-button-primary">
                Try the participant demo <ArrowIcon size={17} />
              </a>
              <a href={resultsUrl!} className="security-button security-button-secondary">
                View sample results
              </a>
            </div>
          ) : (
            <p className="security-note" role="status">
              Verified sample studies are being prepared. No placeholder dashboard is exposed.
            </p>
          )}
        </div>
      </section>

      <div className="page-body prose">
        <h2>What the samples show</h2>
        <ul>
          <li>The same participant flow used by a published Veritio study</li>
          <li>A read-only report shared through the public-results permission boundary</li>
          <li>No researcher account, editing access, or production customer data</li>
        </ul>
        <p>
          Demo responses must use synthetic content and a dedicated sample workspace. Release
          owners verify both links anonymously before enabling them here.
        </p>
      </div>
    </main>
  )
}
