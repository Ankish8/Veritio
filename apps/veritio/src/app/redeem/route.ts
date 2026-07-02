import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Account-first bridge for lifetime-deal code redemption. A marketplace can send a
// buyer to veritio.io/redeem?code=XXXX; this carries the code through signup +
// onboarding via a short-lived cookie so it survives to the redeem form. Mirrors
// the /subscribe and /ltd-checkout bridges.
const INTENT_COOKIE = '__redeem_intent'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  let code = sp.get('code') || ''

  // Coming back after signup/onboarding there is no query param — fall back to cookie.
  if (!code) {
    const cookieVal = req.cookies.get(INTENT_COOKIE)?.value
    if (cookieVal && cookieVal !== '1') code = cookieVal
  }

  const userId = await getServerUserId()
  if (!userId) {
    const res = NextResponse.redirect(new URL('/sign-up', req.url))
    res.cookies.set(INTENT_COOKIE, code || '1', { path: '/', maxAge: 3600, sameSite: 'lax' })
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
    const res = NextResponse.redirect(new URL('/onboarding', req.url))
    res.cookies.set(INTENT_COOKIE, code || '1', { path: '/', maxAge: 3600, sameSite: 'lax' })
    return res
  }

  // Logged in with an org → the redeem form (code prefilled if we have one).
  const apply = new URL('/redeem/apply', req.url)
  if (code) apply.searchParams.set('code', code)
  const res = NextResponse.redirect(apply)
  res.cookies.delete(INTENT_COOKIE)
  return res
}
