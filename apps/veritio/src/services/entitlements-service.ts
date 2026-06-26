import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { cache, cacheKeys, cacheTTL } from '../lib/cache/memory-cache'
import { EntitlementError } from '../lib/api/classify-error'
import {
  REQUIRED_PLAN,
  FEATURE_LABEL,
  computeEntitlements,
  type Entitlements,
  type FeatureKey,
  type OrgPlanRow,
  type PlanId,
  type PlanStatus,
} from '../lib/plans'

// Re-export the client-safe plan definitions so the matrix has one source of truth.
export {
  PLAN_ENTITLEMENTS,
  PLAN_LABEL,
  computeEntitlements,
  trialDaysLeft,
  type Entitlements,
  type FeatureKey,
  type OrgPlanRow,
  type PlanId,
  type PlanStatus,
} from '../lib/plans'

type SupabaseClientType = SupabaseClient<Database>

/** Read (and cache) an org's raw plan columns. Cache is busted on plan change. */
export async function getOrgPlan(supabase: SupabaseClientType, orgId: string): Promise<OrgPlanRow | null> {
  const key = cacheKeys.orgPlan(orgId)
  const cached = cache.get<OrgPlanRow>(key)
  if (cached) return cached

  const { data, error } = await (supabase.from('organizations') as any)
    .select('plan, plan_status, trial_ends_at, extra_seats')
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
    throw new EntitlementError('Your trial has ended. Subscribe to continue.', 'pro')
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
    throw new EntitlementError('Your trial has ended. Subscribe to launch studies.', 'pro')
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
  const ent = await getEntitlements(supabase, orgId)
  if (ent.locked) {
    throw new EntitlementError('Your trial has ended. Subscribe to add members.', 'team')
  }
  if (ent.seats === Infinity) return

  const [{ count: memberCount }, { count: pendingInvites }] = await Promise.all([
    (supabase.from('organization_members') as any)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .not('joined_at', 'is', null),
    (supabase.from('organization_invitations') as any)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'pending'),
  ])

  const used = (memberCount ?? 0) + (pendingInvites ?? 0)
  if (used + addCount > ent.seats) {
    throw new EntitlementError(
      `Your plan includes ${ent.seats} seat${ent.seats === 1 ? '' : 's'}. Upgrade to Team to add more.`,
      'team',
    )
  }
}

/** Throw if accepting `addCount` new joined members would exceed the plan's seat allotment. */
export async function assertCanAcceptSeat(supabase: SupabaseClientType, orgId: string, addCount = 1): Promise<void> {
  const ent = await getEntitlements(supabase, orgId)
  if (ent.locked) {
    throw new EntitlementError('Your trial has ended. Subscribe to add members.', 'team')
  }
  if (ent.seats === Infinity) return

  const { count: memberCount } = await (supabase.from('organization_members') as any)
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .not('joined_at', 'is', null)

  if ((memberCount ?? 0) + addCount > ent.seats) {
    throw new EntitlementError(
      `Your plan includes ${ent.seats} seat${ent.seats === 1 ? '' : 's'}. Upgrade to Team to add more.`,
      'team',
    )
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
  patch: Partial<{ plan: PlanId; plan_status: PlanStatus; trial_ends_at: string | null; extra_seats: number }>,
): Promise<{ error: Error | null }> {
  const { error } = await (supabase.from('organizations') as any).update(patch).eq('id', orgId)
  cache.delete(cacheKeys.orgPlan(orgId))
  return { error: error ? new Error(error.message) : null }
}
