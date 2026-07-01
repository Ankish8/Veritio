import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { getPolar } from '@/lib/billing/polar'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/billing/polar/portal?orgId=<uuid>
 * Opens the Polar customer portal (manage/cancel subscription, invoices) for the
 * caller's org. Uses the org id as Polar's external customer id (set at checkout).
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

  const orgId = req.nextUrl.searchParams.get('orgId') || ''
  if (!orgId) {
    return NextResponse.json({ error: 'Missing organization' }, { status: 400 })
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

  try {
    const session = await polar.customerSessions.create({ externalCustomerId: orgId })
    return NextResponse.redirect(session.customerPortalUrl)
  } catch (err) {
    console.error('[polar] customer portal session failed', { orgId, err })
    // Most common cause: no Polar customer yet (never subscribed).
    return NextResponse.json(
      { error: 'No billing account found. Subscribe to a plan first.' },
      { status: 404 },
    )
  }
}
