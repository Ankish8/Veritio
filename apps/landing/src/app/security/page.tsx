import type { Metadata } from 'next'
import Link from 'next/link'
import ArrowIcon from '@/components/ArrowIcon'
import FadeIn from '@/components/FadeIn'
import GuideLines from '@/components/GuideLines'
import LineTicker from '@/components/LineTicker'

export const metadata: Metadata = {
  title: 'Security & Trust | Veritio',
  description:
    'Learn how Veritio protects research data with workspace permissions, isolated data access, recording consent, controlled sharing, and transparent assurance work.',
  alternates: {
    canonical: 'https://veritio.io/security',
  },
  openGraph: {
    title: 'Security & Trust | Veritio',
    description:
      'Current safeguards, privacy commitments, and Veritio’s evidence-led security roadmap.',
    url: 'https://veritio.io/security',
    siteName: 'Veritio',
    type: 'website',
  },
}

const protections = [
  {
    id: 'workspace-boundaries',
    icon: 'workspace',
    title: 'Workspace boundaries',
    description:
      'Organization-scoped permissions and row-level data rules help keep studies, responses, and workspace activity within the right organization.',
  },
  {
    id: 'role-based-collaboration',
    icon: 'team',
    title: 'Role-based collaboration',
    description:
      'Workspace roles give teams different levels of access, so collaboration does not require giving every member the same permissions.',
  },
  {
    id: 'recording-consent',
    icon: 'recording',
    title: 'Recording consent',
    description:
      'Recording is optional. When it is enabled in supported study flows, participants see a consent step before screen, camera, or microphone capture begins.',
  },
  {
    id: 'controlled-sharing',
    icon: 'share',
    title: 'Controlled sharing',
    description:
      'Supported results and recording links include password and expiration controls. Recording shares can also be revoked when access should end.',
  },
] as const

const lifecycle = [
  {
    id: 'before',
    number: '01',
    eyebrow: 'Before a study',
    title: 'Set expectations first',
    description:
      'Write participant instructions, configure study privacy settings, and collect the consent that applies to your research before participants begin.',
  },
  {
    id: 'during',
    number: '02',
    eyebrow: 'During a study',
    title: 'Collect only what you enable',
    description:
      'Responses stay associated with the appropriate study. Optional recording begins only when the feature is enabled and the supported consent flow is completed.',
  },
  {
    id: 'after',
    number: '03',
    eyebrow: 'After a study',
    title: 'Keep control of the outcome',
    description:
      'Use supported exports and deletion actions, then decide whether findings stay in the workspace or are shared through a controlled external link.',
  },
] as const

const assuranceItems = [
  {
    id: 'available',
    status: 'Available today',
    tone: 'available',
    title: 'Product safeguards',
    description:
      'Encrypted transport and storage, organization-scoped access, role permissions, consent for supported recording flows, and controlled sharing options.',
  },
  {
    id: 'wcag',
    status: 'Working toward',
    tone: 'progress',
    title: 'WCAG 2.2 Level AA',
    description:
      'Accessibility is ongoing product work. We are improving toward WCAG 2.2 Level AA and publish known limitations in our accessibility statement.',
    href: '/accessibility',
    linkLabel: 'Read the accessibility statement',
  },
  {
    id: 'soc2',
    status: 'Planned',
    tone: 'planned',
    title: 'SOC 2 Type II',
    description:
      'A future assurance objective. We will not claim completion or display a badge before an independent report exists.',
  },
  {
    id: 'iso',
    status: 'Planned',
    tone: 'planned',
    title: 'ISO/IEC 27001 & 27701',
    description:
      'Future information security and privacy management objectives. Certification claims will wait for independently issued certificates.',
  },
] as const

const resources = [
  {
    id: 'privacy',
    label: 'Privacy Policy',
    description: 'How Veritio handles customer and participant information.',
    href: '/privacy',
  },
  {
    id: 'accessibility',
    label: 'Accessibility Statement',
    description: 'Our current approach, target, and known limitations.',
    href: '/accessibility',
  },
  {
    id: 'terms',
    label: 'Terms & Conditions',
    description: 'The terms that govern use of the Veritio platform.',
    href: '/terms',
  },
] as const

