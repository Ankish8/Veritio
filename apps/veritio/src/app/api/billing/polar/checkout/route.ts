import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUser } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { getPolar } from '@/lib/billing/polar'
import { productIdFor, type BillingInterval, type PaidPlan } from '@/lib/billing/polar-plans'
import { PLAN_ENTITLEMENTS } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID_PLANS: PaidPlan[] = ['starter', 'pro', 'team']

/**
 * GET /api/billing/polar/checkout?orgId=<uuid>&plan=pro&interval=month
 * Creates a Polar checkout for the caller's organization and redirects to it.
 * The org is verified against the session's membership; the product is mapped
 * server-side, so the client can't pick an arbitrary price or customer.
 */
export async function GET(req: NextRequest) {
  const user = await getServerUser()
  if (!user) {
    return NextResponse.redirect(new URL('/sign-in?redirect=/settings', req.url))
  }
  const userId = user.id
  const userEmail = (user as { email?: string | null }).email ?? undefined

  const polar = getPolar()
  if (!polar) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
  }

  const params = req.nextUrl.searchParams
  const orgId = params.get('orgId') || ''
  const plan = params.get('plan') as PaidPlan | null
  const interval = (params.get('interval') || 'month') as BillingInterval

  if (!orgId || !plan || !PAID_PLANS.includes(plan) || (interval !== 'month' && interval !== 'year')) {
    return NextResponse.json({ error: 'Invalid plan, interval, or organization' }, { status: 400 })
  }

  const productId = productIdFor(plan, interval)
  if (!productId) {
    return NextResponse.json({ error: `No Polar product configured for ${plan}/${interval}` }, { status: 500 })
  }

  const supabase = getMotiaSupabaseClient()
  const { data: membership } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .single()
  if (!membership || !['owner', 'admin'].includes((membership as { role?: string }).role ?? '')) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const origin = req.nextUrl.origin
  const teamSeats = plan === 'team' ? PLAN_ENTITLEMENTS.team.seats : null
  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: orgId,
      ...(userEmail ? { customerEmail: userEmail } : {}),
      ...(teamSeats ? { seats: teamSeats, minSeats: teamSeats } : {}),
      successUrl: `${origin}/settings?tab=plan-usage&checkout=success`,
      metadata: { organizationId: orgId, plan, interval, ...(teamSeats ? { seats: teamSeats } : {}) },
    })
    // ?format=json → return everything the custom 2-column checkout needs; default → redirect.
    if (params.get('format') === 'json') {
      const c = checkout as unknown as {
        clientSecret: string
        id: string
        url: string
        amount?: number
        totalAmount?: number
        currency?: string
        recurringInterval?: string | null
        isPaymentRequired?: boolean
        seats?: number | null
        customerEmail?: string | null
        product?: { name?: string } | null
        paymentProcessorMetadata?: Record<string, string>
      }
      const meta = c.paymentProcessorMetadata || {}
      return NextResponse.json({
        url: c.url,
        clientSecret: c.clientSecret,
        id: c.id,
        publishableKey: meta.publishable_key ?? meta.publishableKey ?? meta.stripe_publishable_key ?? null,
        amount: c.amount ?? null,
        totalAmount: c.totalAmount ?? c.amount ?? null,
        currency: c.currency ?? 'usd',
        recurringInterval: c.recurringInterval ?? interval,
        seats: c.seats ?? teamSeats,
        // Drives Stripe Elements mode: payment/subscription (immediate charge) vs setup.
        isPaymentRequired: c.isPaymentRequired ?? true,
        productName: c.product?.name ?? null,
        customerEmail: userEmail ?? c.customerEmail ?? null,
      })
    }
    return NextResponse.redirect(checkout.url)
  } catch (err) {
    console.error('[polar] checkout creation failed', { orgId, plan, interval, err })
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}
