'use client'

import { useCallback, useEffect, useRef } from 'react'
import ArrowIcon from '@/components/ArrowIcon'
import { ltdEmbedBase, openLtdCheckout, prefetchLtdCheckout, type LtdTier } from '@/components/LtdCheckoutOverlay'
import { trackMetaEvent } from '@/lib/meta'

type LTDPlan = {
  name: string
  desc: string
  price: number
  href: string
  tier: LtdTier
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
    tier: 'tier1',
    features: [
      'All 7 study types',
      '1 seat',
      '5 active studies',
      '50 responses per study',
      'AI analysis with your own key (BYOK)',
      'Lifetime access',
    ],
  },
  {
    name: 'Pro',
    desc: 'For the PM, designer, or researcher going deeper.',
    price: 99,
    href: 'https://veritio.io/ltd-checkout?tier=tier2',
    tier: 'tier2',
    highlight: true,
    features: [
      'All 7 study types',
      '1 seat',
      'Unlimited active studies',
      '100 responses per study',
      'Session recordings & clips',
      'AI analysis with your own key (BYOK)',
      'AI follow-up questions',
      'Lifetime access',
    ],
  },
  {
    name: 'Team',
    desc: 'For a small squad researching together.',
    price: 199,
    href: 'https://veritio.io/ltd-checkout?tier=team',
    tier: 'team',
    features: [
      'All 7 study types',
      '3 seats',
      'Unlimited active studies',
      '100 responses per study',
      'Session recordings & clips',
      'AI analysis with your own key (BYOK)',
      'AI follow-up questions',
      'Team collaboration',
      'Lifetime access',
    ],
  },
]

const DEFAULT_WARM_TIER = PLANS.find((plan) => plan.highlight)?.tier ?? PLANS[0].tier

function trackLtdCheckoutIntent(plan: LTDPlan) {
  trackMetaEvent('InitiateCheckout', {
    content_name: `Veritio LTD ${plan.name}`,
    content_category: 'ltd',
    content_ids: [`veritio_ltd_${plan.tier}`],
    content_type: 'lifetime',
    value: plan.price,
    currency: 'USD',
  })
}

function Check({ light }: { light?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="4" fill={light ? 'var(--text-primary)' : 'var(--text-secondary)'} />
      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export default function LTDPricingCards() {
  const cardsRef = useRef<HTMLDivElement | null>(null)

  const warmTier = useCallback((tier: LtdTier) => {
    if (ltdEmbedBase() !== null) prefetchLtdCheckout(tier)
  }, [])

  // Warm the checkout app before the CTA is clicked. The overlay keeps one app
  // iframe alive and swaps its tier by postMessage, so hover can prepare the
  // exact plan without spawning three separate checkout pages.
  useEffect(() => {
    if (ltdEmbedBase() === null) return
    let done = false
    const warm = () => {
      if (done) return
      done = true
      warmTier(DEFAULT_WARM_TIER)
      cleanup()
      observer?.disconnect()
    }
    const events: Array<keyof WindowEventMap> = ['scroll', 'pointermove', 'touchstart']
    const cleanup = () => events.forEach((ev) => window.removeEventListener(ev, warm))
    let observer: IntersectionObserver | null = null

    if ('IntersectionObserver' in window && cardsRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) warm()
        },
        { rootMargin: '900px 0px' },
      )
      observer.observe(cardsRef.current)
    } else {
      events.forEach((ev) => window.addEventListener(ev, warm, { passive: true, once: true }))
    }

    return () => {
      cleanup()
      observer?.disconnect()
    }
  }, [warmTier])

  return (
    <div className="pricing-cards" ref={cardsRef}>
      {PLANS.map((p) => (
        <div
          className={`pricing-card${p.highlight ? ' pricing-card-pro' : ''}`}
          key={p.name}
          // Card is a much bigger hover target than the button, so warming here
          // buys extra lead time and lets the warm checkout frame switch to the
          // exact tier before the click.
          onMouseEnter={() => {
            warmTier(p.tier)
          }}
        >
          <div className="pricing-card-inner">
            <h3 className="pc-name">{p.name}</h3>
            <p className="pc-desc">{p.desc}</p>
            <div className="pc-price">
              <span className="pc-currency">$</span>
              <span className="pc-amount">{p.price}</span>
              <span className="pc-period ltd-pc-period">one-time</span>
            </div>
            <div className="pc-billed ltd-pc-billed">Pay once, yours for life</div>
            <a
              href={p.href}
              className={`pc-btn ${p.highlight ? 'pc-btn-light' : 'pc-btn-dark'}`}
              // Open the checkout as an overlay on this page (iframe of the app's
              // embed checkout); the href stays as the fallback for hosts where
              // embedding is not possible, middle-clicks, and no-JS.
              onClick={(e) => {
                if (ltdEmbedBase() === null) return
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                e.preventDefault()
                trackLtdCheckoutIntent(p)
                openLtdCheckout(p.tier)
              }}
              onMouseEnter={() => {
                warmTier(p.tier)
              }}
              onTouchStart={() => {
                warmTier(p.tier)
              }}
            >
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
