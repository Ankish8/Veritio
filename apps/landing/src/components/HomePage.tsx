'use client'

import { useState, useEffect } from 'react'
import FadeIn from '@/components/FadeIn'
import GuideLines from '@/components/GuideLines'
import LineTicker from '@/components/LineTicker'
import ArrowIcon from '@/components/ArrowIcon'
import TextReveal from '@/components/TextReveal'
import TabContent from '@/components/home/TabContent'
import { TABS, CHART_DATA } from '@/components/home/constants'
import useTabTransition from '@/hooks/useTabTransition'
import {
  SmartAssistIcon,
  AutoTasksIcon,
  InstantAnswersIcon,
  AIInsightsIcon,
  WorkflowEngineIcon,
  AnalyticsHubIcon
} from '@/components/AnimatedIcons'

export default function Home() {
  const [activeTab, setActiveTab] = useState('card-sort')
  const [insightTab, setInsightTab] = useState(0)
  const [faqOpen, setFaqOpen] = useState(0)
  const [yearly, setYearly] = useState(false)

  const heroTab = useTabTransition()
  const insightTabTrans = useTabTransition()

  const heroTabRef = heroTab.ref
  const insightTabRef = insightTabTrans.ref

  useEffect(() => { heroTab.animate() }, [activeTab, heroTab.animate])
  useEffect(() => { insightTabTrans.animate() }, [insightTab, insightTabTrans.animate])

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
              <h1>Ship products backed by<br />evidence, not opinions.</h1>
              <p>Surveys, prototype tests, first-click tests, and more — one platform, results in hours. No per-response fees. No seat limits.</p>
              <div className="hero-btns">
                <a href="/signup" className="hero-btn-primary">
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

      {/* BRAND + TICKER + TESTIMONIAL — continuous guide lines */}
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

      {/* WHAT VERITIO CAN DO FOR YOU */}
      <section className="feat-section">
        <GuideLines />
        <div className="feat-section-container">

          {/* Section title */}
          <FadeIn>
            <div className="feat-section-header">
              <div className="feat-badge">
                <span className="feat-badge-dot" />
                WHAT VERITIO CAN DO FOR YOU
              </div>
              <h2>From Study Design to Actionable Insights</h2>
            </div>
          </FadeIn>

          {/* Feature Card 1: Real-time Analytics */}
          <FadeIn delay={1}>
            <div className="feat-card">
              <div className="feat-card-text">
                <div className="feat-card-text-inner">
                  <h3>Watch responses roll in as participants complete studies</h3>
                  <p>See exactly how each study performs the moment data arrives — no waiting for exports or batch reports.</p>
                  <div className="feat-points">
                    <div className="feat-point">
                      <div className="feat-point-icon" style={{ background: '#FFF7ED' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></svg>
                      </div>
                      <h4>Live dashboards</h4>
                      <p>Response counts, completion rates, and drop-offs update every second</p>
                    </div>
                    <div className="feat-point">
                      <div className="feat-point-icon" style={{ background: '#F0FDF4' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                      </div>
                      <h4>Auto-flagged issues</h4>
                      <p>Get alerts when completion drops or participants struggle</p>
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
                  <h3>Know exactly where participants drop off — and why</h3>
                  <p>Completion tracking pinpoints friction in your studies so you can iterate before wasting your recruitment budget.</p>
                  <div className="feat-checklist">
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Spot high-abandonment questions and tasks</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Compare completion rates across participant segments</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Track week-over-week study performance trends</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <LineTicker direction="left" />

          {/* Feature Card 3: Human vs AI */}
          <FadeIn>
            <div className="feat-card">
              <div className="feat-card-text">
                <div className="feat-card-text-inner">
                  <h3>Validate AI-generated insights against real user behavior</h3>
                  <p>Veritio's AI analyzes your study data alongside human reviewers so you can trust the results and ship faster.</p>
                  <div className="feat-checklist">
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Compare AI synthesis accuracy with manual analysis</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Identify where AI catches patterns humans miss</div>
                    <div className="feat-check-item"><span className="feat-check-dot" style={{ background: '#F97316' }} /> Build confidence in AI-assisted research decisions</div>
                  </div>
                </div>
              </div>
              <div className="feat-card-visual">
                <div className="feat-card-gradient">
                  <div className="feat-card-mockup">
                    <div className="feat-mockup-header">Human vs AI Performance</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
                      <div>
                        <div style={{ fontSize: '12px', color: '#4F4D49', marginBottom: '8px' }}>Human</div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{ width: '65%', height: '32px', background: 'var(--accent)', borderRadius: '4px' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#4F4D49', marginBottom: '8px' }}>AI</div>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <div style={{ width: '55%', height: '32px', background: '#ECE5FF', borderRadius: '4px' }} />
                          <div style={{ width: '15%', height: '32px', background: '#93C5FD', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: '#210D02' }}>+20.1%</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', fontSize: '10px', color: '#4F4D49' }}>
                      <span>0%</span><span>10%</span>
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
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none"/><path d="M8.5 8.5a2 2 0 114 0 2 2 0 01-4 0zM11.5 11.5a2 2 0 114 0 2 2 0 01-4 0zM8.5 14.5a2 2 0 114 0 2 2 0 01-4 0zM14.5 8.5a2 2 0 11-4 0" stroke="#F97316" strokeWidth="1.5"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="#E22935" strokeWidth="2"/><circle cx="12" cy="12" r="8" stroke="#E22935" strokeWidth="1.5" strokeDasharray="3 2"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#007DFC" strokeWidth="2.5"/><path d="M12 3a9 9 0 010 18" fill="#007DFC"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.5 4h-3L12 2zm0 20l-1.5-4h3L12 22zM2 12l4-1.5v3L2 12zm20 0l-4 1.5v-3L22 12z" fill="#00CECB"/><circle cx="12" cy="12" r="2" fill="#00CECB"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M4 8l8-5 8 5v8l-8 5-8-5V8z" stroke="#312ECB" strokeWidth="2"/><path d="M4 8l8 5 8-5M12 13v9" stroke="#312ECB" strokeWidth="2"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1" fill="#FF630B"/><rect x="13" y="3" width="8" height="8" rx="1" fill="#F15757"/><rect x="3" y="13" width="8" height="8" rx="1" fill="#7F57F1"/><rect x="13" y="13" width="8" height="8" rx="1" fill="#FF6670"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M10 4h4l2 4-6 8h6l2 4H6l2-4 6-8H8l2-4z" stroke="#312ECB" strokeWidth="1.5" fill="none"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 7v5c0 5.25 3.4 10.15 8 11.25 4.6-1.1 8-6 8-11.25V7l-8-5z" fill="none" stroke="#F97316" strokeWidth="2"/><path d="M12 6l-4 3v3c0 3 1.9 5.8 4 6.5 2.1-.7 4-3.5 4-6.5V9l-4-3z" fill="#F97316" opacity=".2"/></svg>,
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.5 6h-5L12 2zm0 20l-2.5-6h5L12 22zM2 12l6-2.5v5L2 12zm20 0l-6 2.5v-5L22 12z" stroke="#FF8A00" strokeWidth="1.5" fill="none"/></svg>
              ].map((icon, i) => (
                <div key={i} className="int-logo-cell">
                  {icon}
                </div>
              ))}
            </div>
            <a href="/integrations" className="integrations-link">See All Integrations <ArrowIcon size={22} /></a>
          </div>
        </FadeIn>
      </section>

      {/* INSIGHTS SECTION */}
      <section className="insights-section">
        <GuideLines />
        <LineTicker direction="right" />
        <FadeIn>
          <div className="insights-inner">
            <div className="section-badge"><span className="badge-dot" /> ANALYTICS</div>
            <h2 className="insights-heading">Turn Raw Responses into Clear Decisions</h2>
          </div>
        </FadeIn>
        <FadeIn delay={1}>
          <div className="insights-tabs">
            {['Card Sort', 'Tree Test', 'Survey', 'Prototype Test', 'First-Click'].map((t, i) => (
              <div key={t} className={`insights-tab${insightTab === i ? ' active' : ''}`} onClick={() => setInsightTab(i)}>
                <span>{t}</span>
              </div>
            ))}
          </div>
          <div className="insights-showcase">
            <div className="grid-pattern" />
              <div
                ref={insightTabRef}
                key={insightTab}
                className="insights-dashboard"
              >
              <div className="insights-dash-inner">
                <div className="insights-dash-header">
                  <span>Study Completion Funnel</span>
                  <span className="insights-dash-filter">Last 24 hours</span>
                </div>
                <div className="insights-funnel">
                  <svg viewBox="0 0 900 280" width="100%" preserveAspectRatio="none">
                    <path d="M0,0 L300,0 L300,280 L0,280 Z" fill="#8B6914" opacity=".85" />
                    <path d="M300,40 C400,40 350,100 450,100 L450,180 C350,180 400,240 300,240 Z" fill="#F97316" opacity=".85" />
                    <path d="M450,80 C550,80 500,120 600,120 L900,120 L900,160 L600,160 C500,160 550,200 450,200 Z" fill="#B3BBFA" opacity=".6" />
                  </svg>
                  <div className="funnel-label" style={{ left: '12%', top: '55%' }}>100%</div>
                  <div className="funnel-label" style={{ left: '40%', top: '55%' }}>36%</div>
                  <div className="funnel-label" style={{ left: '72%', top: '48%' }}>12%</div>
                </div>
                <div className="insights-dash-stats">
                  <div className="ids-stat">
                    <div className="ids-dot" style={{ background: '#8B6914' }} /> Started
                    <div className="ids-num">7.2K</div>
                  </div>
                  <div className="ids-stat">
                    <div className="ids-dot" style={{ background: '#F97316' }} /> Completed
                    <div className="ids-num">165</div>
                  </div>
                  <div className="ids-stat">
                    <div className="ids-dot" style={{ background: '#B3BBFA' }} /> Analyzed
                    <div className="ids-num">560</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </section>


      {/* PRICING */}
      <section className="pricing-section">
        <GuideLines />
        <div className="pricing-container">
          <FadeIn>
            <div className="pricing-header">
              <div className="section-badge"><span className="badge-dot" /> PRICING</div>
              <h2 className="pricing-heading">Simple Pricing, No Per-Response Fees</h2>
              <div className="pricing-toggle" onClick={() => setYearly(!yearly)}>
                <span className={`pricing-toggle-label${!yearly ? ' active' : ''}`}>Monthly</span>
                <div className={`pricing-toggle-switch${yearly ? ' on' : ''}`}><div className="pricing-toggle-dot" /></div>
                <span className={`pricing-toggle-label${yearly ? ' active' : ''}`}>Yearly</span>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="pricing-cards">
              {/* Basic */}
              <div className="pricing-card">
                <div className="pricing-card-inner">
                  <h3 className="pc-name">Basic</h3>
                  <p className="pc-desc">For solo researchers running surveys, first-click tests, and quick usability studies.</p>
                  <div className="pc-price"><span className="pc-currency">$</span><span className="pc-amount">{yearly ? 23 : 29}</span><span className="pc-period">/{yearly ? 'year' : 'month'}</span></div>
                  <a href="/signup?plan=basic" className="pc-btn pc-btn-dark">
                    Get Started <ArrowIcon />
                  </a>
                  <div className="pc-features">
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Unlimited studies</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Up to 100 responses/study</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Basic analytics dashboard</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> CSV &amp; PDF exports</div>
                  </div>
                </div>
              </div>

              {/* Pro (highlighted) */}
              <div className="pricing-card pricing-card-pro">
                <div className="pricing-card-inner">
                  <h3 className="pc-name">Pro</h3>
                  <p className="pc-desc">For research teams running prototype tests, first-click studies, and multi-method projects.</p>
                  <div className="pc-price"><span className="pc-currency">$</span><span className="pc-amount">{yearly ? 47 : 59}</span><span className="pc-period">/{yearly ? 'year' : 'month'}</span></div>
                  <a href="/signup?plan=pro" className="pc-btn pc-btn-light">
                    Get Started <ArrowIcon />
                  </a>
                  <div className="pc-features">
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="rgba(255,255,255,.3)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Unlimited responses</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="rgba(255,255,255,.3)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> AI-powered analysis &amp; themes</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="rgba(255,255,255,.3)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Prototype &amp; first-click testing</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="rgba(255,255,255,.3)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Team collaboration &amp; sharing</div>
                  </div>
                </div>
              </div>

              {/* Premium */}
              <div className="pricing-card">
                <div className="pricing-card-inner">
                  <h3 className="pc-name">Premium</h3>
                  <p className="pc-desc">For research ops teams managing multiple projects with advanced security needs.</p>
                  <div className="pc-price"><span className="pc-currency">$</span><span className="pc-amount">{yearly ? 79 : 99}</span><span className="pc-period">/{yearly ? 'year' : 'month'}</span></div>
                  <a href="/signup?plan=premium" className="pc-btn pc-btn-yellow">
                    Get Started <ArrowIcon />
                  </a>
                  <div className="pc-features">
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Everything in Pro</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> SSO, SAML &amp; audit logs</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Custom branding &amp; domains</div>
                    <div className="pc-feature"><svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="var(--text-secondary)" /><path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" /></svg> Dedicated success manager</div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="pricing-enterprise">
              <div className="pe-info">
                <div className="pe-label">ENTERPRISE</div>
                <p>Custom participant panels, SLA guarantees, and dedicated onboarding for large research organizations</p>
              </div>
              <div className="pe-features">
                <div className="pe-feat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#F97316" /><path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" /></svg> Everything in Premium</div>
                <div className="pe-feat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="4" fill="#F97316" /><path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" /></svg> Unlimited seats<br />&amp; studies</div>
              </div>
              <a href="/contact" className="pe-btn">Contact Us <ArrowIcon /></a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* PERFORMANCE METRICS */}
      <section className="perf-section">
        <GuideLines />
        <div className="perf-container">
          <FadeIn>
            <div className="perf-header">
              <div className="section-badge"><span className="badge-dot" /> FEATURES</div>
              <h2 className="perf-heading">Deeper Analysis, Better Decisions</h2>
            </div>
          </FadeIn>
          <FadeIn delay={1}>
            <div className="perf-cards">
              {/* Card 1 – Team Performance Snapshot */}
              <div className="perf-card">
                <div className="perf-card-top">
                  <div className="perf-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
                  </div>
                  <h3 className="perf-card-title">Researcher Activity Overview</h3>
                  <p className="perf-card-desc">See which team members are running studies, review velocity, and workload balance at a glance.</p>
                </div>
                <div className="perf-card-img">
                  <div className="perf-mockup-table">
                    <div className="pmt-header"><span>Researcher</span><span>Completion</span><span>Studies</span></div>
                    {[{ name: 'Matt', ratio: '92%', color: 'var(--green)', prs: '8' }, { name: 'Samir', ratio: '87%', color: 'var(--green)', prs: '12' }, { name: 'David', ratio: '74%', color: 'var(--green)', prs: '6' }, { name: 'Priya', ratio: '68%', color: '#EAB308', prs: '9' }].map((r, i) => (
                      <div className="pmt-row" key={i}>
                        <span className="pmt-name"><span className="pmt-avatar" style={{ background: ['#E8B87C','#A8D5BA','#B8C4E0','#D4A8C8'][i] }} />{r.name}</span>
                        <span className="pmt-ratio">{r.ratio} <span className="pmt-dot" style={{ background: r.color }} /></span>
                        <span className="pmt-prs">{r.prs}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2 – Problem Solution Workflow */}
              <div className="perf-card">
                <div className="perf-card-top">
                  <div className="perf-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 12h6M12 9v6" /></svg>
                  </div>
                  <h3 className="perf-card-title">Insight-to-Action Mapping</h3>
                  <p className="perf-card-desc">Connect research findings to design decisions. Track which insights drove which product changes.</p>
                </div>
                <div className="perf-card-img">
                  <div className="perf-mockup-workflow">
                    <div className="pmw-item"><span className="pmw-emoji">&#x1F50D;</span> Finding</div>
                    <div className="pmw-item"><span className="pmw-emoji">&#x2705;</span> Action</div>
                    <div className="pmw-add">+ Add</div>
                  </div>
                </div>
              </div>

              {/* Card 3 – Metric Trend Chart */}
              <div className="perf-card">
                <div className="perf-card-top">
                  <div className="perf-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 6-6" /></svg>
                  </div>
                  <h3 className="perf-card-title">Response Trend Analysis</h3>
                  <p className="perf-card-desc">Visualize how response quality and volume evolve across study iterations.</p>
                </div>
                <div className="perf-card-img">
                  <div className="perf-mockup-chart">
                    <svg viewBox="0 0 242 160" fill="none" className="perf-chart-svg">
                      <path d="M10 120 L50 80 L90 100 L130 60 L170 85 L210 40 L240 55" stroke="#FA7B31" strokeWidth="2.5" fill="none" />
                      <path d="M10 130 L50 110 L90 120 L130 90 L170 105 L210 70 L240 80" stroke="#FFD84B" strokeWidth="2.5" fill="none" strokeDasharray="6 4" />
                      {[10,50,90,130,170,210,240].map((x, i) => (
                        <g key={i}>
                          <circle cx={x} cy={[120,80,100,60,85,40,55][i]} r="4" fill="#FA7B31" />
                          <circle cx={x} cy={[130,110,120,90,105,70,80][i]} r="4" fill="#FFD84B" />
                        </g>
                      ))}
                    </svg>
                    <div className="perf-chart-labels">
                      <span>03-07</span><span>10-14</span><span>17-24</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
        <LineTicker direction="right" />
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
              {/* Top row — 4 equal cards */}
              <div className="extra-top-row">
                {[
                  { icon: <SmartAssistIcon />, title: 'Study Builder', desc: 'AI-assisted study design with smart question suggestions and logic branching' },
                  { icon: <AutoTasksIcon />, title: 'Auto-Recruit', desc: 'Reach qualified participants through built-in panels or your own audience' },
                  { icon: <InstantAnswersIcon />, title: 'Live Results', desc: 'Watch responses stream in and get preliminary findings while data collects' },
                  { icon: <AIInsightsIcon />, title: 'AI Synthesis', desc: 'Automatically cluster open-ended responses and surface recurring themes' },
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

              {/* Bottom row — 1 large + 2 small */}
              <div className="extra-bottom-row">
                <div className="extra-card-lg">
                  <div className="extra-card-text">
                    <h3>Cross-Study Reporting</h3>
                    <p>Combine results from surveys, prototype tests, and usability studies into unified reports — no spreadsheets needed</p>
                  </div>
                  <div className="extra-chart-wrap">
                    <div className="extra-bars">
                      {[
                        [88,66,82,89,71], [77,89,66,82,88], [60,77,89,66,82],
                        [71,88,77,89,66], [55,71,82,66,77], [66,82,71,88,77]
                      ].map((heights, gi) => (
                        <div className="extra-bar-group" key={gi}>
                          {heights.map((h, bi) => (
                            <div key={bi} className="extra-bar" style={{
                              height: `${h}px`,
                              background: ['#B38B00','#FF8A00','#A0B6FF','#7B4AE2','#F2A7FF'][bi]
                            }} />
                          ))}
                        </div>
                      ))}
                    </div>
                    <div className="extra-bar-line" />
                    <div className="extra-bar-labels">
                      <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                    </div>
                  </div>
                </div>
                <div className="extra-card-sm">
                  <div className="extra-card-icon">
                    <WorkflowEngineIcon />
                  </div>
                  <div className="extra-card-text">
                    <h3>Study Templates</h3>
                    <p>Launch common research methods in minutes with pre-built, customizable templates</p>
                  </div>
                </div>
                <div className="extra-card-sm">
                  <div className="extra-card-icon">
                    <AnalyticsHubIcon />
                  </div>
                  <div className="extra-card-text">
                    <h3>Shareable Highlights</h3>
                    <p>Generate stakeholder-ready insight reports with key findings and video clips</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
          <LineTicker direction="left" />
        </div>
      </section>

      {/* FAQ */}
      <section className="faq-section">
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
                  { q: 'What types of UX studies can I run with Veritio?', a: 'Veritio supports surveys with branching logic, prototype testing with Figma imports, first-click testing, live website session recording, and more — including card sorting and tree testing. Everything runs from one platform.' },
                  { q: 'How does the AI analysis work?', a: 'After your study collects responses, Veritio\'s AI automatically clusters open-ended answers, identifies recurring themes, flags low-quality submissions, and generates a summary of key findings. You can review and adjust the AI\'s work before sharing results.' },
                  { q: 'Are there limits on responses or participants?', a: 'The Basic plan includes up to 100 responses per study. Pro and Premium plans have unlimited responses with no per-response fees. You can use your own participant panels or recruit through Veritio\'s built-in audience network.' },
                  { q: 'Can I test prototypes directly from Figma?', a: 'Yes. Connect your Figma account and import prototypes directly into Veritio. Participants interact with your designs while Veritio tracks clicks, task completion, time-on-task, and navigation paths — no code required.' },
                  { q: 'How does Veritio handle data privacy?', a: 'All data is encrypted at rest and in transit. Veritio is GDPR-compliant and supports data residency in the US and EU. Premium and Enterprise plans include SSO, SAML, and audit logging for full compliance control.' },
                  { q: 'Can my whole team collaborate on studies?', a: 'Pro plans and above include team workspaces where researchers can co-edit studies, share results, leave comments on findings, and build a shared research repository that grows over time.' },
                ].map((item, i) => (
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
              <h2 style={{ position: 'relative', zIndex: 1 }}>Go from Question to Insight in Hours, Not Weeks</h2>
              <p style={{ position: 'relative', zIndex: 1 }}>Start your 7-day free trial — no credit card required, no per-response fees, full access to every study type.</p>
              <a href="/signup" className="cta2-btn" style={{ position: 'relative', zIndex: 1 }}>Create Free Account <ArrowIcon /></a>
            </div>
          </FadeIn>
        </div>
      </section>
    </>
  )
}
