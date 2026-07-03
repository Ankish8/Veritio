'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LtdCheckout, type CheckoutInfo } from '@/components/billing/ltd-checkout'
import { PLAN_LABEL, type LifetimePlanId } from '@/lib/plans'

const TIER_TO_PLAN: Record<string, LifetimePlanId> = {
  tier1: 'lifetime_tier1',
  tier2: 'lifetime_tier2',
  team: 'lifetime_team',
}

type ClaimState =
  | { phase: 'polling' }
  | { phase: 'ready'; code: string }
  | { phase: 'emailed' } // webhook slower than the poll window — the email has the link

/**
 * Payment-first LTD checkout. Fetches the one-time checkout (org-scoped when a
 * signed-in owner is present, anonymous otherwise) and opens the custom modal.
 *
 * Anonymous success: the order.paid webhook records the purchase and emails the
 * activation link; this screen polls for the activation code so the buyer can
 * continue to signup immediately. If the webhook is slow, the email is the
 * guaranteed fallback — the payment is never lost either way.
 */
/** Tell the /ltd overlay host to hide us (embed mode only). */
function notifyParentClose() {
  try {
    window.parent?.postMessage({ type: 'ltd-checkout:close' }, '*')
  } catch {
    /* not embedded */
  }
}

/** Navigate the TOP window (absolute URL so it works from a cross-origin parent too). */
function topNavigate(path: string) {
  const url = new URL(path, window.location.origin).toString()
  try {
    if (window.top) {
      window.top.location.href = url
      return
    }
  } catch {
    /* cross-origin top without permission — fall through */
  }
  window.location.assign(url)
}

export function LtdCheckoutLauncher({
  orgId,
  tier,
  embed = false,
}: {
  orgId: string | null
  tier: 'tier1' | 'tier2' | 'team'
  /** Rendered inside the /ltd overlay iframe: dismiss hides the overlay instead of navigating. */
  embed?: boolean
}) {
  const router = useRouter()
  const plan = TIER_TO_PLAN[tier]
  const [info, setInfo] = useState<CheckoutInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paid, setPaid] = useState(false)
  // Ref mirror of `paid`: the modal fires onSuccess then onOpenChange(false) in the
  // same tick, so the close handler must not read stale state and bounce the buyer.
  const paidRef = useRef(false)
  const [claim, setClaim] = useState<ClaimState>({ phase: 'polling' })
  const pollAbort = useRef(false)

  useEffect(() => {
    let active = true
    const qs = orgId ? `orgId=${orgId}&tier=${tier}` : `tier=${tier}`
    fetch(`/api/billing/polar/ltd-checkout?${qs}&format=json`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('checkout'))))
      .then((data: CheckoutInfo) => {
        if (active) setInfo(data)
      })
      .catch(() => {
        if (active) setError('We could not start your checkout. Please try again in a moment.')
      })
    return () => {
      active = false
    }
  }, [orgId, tier])

  // After an anonymous payment, poll for the activation code (webhooks usually
  // land within seconds). ~40s window, then fall back to the email.
  useEffect(() => {
    if (!paid || orgId || !info?.clientSecret) return
    pollAbort.current = false
    let attempts = 0
    const tick = async () => {
      if (pollAbort.current) return
      attempts += 1
      try {
        const res = await fetch('/api/billing/polar/ltd-claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientSecret: info.clientSecret }),
        })
        const data = (await res.json().catch(() => ({}))) as { ready?: boolean; code?: string | null }
        if (data.ready && data.code) {
          setClaim({ phase: 'ready', code: data.code })
          return
        }
      } catch {
        /* transient — keep polling */
      }
      if (attempts >= 16) {
        setClaim({ phase: 'emailed' })
        return
      }
      window.setTimeout(tick, 2500)
    }
    void tick()
    return () => {
      pollAbort.current = true
    }
  }, [paid, orgId, info?.clientSecret])

  if (error) {
    return (
      <div className="relative z-10 flex flex-col items-center gap-3 text-center">
        <p className="max-w-sm text-sm text-destructive">{error}</p>
        <Button onClick={() => (embed ? notifyParentClose() : router.replace('/ltd'))}>
          {embed ? 'Close' : 'Back to the deal'}
        </Button>
      </div>
    )
  }

  // ── Anonymous post-payment success screen ──
  if (paid && !orgId) {
    return (
      <>
        {/* In embed mode the dialog (and its dim layer) is gone, so provide our own. */}
        {embed && <div className="fixed inset-0 bg-black/50" aria-hidden="true" />}
        <div className="relative z-10 w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <CheckCircle2 className="mx-auto h-10 w-10 text-green-600" />
          <h1 className="mt-3 text-xl font-semibold">Payment received</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your {PLAN_LABEL[plan]} lifetime access is secured. Create your account to start using it.
          </p>

          {claim.phase === 'ready' ? (
            <Button
              className="mt-6 w-full"
              onClick={() => topNavigate(`/redeem?code=${encodeURIComponent(claim.code)}`)}
            >
              Create account &amp; activate
            </Button>
          ) : claim.phase === 'polling' ? (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing your activation link…
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" /> We emailed your activation link.
              </p>
              <Button className="w-full" onClick={() => topNavigate('/redeem')}>
                Create account &amp; enter code
              </Button>
            </div>
          )}

          <p className="mt-5 text-xs text-muted-foreground">
            We also emailed your activation code{info?.customerEmail ? ` to ${info.customerEmail}` : ''}, so you can
            finish signup anytime. Trouble? support@veritio.io
          </p>
        </div>
      </>
    )
  }

  return (
    <>
      {!embed && (
        <p className="relative z-10 text-sm text-muted-foreground">
          {info ? 'Complete your one-time purchase' : 'Preparing your checkout…'}
        </p>
      )}
      <LtdCheckout
        open
        onOpenChange={(open) => {
          if (!open && !paidRef.current) {
            if (embed) {
              // Keep the dialog mounted and warm; just hide the overlay on /ltd so
              // reopening is instant.
              notifyParentClose()
              return
            }
            // Dismissed without paying — back to the deal page (or billing for org buyers).
            if (orgId) router.replace('/settings?tab=plan-usage')
            else window.location.assign('/ltd')
          }
        }}
        info={info}
        orgId={orgId}
        plan={plan}
        planLabel={PLAN_LABEL[plan]}
        onSuccess={() => {
          paidRef.current = true
          if (orgId) router.replace('/settings?tab=plan-usage&checkout=success')
          else setPaid(true)
        }}
      />
    </>
  )
}
