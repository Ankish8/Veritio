'use client'

import { useCallback, useEffect, useState } from 'react'

const TIERS = ['tier1', 'tier2', 'team'] as const
export type LtdTier = (typeof TIERS)[number]

/**
 * Where the checkout app lives, relative to where this landing page is served.
 * '' (same origin) when the page is proxied through the app domain, an absolute
 * origin when the landing runs on its own domain, and null when embedding is
 * not possible (the CTA then falls back to a plain navigation).
 */
export function ltdEmbedBase(): string | null {
  if (typeof window === 'undefined') return null
  const { hostname, port, protocol } = window.location
  if (hostname === 'veritio.io' || hostname === 'www.veritio.io') return ''
  if (hostname === 'localhost' && port === '4001') return ''
  if (hostname === 'landing-mu-neon.vercel.app') return 'https://veritio.io'
  // Local landing dev server: talk to the local app (its dev CSP allows :4003).
  if (hostname === 'localhost' && port === '4003') return `${protocol}//localhost:4001`
  return null
}

/** Ask the overlay to open (or warm up) the checkout for a tier. */
export function openLtdCheckout(tier: LtdTier) {
  window.dispatchEvent(new CustomEvent('ltd:open', { detail: { tier } }))
}
export function prefetchLtdCheckout(tier: LtdTier) {
  window.dispatchEvent(new CustomEvent('ltd:prefetch', { detail: { tier } }))
}

/**
 * Full-viewport overlay that shows the app's checkout page (/ltd-checkout/pay
 * in embed mode) in a transparent same-origin iframe, so the payment modal
 * appears directly on /ltd with no navigation. Iframes are mounted on hover
 * (prefetch) and kept warm after dismiss, so opening is instant.
 */
export default function LtdCheckoutOverlay() {
  const [active, setActive] = useState<LtdTier | null>(null)
  const [mounted, setMounted] = useState<Record<LtdTier, boolean>>({ tier1: false, tier2: false, team: false })
  const [loaded, setLoaded] = useState<Record<LtdTier, boolean>>({ tier1: false, tier2: false, team: false })
  // Compute the embed base AFTER mount (it needs window). Starting undefined keeps
  // the server render and first client render identical (both null) — no hydration
  // mismatch — then it resolves to '' / an origin (embeddable) or null (not).
  const [base, setBase] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    setBase(ltdEmbedBase())
  }, [])

  const mount = useCallback((tier: LtdTier) => {
    setMounted((m) => (m[tier] ? m : { ...m, [tier]: true }))
  }, [])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const tier = (e as CustomEvent).detail?.tier as LtdTier
      if (!TIERS.includes(tier)) return
      mount(tier)
      setActive(tier)
      document.documentElement.style.overflow = 'hidden'
    }
    const onPrefetch = (e: Event) => {
      const tier = (e as CustomEvent).detail?.tier as LtdTier
      if (TIERS.includes(tier)) mount(tier)
    }
    const onMessage = (e: MessageEvent) => {
      if ((e.data as { type?: string })?.type === 'ltd-checkout:close') {
        setActive(null)
        document.documentElement.style.overflow = ''
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActive(null)
        document.documentElement.style.overflow = ''
      }
    }
    window.addEventListener('ltd:open', onOpen)
    window.addEventListener('ltd:prefetch', onPrefetch)
    window.addEventListener('message', onMessage)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('ltd:open', onOpen)
      window.removeEventListener('ltd:prefetch', onPrefetch)
      window.removeEventListener('message', onMessage)
      window.removeEventListener('keydown', onKey)
      document.documentElement.style.overflow = ''
    }
  }, [mount])

  // undefined = not yet resolved (SSR + first client render → render nothing, matching);
  // null = host can't embed (CTA falls back to navigation); '' / origin = embeddable.
  if (base == null) return null

  return (
    <div className={`ltd-overlay${active ? ' is-open' : ''}`} aria-hidden={!active}>
      <div className="ltd-overlay-backdrop" />
      {active && !loaded[active] && <div className="ltd-overlay-spinner" aria-label="Loading checkout" />}
      {TIERS.map((tier) =>
        mounted[tier] ? (
          <iframe
            key={tier}
            className={`ltd-overlay-frame${active === tier ? ' is-active' : ''}`}
            src={`${base}/ltd-checkout/pay?tier=${tier}&embed=1`}
            title="Veritio lifetime deal checkout"
            allow="payment"
            onLoad={() => setLoaded((l) => ({ ...l, [tier]: true }))}
          />
        ) : null,
      )}
    </div>
  )
}
