/**
 * Lifetime-deal redemption codes. LTD marketplaces (AppSumo, GrabLTD, ...) resell
 * codes that buyers redeem into a Veritio org to unlock a lifetime plan. Codes are
 * generated in batches (handed to the marketplace) and consumed exactly once.
 */
import { randomBytes } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { setOrgPlan } from '@/services/entitlements-service'
import { isLifetimePlan, type LifetimePlanId } from '@/lib/plans'

type SupabaseClientType = SupabaseClient<Database>

// Unambiguous alphabet (no 0/O/1/I) for human-typed codes.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomSegment(len: number): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length]
  return out
}

/** Generate a code like VRT-ABCDE-FGHJK-LMNPQ. */
function generateCode(): string {
  return `VRT-${randomSegment(5)}-${randomSegment(5)}-${randomSegment(5)}`
}

/** Normalize user input: uppercase, trim, strip spaces. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export interface GenerateOptions {
  plan: LifetimePlanId
  count: number
  source?: string | null
  batch?: string | null
  note?: string | null
  expiresAt?: string | null
}

/** Create `count` unique codes for a lifetime tier. Returns the generated codes. */
export async function generateRedemptionCodes(
  supabase: SupabaseClientType,
  opts: GenerateOptions,
): Promise<{ codes: string[]; error: Error | null }> {
  if (!isLifetimePlan(opts.plan)) return { codes: [], error: new Error('Invalid lifetime plan') }
  const count = Math.max(1, Math.min(5000, Math.floor(opts.count)))

  const rows = Array.from({ length: count }, () => ({
    code: generateCode(),
    plan: opts.plan,
    source: opts.source ?? null,
    batch: opts.batch ?? null,
    note: opts.note ?? null,
    expires_at: opts.expiresAt ?? null,
  }))

  const { data, error } = await (supabase.from('redemption_codes' as any) as any)
    .insert(rows)
    .select('code')

  if (error) return { codes: [], error: new Error(error.message) }
  return { codes: ((data ?? []) as { code: string }[]).map((r) => r.code), error: null }
}

export type RedeemResult =
  | { ok: true; plan: LifetimePlanId }
  | { ok: false; reason: 'not_found' | 'already_redeemed' | 'expired' | 'error'; message: string }

/**
 * Atomically claim a code for an org and grant the lifetime plan. The UPDATE ...
 * WHERE redeemed_at IS NULL guard makes double-redemption impossible under races.
 */
export async function redeemCode(
  supabase: SupabaseClientType,
  params: { code: string; orgId: string; userId: string },
): Promise<RedeemResult> {
  const code = normalizeCode(params.code)
  if (!code) return { ok: false, reason: 'not_found', message: 'Enter a code to redeem.' }

  const nowIso = new Date().toISOString()

  // Atomic claim: only succeeds if unredeemed and unexpired.
  const { data: claimed, error: claimErr } = await (supabase.from('redemption_codes' as any) as any)
    .update({ redeemed_at: nowIso, redeemed_by_org: params.orgId, redeemed_by_user: params.userId })
    .eq('code', code)
    .is('redeemed_at', null)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .select('plan')
    .maybeSingle()

  if (claimErr) return { ok: false, reason: 'error', message: 'Could not redeem this code. Please try again.' }

  if (!claimed) {
    // Distinguish why the claim failed for a friendly message.
    const { data: existing } = await (supabase.from('redemption_codes' as any) as any)
      .select('redeemed_at, expires_at')
      .eq('code', code)
      .maybeSingle()
    if (!existing) return { ok: false, reason: 'not_found', message: "That code isn't valid. Check for typos and try again." }
    if ((existing as { redeemed_at?: string | null }).redeemed_at) {
      return { ok: false, reason: 'already_redeemed', message: 'This code has already been redeemed.' }
    }
    return { ok: false, reason: 'expired', message: 'This code has expired.' }
  }

  const plan = (claimed as { plan: LifetimePlanId }).plan
  const { error: planErr } = await setOrgPlan(supabase, params.orgId, {
    plan,
    plan_status: 'active',
    trial_ends_at: null,
  })
  if (planErr) {
    // Roll the claim back so the code can be retried.
    await (supabase.from('redemption_codes' as any) as any)
      .update({ redeemed_at: null, redeemed_by_org: null, redeemed_by_user: null })
      .eq('code', code)
    return { ok: false, reason: 'error', message: 'Could not apply the plan. Please try again.' }
  }

  return { ok: true, plan }
}
