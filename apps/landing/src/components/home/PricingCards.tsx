'use client'

import { useState } from 'react'
import ArrowIcon from '@/components/ArrowIcon'

type Plan = {
  name: string
  desc: string
  monthly: number
  yearlyMonthly: number
  href: string
  highlight?: boolean
  /** Only Starter offers a free trial; Pro/Team are subscribe-only. */
  freeTrial?: boolean
  features: string[]
}

const PLANS: Plan[] = [
  {
    name: 'Starter',
    desc: 'For individuals getting started with research.',
    monthly: 19,
    yearlyMonthly: 14,
    href: 'https://veritio.io/sign-up?plan=starter',
    freeTrial: true,
    features: [
      'All 7 study types',
      'Custom branding (logo & colors)',
      '50 responses per study',
      '5 active studies',
      '1 user',
    ],
  },
  {
    name: 'Pro',
    desc: 'For the PM, designer, or researcher going deeper.',
    monthly: 39,
    yearlyMonthly: 29,
    href: 'https://veritio.io/sign-up?plan=pro',
    highlight: true,
    features: [
      'Everything in Starter, plus:',
      '100 responses per study',
      'Unlimited active studies',
      'Session recordings & clips',
      'AI analysis with your own key (BYOK)',
    ],
  },
  {
    name: 'Team',
    desc: 'For a squad researching together.',
    monthly: 89,
    yearlyMonthly: 69,
    href: 'https://veritio.io/sign-up?plan=team',
    features: [
      'Everything in Pro, plus:',
      '3 team members included (+$39/seat)',
      'Real-time collaboration & shared repository',
      'Roles, permissions & comments',
      'Priority support',
    ],
  },
]

function Check({ light }: { light?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" fill={light ? 'var(--text-primary)' : 'var(--text-secondary)'} />
      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export default function PricingCards() {
  const [yearly, setYearly] = useState(false)

  return (
    <>
      <div className="pricing-toggle" onClick={() => setYearly(!yearly)}>
        <span className={`pricing-toggle-label${!yearly ? ' active' : ''}`}>Monthly</span>
        <div className={`pricing-toggle-switch${yearly ? ' on' : ''}`}><div className="pricing-toggle-dot" /></div>
        <span className={`pricing-toggle-label${yearly ? ' active' : ''}`}>Yearly</span>
      </div>

      <div className="pricing-cards">
        {PLANS.map((p) => {
          const amount = yearly ? p.yearlyMonthly : p.monthly
          return (
            <div className={`pricing-card${p.highlight ? ' pricing-card-pro' : ''}`} key={p.name}>
              <div className="pricing-card-inner">
                <h3 className="pc-name">{p.name}</h3>
                <p className="pc-desc">{p.desc}</p>
                <div className="pc-price">
                  <span className="pc-currency">$</span>
                  <span className="pc-amount">{amount}</span>
                  <span className="pc-period">/mo</span>
                </div>
                <div className="pc-billed">
                  {yearly
                    ? 'billed annually'
                    : p.freeTrial
                      ? '7-day free trial, no card'
                      : 'billed monthly, cancel anytime'}
                </div>
                <a href={p.href} className={`pc-btn ${p.highlight ? 'pc-btn-light' : 'pc-btn-dark'}`}>
                  {p.freeTrial ? 'Start free trial' : 'Subscribe'} <ArrowIcon />
                </a>
                <div className="pc-features">
                  {p.features.map((f, i) => (
                    <div className="pc-feature" key={i}><Check light={p.highlight} /> {f}</div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
