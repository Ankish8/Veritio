/**
 * Client-safe plan definitions. Pure data + pure functions only — NO server
 * imports (supabase, motia, etc.) so this can be imported from React components.
 * The server-side `entitlements-service.ts` re-exports everything here so the
 * plan matrix has a single source of truth.
 */

// 'legacy' = grandfathered orgs from before pricing tiers (unlimited). Never assigned to new signups.
// 'lifetime_*' = one-time lifetime deal (LTD) tiers. Permanently active; never trial-locked.
export type PlanId =
  | 'starter'
  | 'pro'
  | 'team'
  | 'legacy'
  | 'lifetime_tier1'
  | 'lifetime_tier2'
  | 'lifetime_team'
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type FeatureKey = 'recordings' | 'ai' | 'aiFollowUp' | 'collaboration'

export interface Entitlements {
  responsesPerStudy: number // Infinity allowed
  activeStudies: number // Infinity allowed
  seats: number
  recordings: boolean
  ai: boolean
  /** AI follow-up questions during a study (distinct from AI analysis). */
  aiFollowUp: boolean
  collaboration: boolean
  /** true when the trial has expired or the subscription is past_due/canceled */
  locked: boolean
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
}

/** Entitlements when a trial has expired or billing lapsed: read existing data, create nothing new. */
export const LOCKED_ENTITLEMENTS: Entitlements = {
  responsesPerStudy: 0,
  activeStudies: 0,
  seats: 1,
  recordings: false,
  ai: false,
  aiFollowUp: false,
  collaboration: false,
  locked: true,
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
}

/**
 * Compute effective entitlements from a raw plan row (pure; safe on client/server).
 * Lock is re-evaluated live from trial_ends_at, so caching the row is safe.
 */
export function computeEntitlements(row: OrgPlanRow | null): Entitlements {
  if (!row) return { ...LOCKED_ENTITLEMENTS }
  const base = PLAN_ENTITLEMENTS[row.plan] ?? PLAN_ENTITLEMENTS.starter

  const trialActive =
    row.plan_status === 'trialing' &&
    row.trial_ends_at != null &&
    new Date(row.trial_ends_at).getTime() > Date.now()
  const active = row.plan_status === 'active' || trialActive

  if (!active) return { ...LOCKED_ENTITLEMENTS }

  const extraSeats = row.plan === 'team' && base.seats !== Infinity ? row.extra_seats || 0 : 0
  return { ...base, seats: base.seats + extraSeats, locked: false }
}

/** Days left in a trial (0 if not trialing or already past). */
export function trialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000))
}
