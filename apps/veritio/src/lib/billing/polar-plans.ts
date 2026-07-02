/**
 * Maps Veritio plans <-> Polar product IDs, sourced from env so the same code
 * works for sandbox and production (just swap the POLAR_PRODUCT_* env values).
 * Provider-agnostic: nothing else in the app needs to know Polar product IDs.
 *
 * No 'server-only' marker on purpose — this is imported by Motia backend steps
 * (plain Node), and it only reads server-side env vars anyway.
 */
import type { PlanId, LifetimePlanId } from '@/lib/plans'
import { LIFETIME_PLANS } from '@/lib/plans'

// Recurring paid plans only (pinned explicitly — must NOT include the one-time
// lifetime tiers, which have no billing interval).
export type PaidPlan = 'starter' | 'pro' | 'team'
export type BillingInterval = 'month' | 'year'
/** Interval-like tag for the reverse lookup; lifetime products are one-time. */
export type ProductInterval = BillingInterval | 'lifetime'

export interface ProductMapEntry {
  plan: PlanId
  interval: ProductInterval
  productId: string
}

const PAID_PLANS: PaidPlan[] = ['starter', 'pro', 'team']
const INTERVALS: BillingInterval[] = ['month', 'year']

const ENV_KEYS: Record<PaidPlan, Record<BillingInterval, string>> = {
  starter: { month: 'POLAR_PRODUCT_STARTER_MONTHLY', year: 'POLAR_PRODUCT_STARTER_YEARLY' },
  pro: { month: 'POLAR_PRODUCT_PRO_MONTHLY', year: 'POLAR_PRODUCT_PRO_YEARLY' },
  team: { month: 'POLAR_PRODUCT_TEAM_MONTHLY', year: 'POLAR_PRODUCT_TEAM_YEARLY' },
}

// One-time lifetime deal products (no interval).
const LIFETIME_ENV_KEYS: Record<LifetimePlanId, string> = {
  lifetime_tier1: 'POLAR_PRODUCT_LIFETIME_TIER1',
  lifetime_tier2: 'POLAR_PRODUCT_LIFETIME_TIER2',
  lifetime_team: 'POLAR_PRODUCT_LIFETIME_TEAM',
}

/** All product mappings that have an env value configured (recurring + lifetime). */
export function getProductMap(): ProductMapEntry[] {
  const out: ProductMapEntry[] = []
  for (const plan of PAID_PLANS) {
    for (const interval of INTERVALS) {
      const productId = process.env[ENV_KEYS[plan][interval]]
      if (productId) out.push({ plan, interval, productId })
    }
  }
  for (const plan of LIFETIME_PLANS) {
    const productId = process.env[LIFETIME_ENV_KEYS[plan]]
    if (productId) out.push({ plan, interval: 'lifetime', productId })
  }
  return out
}

/** Polar product ID for a given recurring plan + interval (undefined if not configured). */
export function productIdFor(plan: PaidPlan, interval: BillingInterval): string | undefined {
  const key = ENV_KEYS[plan]?.[interval]
  return key ? process.env[key] : undefined
}

/** Polar product ID for a one-time lifetime tier (undefined if not configured). */
export function lifetimeProductIdFor(plan: LifetimePlanId): string | undefined {
  const key = LIFETIME_ENV_KEYS[plan]
  return key ? process.env[key] : undefined
}

/** Reverse lookup used by the webhook/confirm: which plan a product ID belongs to. */
export function planForProductId(productId: string): { plan: PlanId; interval: ProductInterval } | undefined {
  const match = getProductMap().find((e) => e.productId === productId)
  return match ? { plan: match.plan, interval: match.interval } : undefined
}

/** True once at least one product ID is configured. */
export function hasConfiguredProducts(): boolean {
  return getProductMap().length > 0
}
