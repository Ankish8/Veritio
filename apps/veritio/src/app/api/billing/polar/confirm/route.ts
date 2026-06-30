import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getPolar } from '@/lib/billing/polar'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { setOrgPlan } from '@/services/entitlements-service'
import { planForProductId } from '@/lib/billing/polar-plans'

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
  const billingName = typeof body?.billingName === 'string' ? body.billingName : undefined
  const addr = body?.billingAddress as
    | { country?: string; line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; postalCode?: string | null }
    | undefined

  if (!clientSecret || !confirmationTokenId) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
  }
  if (!addr?.country) {
    return NextResponse.json({ error: 'Billing country is required' }, { status: 400 })
  }

  const polar = getPolar() as unknown as Record<string, any>
  if (!polar) return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })

  // Polar's AddressInput requires country; other fields are optional. Drop nulls.
  const customerBillingAddress: Record<string, string> = { country: addr.country }
  for (const [k, v] of Object.entries({ line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, postalCode: addr.postalCode })) {
    if (v) customerBillingAddress[k] = v
  }

  try {
    const confirmed = await polar.checkouts.clientConfirm({
      clientSecret,
      checkoutConfirmStripe: {
        confirmationTokenId,
        customerBillingAddress,
        ...(email ? { customerEmail: email } : {}),
        ...(billingName ? { customerBillingName: billingName } : {}),
      },
    })
    console.log('[polar] confirm result', {
      status: confirmed?.status,
      subscriptionId: confirmed?.subscriptionId ?? confirmed?.subscription?.id ?? null,
      productId: confirmed?.productId ?? confirmed?.product?.id ?? null,
      hasPiSecret: !!(confirmed?.paymentProcessorMetadata?.client_secret ?? confirmed?.paymentProcessorMetadata?.clientSecret),
      metadataOrg: confirmed?.metadata?.organizationId ?? null,
    })

    // Reflect the new plan in our DB immediately so the UI updates without waiting
    // for the async webhook. The webhook (idempotent) reconciles too. Only on an
    // immediate confirm — for 3-D Secure the webhook handles it after auth.
    if (confirmed?.status === 'confirmed') {
      try {
        const orgId =
          confirmed?.metadata?.organizationId ??
          confirmed?.customerExternalId ??
          confirmed?.customer?.externalId
        const productId = confirmed?.productId ?? confirmed?.product?.id
        const mapped = productId ? planForProductId(productId) : undefined
        if (orgId && mapped) {
          await setOrgPlan(getMotiaSupabaseClient(), orgId, {
            plan: mapped.plan,
            plan_status: 'active',
            trial_ends_at: null,
          })
        }
      } catch (syncErr) {
        console.warn('[polar] post-confirm plan sync failed (webhook will reconcile)', syncErr)
      }
    }

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
