'use client'

import ArrowIcon from '@/components/ArrowIcon'

type LTDPlan = {
  name: string
  desc: string
  price: number
  href: string
  highlight?: boolean
  features: string[]
}

// One-time lifetime tiers. No monthly/yearly toggle: these prices are paid once.
// CTA hrefs follow the exact contract: ltd-checkout?tier=tier1|tier2|team.
const PLANS: LTDPlan[] = [
  {
    name: 'Solo',
    desc: 'For one researcher who wants to own their toolkit.',
    price: 49,
    href: 'https://veritio.io/ltd-checkout?tier=tier1',
    features: [
      'All 7 study types',
      '1 seat',
      '5 active studies',
      '50 responses per study',
      'AI insights',
      'Lifetime access',
    ],
  },
  {
    name: 'Pro',
    desc: 'For the PM, designer, or researcher going deeper.',
    price: 99,
    href: 'https://veritio.io/ltd-checkout?tier=tier2',
    highlight: true,
    features: [
      '1 seat',
      'Unlimited active studies',
      '100 responses per study',
      'AI insights',
      'AI follow-up questions',
      'Lifetime access',
    ],
  },
  {
    name: 'Team',
    desc: 'For a small squad researching together.',
    price: 199,
    href: 'https://veritio.io/ltd-checkout?tier=team',
    features: [
      '3 seats',
      'Unlimited active studies',
      '100 responses per study',
      'AI insights',
      'AI follow-up questions',
      'Team collaboration',
      'Lifetime access',
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

export default function LTDPricingCards() {
  return (
    <div className="pricing-cards">
      {PLANS.map((p) => (
        <div className={`pricing-card${p.highlight ? ' pricing-card-pro' : ''}`} key={p.name}>
          <div className="pricing-card-inner">
            <h3 className="pc-name">{p.name}</h3>
            <p className="pc-desc">{p.desc}</p>
            <div className="pc-price">
              <span className="pc-currency">$</span>
              <span className="pc-amount">{p.price}</span>
              <span className="pc-period ltd-pc-period">one-time</span>
            </div>
            <div className="pc-billed ltd-pc-billed">Pay once, yours for life</div>
            <a href={p.href} className={`pc-btn ${p.highlight ? 'pc-btn-light' : 'pc-btn-dark'}`}>
              Get lifetime access <ArrowIcon />
            </a>
            <div className="pc-features">
              {p.features.map((f, i) => (
                <div className="pc-feature" key={i}><Check light={p.highlight} /> {f}</div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
