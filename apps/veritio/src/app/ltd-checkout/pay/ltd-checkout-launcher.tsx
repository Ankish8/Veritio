'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LtdCheckout, type CheckoutInfo } from '@/components/billing/ltd-checkout'
import { PLAN_LABEL, type LifetimePlanId } from '@/lib/plans'

const TIER_TO_PLAN: Record<string, LifetimePlanId> = {
  tier1: 'lifetime_tier1',
  tier2: 'lifetime_tier2',
  team: 'lifetime_team',
}

/**
 * Fetches the one-time checkout for the resolved org/tier and opens our custom
 * lifetime-deal checkout. On success or dismiss, routes into the in-app billing page.
 */
export function LtdCheckoutLauncher({
  orgId,
  tier,
}: {
  orgId: string
  tier: 'tier1' | 'tier2' | 'team'
}) {
  const router = useRouter()
  const plan = TIER_TO_PLAN[tier]
  const [info, setInfo] = useState<CheckoutInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/billing/polar/ltd-checkout?orgId=${orgId}&tier=${tier}&format=json`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('checkout'))))
      .then((data: CheckoutInfo) => {
        if (active) setInfo(data)
      })
      .catch(() => {
        if (active) setError('We could not start your checkout. Please try again from the billing page.')
      })
    return () => {
      active = false
    }
  }, [orgId, tier])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="max-w-sm text-sm text-destructive">{error}</p>
        <Button onClick={() => router.replace('/settings?tab=plan-usage')}>Go to billing</Button>
      </div>
    )
  }

  return (
    <LtdCheckout
      open
      onOpenChange={(open) => {
        if (!open) router.replace('/settings?tab=plan-usage')
      }}
      info={info}
      orgId={orgId}
      plan={plan}
      planLabel={PLAN_LABEL[plan]}
      onSuccess={() => router.replace('/settings?tab=plan-usage&checkout=success')}
    />
  )
}
