import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'
import { EntitlementError } from '../lib/api/classify-error'
import type { OrganizationRole } from '../lib/supabase/collaboration-types'
import {
  REQUIRED_PLAN,
  FEATURE_LABEL,
  computeEntitlements,
  isEducationPlan,
  type Entitlements,
  type FeatureKey,
  type OrgPlanRow,
  type PlanId,
  type PlanStatus,
} from '../lib/plans'
import { checkOrganizationPermission, checkStudyPermission } from './permission-service'

// Re-export the client-safe plan definitions so the matrix has one source of truth.
export {
  PLAN_ENTITLEMENTS,
  PLAN_LABEL,
  EDUCATION_PLANS,
  computeEntitlements,
  isEducationPlan,
  trialDaysLeft,
  termDaysLeft,
  termEnded,
  type EducationPlanId,
  type Entitlements,
  type FeatureKey,
  type LockReason,
  type OrgPlanRow,
  type PlanId,
  type PlanStatus,
} from '../lib/plans'

type SupabaseClientType = SupabaseClient<Database>

function seatCountText(seats: number): string {
  return `${seats} seat${seats === 1 ? '' : 's'}`
}

function addSeatLimitMessage(plan: PlanId | undefined, seats: number): string {
  // Education licenses are sized to a contracted cohort, so "upgrade to Team" is
  // the wrong instruction: the fix is to raise the cohort size on the license.
  if (isEducationPlan(plan)) {
    return `This education license covers ${seatCountText(seats)}. Contact us to extend it to a larger cohort.`
  }
  if (plan === 'team') {
    return `Your Team plan includes ${seatCountText(seats)}. Remove a member or pending invitation before adding more.`
  }
  return `Your plan includes ${seatCountText(seats)}. Upgrade to Team to add members.`
}

function acceptSeatLimitMessage(plan: PlanId | undefined, seats: number): string {
  if (isEducationPlan(plan)) {
    return `This education license covers ${seatCountText(seats)}. Ask your instructor to have the cohort size extended.`
  }
  if (plan === 'team') {
    return `This team has reached its ${seatCountText(seats)} limit. Ask an admin to remove a member or pending invitation.`
  }
  return `This workspace only includes ${seatCountText(seats)}. Ask an admin to upgrade to Team.`
}

/** Lock message that names the real cause (ended term vs expired trial). */
function lockedMessage(ent: Entitlements, action: string): string {
  return ent.lockReason === 'term'
    ? `This access period has ended. Renew to ${action}.`
    : `Your trial has ended. Subscribe to ${action}.`
}

function reservedSeatsForPendingInvite(invitation: { invite_type?: string | null; max_uses?: number | null; uses_count?: number | null }): number {
  if (invitation.invite_type === 'link') {
    return Math.max(0, (invitation.max_uses ?? 1) - (invitation.uses_count ?? 0))
  }

  return 1
}

/** Read (and cache) an org's raw plan columns. Cache is busted on plan change. */
export async function getOrgPlan(supabase: SupabaseClientType, orgId: string): Promise<OrgPlanRow | null> {
  const key = cacheKeys.orgPlan(orgId)
  const cached = cache.get<OrgPlanRow>(key)
  if (cached) return cached

  const { data, error } = await (supabase.from('organizations') as any)
    .select('plan, plan_status, trial_ends_at, extra_seats, access_ends_at')
    .eq('id', orgId)
    .single()

  if (error || !data) return null
  const row = data as OrgPlanRow
  cache.set(key, row, cacheTTL.long)
  return row
}

export async function getEntitlements(supabase: SupabaseClientType, orgId: string): Promise<Entitlements> {
  return computeEntitlements(await getOrgPlan(supabase, orgId))
}

// ─── org resolution helpers (cheap: studies.organization_id is denormalized/indexed) ───

export async function getOrgIdForStudy(supabase: SupabaseClientType, studyId: string): Promise<string | null> {
  const { data } = await (supabase.from('studies') as any)
    .select('organization_id')
    .eq('id', studyId)
    .single()
  return (data as { organization_id?: string } | null)?.organization_id ?? null
}

// ─── assertions used at enforcement hook points (throw EntitlementError → uniform 403) ───

/** Throw if the org's plan does not include `feature`. */
export async function assertFeature(supabase: SupabaseClientType, orgId: string, feature: FeatureKey): Promise<void> {
  const ent = await getEntitlements(supabase, orgId)
  if (ent.locked) {
    throw new EntitlementError(lockedMessage(ent, 'continue'), 'pro')
  }
  if (!ent[feature]) {
    throw new EntitlementError(
      `${FEATURE_LABEL[feature]} requires the ${REQUIRED_PLAN[feature] === 'team' ? 'Team' : 'Pro'} plan.`,
      REQUIRED_PLAN[feature],
    )
  }
}

/** Throw if the study's owning org does not include `feature`. */
export async function assertStudyFeature(
  supabase: SupabaseClientType,
  studyId: string,
  feature: FeatureKey
): Promise<void> {
  const orgId = await getOrgIdForStudy(supabase, studyId)
  if (!orgId) {
    throw new Error('Study not found')
  }
  await assertFeature(supabase, orgId, feature)
}

