'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'

const TIERS = ['tier1', 'tier2', 'team'] as const
export type LtdTier = (typeof TIERS)[number]

// The embed base depends on window.location, so it must be read on the client.
// useSyncExternalStore keeps SSR and the first client render in agreement (both
// null → the overlay renders nothing) without a setState-in-effect cascade, then
// resolves to the real base on the client. The value never changes after load,
// so subscribe is a no-op.
const NEVER_CHANGES = () => () => {}

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
 * appears directly on /ltd with no navigation. One iframe is mounted on hover
 * (prefetch) and kept warm after dismiss; tier changes are sent into it instead
 * of reloading a separate checkout page for each plan.
 */
export default function LtdCheckoutOverlay() {
  const [active, setActive] = useState<LtdTier | null>(null)
  const [mountedTier, setMountedTier] = useState<LtdTier | null>(null)
  const [loaded, setLoaded] = useState(false)
  const frameRef = useRef<HTMLIFrameElement | null>(null)
  const requestedTierRef = useRef<LtdTier | null>(null)
  const base = useSyncExternalStore(NEVER_CHANGES, ltdEmbedBase, () => null)

  const sendRequestedTier = useCallback(() => {
    const tier = requestedTierRef.current
    const target = frameRef.current?.contentWindow
    if (!tier || !target) return
    target.postMessage({ type: 'ltd-checkout:set-tier', tier }, '*')
  }, [])

  const prepareTier = useCallback((tier: LtdTier) => {
    requestedTierRef.current = tier
    setMountedTier((current) => current ?? tier)
    if (loaded) sendRequestedTier()
  }, [loaded, sendRequestedTier])

  useEffect(() => {
    const onOpen = (e: Event) => {
      const tier = (e as CustomEvent).detail?.tier as LtdTier
      if (!TIERS.includes(tier)) return
      prepareTier(tier)
      setActive(tier)
      document.documentElement.style.overflow = 'hidden'
    }
    const onPrefetch = (e: Event) => {
      const tier = (e as CustomEvent).detail?.tier as LtdTier
      if (TIERS.includes(tier)) prepareTier(tier)
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
  }, [prepareTier])

  // undefined = not yet resolved (SSR + first client render → render nothing, matching);
  // null = host can't embed (CTA falls back to navigation); '' / origin = embeddable.
  if (base == null) return null

  return (
    <div className={`ltd-overlay${active ? ' is-open' : ''}`} aria-hidden={!active}>
      <div className="ltd-overlay-backdrop" />
      {active && !loaded && <div className="ltd-overlay-spinner" aria-label="Loading checkout" />}
      {mountedTier ? (
        <iframe
          ref={frameRef}
          className={`ltd-overlay-frame${active ? ' is-active' : ''}`}
          src={`${base}/ltd-checkout/pay?tier=${mountedTier}&embed=1`}
          title="Veritio lifetime deal checkout"
          allow="payment"
          onLoad={() => {
            setLoaded(true)
            sendRequestedTier()
          }}
        />
      ) : null}
    </div>
  )
}
