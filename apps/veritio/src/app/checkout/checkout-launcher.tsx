'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CustomCheckout, type CheckoutInfo } from '@/components/billing/custom-checkout'
import { PLAN_LABEL, type PlanId } from '@/lib/plans'

/**
 * Fetches the checkout for the resolved org/plan and opens our custom checkout.
 * On success or dismiss, routes into the in-app billing page.
 */
export function CheckoutLauncher({
  orgId,
  plan,
  interval,
}: {
  orgId: string
  plan: 'starter' | 'pro' | 'team'
  interval: 'month' | 'year'
}) {
  const router = useRouter()
  const [info, setInfo] = useState<CheckoutInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/billing/polar/checkout?orgId=${orgId}&plan=${plan}&interval=${interval}&format=json`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('checkout'))))
      .then((data: CheckoutInfo) => {
        if (active) setInfo(data)
      })
      .catch(() => {
        if (active) setError('We could not start your checkout. You can subscribe from the billing page.')
      })
    return () => {
      active = false
    }
  }, [orgId, plan, interval])

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="max-w-sm text-sm text-destructive">{error}</p>
        <Button onClick={() => router.replace('/settings?tab=plan-usage')}>Go to billing</Button>
      </div>
    )
  }

  return (
    <CustomCheckout
      open
      onOpenChange={(open) => {
        if (!open) router.replace('/settings?tab=plan-usage')
      }}
      info={info}
      orgId={orgId}
      plan={plan as PlanId}
      planLabel={PLAN_LABEL[plan]}
      onSuccess={() => router.replace('/settings?tab=plan-usage&checkout=success')}
    />
  )
}