/** Throw if the user cannot access the org or the org lacks `feature`. */
export async function assertOrgFeatureForUser(
  supabase: SupabaseClientType,
  orgId: string,
  userId: string,
  feature: FeatureKey,
  requiredRole: OrganizationRole = 'viewer',
): Promise<void> {
  const permission = await checkOrganizationPermission(supabase, orgId, userId, requiredRole)
  if (permission.error) {
    throw permission.error
  }
  if (!permission.allowed) {
    throw new Error('Access denied')
  }

  await assertFeature(supabase, orgId, feature)
}

/** Throw if the user cannot access the study or its org lacks `feature`. */
export async function assertStudyFeatureForUser(
  supabase: SupabaseClientType,
  studyId: string,
  userId: string,
  feature: FeatureKey,
  requiredRole: OrganizationRole = 'viewer',
): Promise<void> {
  const permission = await checkStudyPermission(supabase, studyId, userId, requiredRole)
  if (permission.error) {
    throw permission.error
  }
  if (!permission.allowed) {
    throw new Error('Access denied')
  }

  await assertStudyFeature(supabase, studyId, feature)
}

/** Non-throwing feature check (e.g. for participant-facing paths that should silently skip). */
export async function hasFeature(supabase: SupabaseClientType, orgId: string | null, feature: FeatureKey): Promise<boolean> {
  if (!orgId) return false
  const ent = await getEntitlements(supabase, orgId)
  return !ent.locked && ent[feature]
}

/** Throw if activating another study would exceed the active-studies cap. */
export async function assertCanActivateStudy(supabase: SupabaseClientType, orgId: string): Promise<void> {
  const ent = await getEntitlements(supabase, orgId)
  if (ent.locked) {
    throw new EntitlementError(lockedMessage(ent, 'launch studies'), 'pro')
  }
  if (ent.activeStudies === Infinity) return
  const { count } = await (supabase.from('studies') as any)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .eq('status', 'active')
  if ((count ?? 0) >= ent.activeStudies) {
    throw new EntitlementError(
      `Your plan allows ${ent.activeStudies} active studies. Upgrade to Pro for unlimited.`,
      'pro',
    )
  }
}

/** Throw if adding `addCount` seats would exceed the plan's seat allotment. */
export async function assertCanAddSeat(supabase: SupabaseClientType, orgId: string, addCount = 1): Promise<void> {
  const planRow = await getOrgPlan(supabase, orgId)
  const ent = computeEntitlements(planRow)
  if (ent.locked) {
    throw new EntitlementError(lockedMessage(ent, 'add members'), 'team')
  }
  if (ent.seats === Infinity) return

  const [{ count: memberCount }, { data: pendingInvites }] = await Promise.all([
    (supabase.from('organization_members') as any)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .not('joined_at', 'is', null),
    (supabase.from('organization_invitations') as any)
      .select('invite_type, max_uses, uses_count')
      .eq('organization_id', orgId)
      .eq('status', 'pending'),
  ])

  const pendingSeats = (pendingInvites ?? []).reduce(
    (sum: number, invite: { invite_type?: string | null; max_uses?: number | null; uses_count?: number | null }) =>
      sum + reservedSeatsForPendingInvite(invite),
    0,
  )
  const used = (memberCount ?? 0) + pendingSeats
  if (used + addCount > ent.seats) {
    throw new EntitlementError(addSeatLimitMessage(planRow?.plan, ent.seats), 'team')
  }
}

/** Throw if accepting `addCount` new joined members would exceed the plan's seat allotment. */
export async function assertCanAcceptSeat(supabase: SupabaseClientType, orgId: string, addCount = 1): Promise<void> {
  const planRow = await getOrgPlan(supabase, orgId)
  const ent = computeEntitlements(planRow)
  if (ent.locked) {
    throw new EntitlementError(lockedMessage(ent, 'add members'), 'team')
  }
  if (ent.seats === Infinity) return

  const { count: memberCount } = await (supabase.from('organization_members') as any)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .not('joined_at', 'is', null)

  if ((memberCount ?? 0) + addCount > ent.seats) {
    throw new EntitlementError(acceptSeatLimitMessage(planRow?.plan, ent.seats), 'team')
  }
}

/** The per-study response cap for an org's plan (Infinity if unlimited). */
export async function getStudyResponseCap(supabase: SupabaseClientType, orgId: string): Promise<number> {
  const ent = await getEntitlements(supabase, orgId)
  return ent.responsesPerStudy
}

/** Resolve the per-study response cap from the study's owning org. */
export async function getResponseCapForStudy(supabase: SupabaseClientType, studyId: string): Promise<number> {
  const orgId = await getOrgIdForStudy(supabase, studyId)
  if (!orgId) return Infinity
  return getStudyResponseCap(supabase, orgId)
}

// ─── plan mutation (used by the superadmin endpoint now, by Polar webhooks later) ───

export async function setOrgPlan(
  supabase: SupabaseClientType,
  orgId: string,
  patch: Partial<{
    plan: PlanId
    plan_status: PlanStatus
    trial_ends_at: string | null
    extra_seats: number
    access_ends_at: string | null
  }>,
): Promise<{ error: Error | null }> {
  const { error } = await (supabase.from('organizations') as any).update(patch).eq('id', orgId)
  cache.delete(cacheKeys.orgPlan(orgId))
  return { error: error ? new Error(error.message) : null }
}
