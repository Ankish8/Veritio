'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import FadeIn from '@/components/FadeIn'
import PricingCards from '@/components/home/PricingCards'
import GuideLines from '@/components/GuideLines'
import LineTicker from '@/components/LineTicker'
import ArrowIcon from '@/components/ArrowIcon'
import TextReveal from '@/components/TextReveal'
import TabContent from '@/components/home/TabContent'
import PersonasSection from '@/components/home/PersonasSection'
import { TABS } from '@/components/home/constants'
import useTabTransition from '@/hooks/useTabTransition'
import { ASSET_PREFIX } from '@/lib/asset-prefix'
import {
  SmartAssistIcon,
  AutoTasksIcon,
  InstantAnswersIcon,
  AIInsightsIcon,
  WorkflowEngineIcon,
  AnalyticsHubIcon
} from '@/components/AnimatedIcons'

export default function Home() {
  const [activeTab, setActiveTab] = useState('web-app')
  const [faqOpen, setFaqOpen] = useState(0)

  const heroTab = useTabTransition()

  const { ref: heroTabRef, animate: animateHeroTab } = heroTab

  useEffect(() => { animateHeroTab() }, [activeTab, animateHeroTab])

  // Scroll to a section when arriving with a hash (e.g. /#pricing from another page).
  // Runs after layout/animations settle since native hash scroll is unreliable here.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
    }, 350)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* HERO */}
      <section className="hero-tabbed">
        <GuideLines />
        <div className="container">
          <FadeIn>
            <div className="hero-tabbed-text">
              <div className="hero-badge-pill">
                <span className="hero-badge-tag">NEW</span>
                <span>AI-Powered Study Builder</span>
              </div>
              <h1>Ship products backed by <br />evidence, not opinions.</h1>
              <p>Test live web apps, prototypes, surveys, card sorts, and more. One platform, results in hours. No per-response fees, ever.</p>
              <div className="hero-btns">
                <a href="https://veritio.io/sign-up" className="hero-btn-primary">
                  Start Free
                  <ArrowIcon size={18} />
                </a>
                <a href="#features" className="hero-btn-ghost">
                  Learn More
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
        <FadeIn delay={2}>
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
        </FadeIn>
      </section>

      {/* BRAND + TICKER + TESTIMONIAL: continuous guide lines */}
      <section className="guided-section">
        <GuideLines />

        <LineTicker direction="left" />

        {/* FOUNDER NOTE */}
        <FadeIn>
            <div className="about-content">
              <div className="about-content-inner">
                <div className="about-company-logo">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" /><path d="M8 12l2 2 4-4" /></svg>
                  <span>Why We Built Veritio</span>
                </div>
                <p className="about-quote">
                  <TextReveal text="Most research tools are built for enterprises with big budgets. Veritio is built for everyone else. Fast, simple, and priced so you actually use it." />
                </p>
              </div>
            </div>
          </FadeIn>
      </section>

      {/* WHO IT'S FOR (personas) */}
      <PersonasSection />

      {/* WHAT VERITIO CAN DO FOR YOU */}
      <section className="feat-section" id="features">
        <GuideLines />
        <div className="feat-section-container">

          {/* Section title */}
          <FadeIn>
            <div className="feat-section-header">
              <div className="feat-badge">
                <span className="feat-badge-dot" />
                WHY TEAMS PICK VERITIO
              </div>
              <h2>From question to decision in a day</h2>
            </div>
          </FadeIn>

          {/* Feature Card 1: Real-time Analytics */}
          <FadeIn delay={1}>
            <div className="feat-card">
              <div className="feat-card-text">
                <div className="feat-card-text-inner">
                  <h3>Answers in hours, not weeks</h3>
                  <p>Launch a study, drop the link in Slack, and watch responses land in real time. No agency, no recruiting lag, no waiting on a CSV export to see what is happening.</p>
                  <div className="feat-points">
                    <div className="feat-point">
                      <div className="feat-point-icon" style={{ background: '#FFF7ED' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
                      </div>
                      <h4>Live results</h4>
                      <p>Responses land live from participant one</p>
                    </div>
                    <div className="feat-point">
                      <div className="feat-point-icon" style={{ background: '#F0FDF4' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                      </div>
                      <h4>No exports</h4>
                      <p>Completion and drop-off rates update live</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="feat-card-visual">
                <div className="feat-card-gradient">
                  <div className="feat-card-mockup">
                    <div className="feat-mockup-header">Response Analytics</div>
                    <div className="feat-mockup-big-num">32.5% <span>of total responses</span></div>
                    <div className="feat-mockup-bars">
                      <div style={{ flex: 2, height: '24px', background: '#8B6914', borderRadius: '4px' }} />
                      <div style={{ flex: 2, height: '24px', background: '#F97316', borderRadius: '4px' }} />
                      <div style={{ flex: 1.5, height: '24px', background: '#F9A8D4', borderRadius: '4px' }} />
                      <div style={{ flex: 1.5, height: '24px', background: '#FCD34D', borderRadius: '4px' }} />
                      <div style={{ flex: 1, height: '24px', background: '#93C5FD', borderRadius: '4px' }} />
                    </div>
                    <div className="feat-mockup-legend">
                      <div className="feat-legend-row"><span className="feat-legend-dot" style={{ background: '#F97316' }} /> Card Sort <span className="feat-legend-val">56%</span></div>
                      <div className="feat-legend-row"><span className="feat-legend-dot" style={{ background: '#F97316' }} /> Tree Test <span className="feat-legend-val">30%</span></div>
                      <div className="feat-legend-row"><span className="feat-legend-dot" style={{ background: '#F9A8D4' }} /> Survey <span className="feat-legend-val">46%</span></div>
                      <div className="feat-legend-row"><span className="feat-legend-dot" style={{ background: '#FCD34D' }} /> Prototype <span className="feat-legend-val">21%</span></div>
                      <div className="feat-legend-row"><span className="feat-legend-dot" style={{ background: '#93C5FD' }} /> First-Click <span className="feat-legend-val">12%</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <LineTicker direction="left" />

          {/* Feature Card 2: KPI Growth (reversed) */}
          <FadeIn delay={1}>
            <div className="feat-card feat-card-reverse">
              <div className="feat-card-visual">
                <div className="feat-card-gradient feat-gradient-warm">
                  <div className="feat-card-mockup">
                    <div className="feat-mockup-header">Study Completion Tracking</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                      <span style={{ fontSize: '36px', fontWeight: 700, color: '#210D02' }}>24%</span>
                      <span style={{ fontSize: '12px', color: '#22C55E', fontWeight: 500 }}>+6 points</span>
                    </div>
                    <div style={{ height: '120px', position: 'relative', borderBottom: '1px solid rgba(25,21,22,.08)', marginBottom: '8px' }}>
                      <svg width="100%" height="100%" viewBox="0 0 300 120" preserveAspectRatio="none">
                        <polyline points="0,100 50,90 100,85 150,70 200,40 250,30 300,10" fill="none" stroke="var(--accent)" strokeWidth="2" />
                        <circle cx="200" cy="40" r="4" fill="var(--accent)" />
                      </svg>
                      <div style={{ position: 'absolute', left: '0', top: '30%', fontSize: '10px', color: '#4F4D49' }}>50%</div>
                      <div style={{ position: 'absolute', left: '0', top: '65%', fontSize: '10px', color: '#4F4D49' }}>25%</div>
                      <div style={{ position: 'absolute', left: '0', bottom: '0', fontSize: '10px', color: '#4F4D49' }}>0</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4F4D49' }}>
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="feat-card-text">
                <div className="feat-card-text-inner">
                  <h3>See exactly where users get stuck</h3>
                  <p>Drop-off charts, click maps, and navigation paths show the precise moment confusion sets in, so you fix the real problem instead of debating opinions.</p>
                  <div className="feat-checklist">
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Pinpoint the questions and steps people abandon</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Compare how different participant segments behave</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Catch friction early, before you spend your recruitment budget</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <LineTicker direction="left" />

          {/* Feature Card 3: AI theme analysis */}
          <FadeIn>
            <div className="feat-card">
              <div className="feat-card-text">
                <div className="feat-card-text-inner">
                  <h3>Skip the analysis grind</h3>
                  <p>Veritio reads every open-ended answer, clusters it into themes, and drafts the summary for you. Hours of manual tagging become a five-minute review.</p>
                  <div className="feat-checklist">
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Open responses auto-grouped into themes</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Spot patterns hiding across hundreds of answers</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Editable AI summaries you stay in control of</div>
                  </div>
                </div>
              </div>
              <div className="feat-card-visual">
                <div className="feat-card-gradient">
                  <div className="feat-card-mockup">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div className="feat-mockup-header" style={{ marginBottom: 0 }}>Top Themes</div>
                      <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600, background: 'rgba(109,40,217,.08)', padding: '3px 8px', borderRadius: '6px' }}>AI-grouped</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#4F4D49', marginBottom: '16px' }}>From 248 open responses</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#210D02', marginBottom: '5px' }}><span>Pricing felt unclear</span><span style={{ color: '#4F4D49' }}>42%</span></div>
                        <div style={{ height: '7px', background: 'rgba(25,21,22,.06)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '42%', height: '100%', background: '#F97316', borderRadius: '4px' }} /></div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#210D02', marginBottom: '5px' }}><span>Navigation confusing</span><span style={{ color: '#4F4D49' }}>28%</span></div>
                        <div style={{ height: '7px', background: 'rgba(25,21,22,.06)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '28%', height: '100%', background: 'var(--accent)', borderRadius: '4px' }} /></div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#210D02', marginBottom: '5px' }}><span>Onboarding friction</span><span style={{ color: '#4F4D49' }}>18%</span></div>
                        <div style={{ height: '7px', background: 'rgba(25,21,22,.06)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '18%', height: '100%', background: '#F9A8D4', borderRadius: '4px' }} /></div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#210D02', marginBottom: '5px' }}><span>Loved the speed</span><span style={{ color: '#4F4D49' }}>12%</span></div>
                        <div style={{ height: '7px', background: 'rgba(25,21,22,.06)', borderRadius: '4px', overflow: 'hidden' }}><div style={{ width: '12%', height: '100%', background: '#22C55E', borderRadius: '4px' }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

        </div>
      </section>

      {/* INTEGRATIONS */}
      <section className="integrations-section">
        <GuideLines />
        <LineTicker direction="right" />
        <FadeIn>
          <div className="integrations-inner">
            <div className="section-badge"><span className="badge-dot" /> INTEGRATIONS</div>
            <h2 className="integrations-heading">Fits into your design workflow, not around it</h2>
            <div className="integrations-logos">
              {[
                { src: 'figma.svg', name: 'Figma' },
                { src: 'slack.svg', name: 'Slack' },
                { src: 'notion.svg', name: 'Notion' },
                { src: 'linear.svg', name: 'Linear' },
                { src: 'jira.svg', name: 'Jira' },
                { src: 'asana.svg', name: 'Asana' },
                { src: 'googlesheets.svg', name: 'Google Sheets' },
                { src: 'zoom.svg', name: 'Zoom' },
                { src: 'hubspot.svg', name: 'HubSpot' },
              ].map((logo) => (
                <div key={logo.name} className="int-logo-cell">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${ASSET_PREFIX}/images/integrations/${logo.src}`}
                    alt={logo.name}
                    title={logo.name}
                    className="int-logo-img"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* EXTRA FEATURES */}
      <section className="extra-section">
        <GuideLines />
        <div className="extra-container">
          <FadeIn>
            <div className="extra-header">
              <div className="section-badge"><span className="badge-dot" /> EXTRA FEATURES</div>
              <h2 className="extra-heading">Everything You Need to Run Research at Scale</h2>
            </div>
          </FadeIn>
          <FadeIn delay={1}>
            <div className="extra-grid">
              {/* Top row: 4 equal cards */}
              <div className="extra-top-row">
                {[
                  { icon: <SmartAssistIcon />, title: 'AI follow-up questions', desc: 'Veritio asks each participant a tailored follow-up based on what they answered, digging deeper automatically' },
                  { icon: <AutoTasksIcon />, title: '13 question types', desc: 'NPS, matrix, ranking, semantic differential, constant sum, opinion scales, image choice, audio, and more' },
                  { icon: <WorkflowEngineIcon />, title: 'Branching, logic and scoring', desc: 'Route, skip, and score participants with 30+ logic operators and custom variables' },
                  { icon: <InstantAnswersIcon />, title: 'Screen, quota, auto-close', desc: 'Qualify participants with screening questions, set response quotas, and close studies automatically at your target' },
                ].map((c, i) => (
                  <div className="extra-card-sm" key={i}>
                    <div className="extra-card-icon">{c.icon}</div>
                    <div className="extra-card-text">
                      <h3>{c.title}</h3>
                      <p>{c.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom row: 1 large + 2 small */}
              <div className="extra-bottom-row">
                <div className="extra-card-lg">
                  <div className="extra-card-text">
                    <h3>A/B test your designs</h3>
                    <p>Put designs head to head and let built-in significance testing call the winner with 95% confidence, not gut feel</p>
                  </div>
                  <div className="extra-chart-wrap">
                    <div style={{ background: 'var(--white)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#210D02' }}>Pricing page test</span>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--green)', background: 'rgba(34,197,94,.12)', padding: '3px 9px', borderRadius: '6px' }}>Winner: B &middot; 95% confidence</span>
                      </div>
                      <div style={{ marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#210D02', marginBottom: '6px' }}><span>Design A</span><span style={{ color: '#4F4D49' }}>38%</span></div>
                        <div style={{ height: '10px', background: 'rgba(25,21,22,.06)', borderRadius: '5px', overflow: 'hidden' }}><div style={{ width: '38%', height: '100%', background: 'var(--gray-400)', borderRadius: '5px' }} /></div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#210D02', marginBottom: '6px' }}><span>Design B</span><span style={{ color: '#4F4D49' }}>62%</span></div>
                        <div style={{ height: '10px', background: 'rgba(25,21,22,.06)', borderRadius: '5px', overflow: 'hidden' }}><div style={{ width: '62%', height: '100%', background: 'var(--accent)', borderRadius: '5px' }} /></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="extra-card-sm">
                  <div className="extra-card-icon">
                    <AnalyticsHubIcon />
                  </div>
                  <div className="extra-card-text">
                    <h3>Session recording and clips</h3>
                    <p>Record real website sessions, replay them with an event timeline, and export the key moments as clips</p>
                  </div>
                </div>
                <div className="extra-card-sm">
                  <div className="extra-card-icon">
                    <AIInsightsIcon />
                  </div>
                  <div className="extra-card-text">
                    <h3>Cross-tab with significance</h3>
                    <p>Cross-tabulate any two questions with automatic chi-square or Fisher’s exact testing</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
          <LineTicker direction="left" />
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <GuideLines />
        <div className="pricing-container">
          <FadeIn>
            <div className="pricing-header">
              <div className="section-badge"><span className="badge-dot" /> PRICING</div>
              <h2 className="pricing-heading">Simple pricing. No per-response fees.</h2>
            </div>
          </FadeIn>

          <FadeIn>
            <PricingCards />
          </FadeIn>

          <FadeIn>
            <div className="pricing-compare-link">
              <Link href="/pricing">Compare all plans &amp; features <ArrowIcon /></Link>
            </div>
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
                <h2 className="faq-heading">Frequently Asked Questions</h2>
              </div>
              <div className="faq-right">
                {[
                  { q: 'What types of UX studies can I run with Veritio?', a: 'Veritio supports web app tests, prototype tests (paste any URL), surveys with branching logic, card sorting, tree testing, first-click testing, and first impression tests, all from one platform. Figma prototype testing is coming soon.' },
                  { q: 'Can I test prototypes and live web apps?', a: 'Yes. Paste any URL (a Lovable, v0, Bolt, or Replit prototype, or your own live deployment) and participants interact with it while Veritio tracks clicks, task completion, time-on-task, and navigation paths, no code required. For production sites, add a lightweight snippet to run on-site tests. Direct Figma prototype import is coming soon.' },
                  { q: 'Do I need to write any code?', a: 'No. Build studies in the visual builder, or describe your goal and let the AI assistant draft one for you. Prototype and design tests just need a URL. The only place code comes in is the Web App test, where you paste one lightweight snippet onto your live site.' },
                  { q: 'How do I recruit participants, and are there per-response fees?', a: 'Share your study link anywhere (email, Slack, social, or a QR code), or import and manage your own participant lists with screening questions and quotas. There are no per-response or per-participant fees: each plan includes a per-study response allowance, and because you bring your own participants, you never pay per recruited person. Upgrade anytime as your volume grows.' },
                  { q: 'How does the AI analysis work, and can I trust it?', a: 'Once responses come in, Veritio clusters open-ended answers into themes, drafts a summary of key findings, and flags low-quality submissions. It can even ask each participant a tailored follow-up based on what they answered. Every AI output is a starting point you review and edit before sharing, so you stay in control.' },
                  { q: 'What analysis and reports do I get?', a: 'Every method gets purpose-built analysis: similarity matrices and dendrograms for card sorts, click maps and heatmaps for prototypes and live sites, findability and pathways for tree tests, and completion funnels throughout. You can segment results, cross-tabulate questions with significance testing, and A/B test designs to a statistically confident winner. Share findings as a live link, PDF, or CSV.' },
                  { q: 'Can my whole team collaborate on studies?', a: 'Team plans include team workspaces where researchers can co-edit studies, share results, leave comments on findings, and build a shared research repository that grows over time.' },
                  { q: 'Is my data secure and private?', a: 'Your data is encrypted in transit and at rest, and organization-scoped access helps keep studies and responses within the right workspace. You own your participant data and decide how supported results links are shared, including optional password and expiry controls.', href: '/security', linkLabel: 'See how Veritio protects research data' },
                ].map((item, i) => (
                  <div className={`faq-item ${faqOpen === i ? 'faq-item-open' : ''}`} key={item.q} onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>
                    <div className="faq-q">
                      <span>{item.q}</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                    <div className="faq-a-wrap">
                      <div className="faq-a-inner">
                        <p className="faq-a">
                          {item.a}
                          {faqOpen === i && 'href' in item && (
                            <> <Link href={item.href!} className="faq-security-link" onClick={(event) => event.stopPropagation()}>{item.linkLabel} <ArrowIcon size={13} /></Link></>
                          )}
                        </p>
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
              <h2 style={{ position: 'relative', zIndex: 1 }}>Go from Question to Insight in Hours, Not Weeks</h2>
              <p style={{ position: 'relative', zIndex: 1 }}>Start your 7-day free trial. No credit card required, no per-response fees, full access to every study type.</p>
              <a href="https://veritio.io/sign-up" className="cta2-btn" style={{ position: 'relative', zIndex: 1 }}>Create Free Account <ArrowIcon /></a>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  )
}
