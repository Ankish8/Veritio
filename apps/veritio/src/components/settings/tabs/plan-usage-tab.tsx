'use client'

import { useState } from 'react'
import { CreditCard, Download, Check, Minus } from 'lucide-react'
import { useCurrentOrganization } from '@/hooks/use-organizations'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { useBillingDetails } from '@/hooks/use-billing-details'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
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
  const { orgId, plan, planStatus, label, isLegacy, isActivePaid, isTrialing, daysLeft } = useCurrentPlan()
  const { summary, invoices, isLoading: billingLoading, refresh } = useBillingDetails(isLegacy ? null : orgId)
  const { stats } = useDashboardStats()

  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [canceling, setCanceling] = useState(false)

  if (orgLoading || !fullOrg) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  const limits = PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.starter
  const extraSeats = fullOrg.extra_seats ?? 0
  const seatLimit = limits.seats === Infinity ? Infinity : limits.seats + extraSeats
  const memberCount = fullOrg.member_count ?? 1
  const activeStudies = stats?.activeStudies ?? 0
  const sub = summary?.subscription
  const pm = summary?.paymentMethod
  const paidPricing = !isLegacy ? PLAN_PRICING[plan as Exclude<PlanId, 'legacy'>] : null

  const priceText = isLegacy
    ? 'Unlimited'
    : sub
      ? `${formatCurrency(sub.amount, sub.currency)}/${sub.recurringInterval === 'year' ? 'yr' : 'mo'}`
      : paidPricing
        ? `$${paidPricing.monthly}/mo`
        : ''

  const renewalText = isTrialing
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

  return (
    <div className="max-w-3xl space-y-6">
      {/* Plan summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {label} plan
                <Badge variant={STATUS_BADGE[planStatus].variant}>{STATUS_BADGE[planStatus].label}</Badge>
              </CardTitle>
              <CardDescription>{renewalText}</CardDescription>
            </div>
            <div className="shrink-0 text-right text-sm font-medium text-foreground">{priceText}</div>
          </div>
        </CardHeader>
        {!isLegacy && (
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
      {!isLegacy && pm && (
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
            <a href={`/api/billing/polar/portal?orgId=${orgId}`}>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </a>
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
      {!isLegacy && (
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
          onChanged={refresh}
        />
      )}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        variant="danger"
        title="Cancel subscription?"
        description="Your plan stays active until the end of the current billing period, then reverts. You can resubscribe anytime."
        confirmText="Cancel subscription"
        loading={canceling}
        onConfirm={handleCancel}
      />
    </div>
  )
}
