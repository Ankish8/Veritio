/**
 * Payment-first lifetime deal purchases.
 *
 * Anonymous buyers pay in the custom checkout BEFORE having an account. Every
 * paid one-time LTD order is recorded durably here (driven by the order.paid
 * webhook, which is the only signal that money actually moved), a single-use
 * redemption code is generated, and the buyer is emailed an activation link.
 * The purchase is then claimed by exactly one of:
 *   1. auto-grant: a new account whose VERIFIED email matches the buyer email
 *      (hooked into workspace initialization), or
 *   2. the redemption code (success screen / email link) via /redeem.
 *
 * Everything is idempotent: unique keys on the Polar checkout/order ids, an
 * atomic email_sent_at claim so the fulfillment email sends exactly once, and
 * conditional status transitions so a purchase can never be granted twice.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { sendEmail } from '@/services/email-service'
import { setOrgPlan } from '@/services/entitlements-service'
import { generateRedemptionCodes } from '@/services/billing/redemption-service'
import { PLAN_LABEL, isLifetimePlan, type LifetimePlanId } from '@/lib/plans'

type SupabaseClientType = SupabaseClient<Database>

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io'

export interface LifetimePurchaseRow {
  id: string
  email: string
  plan: LifetimePlanId
  polar_checkout_id: string | null
  polar_order_id: string | null
  status: 'paid' | 'granted' | 'refunded'
  redemption_code: string | null
  email_sent_at: string | null
}

function purchases(supabase: SupabaseClientType) {
  return supabase.from('lifetime_purchases' as any) as any
}

/** Fulfillment email: activation link + code + auto-activate note. */
function buildPurchaseEmail(plan: LifetimePlanId, code: string, email: string): { subject: string; html: string } {
  const planLabel = PLAN_LABEL[plan]
  const claimUrl = `${APP_URL}/redeem?code=${encodeURIComponent(code)}`
  const subject = `Your Veritio ${planLabel} access is ready`
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#210D02;max-width:560px;margin:0 auto;padding:24px;">
  <div style="border-bottom:1px solid #eee;padding-bottom:16px;margin-bottom:20px;"><strong style="font-size:18px;">Veritio</strong></div>
  <h2 style="margin:0 0 8px;">Payment received. Welcome aboard!</h2>
  <p>Thanks for buying the <strong>Veritio ${planLabel}</strong> lifetime deal. Your payment is confirmed, and your lifetime access is waiting for you.</p>
  <p style="margin:24px 0;">
    <a href="${claimUrl}" style="display:inline-block;background:#210D02;color:#fff !important;padding:13px 26px;text-decoration:none;border-radius:8px;font-weight:600;">Activate lifetime access</a>
  </p>
  <p>The button signs you up (or in) and applies your plan. If you are asked for a code, use:</p>
  <p style="background:#f6f5f4;border:1px solid #eee;border-radius:8px;padding:12px 16px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:15px;letter-spacing:.5px;">${code}</p>
  <p style="color:#4F4D49;font-size:14px;">Tip: create your account with <strong>${email}</strong> and your lifetime plan can activate automatically.</p>
  <p style="color:#4F4D49;font-size:14px;">Your payment receipt is sent separately by Polar, our payment partner.</p>
  <div style="border-top:1px solid #eee;padding-top:16px;margin-top:28px;font-size:12px;color:#666;">
    <p>Questions or trouble activating? Just reply, or email <a href="mailto:support@veritio.io">support@veritio.io</a>. Keep this email: the code above is your proof of purchase.</p>
    <p>Veritio, UX research made simple</p>
  </div>
</body>
</html>`.trim()
  return { subject, html }
}

export interface RecordPurchaseInput {
  email: string
  plan: LifetimePlanId
  checkoutId?: string | null
  orderId?: string | null
  amount?: number | null
  currency?: string | null
  source?: string
}

/**
 * Durably record a PAID one-time lifetime purchase, generate its single-use
 * redemption code, and send the fulfillment email exactly once. Safe to call
 * repeatedly (webhook redeliveries, order.paid + order.updated, races).
 */
export async function recordLifetimePurchase(
  supabase: SupabaseClientType,
  input: RecordPurchaseInput,
): Promise<{ row: LifetimePurchaseRow | null; error: Error | null }> {
  const email = input.email.trim().toLowerCase()
  if (!email || !isLifetimePlan(input.plan)) {
    return { row: null, error: new Error('Invalid purchase input') }
  }
  const checkoutId = input.checkoutId || null
  const orderId = input.orderId || null
  if (!checkoutId && !orderId) {
    return { row: null, error: new Error('Purchase needs a Polar checkout or order id') }
  }

  // 1. Idempotent insert keyed on the Polar checkout id (both the webhook and
  //    any other capture path know it). Falls back to order id when absent.
  const conflictKey = checkoutId ? 'polar_checkout_id' : 'polar_order_id'
  const { error: upsertErr } = await purchases(supabase).upsert(
    {
      email,
      plan: input.plan,
      polar_checkout_id: checkoutId,
      polar_order_id: orderId,
      amount: input.amount ?? null,
      currency: input.currency ?? null,
      source: input.source ?? 'direct-ltd',
      status: 'paid',
    },
    { onConflict: conflictKey, ignoreDuplicates: true },
  )
  if (upsertErr) return { row: null, error: new Error(upsertErr.message) }

  // 2. Load the canonical row.
  const idFilter = checkoutId
    ? { col: 'polar_checkout_id', val: checkoutId }
    : { col: 'polar_order_id', val: orderId! }
  const { data: rowData, error: selErr } = await purchases(supabase)
    .select('id, email, plan, polar_checkout_id, polar_order_id, status, redemption_code, email_sent_at')
    .eq(idFilter.col, idFilter.val)
    .maybeSingle()
  if (selErr || !rowData) return { row: null, error: new Error(selErr?.message || 'Purchase row not found after upsert') }
  let row = rowData as LifetimePurchaseRow

  // 2b. Backfill the order id when the row was first created without it.
  if (orderId && !row.polar_order_id) {
    await purchases(supabase).update({ polar_order_id: orderId }).eq('id', row.id).is('polar_order_id', null)
  }

  // 3. Generate the single-use claim code once (guarded update wins the race).
  if (!row.redemption_code) {
    const { codes, error: codeErr } = await generateRedemptionCodes(supabase, {
      plan: row.plan,
      count: 1,
      source: input.source ?? 'direct-ltd',
      note: `lifetime purchase ${row.id} (${email})`,
    })
    if (!codeErr && codes[0]) {
      const { data: updated } = await purchases(supabase)
        .update({ redemption_code: codes[0] })
        .eq('id', row.id)
        .is('redemption_code', null)
        .select('redemption_code')
        .maybeSingle()
      if (updated?.redemption_code) {
        row = { ...row, redemption_code: updated.redemption_code }
      } else {
        // Lost the race: another writer already set a code. Re-read it and void ours.
        const { data: reread } = await purchases(supabase).select('redemption_code').eq('id', row.id).maybeSingle()
        row = { ...row, redemption_code: (reread as any)?.redemption_code ?? codes[0] }
        if ((reread as any)?.redemption_code && (reread as any).redemption_code !== codes[0]) {
          await (supabase.from('redemption_codes' as any) as any).delete().eq('code', codes[0]).is('redeemed_at', null)
        }
      }
    }
  }

  // 4. Fulfillment email, exactly once: atomically claim email_sent_at, and
  //    release the claim if the provider rejects the send so a later webhook
  //    delivery retries it.
  if (!row.email_sent_at && row.redemption_code && row.status === 'paid') {
    const { data: claimed } = await purchases(supabase)
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('email_sent_at', null)
      .select('id')
      .maybeSingle()
    if (claimed) {
      const { subject, html } = buildPurchaseEmail(row.plan, row.redemption_code, email)
      const result = await sendEmail({ to: email, subject, html })
      if (!result.success) {
        console.error('[ltd] fulfillment email failed; releasing send claim for retry', {
          purchaseId: row.id,
          error: result.error,
        })
        await purchases(supabase).update({ email_sent_at: null }).eq('id', row.id)
      } else {
        console.log('[ltd] fulfillment email sent', { purchaseId: row.id, emailId: result.id })
      }
    }
  }

  return { row, error: null }
}

export type ClaimResult =
  | { claimed: true; plan: LifetimePlanId }
  | { claimed: false }

/**
 * Auto-grant: claim the oldest unclaimed purchase matching this (verified)
 * email and apply the lifetime plan to the given org. Atomic on status so a
 * purchase can only ever be granted once; rolls back the claim if the plan
 * update fails so nothing is lost.
 */
export async function claimLifetimePurchaseByEmail(
  supabase: SupabaseClientType,
  params: { email: string; userId: string; orgId: string },
): Promise<ClaimResult> {
  const email = params.email.trim().toLowerCase()
  if (!email) return { claimed: false }

  const { data: candidate } = await purchases(supabase)
    .select('id, plan, redemption_code')
    .eq('status', 'paid')
    .ilike('email', email) // exact match modulo case (no wildcards in the input path)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (!candidate) return { claimed: false }

  // Atomic claim: only wins if still unclaimed.
  const { data: won } = await purchases(supabase)
    .update({
      status: 'granted',
      granted_org: params.orgId,
      granted_user: params.userId,
      granted_at: new Date().toISOString(),
    })
    .eq('id', candidate.id)
    .eq('status', 'paid')
    .select('id')
    .maybeSingle()
  if (!won) return { claimed: false }

  const plan = candidate.plan as LifetimePlanId
  const { error: planErr } = await setOrgPlan(supabase, params.orgId, {
    plan,
    plan_status: 'active',
    trial_ends_at: null,
  })
  if (planErr) {
    // Release the claim so the code / a retry can still fulfil the purchase.
    await purchases(supabase)
      .update({ status: 'paid', granted_org: null, granted_user: null, granted_at: null })
      .eq('id', candidate.id)
    console.error('[ltd] auto-claim plan grant failed; claim released', { purchaseId: candidate.id, error: planErr.message })
    return { claimed: false }
  }

  // Retire the linked code so it cannot double-grant elsewhere.
  if (candidate.redemption_code) {
    await (supabase.from('redemption_codes' as any) as any)
      .update({ redeemed_at: new Date().toISOString(), redeemed_by_org: params.orgId, redeemed_by_user: params.userId })
      .eq('code', candidate.redemption_code)
      .is('redeemed_at', null)
  }

  return { claimed: true, plan }
}

/** Mark the purchase behind a redemption code as granted (called after a code redeem). */
export async function markPurchaseGrantedByCode(
  supabase: SupabaseClientType,
  params: { code: string; orgId: string; userId: string },
): Promise<void> {
  await purchases(supabase)
    .update({
      status: 'granted',
      granted_org: params.orgId,
      granted_user: params.userId,
      granted_at: new Date().toISOString(),
    })
    .eq('redemption_code', params.code)
    .eq('status', 'paid')
}

/**
 * Refund handling: block future claims. If the purchase was already granted,
 * flag it loudly for manual review rather than auto-revoking a live workspace.
 */
export async function markPurchaseRefunded(
  supabase: SupabaseClientType,
  params: { checkoutId?: string | null; orderId?: string | null },
): Promise<void> {
  const key = params.orderId
    ? { col: 'polar_order_id', val: params.orderId }
    : params.checkoutId
      ? { col: 'polar_checkout_id', val: params.checkoutId }
      : null
  if (!key) return

  const { data: row } = await purchases(supabase)
    .select('id, status, granted_org, redemption_code')
    .eq(key.col, key.val)
    .maybeSingle()
  if (!row) return

  if (row.status === 'granted') {
    console.warn('[ltd] refund on an already-granted lifetime purchase; manual review required', {
      purchaseId: row.id,
      grantedOrg: row.granted_org,
    })
    return
  }

  await purchases(supabase).update({ status: 'refunded' }).eq('id', row.id).neq('status', 'granted')
  if (row.redemption_code) {
    // Retire the unused code so a refunded purchase cannot be claimed.
    await (supabase.from('redemption_codes' as any) as any)
      .update({ expires_at: new Date().toISOString() })
      .eq('code', row.redemption_code)
      .is('redeemed_at', null)
  }
}

/** Look up a purchase (code + plan) by Polar checkout id, for the post-payment success screen. */
export async function getPurchaseByCheckoutId(
  supabase: SupabaseClientType,
  checkoutId: string,
): Promise<{ code: string | null; plan: LifetimePlanId; email: string; status: string } | null> {
  const { data } = await purchases(supabase)
    .select('redemption_code, plan, email, status')
    .eq('polar_checkout_id', checkoutId)
    .maybeSingle()
  if (!data) return null
  return { code: data.redemption_code ?? null, plan: data.plan, email: data.email, status: data.status }
}
