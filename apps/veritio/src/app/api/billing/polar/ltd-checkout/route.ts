import 'server-only'

import { randomUUID } from 'node:crypto'
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
 * GET /api/billing/polar/ltd-checkout?tier=tier1|tier2|team[&orgId=<uuid>]
 * Creates a ONE-TIME Polar checkout for a lifetime deal tier.
 *
 * Payment-first: works WITHOUT a session. Anonymous checkouts carry no org —
 * fulfilment is driven by the order.paid webhook, which records the purchase
 * (lifetime_purchases) and emails the buyer an activation link, so the payment
 * is captured even if the browser dies mid-flow.
 *
 * When a signed-in owner/admin passes their orgId, the checkout is org-scoped
 * and the plan is granted directly on payment (original account-first path).
 */
export async function GET(req: NextRequest) {
  const polar = getPolar()
  if (!polar) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
  }

  const params = req.nextUrl.searchParams
  const tier = params.get('tier') || ''
  const orgId = params.get('orgId') || ''
  const plan = TIER_TO_PLAN[tier]

  if (!plan) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const productId = lifetimeProductIdFor(plan)
  if (!productId) {
    return NextResponse.json({ error: `No Polar product configured for ${plan}` }, { status: 500 })
  }

  const origin = req.nextUrl.origin
  let userEmail: string | undefined
  let scopedOrgId: string | null = null

  if (orgId) {
    // Org-scoped purchase requires an authenticated owner/admin of that org.
    const user = await getServerUser()
    if (!user) {
      return NextResponse.redirect(new URL('/sign-in?redirect=/settings', req.url))
    }
    const supabase = getMotiaSupabaseClient()
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .single()
    if (!membership || !['owner', 'admin'].includes((membership as { role?: string }).role ?? '')) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    scopedOrgId = orgId
    userEmail = (user as { email?: string | null }).email ?? undefined
  } else {
    // Anonymous purchase: prefill the email if a session happens to exist.
    const user = await getServerUser().catch(() => null)
    userEmail = (user as { email?: string | null } | null)?.email ?? undefined
  }

  try {
    const metaPurchaseEventId = `purchase_${randomUUID()}`
    const checkout = await polar.checkouts.create({
      products: [productId],
      ...(scopedOrgId ? { externalCustomerId: scopedOrgId } : {}),
      ...(userEmail ? { customerEmail: userEmail } : {}),
      successUrl: scopedOrgId
        ? `${origin}/settings?tab=plan-usage&checkout=success`
        : `${origin}/redeem`,
      metadata: {
        plan,
        source: 'direct-ltd',
        metaPurchaseEventId,
        ...(scopedOrgId ? { organizationId: scopedOrgId } : {}),
      },
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
        metaPurchaseEventId,
      })
    }
    return NextResponse.redirect(checkout.url)
  } catch (err) {
    console.error('[polar] ltd checkout creation failed', { orgId: scopedOrgId, plan, err })
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}
