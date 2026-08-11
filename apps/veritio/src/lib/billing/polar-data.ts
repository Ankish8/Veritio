import 'server-only'

import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { getPolar } from '@/lib/billing/polar'
import { PLAN_ENTITLEMENTS, isEducationPlan } from '@/lib/plans'
import { getOrgPlan, setOrgPlan } from '@/services/entitlements-service'
import { planForProductId, productIdFor, type BillingInterval, type PaidPlan } from '@/lib/billing/polar-plans'

// Clean DTOs we render in our own UI. The Polar SDK's generated types are heavy
// and union-laden, so we cast at the boundary and map to these stable shapes.

export interface BillingSubscription {
  id: string
  status: string
  amount: number | null
  currency: string
  recurringInterval: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  productName: string | null
  productId: string | null
  seats: number | null
}

export interface BillingPaymentMethod {
  brand: string
  last4: string
  expMonth?: number
  expYear?: number
}

export interface BillingSummary {
  subscription: BillingSubscription | null
  customer: { email: string | null; name: string | null } | null
  paymentMethod: BillingPaymentMethod | null
}

export interface BillingInvoice {
  id: string
  date: string
  amount: number
  currency: string
  status: string
  paid: boolean
  invoiceNumber: string | null
  description: string
}

/** Verify the caller is signed in and a member of orgId. Returns userId or null. */
export async function assertOrgAccess(orgId: string | null | undefined): Promise<string | null> {
  if (!orgId) return null
  const userId = await getServerUserId()
  if (!userId) return null
  const supabase = getMotiaSupabaseClient()
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .maybeSingle()
  return data ? userId : null
}

/** Verify the caller can change billing for orgId. Returns userId or null. */
/**
 * True when the org holds an institutional education license.
 *
 * Those are invoiced against a purchase order and sized to a cohort, so they
 * must never pass through self-serve Polar checkout: the webhook would call
 * setOrgPlan() and overwrite edu_* with a card plan, collapsing 40+ seats to 1
 * and uncapped responses back to 100. Every plan-mutating billing route checks
 * this, because hiding the button in the UI is not a guarantee.
 */
export async function isEducationOrg(orgId: string | null | undefined): Promise<boolean> {
  if (!orgId) return false
  const row = await getOrgPlan(getMotiaSupabaseClient(), orgId)
  return isEducationPlan(row?.plan)
}

/** Message shown when an education license is pointed at self-serve billing. */
export const EDUCATION_BILLING_MESSAGE =
  'This organization is on an education license, which is invoiced rather than billed to a card. Contact support@veritio.io to change or renew it.'

export async function assertOrgBillingAccess(orgId: string | null | undefined): Promise<string | null> {
  if (!orgId) return null
  const userId = await getServerUserId()
  if (!userId) return null

  const supabase = getMotiaSupabaseClient()
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .maybeSingle()

  const role = (data as { role?: string } | null)?.role
  return role === 'owner' || role === 'admin' ? userId : null
}

function toISO(d: unknown): string | null {
  if (!d) return null
  try {
    return d instanceof Date ? d.toISOString() : new Date(d as string).toISOString()
  } catch {
    return null
  }
}

function describeReason(reason: string | null | undefined, productName: string | null | undefined): string {
  const name = productName || 'Subscription'
  switch (reason) {
    case 'subscription_create':
      return `${name} — subscription started`
    case 'subscription_cycle':
    case 'subscription_renewal':
      return `${name} — renewal`
    case 'subscription_update':
      return `${name} — plan change`
    case 'purchase':
      return name
    default:
      return name
  }
}

