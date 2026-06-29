import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Bridge between marketing "Subscribe" CTAs and Polar checkout. Carries the chosen
// plan/interval through signup + email verification via a short-lived cookie so the
// user lands on checkout automatically once their account + org exist.
const INTENT_COOKIE = '__checkout_intent'
const PAID = ['pro', 'team'] // Starter is a free trial (plain signup), not a checkout.

function parseIntent(raw: string | undefined): { plan: string; interval: string } | null {
  if (!raw) return null
  const [plan, interval] = raw.split(':')
  if (!PAID.includes(plan) || (interval !== 'month' && interval !== 'year')) return null
  return { plan, interval }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let plan = sp.get('plan') || ''
  let interval = sp.get('interval') === 'year' ? 'year' : 'month'

  // When we come back here after onboarding there are no query params — fall back to the cookie.
  if (!PAID.includes(plan)) {
    const cookieIntent = parseIntent(req.cookies.get(INTENT_COOKIE)?.value)
    if (cookieIntent) {
      plan = cookieIntent.plan
      interval = cookieIntent.interval
    }
  }

  if (!PAID.includes(plan)) {
    // Nothing valid to subscribe to — send them to the in-app billing page.
    return NextResponse.redirect(new URL('/settings', req.url))
  }

  const userId = await getServerUserId()
  if (!userId) {
    // Remember the intent and send them to sign up; consumed after onboarding.
    const res = NextResponse.redirect(new URL('/sign-up', req.url))
    res.cookies.set(INTENT_COOKIE, `${plan}:${interval}`, { path: '/', maxAge: 3600, sameSite: 'lax' })
    return res
  }

  // Resolve the user's organization (one personal org for fresh signups).
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
    res.cookies.set(INTENT_COOKIE, `${plan}:${interval}`, { path: '/', maxAge: 3600, sameSite: 'lax' })
    return res
  }

  // Logged in with an org → straight to checkout. Clear the intent.
  const checkout = new URL('/api/billing/polar/checkout', req.url)
  checkout.searchParams.set('orgId', orgId)
  checkout.searchParams.set('plan', plan)
  checkout.searchParams.set('interval', interval)
  const res = NextResponse.redirect(checkout)
  res.cookies.delete(INTENT_COOKIE)
  return res
}
