import type { Metadata } from 'next'
import GuideLines from '@/components/GuideLines'
import { InstantAnswersIcon, AIInsightsIcon, AnalyticsHubIcon } from '@/components/AnimatedIcons'

export const metadata: Metadata = {
  title: 'About Veritio',
  description:
    'Veritio is a UX research platform built for the teams priced out of enterprise tools. One platform for every study type, no per-response fees, results in hours.',
}

export default function AboutPage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> About Us</div>
          <h1 className="page-title">Research shouldn&apos;t be a luxury</h1>
          <p className="page-subtitle">
            We&apos;re building the UX research platform for everyone the enterprise tools
            left behind, the product teams, designers, and founders who want real user
            evidence without the enterprise price tag.
          </p>
        </div>
      </section>

      <div className="page-body prose">
        <h2>Why we built Veritio</h2>
        <p>
          Good product decisions come from watching real users, not from the loudest
          opinion in the room. But for most teams, research has been gated behind tools
          that charge per response, lock features behind seat minimums, and take weeks to
          turn raw answers into something you can act on.
        </p>
        <p>
          Veritio exists to close that gap. We put web app tests, prototype tests, surveys,
          card sorts, tree tests, and first-click studies in one platform, with analysis
          that clusters open-ended answers into themes and drafts the summary for you. You
          go from question to insight in hours, not weeks.
        </p>

        <h2>What we believe</h2>
        <div className="about-values">
          <div className="about-value">
            <div className="about-value-icon"><InstantAnswersIcon /></div>
            <h3>Speed is a feature</h3>
            <p>Insight that arrives in hours changes decisions. Insight that arrives in weeks just confirms what already shipped.</p>
          </div>
          <div className="about-value">
            <div className="about-value-icon"><AIInsightsIcon /></div>
            <h3>Evidence over opinion</h3>
            <p>Everyone has a hunch. We make it cheap and fast enough to check the hunch before you build on it.</p>
          </div>
          <div className="about-value">
            <div className="about-value-icon"><AnalyticsHubIcon /></div>
            <h3>Research for everyone</h3>
            <p>You shouldn&apos;t need a dedicated researcher to learn from users. The tools should be simple enough for any team.</p>
          </div>
        </div>

        <h2>The platform, in numbers</h2>
        <div className="about-stats">
          <div className="about-stat">
            <div className="about-stat-num">7</div>
            <div className="about-stat-label">Study types, one platform</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-num">$0</div>
            <div className="about-stat-label">Per-response fees, ever</div>
          </div>
          <div className="about-stat">
            <div className="about-stat-num">Hours</div>
            <div className="about-stat-label">From question to insight</div>
          </div>
        </div>

        <div className="about-cta">
          <h2>Start with your next decision</h2>
          <p>Spin up a study and get real user evidence today.</p>
          <a href="/#pricing" className="about-cta-btn">See pricing</a>
        </div>
      </div>
    </main>
  )
}
