import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getPolar } from '@/lib/billing/polar'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { getPurchaseByCheckoutId } from '@/services/billing/lifetime-purchase-service'
import { PLAN_LABEL } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/polar/ltd-claim { clientSecret }
 * Post-payment success screen polls this until the order.paid webhook has
 * recorded the anonymous lifetime purchase, then hands back the activation
 * code. Capability-based: the per-checkout clientSecret (which only the payer
 * holds) is resolved through Polar to the checkout id — a checkout id alone is
 * never accepted, so codes cannot be fished.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const clientSecret = typeof body?.clientSecret === 'string' ? body.clientSecret : null
  if (!clientSecret) return NextResponse.json({ error: 'Missing clientSecret' }, { status: 400 })

  const polar = getPolar()
  if (!polar) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  let checkoutId: string | null = null
  try {
    const checkout = await polar.checkouts.clientGet({ clientSecret })
    checkoutId = (checkout as unknown as { id?: string })?.id ?? null
  } catch {
    return NextResponse.json({ error: 'Invalid checkout' }, { status: 404 })
  }
  if (!checkoutId) return NextResponse.json({ error: 'Invalid checkout' }, { status: 404 })

  const purchase = await getPurchaseByCheckoutId(getMotiaSupabaseClient(), checkoutId)
  if (!purchase) return NextResponse.json({ ready: false })

  return NextResponse.json({
    ready: true,
    code: purchase.code,
    plan: purchase.plan,
    planLabel: PLAN_LABEL[purchase.plan],
    email: purchase.email,
    status: purchase.status,
  })
}
