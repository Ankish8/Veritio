import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Payment-first bridge from the /ltd marketing CTAs: validate the tier and go
// straight to the checkout page — no login required. The pay page decides the
// mode itself (org-scoped for signed-in owners, anonymous otherwise); account
// creation happens AFTER payment via /redeem (activation code + email).
const TIERS = ['tier1', 'tier2', 'team']

export async function GET(req: NextRequest) {
  const tier = req.nextUrl.searchParams.get('tier') || ''
  if (!TIERS.includes(tier)) {
    return NextResponse.redirect(new URL('/ltd', req.url))
  }
  const pay = new URL('/ltd-checkout/pay', req.url)
  pay.searchParams.set('tier', tier)
  return NextResponse.redirect(pay)
}
