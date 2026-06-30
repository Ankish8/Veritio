import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getPolar } from '@/lib/billing/polar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/polar/confirm { clientSecret, confirmationTokenId, email }
 * Confirms a checkout with a Stripe confirmation token. The checkout's
 * clientSecret is the capability (per-checkout secret), so no session check.
 * Returns { status, piClientSecret? } so the client can run 3-D Secure if needed.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const clientSecret = typeof body?.clientSecret === 'string' ? body.clientSecret : null
  const confirmationTokenId = typeof body?.confirmationTokenId === 'string' ? body.confirmationTokenId : null
  const email = typeof body?.email === 'string' ? body.email : undefined

  if (!clientSecret || !confirmationTokenId) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
  }

  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  try {
    const confirmed = await polar.checkouts.clientConfirm({
      clientSecret,
      checkoutConfirmStripe: { confirmationTokenId, ...(email ? { customerEmail: email } : {}) },
    })
    const meta = confirmed?.paymentProcessorMetadata || {}
    return NextResponse.json({
      status: confirmed?.status ?? 'unknown',
      piClientSecret: meta.client_secret ?? meta.clientSecret ?? null,
    })
  } catch (e) {
    console.error('[polar] checkout confirm failed', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Payment failed' }, { status: 502 })
  }
}