/** Subscription + customer + payment method for the org's Polar customer (externalId = orgId). */
export async function getBillingSummary(orgId: string): Promise<BillingSummary> {
  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return { subscription: null, customer: null, paymentMethod: null }

  let subscription: BillingSubscription | null = null
  let customer: BillingSummary['customer'] = null
  let paymentMethod: BillingPaymentMethod | null = null

  try {
    const res = await polar.subscriptions.list({ externalCustomerId: orgId, active: true, limit: 1 })
    const s = res?.result?.items?.[0]
    if (s) {
      subscription = {
        id: s.id,
        status: s.status,
        amount: s.amount ?? null,
        currency: s.currency ?? 'usd',
        recurringInterval: s.recurringInterval ?? null,
        currentPeriodEnd: toISO(s.currentPeriodEnd),
        cancelAtPeriodEnd: !!s.cancelAtPeriodEnd,
        productName: s.product?.name ?? null,
        productId: s.productId ?? null,
        seats: typeof s.seats === 'number' ? s.seats : null,
      }
    }
  } catch {
    // no subscription / not a Polar customer yet
  }

  try {
    const c = await polar.customers.getStateExternal({ externalId: orgId })
    if (c) customer = { email: c.email ?? null, name: c.name ?? null }
  } catch {
    // customer not created yet
  }

  // Payment method requires a customer-session-scoped portal call.
  try {
    const session = await polar.customerSessions.create({ externalCustomerId: orgId })
    const token = session?.token
    if (token) {
      const pms = await polar.customerPortal.customers.listPaymentMethods({ customerSession: token }, {})
      const items = pms?.result?.items ?? []
      const card = items.find((m: any) => (m?.type === 'card' || m?.methodMetadata?.brand)) ?? items[0]
      const meta = card?.methodMetadata ?? card
      if (meta?.brand && meta?.last4) {
        paymentMethod = {
          brand: meta.brand,
          last4: meta.last4,
          expMonth: meta.expMonth,
          expYear: meta.expYear,
        }
      }
    }
  } catch {
    // no payment method on file
  }

  return { subscription, customer, paymentMethod }
}

/** Billing history (Polar orders) for the org. */
export async function listInvoices(orgId: string): Promise<BillingInvoice[]> {
  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return []
  try {
    const res = await polar.orders.list({ externalCustomerId: orgId, limit: 50 })
    const items = res?.result?.items ?? []
    return items.map((o: any) => ({
      id: o.id,
      date: toISO(o.createdAt) ?? '',
      amount: o.totalAmount ?? o.netAmount ?? 0,
      currency: o.currency ?? 'usd',
      status: o.status ?? (o.paid ? 'paid' : 'pending'),
      paid: !!o.paid,
      invoiceNumber: o.invoiceNumber ?? null,
      description: describeReason(o.billingReason, o.product?.name),
    }))
  } catch {
    return []
  }
}

/** Resolve a downloadable invoice PDF URL for an order, generating it if needed. */
export async function getInvoiceUrl(orgId: string, orderId: string): Promise<string | null> {
  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return null
  try {
    const order = await polar.orders.get({ id: orderId })
    // Guard: the order must belong to this org's customer.
    if (order?.customer?.externalId && order.customer.externalId !== orgId) return null
    if (order && order.isInvoiceGenerated === false) {
      try {
        await polar.orders.generateInvoice({ id: orderId })
      } catch {
        // may already be generating
      }
    }
    const inv = await polar.orders.invoice({ id: orderId })
    return inv?.url ?? null
  } catch {
    return null
  }
}

async function getActiveSubscription(polar: Record<string, any>, orgId: string): Promise<Record<string, any> | null> {
  const res = await polar.subscriptions.list({ externalCustomerId: orgId, active: true, limit: 1 })
  return res?.result?.items?.[0] ?? null
}

async function getActiveSubscriptionId(polar: Record<string, any>, orgId: string): Promise<string | null> {
  return (await getActiveSubscription(polar, orgId))?.id ?? null
}