const faqs = [
  {
    id: 'certification',
    question: 'Is Veritio SOC 2 or ISO certified?',
    answer:
      'Not today. SOC 2 Type II and ISO/IEC 27001 and 27701 are planned assurance objectives. We will update this page and display certification marks only after independent reports or certificates exist.',
  },
  {
    id: 'ownership',
    question: 'Who owns the research data?',
    answer:
      'You do. Customer and participant data is processed to operate the service and deliver the features you choose. Veritio does not sell customer or participant data.',
  },
  {
    id: 'ai-training',
    question: 'Do you use participant responses to train AI?',
    answer:
      'Not without your instruction. When you choose an AI-powered feature, relevant content may be sent to the configured AI provider to complete that request. Review the Privacy Policy for the current details.',
  },
  {
    id: 'recordings',
    question: 'How are participant recordings handled?',
    answer:
      'Recording is optional and controlled by the study configuration. In supported recording flows, participants are shown a consent step before screen, camera, or microphone capture begins.',
  },
  {
    id: 'share-links',
    question: 'Can external share links be restricted?',
    answer:
      'Supported result and recording shares can use password and expiration controls. Recording shares can also be revoked. Availability depends on the sharing flow and plan you are using.',
  },
  {
    id: 'self-hosting',
    question: 'Can I self-host Veritio?',
    answer:
      'Yes. Veritio is available under the AGPL-3.0 license. A self-hosted operator is responsible for securing, updating, monitoring, and backing up their own deployment.',
  },
  {
    id: 'vulnerability',
    question: 'How do I report a security concern?',
    answer:
      'Email security@veritio.io with a clear description, affected URL or feature, reproduction steps, and impact. Please avoid accessing, changing, or downloading data that is not yours.',
  },
] as const

