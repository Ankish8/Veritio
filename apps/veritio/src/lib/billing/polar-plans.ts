/**
 * Maps Veritio plans <-> Polar product IDs, sourced from env so the same code
 * works for sandbox and production (just swap the POLAR_PRODUCT_* env values).
 * Provider-agnostic: nothing else in the app needs to know Polar product IDs.
 *
 * No 'server-only' marker on purpose — this is imported by Motia backend steps
 * (plain Node), and it only reads server-side env vars anyway.
 */
import type { PlanId } from '@/lib/plans'

export type PaidPlan = Exclude<PlanId, 'legacy'>
export type BillingInterval = 'month' | 'year'

export interface ProductMapEntry {
  plan: PaidPlan
  interval: BillingInterval
  productId: string
}

const PAID_PLANS: PaidPlan[] = ['starter', 'pro', 'team']
const INTERVALS: BillingInterval[] = ['month', 'year']

const ENV_KEYS: Record<PaidPlan, Record<BillingInterval, string>> = {
  starter: { month: 'POLAR_PRODUCT_STARTER_MONTHLY', year: 'POLAR_PRODUCT_STARTER_YEARLY' },
  pro: { month: 'POLAR_PRODUCT_PRO_MONTHLY', year: 'POLAR_PRODUCT_PRO_YEARLY' },
  team: { month: 'POLAR_PRODUCT_TEAM_MONTHLY', year: 'POLAR_PRODUCT_TEAM_YEARLY' },
}

/** All product mappings that have an env value configured. */
export function getProductMap(): ProductMapEntry[] {
  const out: ProductMapEntry[] = []
  for (const plan of PAID_PLANS) {
    for (const interval of INTERVALS) {
      const productId = process.env[ENV_KEYS[plan][interval]]
      if (productId) out.push({ plan, interval, productId })
    }
  }
  return out
}

/** Polar product ID for a given plan + interval (undefined if not configured). */
export function productIdFor(plan: PaidPlan, interval: BillingInterval): string | undefined {
  const key = ENV_KEYS[plan]?.[interval]
  return key ? process.env[key] : undefined
}

/** Reverse lookup used by the webhook: which plan/interval a product ID belongs to. */
export function planForProductId(productId: string): { plan: PaidPlan; interval: BillingInterval } | undefined {
  const match = getProductMap().find((e) => e.productId === productId)
  return match ? { plan: match.plan, interval: match.interval } : undefined
}

/** True once at least one product ID is configured. */
export function hasConfiguredProducts(): boolean {
  return getProductMap().length > 0
}
