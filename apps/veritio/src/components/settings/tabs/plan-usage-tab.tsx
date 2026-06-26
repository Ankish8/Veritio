'use client'

import { useCurrentOrganization } from '@/hooks/use-organizations'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Check, Minus } from 'lucide-react'
import {
  PLAN_ENTITLEMENTS,
  PLAN_LABEL,
  computeEntitlements,
  trialDaysLeft,
  type PlanId,
  type PlanStatus,
} from '@/lib/plans'

type OrgPlanFields = {
  id?: string
  plan?: PlanId
  plan_status?: PlanStatus
  trial_ends_at?: string | null
  extra_seats?: number
  member_count?: number
}

const STATUS_LABEL: Record<PlanStatus, string> = {
  trialing: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
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
        <span className="text-muted-foreground">{used} / {fmtLimit(limit)}</span>
      </div>
      {!unlimited && <Progress value={pct} />}
    </div>
  )
}

function FeatureRow({ label, included, requiredPlan }: { label: string; included: boolean; requiredPlan: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5">
      <span className="text-foreground">{label}</span>
      {included ? (
        <span className="inline-flex items-center gap-1.5 text-green-600"><Check className="size-4" /> Included</span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Minus className="size-4" /> {requiredPlan}</span>
      )}
    </div>
  )
}

export function PlanUsageTab() {
  const { currentOrg, organizations, isLoading } = useCurrentOrganization()
  const { stats } = useDashboardStats()

  // currentOrg may be a trimmed store summary; read full plan fields from the org list.
  const fullOrg = (organizations.find((o) => o.id === currentOrg?.id) ?? currentOrg) as OrgPlanFields | null

  if (isLoading || !fullOrg) {
    return <div className="max-w-2xl text-sm text-muted-foreground">Loading plan…</div>
  }

  const plan: PlanId = fullOrg.plan ?? 'starter'
  const planStatus: PlanStatus = fullOrg.plan_status ?? 'active'
  const limits = PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.starter
  const ent = computeEntitlements({
    plan,
    plan_status: planStatus,
    trial_ends_at: fullOrg.trial_ends_at ?? null,
    extra_seats: fullOrg.extra_seats ?? 0,
  })
  const seatLimit = limits.seats === Infinity ? Infinity : limits.seats + (fullOrg.extra_seats ?? 0)
  const daysLeft = trialDaysLeft(fullOrg.trial_ends_at)
  const memberCount = fullOrg.member_count ?? 1
  const activeStudies = stats?.activeStudies ?? 0

  return (
    <div className="max-w-2xl space-y-6">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {PLAN_LABEL[plan]} plan
              <Badge variant={planStatus === 'active' ? 'secondary' : planStatus === 'trialing' ? 'default' : 'destructive'}>
                {STATUS_LABEL[planStatus]}
              </Badge>
            </CardTitle>
          </div>
          <CardDescription>
            {planStatus === 'trialing'
              ? daysLeft > 0
                ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your free trial.`
                : 'Your free trial has ended.'
              : plan === 'legacy'
                ? 'Grandfathered plan with unlimited usage.'
                : 'Your current subscription.'}
          </CardDescription>
        </CardHeader>
        {ent.locked && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Trial ended</AlertTitle>
              <AlertDescription>
                Your trial has ended. New studies, responses, recordings, and AI are paused until you subscribe.
                Your existing data is safe and still readable.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
          <CardDescription>Your current usage against this plan&apos;s limits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageRow label="Active studies" used={activeStudies} limit={limits.activeStudies} />
          <UsageRow label="Team members" used={memberCount} limit={seatLimit} />
          <div className="text-sm text-muted-foreground pt-1">
            Responses per study: {fmtLimit(limits.responsesPerStudy)}
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
    </div>
  )
}
