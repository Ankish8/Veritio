import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import GuideLines from '@/components/GuideLines'
import OpenSourceCtas from '@/components/OpenSourceCtas'
import {
  competitorComparisons,
  findCompetitorComparison,
  withMarketingCanonical,
} from '@veritio/marketing-routes'

export function generateStaticParams() {
  return competitorComparisons.map((comparison) => ({ competitor: comparison.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>
}): Promise<Metadata> {
  const comparison = findCompetitorComparison((await params).competitor)
  if (!comparison) return {}
  return withMarketingCanonical(`/compare/${comparison.slug}`, {
    title: `Veritio vs ${comparison.name} | Deployment and method comparison`,
    description: comparison.summary,
  })
}

export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ competitor: string }>
}) {
  const comparison = findCompetitorComparison((await params).competitor)
  if (!comparison) notFound()

  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> REVIEWED {comparison.reviewedAt}</div>
          <h1 className="page-title">Veritio and {comparison.name}</h1>
          <p className="page-subtitle">{comparison.summary}</p>
          <OpenSourceCtas path={`/compare/${comparison.slug}`} />
        </div>
      </section>

      <div className="page-body prose">
        <h2>What differs</h2>
        {comparison.rows.map((row) => (
          <section key={row.criterion}>
            <h3>{row.criterion}</h3>
            <p><strong>Veritio:</strong> {row.veritio}</p>
            <p><strong>{comparison.name}:</strong> {row.competitor}</p>
          </section>
        ))}

        <h2>How to choose</h2>
        <p>
          Choose on the operating model and research capabilities you actually need. Verify
          plan limits, procurement requirements, and current product behavior directly with
          each vendor before purchasing or migrating.
        </p>

        <h2>Sources</h2>
        <p>Competitor claims were reviewed against these first-party pages on {comparison.reviewedAt}:</p>
        <ul>
          {comparison.sources.map((source) => (
            <li key={source.url}><a href={source.url}>{source.label}</a></li>
          ))}
        </ul>
      </div>
    </main>
  )
}
