/**
 * Maps Polar subscription webhook events onto Veritio org plans.
 * Provider-specific glue only: it derives {plan, plan_status} from the Polar
 * subscription and reuses the existing setOrgPlan() path, so all downstream
 * entitlement enforcement (403s, DB triggers) is unchanged.
 */
import { PLAN_ENTITLEMENTS, PLAN_LABEL, isLifetimePlan, type LifetimePlanId, type PlanStatus } from '@/lib/plans'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { setOrgPlan } from '@/services/entitlements-service'
import { planForProductId } from '@/lib/billing/polar-plans'
import { recordLifetimePurchase, markPurchaseRefunded } from '@/services/billing/lifetime-purchase-service'
import { createServerMetaEventId, trackMetaServerEvent } from '@/lib/analytics/meta-conversions'

/** Polar subscription.status -> our plan_status. Unknown/incomplete states lock the org. */
function mapStatus(polarStatus: string | undefined): PlanStatus {
  switch (polarStatus) {
    case 'active':
      return 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    case 'canceled':
    case 'revoked':
    case 'incomplete':
    case 'incomplete_expired':
    default:
      return 'canceled'
  }
}

interface PolarSubscriptionLike {
  id?: string
  status?: string
  /** order.paid convenience flag (present on order payloads). */
  paid?: boolean
  productId?: string
  product_id?: string
  product?: { id?: string } | null
  customerId?: string
  customer_id?: string
  checkoutId?: string | null
  checkout_id?: string | null
  totalAmount?: number | null
  total_amount?: number | null
  currency?: string | null
  currentPeriodEnd?: string | null
  current_period_end?: string | null
  customer?: { externalId?: string | null; external_id?: string | null; email?: string | null } | null
  customerExternalId?: string | null
  customer_external_id?: string | null
  customerEmail?: string | null
  customer_email?: string | null
  seats?: number | null
  metadata?: Record<string, unknown> | null
}

/** Buyer email from an order payload (anonymous LTD purchases have no org id). */
function resolveBuyerEmail(order: PolarSubscriptionLike): string | null {
  return (
    order.customer?.email ||
    order.customerEmail ||
    order.customer_email ||
    (typeof order.metadata?.buyerEmail === 'string' ? (order.metadata.buyerEmail as string) : null) ||
    null
  )
}

/** Pull the Veritio org id we attached at checkout (customerExternalId / metadata). */
function resolveOrgId(sub: PolarSubscriptionLike): string | null {
  return (
    sub.customer?.externalId ||
    sub.customer?.external_id ||
    sub.customerExternalId ||
    sub.customer_external_id ||
    (typeof sub.metadata?.organizationId === 'string' ? (sub.metadata.organizationId as string) : null) ||
    null
  )
}

function resolveMetaPurchaseEventId(payload: PolarSubscriptionLike): string {
  const fromMetadata = payload.metadata?.metaPurchaseEventId
  if (typeof fromMetadata === 'string' && fromMetadata.trim()) return fromMetadata.trim()
  return createServerMetaEventId('Purchase', payload.id || payload.checkoutId || payload.checkout_id || null)
}

function amountToValue(amount: number | null | undefined): number | undefined {
  return typeof amount === 'number' && Number.isFinite(amount) ? amount / 100 : undefined
}

async function trackPolarPurchase(
  event: PolarEvent,
  payload: PolarSubscriptionLike,
  mapped: NonNullable<ReturnType<typeof planForProductId>>,
  buyerEmail?: string | null,
): Promise<void> {
  const checkoutId = payload.checkoutId || payload.checkout_id || null
  const isLifetime = mapped.interval === 'lifetime'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://veritio.io'
  await trackMetaServerEvent({
    eventName: 'Purchase',
    eventId: resolveMetaPurchaseEventId(payload),
    email: buyerEmail ?? resolveBuyerEmail(payload),
    externalId: resolveOrgId(payload),
    eventSourceUrl: isLifetime ? `${appUrl}/ltd` : appUrl,
    customData: {
      content_name: isLifetime ? `Veritio LTD ${PLAN_LABEL[mapped.plan]}` : `Veritio ${PLAN_LABEL[mapped.plan]}`,
      content_category: isLifetime ? 'ltd' : mapped.interval,
      content_ids: [isLifetime ? `veritio_ltd_${mapped.plan}` : `veritio_${mapped.plan}_${mapped.interval}`],
      content_type: isLifetime ? 'lifetime' : 'subscription',
      value: amountToValue(payload.totalAmount ?? payload.total_amount),
      currency: (payload.currency || 'usd').toUpperCase(),
      order_id: payload.id,
      checkout_id: checkoutId,
      event_type: event.type,
    },
  })
}

export interface PolarEvent {
  type: string
  data: PolarSubscriptionLike
}

/**
 * One-time lifetime deal orders. Recurring subscriptions also emit order.* events,
 * so we only act when the ordered product maps to a lifetime tier and leave
 * everything else to the subscription.* handler. Idempotent.
 */
