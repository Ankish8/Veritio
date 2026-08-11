/**
 * Client-safe plan definitions. Pure data + pure functions only — NO server
 * imports (supabase, motia, etc.) so this can be imported from React components.
 * The server-side `entitlements-service.ts` re-exports everything here so the
 * plan matrix has a single source of truth.
 */

// 'legacy' = grandfathered orgs from before pricing tiers (unlimited). Never assigned to new signups.
// 'lifetime_*' = one-time lifetime deal (LTD) tiers. Permanently active; never trial-locked.
// 'edu_*' = education tiers sold per term to an institution. Provisioned by hand
//   (invoice / purchase order), sized to a cohort, and bounded by `access_ends_at`
//   rather than a rolling subscription. See /education on the marketing site.
// Single source for every plan id. Zod enums and the organizations.plan CHECK
// constraint both derive from this list — before it existed, the org API response
// schemas silently drifted and never learned about the lifetime tiers.
export const PLAN_IDS = [
  'starter',
  'pro',
  'team',
  'legacy',
  'lifetime_tier1',
  'lifetime_tier2',
  'lifetime_team',
  'edu_classroom',
  'edu_department',
  'edu_campus',
] as const
export type PlanId = (typeof PLAN_IDS)[number]

export const PLAN_STATUSES = ['trialing', 'active', 'past_due', 'canceled'] as const
export type PlanStatus = (typeof PLAN_STATUSES)[number]
export type FeatureKey = 'recordings' | 'ai' | 'aiFollowUp' | 'collaboration'

/** Why an org is locked. Lets the UI say "term ended" instead of "trial ended". */
export type LockReason = 'none' | 'trial' | 'billing' | 'term'

export interface Entitlements {
  responsesPerStudy: number // Infinity allowed
  activeStudies: number // Infinity allowed
  seats: number
  recordings: boolean
  ai: boolean
  /** AI follow-up questions during a study (distinct from AI analysis). */
  aiFollowUp: boolean
  collaboration: boolean
  /** true when the trial expired, the access term ended, or billing lapsed */
  locked: boolean
  /** Which of those it was ('none' when not locked). */
  lockReason: LockReason
}

/** The ONE place plan limits live. Mirror this in the marketing pricing table. */
export const PLAN_ENTITLEMENTS: Record<
  PlanId,
  { responsesPerStudy: number; activeStudies: number; seats: number; recordings: boolean; ai: boolean; aiFollowUp: boolean; collaboration: boolean }
> = {
  starter: { responsesPerStudy: 50, activeStudies: 5, seats: 1, recordings: false, ai: false, aiFollowUp: false, collaboration: false },
  pro: { responsesPerStudy: 100, activeStudies: Infinity, seats: 1, recordings: true, ai: true, aiFollowUp: true, collaboration: false },
  team: { responsesPerStudy: 100, activeStudies: Infinity, seats: 3, recordings: true, ai: true, aiFollowUp: true, collaboration: true },
  // Grandfathered orgs — unlimited everything, never restricted.
  legacy: { responsesPerStudy: Infinity, activeStudies: Infinity, seats: Infinity, recordings: true, ai: true, aiFollowUp: true, collaboration: true },
  // Lifetime deal tiers — one-time purchase, permanently active.
  lifetime_tier1: { responsesPerStudy: 50, activeStudies: 5, seats: 1, recordings: false, ai: true, aiFollowUp: false, collaboration: false },
  lifetime_tier2: { responsesPerStudy: 100, activeStudies: Infinity, seats: 1, recordings: true, ai: true, aiFollowUp: true, collaboration: false },
  lifetime_team: { responsesPerStudy: 100, activeStudies: Infinity, seats: 3, recordings: true, ai: true, aiFollowUp: true, collaboration: true },
  // Education tiers. Every feature is on: the /education page promises all 7 study
  // types, recordings and clips, AI insight reports, roles/comments, and real-time
  // collaboration on the entry tier. Responses are uncapped because that page
  // promises no per-response fees, so a cohort can iterate instead of rationing a
  // sample. `seats` is the base cohort size; the contracted size is topped up per
  // org with `extra_seats`.
  edu_classroom: { responsesPerStudy: Infinity, activeStudies: Infinity, seats: 40, recordings: true, ai: true, aiFollowUp: true, collaboration: true },
  edu_department: { responsesPerStudy: Infinity, activeStudies: Infinity, seats: 200, recordings: true, ai: true, aiFollowUp: true, collaboration: true },
  edu_campus: { responsesPerStudy: Infinity, activeStudies: Infinity, seats: Infinity, recordings: true, ai: true, aiFollowUp: true, collaboration: true },
}

/** Education tiers: hand-provisioned per term, never self-serve checkout. */
export const EDUCATION_PLANS = ['edu_classroom', 'edu_department', 'edu_campus'] as const
export type EducationPlanId = (typeof EDUCATION_PLANS)[number]

/** Narrow a raw plan value to one of the education tiers. */
export function isEducationPlan(plan: string | null | undefined): plan is EducationPlanId {
  return plan === 'edu_classroom' || plan === 'edu_department' || plan === 'edu_campus'
}

