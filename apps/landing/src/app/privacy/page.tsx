import type { Metadata } from 'next'
import GuideLines from '@/components/GuideLines'
import { withMarketingCanonical } from '@veritio/marketing-routes'

export const metadata: Metadata = withMarketingCanonical('/privacy', {
  title: 'Privacy Policy | Veritio',
  description: 'How Veritio collects, uses, and protects your data and your participants\' data.',
})

export default function PrivacyPage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> Legal</div>
          <h1 className="page-title">Privacy Policy</h1>
          <p className="page-subtitle">
            How we collect, use, and protect your data, and the data of the participants
            in your studies.
          </p>
          <div className="page-updated">Last updated: June 25, 2026</div>
        </div>
      </section>

      <div className="page-body prose">
        <p>
          This Privacy Policy explains how Veritio (&quot;we&quot;, &quot;us&quot;) handles personal
          information when you use our UX research platform and website (the &quot;Service&quot;). By
          using the Service, you agree to the practices described here.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li><strong>Account information</strong> you provide, such as your name, email address, and organization details.</li>
          <li><strong>Study content</strong> you create, including questions, prototypes, and study configurations.</li>
          <li><strong>Participant responses</strong> collected through your studies, which may include answers, clicks, time-on-task, and session events.</li>
          <li><strong>Usage data</strong> such as log information, device and browser type, and how you interact with the Service.</li>
          <li><strong>Cookies and similar technologies</strong> used to keep you signed in and to understand product usage.</li>
        </ul>

        <h2>How we use information</h2>
        <ul>
          <li>To provide, maintain, and improve the Service.</li>
          <li>To run your studies, collect responses, and generate analysis such as themes and summaries.</li>
          <li>To communicate with you about your account, security, and product updates.</li>
          <li>To detect, prevent, and address technical issues, fraud, and abuse.</li>
        </ul>

        <h2>Your data is yours</h2>
        <p>
          You own the studies you create and the participant data you collect. We process
          that data on your behalf to operate the Service. We do not sell your data or your
          participants&apos; data, and we do not use participant responses to train models without
          your instruction.
        </p>

        <h2>How we share information</h2>
        <p>
          We share information only with service providers who help us run the Service (for
          example, cloud hosting and infrastructure), under agreements that require them to
          protect it; when required by law; or to protect the rights, safety, and security of
          Veritio, our users, and the public.
        </p>

        <h2>Data security</h2>
        <p>
          Data is encrypted in transit and at rest. Each organization&apos;s studies and responses
          are isolated with row-level security. No method of transmission or storage is ever
          completely secure, but we work to protect your information using industry-standard
          safeguards.
        </p>

        <h2>Data retention</h2>
        <p>
          We retain personal information for as long as your account is active or as needed to
          provide the Service. You can delete studies and responses at any time, and we will
          delete or anonymize your data after account closure, except where we are required to
          keep it for legal reasons.
        </p>

        <h2>Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, or
          delete your personal information, and to object to or restrict certain processing. You
          can exercise many of these rights directly in your account settings, or by contacting us.
        </p>

        <h2>Cookies</h2>
        <p>
          We use essential cookies to operate the Service and keep you signed in, and limited
          analytics cookies to understand usage. You can control cookies through your browser
          settings; disabling essential cookies may affect how the Service works.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we make material changes, we
          will update the date above and, where appropriate, notify you.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about this policy or your data? Reach us at{' '}
          <a href="mailto:support@veritio.io">support@veritio.io</a>.
        </p>
      </div>
    </main>
  )
}
