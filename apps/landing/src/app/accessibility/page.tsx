import type { Metadata } from 'next'
import GuideLines from '@/components/GuideLines'

export const metadata: Metadata = {
  title: 'Accessibility Statement | Veritio',
  description: 'Veritio\'s commitment to building an accessible UX research platform for everyone.',
}

export default function AccessibilityPage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> Accessibility</div>
          <h1 className="page-title">Accessibility Statement</h1>
          <p className="page-subtitle">
            We want research to be usable by everyone, including the people who run studies
            and the participants who take them.
          </p>
          <div className="page-updated">Last updated: June 25, 2026</div>
        </div>
      </section>

      <div className="page-body prose">
        <h2>Our commitment</h2>
        <p>
          Accessibility is part of our belief that research should work for everyone. We aim to
          conform to the <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong>,
          the recognized standard for making web content usable by people with a wide range of
          abilities, and we treat accessibility as an ongoing part of how we build, not a one-time
          checklist.
        </p>

        <h2>What we do</h2>
        <ul>
          <li>Design for keyboard navigation, so the platform can be operated without a mouse.</li>
          <li>Maintain meaningful color contrast and avoid relying on color alone to convey meaning.</li>
          <li>Use semantic structure and labels so screen readers can interpret pages and controls.</li>
          <li>Respect reduced-motion preferences for animations and transitions.</li>
          <li>Test new features against accessibility guidelines as part of our development process.</li>
        </ul>

        <h2>Accessibility for your participants</h2>
        <p>
          The studies you run reach real people with diverse needs. We build the participant
          experience to be keyboard- and screen-reader-friendly, and we give you the tools to write
          clear questions and instructions. How you design your study still matters, so we encourage
          plain language, descriptive alt text for images, and avoiding time pressure where it
          isn&apos;t essential.
        </p>

        <h2>Known limitations</h2>
        <p>
          We&apos;re honest that no platform is perfect. Some newer or complex features, and some
          third-party content shown inside studies, may not yet fully meet every criterion. Where we
          find gaps, we prioritize fixing them, and we welcome reports that help us find them faster.
        </p>

        <h2>Share feedback</h2>
        <p>
          If you run into an accessibility barrier, or have a suggestion, please tell us. Email{' '}
          <a href="mailto:accessibility@veritio.com">accessibility@veritio.com</a> with the page or
          feature, what happened, and the assistive technology you were using if relevant. We read
          every report and use it to improve.
        </p>
      </div>
    </main>
  )
}
