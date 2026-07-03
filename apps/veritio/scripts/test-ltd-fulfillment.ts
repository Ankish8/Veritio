#!/usr/bin/env bun
/**
 * One-off verification of the payment-first LTD fulfillment path.
 * Simulates exactly what the order.paid webhook does for an anonymous buyer:
 * resolve the checkout, recordLifetimePurchase (row + code + real email).
 * Usage: bun scripts/test-ltd-fulfillment.ts <clientSecret> <email>
 */
import { Polar } from '@polar-sh/sdk'
import { getMotiaSupabaseClient } from '../src/lib/supabase/motia-client'
import { recordLifetimePurchase } from '../src/services/billing/lifetime-purchase-service'

const clientSecret = process.argv[2]
const email = process.argv[3]
if (!clientSecret || !email) {
  console.error('usage: bun scripts/test-ltd-fulfillment.ts <clientSecret> <email>')
  process.exit(1)
}

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox',
})
const checkout = await polar.checkouts.clientGet({ clientSecret })
console.log('checkout:', { id: checkout.id, status: checkout.status })

const { row, error } = await recordLifetimePurchase(getMotiaSupabaseClient(), {
  email,
  plan: 'lifetime_tier1',
  checkoutId: checkout.id,
  orderId: `test-order-${checkout.id.slice(0, 8)}`,
  amount: 4900,
  currency: 'usd',
  source: 'direct-ltd-test',
})
console.log('purchase row:', row)
console.log('error:', error?.message ?? null)
process.exit(error ? 1 : 0)
