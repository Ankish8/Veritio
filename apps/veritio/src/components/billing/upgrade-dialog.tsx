'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { Check, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import { PLAN_LABEL, PLAN_PRICING, type PlanId } from '@/lib/plans'
import { SWR_KEYS } from '@/lib/swr'
import { celebrate } from '@/lib/confetti'
import { CustomCheckout, type CheckoutInfo } from '@/components/billing/custom-checkout'

type PaidPlan = 'starter' | 'pro' | 'team'
const PAID: PaidPlan[] = ['starter', 'pro', 'team']

const HIGHLIGHTS: Record<PaidPlan, string[]> = {
  starter: ['All study types', '50 responses / study', '5 active studies', '1 seat'],
  pro: ['Everything in Starter', '100 responses / study', 'Unlimited studies', 'Recordings + AI (BYOK)'],
  team: ['Everything in Pro', '3 seats included', 'Real-time collaboration', 'Roles & permissions'],
}

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  currentPlan: PlanId
  /** When true, the org already has a paid subscription → plan changes go through the API (proration), not a new checkout. */
  hasActiveSubscription: boolean
  /** Which plan card to visually highlight. Defaults to 'pro'. Set by the trigger so the card matches the CTA (e.g. 'team' when opened from "Upgrade to Team"). */
  highlightPlan?: PaidPlan
  onChanged?: () => void
}

export function UpgradeDialog({ open, onOpenChange, orgId, currentPlan, hasActiveSubscription, highlightPlan = 'pro', onChanged }: UpgradeDialogProps) {
  const { mutate } = useSWRConfig()
  const [interval, setInterval] = useState<'month' | 'year'>('month')
  const [busyPlan, setBusyPlan] = useState<PaidPlan | null>(null)
  const [confirmPlan, setConfirmPlan] = useState<PaidPlan | null>(null)
  const [checkoutInfo, setCheckoutInfo] = useState<CheckoutInfo | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutLabel, setCheckoutLabel] = useState('')
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlan>('starter')

  async function startCheckout(plan: PaidPlan) {
    setBusyPlan(plan)
    try {
      const res = await fetch(
        `/api/billing/polar/checkout?orgId=${orgId}&plan=${plan}&interval=${interval}&format=json`,
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error('checkout')
      const info = (await res.json()) as CheckoutInfo
      setCheckoutInfo(info)
      setCheckoutLabel(PLAN_LABEL[plan])
      setCheckoutPlan(plan)
      onOpenChange(false) // close the plan picker
      setCheckoutOpen(true) // open the custom 2-column checkout
    } catch {
      toast.error('Could not start checkout. Please try again.')
    } finally {
      setBusyPlan(null)
    }
  }

  async function changePlan(plan: PaidPlan) {
    setBusyPlan(plan)
    try {
      const res = await fetch('/api/billing/polar/change-plan', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, plan, interval }),
      })
      if (!res.ok) throw new Error()
      // Optimistically flip this org to the new plan in the org-list cache so the
      // sidebar card + badge update instantly (no reload), then revalidate.
      void mutate(
        SWR_KEYS.organizations,
        (orgs: unknown) =>
          Array.isArray(orgs)
            ? orgs.map((o) =>
                (o as { id?: string })?.id === orgId ? { ...(o as object), plan, plan_status: 'active' } : o,
              )
            : orgs,
        { revalidate: true },
      )
      void celebrate()
      toast.success(`Plan changed to ${PLAN_LABEL[plan]}`)
      onOpenChange(false)
      onChanged?.()
    } catch {
      toast.error('Could not change plan. Please try again.')
    } finally {
      setBusyPlan(null)
      setConfirmPlan(null)
    }
  }

  function handleSelect(plan: PaidPlan) {
    // Only block the active PAID current plan. On a trial, the current plan
    // (Starter) is still subscribable to convert the trial into a paid plan.
    if (hasActiveSubscription && plan === currentPlan) return
    if (hasActiveSubscription) setConfirmPlan(plan)
    else startCheckout(plan)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl duration-300 ease-out data-open:slide-in-from-bottom-2 data-closed:slide-out-to-bottom-2">
          <DialogHeader>
            <DialogTitle>Choose your plan</DialogTitle>
            <DialogDescription>Upgrade or change your Veritio plan. Cancel anytime.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-center">
            <SegmentedControl
              options={[
                { value: 'month', label: 'Monthly' },
                { value: 'year', label: 'Yearly' },
              ]}
              value={interval}
              onValueChange={(v) => setInterval(v as 'month' | 'year')}
              size="sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {PAID.map((plan) => {
              const price = interval === 'year' ? PLAN_PRICING[plan].yearlyMonthly : PLAN_PRICING[plan].monthly
              const isCurrentPlan = plan === currentPlan
              const isCurrentSubscription = hasActiveSubscription && isCurrentPlan
              const featured = plan === highlightPlan
              return (
                <div
                  key={plan}
                  className={cn(
                    'flex flex-col rounded-xl border p-4',
                    featured ? 'border-primary ring-1 ring-primary/30' : 'border-border',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{PLAN_LABEL[plan]}</h3>
                    {isCurrentPlan && <Badge variant="secondary">Current</Badge>}
                  </div>
                  <div className="mt-2">
                    <span className="text-2xl font-semibold">${price}</span>
                    <span className="text-sm text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{interval === 'year' ? 'billed annually' : 'billed monthly'}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    {HIGHLIGHTS[plan].map((h) => (
                      <li key={h} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full"
                    variant={isCurrentSubscription ? 'outline' : featured ? 'default' : 'secondary'}
                    disabled={isCurrentSubscription || busyPlan !== null}
                    onClick={() => handleSelect(plan)}
                  >
                    {busyPlan === plan ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrentSubscription ? (
                      'Current plan'
                    ) : hasActiveSubscription ? (
                      `Switch to ${PLAN_LABEL[plan]}`
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {confirmPlan && (
        <ConfirmDialog
          open={!!confirmPlan}
          onOpenChange={(o) => !o && setConfirmPlan(null)}
          variant="info"
          title={`Switch to ${PLAN_LABEL[confirmPlan]}?`}
          description={`Your plan will change to ${PLAN_LABEL[confirmPlan]}, billed ${interval === 'year' ? 'yearly' : 'monthly'}. We'll prorate the difference on your next invoice, so you only pay for what you use.`}
          confirmText="Confirm change"
          loading={busyPlan !== null}
          onConfirm={() => changePlan(confirmPlan)}
        />
      )}

      <CustomCheckout
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        info={checkoutInfo}
        orgId={orgId}
        plan={checkoutPlan}
        planLabel={checkoutLabel}
        onSuccess={onChanged}
      />
    </>
  )
}
