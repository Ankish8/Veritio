import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUser } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { getPolar } from '@/lib/billing/polar'
import { lifetimeProductIdFor } from '@/lib/billing/polar-plans'
import { PLAN_LABEL, type LifetimePlanId } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Public tier slug (from the /ltd marketing CTAs) -> internal lifetime plan id.
const TIER_TO_PLAN: Record<string, LifetimePlanId> = {
  tier1: 'lifetime_tier1',
  tier2: 'lifetime_tier2',
  team: 'lifetime_team',
}

/**
 * GET /api/billing/polar/ltd-checkout?orgId=<uuid>&tier=tier1|tier2|team
 * Creates a ONE-TIME Polar checkout for a lifetime deal tier, scoped to the
 * caller's organization (account-first). Mirrors the recurring checkout route
 * but sells a one-time product — the lifetime plan is applied on confirm and
 * reconciled by the order.* webhook. Kept separate so the live subscription
 * checkout is never touched.
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
  const tier = params.get('tier') || ''
  const plan = TIER_TO_PLAN[tier]

  if (!orgId || !plan) {
    return NextResponse.json({ error: 'Invalid tier or organization' }, { status: 400 })
  }

  const productId = lifetimeProductIdFor(plan)
  if (!productId) {
    return NextResponse.json({ error: `No Polar product configured for ${plan}` }, { status: 500 })
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
  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: orgId,
      ...(userEmail ? { customerEmail: userEmail } : {}),
      successUrl: `${origin}/settings?tab=plan-usage&checkout=success`,
      metadata: { organizationId: orgId, plan },
    })
    // ?format=json → return everything the custom checkout needs; default → redirect.
    if (params.get('format') === 'json') {
      const c = checkout as unknown as {
        clientSecret: string
        id: string
        url: string
        amount?: number
        totalAmount?: number
        discountAmount?: number
        currency?: string
        recurringInterval?: string | null
        isPaymentRequired?: boolean
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
        discountAmount: c.discountAmount ?? 0,
        currency: c.currency ?? 'usd',
        // One-time purchase: no recurring interval.
        recurringInterval: null,
        isPaymentRequired: c.isPaymentRequired ?? true,
        productName: c.product?.name ?? PLAN_LABEL[plan],
        customerEmail: userEmail ?? c.customerEmail ?? null,
      })
    }
    return NextResponse.redirect(checkout.url)
  } catch (err) {
    console.error('[polar] ltd checkout creation failed', { orgId, plan, err })
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}
