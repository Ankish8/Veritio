import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getPolar } from '@/lib/billing/polar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/polar/discount
 * Body: { clientSecret: string, code: string | null }
 *
 * Applies (or, with code=null, removes) a discount code on an open checkout via
 * Polar's client update, then returns the refreshed amounts so the custom
 * checkout can re-render totals. A 100%-off code drops isPaymentRequired to
 * false, which the client uses to switch Stripe Elements into setup mode.
 */
export async function POST(req: NextRequest) {
  const polar = getPolar()
  if (!polar) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
  }

  let body: { clientSecret?: string; code?: string | null }
  try {
    body = (await req.json()) as { clientSecret?: string; code?: string | null }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const clientSecret = body.clientSecret
  if (!clientSecret) {
    return NextResponse.json({ error: 'Missing checkout' }, { status: 400 })
  }
  // Trim + normalize; empty string means "remove any applied discount".
  const code = (body.code ?? '').trim() || null

  try {
    const updated = await polar.checkouts.clientUpdate({
      clientSecret,
      checkoutUpdatePublic: { discountCode: code },
    })
    const c = updated as unknown as {
      amount: number
      discountAmount: number
      netAmount: number
      totalAmount: number
      currency: string
      isPaymentRequired: boolean
      discountId: string | null
    }
    return NextResponse.json({
      amount: c.amount,
      discountAmount: c.discountAmount,
      netAmount: c.netAmount,
      totalAmount: c.totalAmount,
      currency: c.currency,
      isPaymentRequired: c.isPaymentRequired,
      discountApplied: !!c.discountId,
    })
  } catch (err) {
    // Polar returns a validation error for invalid/expired/exhausted codes.
    console.error('[polar] discount apply failed', { err })
    return NextResponse.json(
      { error: "Couldn't apply that code. Check it's correct and still active." },
      { status: 400 },
    )
  }
}
