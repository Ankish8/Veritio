'use client'

import { useEffect, useState } from 'react'
import { mutate } from 'swr'
import { CreditCard, Download, Check, Minus, Plus } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/use-organizations'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { useBillingDetails } from '@/hooks/use-billing-details'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { SWR_KEYS } from '@/lib/swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { UpgradeDialog } from '@/components/billing/upgrade-dialog'
import { toast } from '@/components/ui/sonner'
import { formatBillingDate, formatCurrency } from '@/lib/utils'
import { EXTRA_SEAT_MONTHLY, PLAN_ENTITLEMENTS, PLAN_PRICING, type PlanId, type PlanStatus } from '@/lib/plans'

const STATUS_BADGE: Record<PlanStatus, { label: string; variant: 'secondary' | 'default' | 'destructive' }> = {
  trialing: { label: 'Trial', variant: 'default' },
  active: { label: 'Active', variant: 'secondary' },
  past_due: { label: 'Past due', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'destructive' },
}

function fmtLimit(n: number): string {
  return n === Infinity ? 'Unlimited' : String(n)
}

function UsageRow({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = limit === Infinity
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">
          {used} / {fmtLimit(limit)}
        </span>
      </div>
      {!unlimited && <Progress value={pct} />}
    </div>
  )
}

function FeatureRow({ label, included, requiredPlan }: { label: string; included: boolean; requiredPlan: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-foreground">{label}</span>
      {included ? (
        <span className="inline-flex items-center gap-1.5 text-green-600">
          <Check className="size-4" /> Included
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Minus className="size-4" /> {requiredPlan}
        </span>
      )}
    </div>
  )
}

