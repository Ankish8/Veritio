'use client'

import { useState, useEffect } from 'react'
import FadeIn from '@/components/FadeIn'
import GuideLines from '@/components/GuideLines'
import LineTicker from '@/components/LineTicker'
import ArrowIcon from '@/components/ArrowIcon'
import LTDPricingCards from '@/components/home/LTDPricingCards'
import LtdCheckoutOverlay from '@/components/LtdCheckoutOverlay'
import TabContent from '@/components/home/TabContent'
import { TABS } from '@/components/home/constants'
import useTabTransition from '@/hooks/useTabTransition'
import {
  SmartAssistIcon,
  AutoTasksIcon,
  WorkflowEngineIcon,
  InstantAnswersIcon,
  AIInsightsIcon,
} from '@/components/AnimatedIcons'

const WHAT_YOU_GET = [
  {
    icon: <AutoTasksIcon />,
    title: 'Usability tests',
    desc: 'Test live web apps and prototypes. Track clicks, task completion, and where people get stuck.',
  },
  {
    icon: <WorkflowEngineIcon />,
    title: 'Card sorts and tree tests',
    desc: 'Validate your information architecture with open and closed card sorts, plus tree testing.',
  },
  {
    icon: <InstantAnswersIcon />,
    title: 'Surveys with logic',
    desc: 'Build surveys with 13 question types, branching, and scoring. Screen and quota participants.',
  },
  {
    icon: <SmartAssistIcon />,
    title: 'AI analysis (BYOK)',
    desc: 'Cluster open responses into themes and draft summaries you review and edit before sharing. Bring your own AI key.',
  },
  {
    icon: <AIInsightsIcon />,
    title: 'Research repository',
    desc: 'Keep studies, results, and findings in one place that grows with every project you run.',
  },
]

const FAQS = [
  {
    q: 'Is this really lifetime?',
    a: 'Yes. You pay once and keep access to your tier for the life of the product. There is no monthly or annual subscription on a lifetime deal.',
  },
  {
    q: 'Can I upgrade tiers later?',
    a: 'No. Tiers are not upgradable, so pick the tier that fits your needs. Each lifetime deal is locked to the tier you buy.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your studies and responses stay yours. Data is encrypted in transit and at rest, and each account is isolated with row-level security. You decide what each shared results link reveals.',
  },
  {
    q: 'Do I get future updates?',
    a: 'Yes. Your lifetime tier includes ongoing product updates and improvements within that tier. New capabilities that ship for your tier are included.',
  },
  {
    q: 'Are there per-response fees?',
    a: 'No. Each tier includes a per-study response allowance, and because you bring your own participants, you never pay per recruited person.',
  },
]

export default function LTDPage() {
  const [faqOpen, setFaqOpen] = useState(0)
  const [activeTab, setActiveTab] = useState('web-app')
  const heroTab = useTabTransition()
  const { ref: heroTabRef, animate: animateHeroTab } = heroTab

  useEffect(() => {
    animateHeroTab()
  }, [activeTab, animateHeroTab])

  return (
    <>
      {/* Checkout overlay host: the payment modal opens directly on this page. */}
      <LtdCheckoutOverlay />

      {/* HERO */}
      <section className="hero-tabbed ltd-hero">
        <GuideLines />
        <div className="container">
          <FadeIn>
            <div className="hero-tabbed-text">
              <div className="section-badge ltd-deal-badge"><span className="badge-dot" /> Limited lifetime deal</div>
              <h1>Pay once.<br />Research forever.</h1>
              <p>Own Veritio for life. Run usability tests, card sorts, tree tests, and surveys with no subscription and no per-response fees. Ever.</p>
              <div className="hero-btns">
                <a href="#ltd-pricing" className="hero-btn-primary">
                  See lifetime pricing
                  <ArrowIcon size={18} />
                </a>
                <a href="#what-you-get" className="hero-btn-ghost">
                  What you get
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
        {/* Tabbed study-type showcase, mirrored from the home hero. No FadeIn wrapper
            since it sits above the fold and must be visible immediately. */}
        <div className="hero-tabs-wrap">
          <div className="hero-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`hero-tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {tab.icon}
                  {tab.label}
                  {'soon' in tab && <span className="tab-soon">Soon</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="hero-showcase-wrap">
          <div className="hero-showcase">
            <div className="grid-pattern" />
            <div className="hero-showcase-card">
              <div className="hero-showcase-card-inner" style={{ position: 'relative', overflow: 'hidden' }}>
                <div ref={heroTabRef} key={activeTab}>
                  <TabContent id={activeTab} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="extra-section" id="what-you-get">
        <GuideLines />
        <div className="extra-container">
          <FadeIn>
            <div className="extra-header">
              <div className="section-badge"><span className="badge-dot" /> WHAT YOU GET</div>
              <h2 className="extra-heading">Everything Veritio does, for life</h2>
            </div>
          </FadeIn>
          <FadeIn delay={1}>
            <div className="extra-grid">
              <div className="extra-top-row">
                {WHAT_YOU_GET.slice(0, 4).map((c, i) => (
                  <div className="extra-card-sm" key={i}>
                    <div className="extra-card-icon">{c.icon}</div>
                    <div className="extra-card-text">
                      <h3>{c.title}</h3>
                      <p>{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="extra-bottom-row">
                <div className="extra-card-lg">
                  <div className="extra-card-text">
                    <h3>{WHAT_YOU_GET[4].title}</h3>
                    <p>{WHAT_YOU_GET[4].desc}</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
          <LineTicker direction="left" />
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="ltd-pricing">
        <GuideLines />
        <div className="pricing-container">
          <FadeIn>
            <div className="pricing-header">
              <div className="section-badge ltd-deal-badge"><span className="badge-dot" /> Lifetime pricing</div>
              <h2 className="pricing-heading">Pay once. No subscription, ever.</h2>
            </div>
          </FadeIn>

          <FadeIn>
            <LTDPricingCards />
          </FadeIn>

          <FadeIn>
            <p className="ltd-savings">
              <strong>One payment, lifetime access.</strong> No monthly fees, no per-response charges. Bring your own participants.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section" id="faq">
        <GuideLines />
        <div className="faq-container">
          <FadeIn>
            <div className="faq-layout">
              <div className="faq-left">
                <div className="section-badge"><span className="badge-dot" /> FAQ</div>
                <h2 className="faq-heading">Lifetime deal questions</h2>
              </div>
              <div className="faq-right">
                {FAQS.map((item, i) => (
                  <div className={`faq-item ${faqOpen === i ? 'faq-item-open' : ''}`} key={i} onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                    <div className="faq-q">
                      <span>{item.q}</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                    <div className="faq-a-wrap">
                      <div className="faq-a-inner">
                        <p className="faq-a">{item.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta2-section">
        <GuideLines />
        <div className="cta2-container">
          <FadeIn>
            <div className="cta2-card">
              <div className="grid-pattern" />
              <h2 style={{ position: 'relative', zIndex: 1 }}>Own Veritio for life, starting today</h2>
              <p style={{ position: 'relative', zIndex: 1 }}>One payment, lifetime access, no per-response fees. Every study type included.</p>
              <a href="#ltd-pricing" className="cta2-btn" style={{ position: 'relative', zIndex: 1 }}>Get the lifetime deal <ArrowIcon /></a>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  )
}
