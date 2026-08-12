import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { isEducationPlan, termDaysLeft, type PlanId } from '../lib/plans'

type SupabaseClientType = SupabaseClient<Database>

/**
 * Warning stages for a fixed access term.
 *
 * An education license stops on its end date. Enforcement is correct but
 * silent, so without this an institution's cohort loses access mid-course
 * with no notice. The first notice is pitched at university procurement lead
 * time rather than at a consumer renewal nag.
 */
export const TERM_WARNING_STAGES = [
  { stage: 2 as const, withinDays: 7, label: 'final' },
  { stage: 1 as const, withinDays: 30, label: 'first' },
]

export type TermWarningStage = 0 | 1 | 2

export interface TermRow {
  id: string
  name: string
  plan: PlanId
  access_ends_at: string | null
  term_warned_for: string | null
  term_warning_stage: number | null
}

export interface DueWarning {
  org: TermRow
  stage: 1 | 2
  daysLeft: number
}

/**
 * The stage already sent for the row's *current* term.
 *
 * `term_warned_for` pins the stage to a specific end date, so renewing a term
 * makes any stored stage stale automatically and the next term starts from
 * zero. No reset step exists to be forgotten.
 */
export function stageForCurrentTerm(org: TermRow): TermWarningStage {
  if (!org.access_ends_at || org.term_warned_for !== org.access_ends_at) return 0
  const stage = org.term_warning_stage ?? 0
  return stage === 1 || stage === 2 ? stage : 0
}

/**
 * Which warning (if any) an org is due, given the time left in its term.
 *
 * Pure, so the thresholds and the "don't repeat, don't skip backwards" rules
 * are testable without a database. Returns null when the org is not on a termed
 * education license, the term has passed, it is too early, or the notice has
 * already gone out.
 */
export function dueWarningFor(org: TermRow, now = Date.now()): DueWarning | null {
  if (!isEducationPlan(org.plan) || !org.access_ends_at) return null

  const daysLeft = termDaysLeft(org.access_ends_at)
  // Already expired: the lock itself is the message, and a "renew soon" email
  // after the fact reads as broken.
  if (daysLeft <= 0 || new Date(org.access_ends_at).getTime() <= now) return null

  const sent = stageForCurrentTerm(org)
  for (const { stage, withinDays } of TERM_WARNING_STAGES) {
    if (daysLeft <= withinDays && sent < stage) return { org, stage, daysLeft }
  }
  return null
}

/** Termed education orgs whose term is still running, for the daily sweep. */
export async function listTermedOrganizations(supabase: SupabaseClientType): Promise<TermRow[]> {
  const { data, error } = await (supabase.from('organizations') as any)
    .select('id, name, plan, access_ends_at, term_warned_for, term_warning_stage')
    .not('access_ends_at', 'is', null)
    .gt('access_ends_at', new Date().toISOString())

  if (error) throw new Error(error.message)
  return (data ?? []) as TermRow[]
}

/** Owners and admins of an org: the people who can act on a renewal. */
/**
 * Owners and admins who have actually joined an organization — the recipient
 * set for any billing notice (term expiry, trial expiry), not just terms.
 */
export async function listOrgBillingRecipients(
  supabase: SupabaseClientType,
  orgId: string,
): Promise<string[]> {
  const { data } = await (supabase.from('organization_members') as any)
    .select('user_id')
    .eq('organization_id', orgId)
    .in('role', ['owner', 'admin'])
    .not('joined_at', 'is', null)

  return ((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)
}

/**
 * Record that `stage` went out for the org's current term.
 *
 * Writes term_warned_for alongside the stage so the pair always describes the
 * same end date.
 */
export async function markTermWarningSent(
  supabase: SupabaseClientType,
  orgId: string,
  accessEndsAt: string,
  stage: 1 | 2,
): Promise<void> {
  const { error } = await (supabase.from('organizations') as any)
    .update({ term_warned_for: accessEndsAt, term_warning_stage: stage })
    .eq('id', orgId)

  if (error) throw new Error(error.message)
}