/** Public recurring pricing shown on the marketing pricing page. */
export const PLAN_PRICING: Record<'starter' | 'pro' | 'team', { monthly: number; yearlyMonthly: number }> = {
  starter: { monthly: 19, yearlyMonthly: 14 },
  pro: { monthly: 39, yearlyMonthly: 29 },
  team: { monthly: 89, yearlyMonthly: 69 },
}

/** One-time lifetime deal prices (USD). Mirror on the /ltd marketing page. */
export const LIFETIME_PLANS = ['lifetime_tier1', 'lifetime_tier2', 'lifetime_team'] as const
export type LifetimePlanId = (typeof LIFETIME_PLANS)[number]
export const LIFETIME_PRICING: Record<LifetimePlanId, number> = {
  lifetime_tier1: 49,
  lifetime_tier2: 99,
  lifetime_team: 199,
}

/** Narrow a raw plan value to one of the lifetime tiers. */
export function isLifetimePlan(plan: string | null | undefined): plan is LifetimePlanId {
  return (
    plan === 'lifetime_tier1' || plan === 'lifetime_tier2' || plan === 'lifetime_team'
  )
}

export const EXTRA_SEAT_MONTHLY = 39

/** Human label for each plan (UI). */
export const PLAN_LABEL: Record<PlanId, string> = {
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  legacy: 'Legacy',
  lifetime_tier1: 'Lifetime Solo',
  lifetime_tier2: 'Lifetime Pro',
  lifetime_team: 'Lifetime Team',
  edu_classroom: 'Education Classroom',
  edu_department: 'Education Department',
  edu_campus: 'Education Campus',
}

/** Entitlements when a trial expired, an access term ended, or billing lapsed: read existing data, create nothing new. */
export const LOCKED_ENTITLEMENTS: Entitlements = {
  responsesPerStudy: 0,
  activeStudies: 0,
  seats: 1,
  recordings: false,
  ai: false,
  aiFollowUp: false,
  collaboration: false,
  locked: true,
  lockReason: 'billing',
}

/** The minimum plan that unlocks each gated feature (for upgrade messaging). */
export const REQUIRED_PLAN: Record<FeatureKey, PlanId> = {
  recordings: 'pro',
  ai: 'pro',
  aiFollowUp: 'pro',
  collaboration: 'team',
}

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  recordings: 'Session recordings',
  ai: 'AI analysis',
  aiFollowUp: 'AI follow-up questions',
  collaboration: 'Team collaboration',
}

export interface OrgPlanRow {
  plan: PlanId
  plan_status: PlanStatus
  trial_ends_at: string | null
  extra_seats: number
  /**
   * End of a fixed access term (education semester / academic year). NULL on
   * rolling subscriptions. Independent of `trial_ends_at`: an education org is
   * `active`, not `trialing`, so it must never be told its "trial" ended.
   */
  access_ends_at?: string | null
}

/** Plans whose base seat count is topped up by `extra_seats`. */
function usesExtraSeats(plan: PlanId): boolean {
  return plan === 'team' || isEducationPlan(plan)
}

/**
 * Compute effective entitlements from a raw plan row (pure; safe on client/server).
 * Lock is re-evaluated live from trial_ends_at / access_ends_at, so caching the row is safe.
 */
export function computeEntitlements(row: OrgPlanRow | null): Entitlements {
  if (!row) return { ...LOCKED_ENTITLEMENTS }
  const base = PLAN_ENTITLEMENTS[row.plan] ?? PLAN_ENTITLEMENTS.starter

  // A fixed access term outranks plan_status: the term ending is what closes an
  // education license, even though the org stays 'active' until the sweep runs.
  if (termEnded(row.access_ends_at)) {
    return { ...LOCKED_ENTITLEMENTS, lockReason: 'term' }
  }

  const trialActive =
    row.plan_status === 'trialing' &&
    row.trial_ends_at != null &&
    new Date(row.trial_ends_at).getTime() > Date.now()
  const active = row.plan_status === 'active' || trialActive

  if (!active) {
    return {
      ...LOCKED_ENTITLEMENTS,
      lockReason: row.plan_status === 'trialing' ? 'trial' : 'billing',
    }
  }

  const extraSeats = usesExtraSeats(row.plan) && base.seats !== Infinity ? row.extra_seats || 0 : 0
  return { ...base, seats: base.seats + extraSeats, locked: false, lockReason: 'none' }
}

/** Days left in a trial (0 if not trialing or already past). */
export function trialDaysLeft(trialEndsAt: string | null | undefined): number {
  return daysUntil(trialEndsAt)
}

/** Days left in a fixed access term (0 if no term or already past). */
export function termDaysLeft(accessEndsAt: string | null | undefined): number {
  return daysUntil(accessEndsAt)
}

/** True when a fixed access term exists and has already passed. */
export function termEnded(accessEndsAt: string | null | undefined): boolean {
  return accessEndsAt != null && new Date(accessEndsAt).getTime() <= Date.now()
}

function daysUntil(date: string | null | undefined): number {
  if (!date) return 0
  const ms = new Date(date).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000))
}