async function handleOrderEvent(event: PolarEvent): Promise<void> {
  const order = event.data || {}
  const productId = order.productId || order.product_id || order.product?.id
  const mapped = productId ? planForProductId(productId) : undefined
  if (!mapped) return
  const isLifetimeOrder = isLifetimePlan(mapped.plan)

  const supabase = getMotiaSupabaseClient()
  const checkoutId = order.checkoutId || order.checkout_id || null

  // Refunds: block future claims (granted orgs are flagged for manual review).
  if (event.type === 'order.refunded' || order.status === 'refunded') {
    if (isLifetimeOrder) {
      await markPurchaseRefunded(supabase, { orderId: order.id ?? null, checkoutId })
      console.log('[polar] lifetime order refunded', { type: event.type, id: order.id })
    }
    return
  }

  // Fulfil only on a PAID order — this webhook is the one signal that money
  // actually moved. Polar sends order.paid (and order.updated with status='paid').
  const isPaid = order.paid === true || event.type === 'order.paid' || order.status === 'paid'
  if (!isPaid) return

  if (!isLifetimeOrder) {
    await trackPolarPurchase(event, order, mapped)
    return
  }

  const orgId = resolveOrgId(order)

  if (!orgId) {
    // Payment-first flow: the buyer paid before having an account. Record the
    // purchase durably + email the activation link. Idempotent across redeliveries.
    const email = resolveBuyerEmail(order)
    if (!email) {
      console.error('[polar] paid lifetime order without org OR buyer email — cannot fulfil', {
        type: event.type,
        id: order.id,
      })
      throw new Error('Lifetime order missing buyer email') // 500 → Polar retries
    }
    const { error } = await recordLifetimePurchase(supabase, {
      email,
      plan: mapped.plan as LifetimePlanId,
      checkoutId,
      orderId: order.id ?? null,
      amount: order.totalAmount ?? order.total_amount ?? null,
      currency: order.currency ?? null,
      source: 'direct-ltd',
    })
    if (error) {
      console.error('[polar] failed to record lifetime purchase', { id: order.id, error: error.message })
      throw error // let the route return 500 so Polar retries
    }
    await trackPolarPurchase(event, order, mapped, email)
    console.log('[polar] recorded anonymous lifetime purchase', { type: event.type, id: order.id, plan: mapped.plan })
    return
  }

  // Logged-in buyer with an org: grant directly (and keep an audit row, marked granted).
  const { error } = await setOrgPlan(supabase, orgId, {
    plan: mapped.plan,
    plan_status: 'active',
    trial_ends_at: null,
  })
  if (error) {
    console.error('[polar] failed to apply lifetime order', { orgId, type: event.type, error: error.message })
    throw error // let the route return 500 so Polar retries
  }

  const billingPatch: Record<string, unknown> = { billing_provider: 'polar' }
  if (order.customerId || order.customer_id) billingPatch.billing_customer_id = (order.customerId || order.customer_id)!
  await (supabase.from('organizations') as never as { update: (p: unknown) => { eq: (k: string, v: string) => Promise<unknown> } })
    .update(billingPatch)
    .eq('id', orgId)

  await trackPolarPurchase(event, order, mapped)
  console.log('[polar] applied lifetime order', { orgId, type: event.type, plan: mapped.plan })
}

/**
 * Apply a verified Polar webhook event. Idempotent: re-delivering the same event
 * produces the same org state. subscription.* events drive recurring plans;
 * order.* events fulfil one-time lifetime purchases.
 */
export async function handlePolarEvent(event: PolarEvent): Promise<void> {
  if (event?.type?.startsWith('order.')) {
    await handleOrderEvent(event)
    return
  }
  if (!event?.type?.startsWith('subscription.')) {
    // checkout.*, customer.*, benefit.* — nothing to do for plan state.
    return
  }

  const sub = event.data || {}
  const orgId = resolveOrgId(sub)
  if (!orgId) {
    console.warn('[polar] subscription event without org id (customerExternalId)', { type: event.type, subId: sub.id })
    return
  }

  const productId = sub.productId || sub.product_id
  const status = mapStatus(sub.status)
  const supabase = getMotiaSupabaseClient()

  // Build the plan patch. Active subscriptions clear the in-app trial. Polar
  // trialing subscriptions keep their period end so computeEntitlements can
  // grant access until the external trial expires.
  const patch: Parameters<typeof setOrgPlan>[2] = { plan_status: status }
  if (status === 'active' || status === 'trialing') {
    const mapped = productId ? planForProductId(productId) : undefined
    if (mapped) {
      patch.plan = mapped.plan
      if (mapped.plan === 'team' && typeof sub.seats === 'number') {
        patch.extra_seats = Math.max(0, sub.seats - PLAN_ENTITLEMENTS.team.seats)
      } else if (mapped.plan !== 'team') {
        patch.extra_seats = 0
      }
    }
    patch.trial_ends_at =
      status === 'trialing'
        ? sub.currentPeriodEnd || sub.current_period_end || null
        : null
  }

  const { error } = await setOrgPlan(supabase, orgId, patch)
  if (error) {
    console.error('[polar] failed to update org plan', { orgId, type: event.type, error: error.message })
    throw error // let the route return 500 so Polar retries
  }

  // Persist billing linkage (not part of the entitlement cache).
  const billingPatch: Record<string, unknown> = { billing_provider: 'polar' }
  if (sub.customerId || sub.customer_id) billingPatch.billing_customer_id = (sub.customerId || sub.customer_id)!
  if (sub.id) billingPatch.billing_subscription_id = sub.id

  if (patch.plan === 'team') {
    const { data: org } = await (supabase.from('organizations') as any)
      .select('settings')
      .eq('id', orgId)
      .single()
    const settings = ((org as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as Record<string, unknown>
    billingPatch.settings = { ...settings, type: 'team' }
  }

  await (supabase.from('organizations') as never as { update: (p: unknown) => { eq: (k: string, v: string) => Promise<unknown> } })
    .update(billingPatch)
    .eq('id', orgId)

  console.log('[polar] applied subscription event', { orgId, type: event.type, status, plan: patch.plan })
}
