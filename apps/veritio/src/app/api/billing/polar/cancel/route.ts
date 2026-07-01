import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { assertOrgBillingAccess, cancelSubscription } from '@/lib/billing/polar-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/billing/polar/cancel { orgId } → cancels at period end. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const orgId = typeof body?.orgId === 'string' ? body.orgId : null
  const userId = await assertOrgBillingAccess(orgId)
  if (!userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const result = await cancelSubscription(orgId!)
  if (!result.ok) return NextResponse.json({ error: result.error || 'Cancel failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
