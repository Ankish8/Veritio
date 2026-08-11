'use client'

import { useCurrentOrganization } from '@/hooks/use-organizations'
import {
  PLAN_LABEL,
  computeEntitlements,
  isEducationPlan,
  termDaysLeft,
  trialDaysLeft,
  type PlanId,
  type PlanStatus,
} from '@/lib/plans'

interface OrgPlanFields {
  id?: string
  plan?: PlanId
  plan_status?: PlanStatus
  trial_ends_at?: string | null
  access_ends_at?: string | null
  extra_seats?: number
}

export interface CurrentPlan {
  orgId: string | null
  plan: PlanId
  planStatus: PlanStatus
  trialEndsAt: string | null
  daysLeft: number
  label: string
  /** Active trial with time remaining. */
  isTrialing: boolean
  /** Trial expired, or subscription past_due/canceled (org is locked). */
  isLapsed: boolean
  /** Grandfathered unlimited plan — never nagged. */
  isLegacy: boolean
  /** Institutional education license: fixed term, invoiced, no self-serve billing. */
  isEducation: boolean
  /** End of a fixed access term (education), or null on rolling subscriptions. */
  accessEndsAt: string | null
  /** Days left in the access term (0 when there is no term or it has passed). */
  termDaysRemaining: number
  /** A real paid (non-legacy) subscription that's active. */
  isActivePaid: boolean
  /** Current org can use Team collaboration features. */
  canCollaborate: boolean
  locked: boolean
  isLoading: boolean
}

/**
 * Plan UI state for the current organization, derived once for the top bar +
 * sidebar badge. Reads full plan fields from the organizations list (the
 * currentOrg summary doesn't carry them) and computes lock/trial state via
 * the shared helpers in src/lib/plans.ts.
 */
export function useCurrentPlan(): CurrentPlan {
  const { currentOrg, organizations, isLoading } = useCurrentOrganization()
  const fullOrg = (organizations.find((o) => o.id === currentOrg?.id) ?? currentOrg ?? null) as OrgPlanFields | null

  const plan: PlanId = fullOrg?.plan ?? 'starter'
  const planStatus: PlanStatus = fullOrg?.plan_status ?? 'active'
  const trialEndsAt = fullOrg?.trial_ends_at ?? null
  const accessEndsAt = fullOrg?.access_ends_at ?? null
  const daysLeft = trialDaysLeft(trialEndsAt)
  const ent = computeEntitlements({
    plan,
    plan_status: planStatus,
    trial_ends_at: trialEndsAt,
    extra_seats: fullOrg?.extra_seats ?? 0,
    access_ends_at: accessEndsAt,
  })

  const isLegacy = plan === 'legacy'
  const isEducation = isEducationPlan(plan)

  return {
    orgId: fullOrg?.id ?? currentOrg?.id ?? null,
    plan,
    planStatus,
    trialEndsAt,
    daysLeft,
    label: PLAN_LABEL[plan],
    // An education org is 'active', never 'trialing', so this stays false for it.
    isTrialing: planStatus === 'trialing' && daysLeft > 0,
    isLapsed: ent.locked && !isLegacy,
    isLegacy,
    isEducation,
    accessEndsAt,
    termDaysRemaining: termDaysLeft(accessEndsAt),
    isActivePaid: planStatus === 'active' && !isLegacy,
    canCollaborate: !ent.locked && ent.collaboration,
    locked: ent.locked,
    isLoading,
  }
}
