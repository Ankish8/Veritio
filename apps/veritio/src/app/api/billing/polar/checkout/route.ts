import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { getPolar } from '@/lib/billing/polar'
import { productIdFor, type BillingInterval, type PaidPlan } from '@/lib/billing/polar-plans'

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
  const userId = await getServerUserId()
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in?redirect=/settings', req.url))
  }

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
  if (!membership) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  const origin = req.nextUrl.origin
  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: orgId,
      successUrl: `${origin}/settings?checkout=success`,
      metadata: { organizationId: orgId, plan, interval },
    })
    return NextResponse.redirect(checkout.url)
  } catch (err) {
    console.error('[polar] checkout creation failed', { orgId, plan, interval, err })
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}
