/**
 * Maps Polar subscription webhook events onto Veritio org plans.
 * Provider-specific glue only: it derives {plan, plan_status} from the Polar
 * subscription and reuses the existing setOrgPlan() path, so all downstream
 * entitlement enforcement (403s, DB triggers) is unchanged.
 */
import { PLAN_ENTITLEMENTS, type PlanStatus } from '@/lib/plans'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { setOrgPlan } from '@/services/entitlements-service'
import { planForProductId } from '@/lib/billing/polar-plans'

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
  productId?: string
  product_id?: string
  customerId?: string
  customer_id?: string
  currentPeriodEnd?: string | null
  current_period_end?: string | null
  customer?: { externalId?: string | null; external_id?: string | null } | null
  customerExternalId?: string | null
  customer_external_id?: string | null
  seats?: number | null
  metadata?: Record<string, unknown> | null
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

export interface PolarEvent {
  type: string
  data: PolarSubscriptionLike
}

/**
 * Apply a verified Polar webhook event. Idempotent: re-delivering the same event
 * produces the same org state. Only subscription.* events change plans.
 */
export async function handlePolarEvent(event: PolarEvent): Promise<void> {
  if (!event?.type?.startsWith('subscription.')) {
    // order.*, checkout.*, customer.*, benefit.* — nothing to do for plan state.
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
