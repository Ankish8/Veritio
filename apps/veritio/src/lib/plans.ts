/**
 * Client-safe plan definitions. Pure data + pure functions only — NO server
 * imports (supabase, motia, etc.) so this can be imported from React components.
 * The server-side `entitlements-service.ts` re-exports everything here so the
 * plan matrix has a single source of truth.
 */

// 'legacy' = grandfathered orgs from before pricing tiers (unlimited). Never assigned to new signups.
export type PlanId = 'starter' | 'pro' | 'team' | 'legacy'
export type PlanStatus = 'trialing' | 'active' | 'past_due' | 'canceled'
export type FeatureKey = 'recordings' | 'ai' | 'collaboration'

export interface Entitlements {
  responsesPerStudy: number // Infinity allowed
  activeStudies: number // Infinity allowed
  seats: number
  recordings: boolean
  ai: boolean
  collaboration: boolean
  /** true when the trial has expired or the subscription is past_due/canceled */
  locked: boolean
}

/** The ONE place plan limits live. Mirror this in the marketing pricing table. */
export const PLAN_ENTITLEMENTS: Record<
  PlanId,
  { responsesPerStudy: number; activeStudies: number; seats: number; recordings: boolean; ai: boolean; collaboration: boolean }
> = {
  starter: { responsesPerStudy: 50, activeStudies: 5, seats: 1, recordings: false, ai: false, collaboration: false },
  pro: { responsesPerStudy: 100, activeStudies: Infinity, seats: 1, recordings: true, ai: true, collaboration: false },
  team: { responsesPerStudy: 100, activeStudies: Infinity, seats: 3, recordings: true, ai: true, collaboration: true },
  // Grandfathered orgs — unlimited everything, never restricted.
  legacy: { responsesPerStudy: Infinity, activeStudies: Infinity, seats: Infinity, recordings: true, ai: true, collaboration: true },
}

/** Human label for each plan (UI). */
export const PLAN_LABEL: Record<PlanId, string> = {
  starter: 'Starter',
  pro: 'Pro',
  team: 'Team',
  legacy: 'Legacy',
}

/** Entitlements when a trial has expired or billing lapsed: read existing data, create nothing new. */
export const LOCKED_ENTITLEMENTS: Entitlements = {
  responsesPerStudy: 0,
  activeStudies: 0,
  seats: 1,
  recordings: false,
  ai: false,
  collaboration: false,
  locked: true,
}

/** The minimum plan that unlocks each gated feature (for upgrade messaging). */
export const REQUIRED_PLAN: Record<FeatureKey, PlanId> = {
  recordings: 'pro',
  ai: 'pro',
  collaboration: 'team',
}

export const FEATURE_LABEL: Record<FeatureKey, string> = {
  recordings: 'Session recordings',
  ai: 'AI analysis',
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
  return { ...base, seats: base.seats + (row.extra_seats || 0), locked: false }
}

/** Days left in a trial (0 if not trialing or already past). */
export function trialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000))
}