async function countReservedSeats(orgId: string): Promise<number> {
  const supabase = getMotiaSupabaseClient()
  const [{ count: memberCount }, { data: pendingInvites }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .not('joined_at', 'is', null),
    supabase
      .from('organization_invitations')
      .select('invite_type, max_uses, uses_count')
      .eq('organization_id', orgId)
      .eq('status', 'pending'),
  ])

  const pendingSeats = (pendingInvites ?? []).reduce((sum, invite) => {
    if (invite.invite_type === 'link') {
      return sum + Math.max(0, (invite.max_uses ?? 1) - (invite.uses_count ?? 0))
    }
    return sum + 1
  }, 0)

  return (memberCount ?? 0) + pendingSeats
}

/** Cancel the org's active subscription at period end. */
export async function cancelSubscription(orgId: string): Promise<{ ok: boolean; error?: string }> {
  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return { ok: false, error: 'Billing not configured' }
  try {
    const id = await getActiveSubscriptionId(polar, orgId)
    if (!id) return { ok: false, error: 'No active subscription' }
    await polar.subscriptions.update({ id, subscriptionUpdate: { cancelAtPeriodEnd: true } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Cancel failed' }
  }
}

/** Change the org's active subscription to a different plan/interval (proration handled by Polar). */
export async function changePlan(
  orgId: string,
  plan: PaidPlan,
  interval: BillingInterval,
): Promise<{ ok: boolean; error?: string }> {
  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return { ok: false, error: 'Billing not configured' }
  const productId = productIdFor(plan, interval)
  if (!productId) return { ok: false, error: `No product configured for ${plan}/${interval}` }
  try {
    const id = await getActiveSubscriptionId(polar, orgId)
    if (!id) return { ok: false, error: 'No active subscription' }
    await polar.subscriptions.update({ id, subscriptionUpdate: { productId } })
    if (plan === 'team') {
      await polar.subscriptions.update({
        id,
        subscriptionUpdate: { seats: PLAN_ENTITLEMENTS.team.seats },
      })
    }
    // Reflect the new plan in our DB immediately so the change doesn't hinge on the
    // async subscription.updated webhook (which can be delayed, or — while testing
    // across sandbox/production — routed to a different environment). The webhook
    // reconfirms this idempotently.
    const { error } = await setOrgPlan(getMotiaSupabaseClient(), orgId, {
      plan,
      plan_status: 'active',
      ...(plan === 'team' ? {} : { extra_seats: 0 }),
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Plan change failed' }
  }
}

/** Update a Team subscription's seat count. `totalSeats` includes the 3 base Team seats. */
export async function updateTeamSeats(
  orgId: string,
  totalSeats: number,
): Promise<{ ok: boolean; error?: string; totalSeats?: number; extraSeats?: number }> {
  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return { ok: false, error: 'Billing not configured' }
  if (!Number.isInteger(totalSeats) || totalSeats < PLAN_ENTITLEMENTS.team.seats) {
    return { ok: false, error: `Team plans include at least ${PLAN_ENTITLEMENTS.team.seats} seats` }
  }

  try {
    const subscription = await getActiveSubscription(polar, orgId)
    if (!subscription?.id) return { ok: false, error: 'No active subscription' }

    const mapped = subscription.productId ? planForProductId(subscription.productId) : undefined
    if (mapped?.plan !== 'team') {
      return { ok: false, error: 'Extra seats are only available on the Team plan' }
    }

    const reservedSeats = await countReservedSeats(orgId)
    if (totalSeats < reservedSeats) {
      return {
        ok: false,
        error: `This workspace already has ${reservedSeats} reserved seat${reservedSeats === 1 ? '' : 's'}. Remove members or pending invites before lowering the seat count.`,
      }
    }

    await polar.subscriptions.update({
      id: subscription.id,
      subscriptionUpdate: { seats: totalSeats },
    })

    const extraSeats = totalSeats - PLAN_ENTITLEMENTS.team.seats
    const { error } = await setOrgPlan(getMotiaSupabaseClient(), orgId, { extra_seats: extraSeats })
    if (error) return { ok: false, error: error.message }

    return { ok: true, totalSeats, extraSeats }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Seat update failed' }
  }
}