export function PlanUsageTab() {
  const { currentOrg, organizations, isLoading: orgLoading } = useCurrentOrganization()
  const fullOrg = (organizations.find((o) => o.id === currentOrg?.id) ?? currentOrg) as
    | ({ id?: string; member_count?: number; extra_seats?: number } | null)
    | undefined
  const {
    orgId,
    plan,
    planStatus,
    label,
    isLegacy,
    isEducation,
    accessEndsAt,
    termDaysRemaining,
    isActivePaid,
    isTrialing,
    daysLeft,
    locked,
  } = useCurrentPlan()
  // Education licenses are invoiced against a purchase order, so there is no
  // Polar subscription, payment method, or invoice history to show.
  const isSelfServeBilling = !isLegacy && !isEducation
  const { summary, invoices, isLoading: billingLoading, refresh } = useBillingDetails(
    isSelfServeBilling ? orgId : null,
  )
  const { stats } = useDashboardStats()

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [seatDraft, setSeatDraft] = useState(PLAN_ENTITLEMENTS.team.seats)
  const [seatSaving, setSeatSaving] = useState(false)

  const limits = PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.starter
  const extraSeats = fullOrg?.extra_seats ?? 0
  const seatLimit = limits.seats === Infinity ? Infinity : limits.seats + extraSeats
  const memberCount = fullOrg?.member_count ?? 1
  const activeStudies = stats?.activeStudies ?? 0
  const sub = summary?.subscription
  const pm = summary?.paymentMethod
  // Only recurring plans have monthly/yearly pricing (legacy + lifetime plans don't).
  const paidPricing = plan === 'starter' || plan === 'pro' || plan === 'team' ? PLAN_PRICING[plan] : null
  const teamBaseSeats = PLAN_ENTITLEMENTS.team.seats
  const canManageBilling = currentOrg?.user_role === 'owner' || currentOrg?.user_role === 'admin'
  const canManageSeats = canManageBilling && plan === 'team' && isActivePaid && seatLimit !== Infinity
  const draftExtraSeats = Math.max(0, seatDraft - teamBaseSeats)

  useEffect(() => {
    if (seatLimit !== Infinity) setSeatDraft(seatLimit)
  }, [seatLimit])

  if (orgLoading || !fullOrg) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const priceText = isLegacy
    ? 'Unlimited'
    : isEducation
      ? 'Institutional license'
      : sub
        ? `${formatCurrency(sub.amount, sub.currency)}/${sub.recurringInterval === 'year' ? 'yr' : 'mo'}`
        : paidPricing
          ? `$${paidPricing.monthly}/mo`
          : ''

  // An education license runs to a fixed date, so it reports the term rather than
  // a renewal. Never the trial wording: these organizations are paid, not trialing.
  const educationTermText = accessEndsAt
    ? termDaysRemaining > 0
      ? `Access runs to ${formatBillingDate(accessEndsAt)} · ${termDaysRemaining} day${termDaysRemaining === 1 ? '' : 's'} left`
      : `This access period ended ${formatBillingDate(accessEndsAt)}`
    : 'Institutional license with no end date set'

  // An education org keeps plan_status 'active' after its term ends (the date is
  // what closes access), so the badge has to follow the term, not the status.
  const statusBadge =
    isEducation && locked ? { label: 'Ended', variant: 'destructive' as const } : STATUS_BADGE[planStatus]

  const renewalText = isEducation
    ? educationTermText
    : isTrialing
      ? daysLeft > 0
        ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial`
        : 'Your trial has ended'
      : sub?.currentPeriodEnd
        ? `${sub.cancelAtPeriodEnd ? 'Ends' : 'Renews'} ${formatBillingDate(sub.currentPeriodEnd)}`
        : isLegacy
          ? 'Grandfathered plan with unlimited usage'
          : 'Your current plan'

  async function handleCancel() {
    setCanceling(true)
    try {
      const res = await fetch('/api/billing/polar/cancel', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })
      if (!res.ok) throw new Error()
      toast.success('Your subscription will cancel at the end of the period')
      refresh()
    } catch {
      toast.error('Could not cancel. Please try again.')
    } finally {
      setCanceling(false)
      setCancelOpen(false)
    }
  }

  async function handleUpdateSeats() {
    setSeatSaving(true)
    try {
      const res = await fetch('/api/billing/polar/seats', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId, totalSeats: seatDraft }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Could not update seats')
      toast.success('Seats updated')
      refresh()
      mutate(SWR_KEYS.organizations)
      if (orgId) mutate(SWR_KEYS.organization(orgId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update seats')
    } finally {
      setSeatSaving(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Plan summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {label} plan
                <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
              </CardTitle>
              <CardDescription>{renewalText}</CardDescription>
            </div>
            <div className="shrink-0 text-right text-sm font-medium text-foreground">{priceText}</div>
          </div>
        </CardHeader>
        {isSelfServeBilling && canManageBilling && (
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setUpgradeOpen(true)}>{isActivePaid ? 'Change plan' : 'Upgrade'}</Button>
            {isActivePaid && !sub?.cancelAtPeriodEnd && (
              <Button variant="outline" onClick={() => setCancelOpen(true)}>
                Cancel plan
              </Button>
            )}
            {sub?.cancelAtPeriodEnd && (
              <span className="self-center text-sm text-muted-foreground">Cancels at period end</span>
            )}
          </CardContent>
        )}
      </Card>

      {/* Payment method */}
      {isSelfServeBilling && pm && (
        <Card>
          <CardHeader>
            <CardTitle>Payment method</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                <span className="capitalize">{pm.brand}</span> •••• {pm.last4}
                {pm.expMonth ? ` · expires ${pm.expMonth}/${pm.expYear}` : ''}
              </span>
            </div>
            {canManageBilling && (
              <a href={`/api/billing/polar/portal?orgId=${orgId}`}>
                <Button variant="outline" size="sm">
                  Update
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Your current usage against this plan&apos;s limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageRow label="Active studies" used={activeStudies} limit={limits.activeStudies} />
          <UsageRow label="Team members" used={memberCount} limit={seatLimit} />
          <div className="pt-1 text-sm text-muted-foreground">
            Responses per study: {fmtLimit(limits.responsesPerStudy)}
            {plan === 'team' ? ` · extra seats $${EXTRA_SEAT_MONTHLY}/mo` : ''}
          </div>
          {canManageSeats && (
            <div className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Team seats</p>
                  <p className="text-sm text-muted-foreground">
                    {teamBaseSeats} included
                    {draftExtraSeats > 0 ? ` + ${draftExtraSeats} extra at $${EXTRA_SEAT_MONTHLY}/seat/mo` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setSeatDraft((value) => Math.max(teamBaseSeats, value - 1))}
                    disabled={seatSaving || seatDraft <= teamBaseSeats}
                    title="Remove one seat"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-10 text-center text-sm font-medium">{seatDraft}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setSeatDraft((value) => value + 1)}
                    disabled={seatSaving}
                    title="Add one seat"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUpdateSeats}
                    disabled={seatSaving || seatDraft === seatLimit}
                  >
                    {seatSaving ? 'Updating...' : 'Update seats'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>What&apos;s included on your plan.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <FeatureRow label="Session recordings & clips" included={limits.recordings} requiredPlan="Pro" />
          <FeatureRow label="AI analysis (bring your own key)" included={limits.ai} requiredPlan="Pro" />
          <FeatureRow label="Team collaboration" included={limits.collaboration} requiredPlan="Team" />
        </CardContent>
      </Card>

      {/* Billing history */}
      {isSelfServeBilling && (
        <Card>
          <CardHeader>
            <CardTitle>Billing history</CardTitle>
            <CardDescription>Your invoices and payments.</CardDescription>
          </CardHeader>
          <CardContent>
            {billingLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{formatBillingDate(inv.date)}</TableCell>
                      <TableCell>{inv.description}</TableCell>
                      <TableCell>{formatCurrency(inv.amount, inv.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={inv.paid ? 'secondary' : 'outline'}>{inv.paid ? 'Paid' : inv.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <a
                          href={`/api/billing/polar/invoice?orgId=${orgId}&orderId=${inv.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Download invoice"
                        >
                          <Button variant="ghost" size="icon-sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {orgId && (
        <UpgradeDialog
          open={upgradeOpen}
          onOpenChange={setUpgradeOpen}
          orgId={orgId}
          currentPlan={plan}
          hasActiveSubscription={isActivePaid}
          highlightPlan={plan === 'pro' ? 'team' : 'pro'}
          onChanged={refresh}
        />
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        variant="danger"
        size="lg"
        title="Cancel subscription?"
        description="Your plan stays active until the end of the current billing period, then reverts. You can resubscribe anytime."
        cancelText="Keep plan"
        confirmText="Cancel subscription"
        loading={canceling}
        onConfirm={handleCancel}
      />
    </div>
  )
}
