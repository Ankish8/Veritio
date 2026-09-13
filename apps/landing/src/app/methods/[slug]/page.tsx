import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import GuideLines from '@/components/GuideLines'
import OpenSourceCtas from '@/components/OpenSourceCtas'
import {
  findResearchMethod,
  researchMethodFeatureMatrix,
  withMarketingCanonical,
} from '@veritio/marketing-routes'

export function generateStaticParams() {
  return researchMethodFeatureMatrix.map((method) => ({ slug: method.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const method = findResearchMethod(slug)
  if (!method) return {}

  return withMarketingCanonical(`/methods/${method.slug}`, {
    title: `${method.name} tool | Veritio`,
    description: method.shortDescription,
  })
}

export default async function ResearchMethodPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const method = findResearchMethod(slug)
  if (!method) notFound()

  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> RESEARCH METHOD</div>
          <h1 className="page-title">{method.name}</h1>
          <p className="page-subtitle">{method.shortDescription}</p>
          <OpenSourceCtas path={`/methods/${method.slug}`} />
        </div>
      </section>

      <div className="page-body prose">
        <h2>What you can do</h2>
        <ul>
          {method.verifiedCapabilities.map((capability) => <li key={capability}>{capability}</li>)}
        </ul>
        <h2>Edition availability</h2>
        <p>{method.operatingNote}</p>
        <p>
          Veritio keeps study building, participant collection, and results in one workflow.
          Availability still depends on correctly configured infrastructure and provider
          credentials for optional features.
        </p>
      </div>
    </main>
  )
}
