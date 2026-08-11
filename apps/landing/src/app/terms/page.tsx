import type { Metadata } from 'next'
import GuideLines from '@/components/GuideLines'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Veritio',
  description: 'The terms that govern your use of the Veritio UX research platform.',
}

export default function TermsPage() {
  return (
    <main className="page">
      <section className="page-hero">
        <GuideLines />
        <div className="page-hero-inner">
          <div className="section-badge"><span className="badge-dot" /> Legal</div>
          <h1 className="page-title">Terms &amp; Conditions</h1>
          <p className="page-subtitle">
            The terms that govern your access to and use of Veritio.
          </p>
          <div className="page-updated">Last updated: June 25, 2026</div>
        </div>
      </section>

      <div className="page-body prose">
        <p>
          These Terms &amp; Conditions (&quot;Terms&quot;) are an agreement between you and Veritio
          (&quot;we&quot;, &quot;us&quot;) governing your use of our platform and website (the
          &quot;Service&quot;). By creating an account or using the Service, you agree to these Terms.
        </p>

        <h2>The Service</h2>
        <p>
          Veritio is a UX research platform that lets you create studies, recruit and collect
          responses from participants, and analyze the results. We may add, change, or remove
          features over time to improve the Service.
        </p>

        <h2>Your account</h2>
        <ul>
          <li>You are responsible for the activity under your account and for keeping your credentials secure.</li>
          <li>You must provide accurate information and be old enough to form a binding contract in your jurisdiction.</li>
          <li>Notify us promptly of any unauthorized use of your account.</li>
        </ul>

        <h2>Acceptable use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Break the law, infringe others&apos; rights, or violate participants&apos; privacy.</li>
          <li>Collect sensitive data without a lawful basis and appropriate consent.</li>
          <li>Send spam, malware, or attempt to disrupt or gain unauthorized access to the Service.</li>
          <li>Resell or misrepresent the Service as your own.</li>
        </ul>

        <h2>Your content and data</h2>
        <p>
          You retain ownership of the studies you create and the data you collect. You grant us
          the limited rights needed to host and process that content so we can provide the
          Service. You are responsible for having the necessary rights and consents for the data
          you collect from participants.
        </p>

        <h2>Plans and billing</h2>
        <p>
          Paid plans are billed in advance on a monthly or yearly basis and renew automatically
          unless cancelled. Fees are non-refundable except where required by law. We may change
          pricing with reasonable notice; changes take effect on your next billing cycle.
        </p>

        <h2>Intellectual property</h2>
        <p>
          The Service, including its software, design, and branding, is owned by Veritio and
          protected by intellectual property laws. These Terms do not grant you any rights to our
          trademarks or to the Service beyond the right to use it as permitted here.
        </p>

        <h2>Termination</h2>
        <p>
          You may stop using the Service and close your account at any time. We may suspend or
          terminate access if you breach these Terms or use the Service in a way that creates risk
          or legal exposure. On termination, your right to use the Service ends and we will handle
          your data as described in our Privacy Policy.
        </p>

        <h2>Disclaimers</h2>
        <p>
          The Service is provided &quot;as is&quot; without warranties of any kind. We do not warrant
          that the Service will be uninterrupted, error-free, or that analysis outputs will be
          accurate or fit for a particular purpose. AI-assisted outputs are a starting point for
          your own review.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Veritio will not be liable for any indirect,
          incidental, or consequential damages, or for lost profits or data. Our total liability
          for any claim relating to the Service will not exceed the amount you paid us in the
          twelve months before the claim.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          We may update these Terms from time to time. When changes are material, we will update
          the date above and, where appropriate, notify you. Continued use of the Service after
          changes take effect means you accept the updated Terms.
        </p>

        <h2>Contact us</h2>
        <p>
          Questions about these Terms? Reach us at{' '}
          <a href="mailto:support@veritio.io">support@veritio.io</a>.
        </p>
      </div>
    </main>
  )
}
