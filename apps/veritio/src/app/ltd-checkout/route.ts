import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Account-first bridge between the /ltd marketing CTAs and our custom one-time
// checkout. Carries the chosen tier through signup + onboarding via a short-lived
// cookie so the buyer lands on checkout once their account + org exist. Mirrors
// the recurring /subscribe bridge.
const INTENT_COOKIE = '__ltd_intent'
const TIERS = ['tier1', 'tier2', 'team']

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let tier = sp.get('tier') || ''

  // Coming back after onboarding there are no query params — fall back to the cookie.
  if (!TIERS.includes(tier)) {
    const cookieTier = req.cookies.get(INTENT_COOKIE)?.value
    if (cookieTier && TIERS.includes(cookieTier)) tier = cookieTier
  }

  if (!TIERS.includes(tier)) {
    return NextResponse.redirect(new URL('/settings', req.url))
  }

  const userId = await getServerUserId()
  if (!userId) {
    // Remember the intent and send them to sign up; consumed after onboarding.
    const res = NextResponse.redirect(new URL('/sign-up', req.url))
    res.cookies.set(INTENT_COOKIE, tier, { path: '/', maxAge: 3600, sameSite: 'lax' })
    return res
  }

  const supabase = getMotiaSupabaseClient()
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)
    .limit(1)
    .maybeSingle()

  const orgId = (membership as { organization_id?: string } | null)?.organization_id
  if (!orgId) {
    // Account exists but org not created yet (mid-onboarding) — finish onboarding, keep intent.
    const res = NextResponse.redirect(new URL('/onboarding', req.url))
    res.cookies.set(INTENT_COOKIE, tier, { path: '/', maxAge: 3600, sameSite: 'lax' })
    return res
  }

  // Logged in with an org → our custom one-time checkout page. Clear the intent.
  const pay = new URL('/ltd-checkout/pay', req.url)
  pay.searchParams.set('tier', tier)
  const res = NextResponse.redirect(pay)
  res.cookies.delete(INTENT_COOKIE)
  return res
}