function SecurityIcon({ name }: { name: (typeof protections)[number]['icon'] }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
  }

  if (name === 'workspace') {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M8 5V3m8 2V3M8 10h8M8 14h3" />
      </svg>
    )
  }

  if (name === 'team') {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-2.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V20M16 5.5a3 3 0 0 1 0 5.8M17.5 14a4.8 4.8 0 0 1 3 4.5V20" />
      </svg>
    )
  }

  if (name === 'recording') {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="13" height="12" rx="3" />
        <path d="m16 10 5-3v10l-5-3M9.5 10.5v3M8 12h3" />
      </svg>
    )
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a8.2 8.2 0 0 0 .1-5.8l2-1.2-2-3.4-2 1.2A8 8 0 0 0 12.5 3V1h-4v2a8 8 0 0 0-5 2.8L1.5 4.6.5 6.3 4.6 9a8.2 8.2 0 0 0 0 6L.5 17.7l1 1.7 2-1.2A8 8 0 0 0 8.5 21v2h4v-2a8 8 0 0 0 5-2.8l2 1.2 2-3.4-2.1-1Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="9" cy="9" r="8.25" stroke="currentColor" strokeWidth="1.5" />
      <path d="m5.5 9 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function SecurityPage() {
  return (
    <main className="security-page">
      <section className="security-hero" aria-labelledby="security-hero-title">
        <GuideLines />
        <div className="security-shell security-hero-grid">
          <FadeIn className="security-hero-copy">
            <div className="section-badge">
              <span className="badge-dot" /> SECURITY &amp; TRUST
            </div>
            <h1 id="security-hero-title">Your research data stays yours.</h1>
            <p className="security-hero-lede">
              Veritio protects studies, participant responses, and recordings through workspace
              permissions, isolated data access, and controlled sharing, so your team can move
              quickly without giving up control.
            </p>
            <div className="security-actions">
              <a
                href="https://veritio.io/sign-up"
                className="security-button security-button-primary"
                data-analytics="security-start-free"
              >
                Start Free <ArrowIcon size={17} />
              </a>
              <a
                href="mailto:security@veritio.io?subject=Veritio%20security%20question"
                className="security-button security-button-secondary"
                data-analytics="security-contact"
              >
                Contact Security
              </a>
            </div>
            <ul className="security-trust-points" aria-label="Veritio trust commitments">
              <li><CheckIcon /> Encrypted in transit and at rest</li>
              <li><CheckIcon /> Consent before optional recording</li>
              <li><CheckIcon /> No sale of customer or participant data</li>
            </ul>
          </FadeIn>

          <FadeIn className="security-workflow-wrap" delay={0.1}>
            <div className="security-workflow">
              <div className="grid-pattern" aria-hidden="true" />
              <div className="security-workflow-panel">
                <div className="security-workflow-header">
                  <div>
                    <span>Protected workflow</span>
                    <p>Study security overview</p>
                  </div>
                  <span className="security-live-status"><span /> Active</span>
                </div>
                <div className="security-workflow-rows">
                  <div className="security-workflow-row">
                    <span className="security-workflow-icon"><SecurityIcon name="team" /></span>
                    <div><strong>Team access</strong><span>Organization-scoped permissions</span></div>
                    <span className="security-row-state">Scoped</span>
                  </div>
                  <div className="security-workflow-row">
                    <span className="security-workflow-icon"><SecurityIcon name="recording" /></span>
                    <div><strong>Participant recording</strong><span>Consent shown before capture</span></div>
                    <span className="security-row-state">Optional</span>
                  </div>
                  <div className="security-workflow-row">
                    <span className="security-workflow-icon"><SecurityIcon name="share" /></span>
                    <div><strong>Shared findings</strong><span>Password and expiry; recording revoke</span></div>
                    <span className="security-row-state">Restricted</span>
                  </div>
                  <div className="security-workflow-row">
                    <span className="security-workflow-icon security-code-icon" aria-hidden="true">&lt;/&gt;</span>
                    <div><strong>Source code</strong><span>Licensed for self-hosting and modification</span></div>
                    <span className="security-row-state">AGPL-3.0</span>
                  </div>
                </div>
                <p className="security-workflow-note">
                  This overview reflects product safeguards, not an independent audit report.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="security-section" aria-labelledby="protection-title">
        <GuideLines />
        <div className="security-shell">
          <FadeIn>
            <div className="security-section-heading">
              <div className="section-badge"><span className="badge-dot" /> BUILT INTO THE WORKFLOW</div>
              <h2 id="protection-title">Protection across the research workflow</h2>
              <p>
                Practical controls help teams collaborate, collect, and share research without
                turning product safeguards into claims they cannot support.
              </p>
            </div>
          </FadeIn>
          <div className="security-protection-grid">
            {protections.map((item, index) => (
              <FadeIn key={item.id} delay={index * 0.05}>
                <article className="security-protection-card">
                  <span className="security-card-icon"><SecurityIcon name={item.icon} /></span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <div className="security-ticker-wrap" aria-hidden="true">
        <LineTicker direction="left" />
      </div>

      <section className="security-section security-control-section" aria-labelledby="control-title">
        <GuideLines />
        <div className="security-shell">
          <FadeIn>
            <div className="security-section-heading security-section-heading-wide">
              <div className="section-badge"><span className="badge-dot" /> YOUR RESEARCH, YOUR RULES</div>
              <h2 id="control-title">You decide what gets collected and shared</h2>
              <p>
                Control begins before a participant opens the study and continues after the
                findings are ready.
              </p>
            </div>
          </FadeIn>
          <div className="security-lifecycle-grid">
            {lifecycle.map((item, index) => (
              <FadeIn key={item.id} delay={index * 0.06}>
                <article className="security-lifecycle-card">
                  <div className="security-lifecycle-top">
                    <span className="security-step-number">{item.number}</span>
                    <span>{item.eyebrow}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </article>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <aside className="security-open-source" aria-labelledby="open-source-title">
              <div className="security-open-source-mark" aria-hidden="true">&lt;/&gt;</div>
              <div className="security-open-source-copy">
                <span>OPEN SOURCE &amp; SELF-HOSTABLE</span>
                <h3 id="open-source-title">Trust can include looking under the hood.</h3>
                <p>
                  Veritio is available under the AGPL-3.0 license, which permits you to run,
                  study, modify, and self-host the platform.
                </p>
              </div>
            </aside>
          </FadeIn>
        </div>
      </section>

      <section className="security-section security-assurance-section" aria-labelledby="assurance-title">
        <GuideLines />
        <div className="security-shell">
          <FadeIn>
            <div className="security-section-heading security-assurance-heading">
              <div>
                <div className="section-badge"><span className="badge-dot" /> ASSURANCE</div>
                <h2 id="assurance-title">Standards are the roadmap. Evidence is the goal.</h2>
              </div>
              <p>
                We separate what exists in the product today from work that is still underway or
                planned. Certification logos will appear only after independent reports or
                certificates exist.
              </p>
            </div>
          </FadeIn>
          <div className="security-assurance-grid">
            {assuranceItems.map((item, index) => (
              <FadeIn key={item.id} delay={index * 0.05}>
                <article className="security-assurance-card">
                  <span className={`security-status security-status-${item.tone}`}>
                    <span aria-hidden="true" /> {item.status}
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  {'href' in item && (
                    <Link href={item.href} className="security-card-link">
                      {item.linkLabel} <ArrowIcon />
                    </Link>
                  )}
                </article>
              </FadeIn>
            ))}
          </div>
          <FadeIn>
            <div className="security-obligation-note">
              <strong>Privacy obligations, not certifications.</strong>
              <p>
                GDPR and India&apos;s Digital Personal Data Protection Act are legal frameworks.
                Veritio is building the operational documentation and processes needed to meet
                applicable obligations; neither framework provides a product certification.
              </p>
              <span>Page reviewed July 2026</span>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="security-section security-resources-section" aria-labelledby="resources-title">
        <GuideLines />
        <div className="security-shell">
          <FadeIn>
            <div className="security-section-heading">
              <div className="section-badge"><span className="badge-dot" /> TRUST RESOURCES</div>
              <h2 id="resources-title">The documents behind the promise</h2>
              <p>Review the policies, commitments, and source code that are available today.</p>
            </div>
          </FadeIn>
          <div className="security-resources-grid">
            {resources.map((resource, index) => (
              <FadeIn key={resource.id} delay={index * 0.05}>
                <Link href={resource.href} className="security-resource-card">
                  <span>{resource.label}</span>
                  <p>{resource.description}</p>
                  <ArrowIcon />
                </Link>
              </FadeIn>
            ))}
          </div>

          <div className="security-faq-layout">
            <FadeIn className="security-faq-intro">
              <div className="section-badge"><span className="badge-dot" /> FAQ</div>
              <h2>Security questions, answered plainly</h2>
              <p>
                Need to review something specific? Email{' '}
                <a href="mailto:security@veritio.io">security@veritio.io</a>.
              </p>
            </FadeIn>
            <FadeIn className="security-faq-list">
              {faqs.map((faq) => (
                <details className="security-faq-item" key={faq.id}>
                  <summary>
                    <span>{faq.question}</span>
                    <span className="security-faq-plus" aria-hidden="true" />
                  </summary>
                  <div className="security-faq-answer">
                    <p>{faq.answer}</p>
                    {faq.id === 'ai-training' && (
                      <Link href="/privacy">Read the Privacy Policy <ArrowIcon /></Link>
                    )}
                    {faq.id === 'vulnerability' && (
                      <a href="mailto:security@veritio.io?subject=Security%20report">
                        Email the security team <ArrowIcon />
                      </a>
                    )}
                  </div>
                </details>
              ))}
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="security-final-section" aria-labelledby="security-final-title">
        <GuideLines />
        <div className="security-shell">
          <FadeIn>
            <div className="security-final-card">
              <div className="grid-pattern" aria-hidden="true" />
              <div className="security-final-copy">
                <h2 id="security-final-title">Run research without giving up control.</h2>
                <p>Start with Veritio today, or bring your security questions directly to us.</p>
              </div>
              <div className="security-final-actions">
                <a
                  href="https://veritio.io/sign-up"
                  className="security-button security-button-primary"
                  data-analytics="security-final-start-free"
                >
                  Start Free <ArrowIcon size={17} />
                </a>
                <a
                  href="mailto:security@veritio.io?subject=Veritio%20security%20question"
                  className="security-button security-button-light"
                  data-analytics="security-final-contact"
                >
                  Contact Security
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>
    </main>
  )
}
