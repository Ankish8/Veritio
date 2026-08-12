import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Trial lifecycle notices.
 *
 * Trials previously expired in total silence: the hourly sweep flipped an
 * organization from `trialing` to `past_due` and told nobody — no email, no
 * in-app notice, not even an event. The first a customer knew was hitting a
 * locked feature.
 *
 * Mirrors education-term-service, which already solves the identical problem
 * for access terms, so the two billing notices behave the same way.
 */

/**
 * Days-remaining thresholds, checked in order. Two notices only: a heads-up
 * with time to act, and a final one. More than that is nagging.
 */
export const TRIAL_WARNING_STAGES = [
  { stage: 1 as const, withinDays: 3 },
  { stage: 2 as const, withinDays: 1 },
]

export type TrialWarningStage = 0 | 1 | 2

export interface TrialRow {
  id: string
  name: string
  plan: string
  plan_status: string
  trial_ends_at: string | null
  trial_warned_for: string | null
  trial_warning_stage: number | null
}

export interface DueTrialWarning {
  org: TrialRow
  stage: 1 | 2
  daysLeft: number
}

/** Whole days from now until `endsAt`, rounded up; 0 once it has passed. */
export function trialDaysLeft(endsAt: string, now = Date.now()): number {
  const remaining = new Date(endsAt).getTime() - now
  if (remaining <= 0) return 0
  return Math.ceil(remaining / 86400_000)
}

/**
 * Which stage has already been sent *for the current trial end date*.
 *
 * A trial that gets extended has a new `trial_ends_at`, so the recorded stage
 * no longer applies and warnings start again — otherwise extending a trial
 * would permanently silence its notices.
 */
export function stageForCurrentTrial(org: TrialRow): TrialWarningStage {
  if (!org.trial_ends_at) return 0
  if (org.trial_warned_for !== org.trial_ends_at) return 0
  return (org.trial_warning_stage ?? 0) as TrialWarningStage
}

/** The warning due now, or null if none is. */
export function dueTrialWarningFor(org: TrialRow, now = Date.now()): DueTrialWarning | null {
  if (org.plan_status !== 'trialing' || !org.trial_ends_at) return null

  const daysLeft = trialDaysLeft(org.trial_ends_at, now)
  // Already expired: the expiry sweep owns that notice, not this one.
  if (daysLeft <= 0) return null

  const sent = stageForCurrentTrial(org)

  for (const { stage, withinDays } of TRIAL_WARNING_STAGES) {
    if (daysLeft <= withinDays && sent < stage) {
      return { org, stage, daysLeft }
    }
  }
  return null
}

export async function listTrialingOrganizations(
  supabase: SupabaseClientType
): Promise<TrialRow[]> {
  const { data, error } = await (supabase.from('organizations') as any)
    .select('id, name, plan, plan_status, trial_ends_at, trial_warned_for, trial_warning_stage')
    .eq('plan_status', 'trialing')
    .not('trial_ends_at', 'is', null)
    .is('deleted_at', null)

  if (error) return []
  return (data ?? []) as TrialRow[]
}

export async function markTrialWarningSent(
  supabase: SupabaseClientType,
  orgId: string,
  trialEndsAt: string,
  stage: 1 | 2
): Promise<void> {
  await (supabase.from('organizations') as any)
    .update({ trial_warned_for: trialEndsAt, trial_warning_stage: stage })
    .eq('id', orgId)
}
