import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import {
  assertOrgBillingAccess,
  updateTeamSeats,
  isEducationOrg,
  EDUCATION_BILLING_MESSAGE,
} from '@/lib/billing/polar-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** POST /api/billing/polar/seats { orgId, totalSeats } -> updates Team subscription seats. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const orgId = typeof body?.orgId === 'string' ? body.orgId : null
  const totalSeats = Number(body?.totalSeats)

  const userId = await assertOrgBillingAccess(orgId)
  if (!userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  if (!Number.isInteger(totalSeats)) {
    return NextResponse.json({ error: 'Seat count must be a whole number' }, { status: 400 })
  }
  // A cohort's size is set on the license, not bought by the seat. Routing it
  // through Polar would bill an invoiced customer. See isEducationOrg().
  if (await isEducationOrg(orgId)) {
    return NextResponse.json({ error: EDUCATION_BILLING_MESSAGE }, { status: 409 })
  }

  const result = await updateTeamSeats(orgId!, totalSeats)
  if (!result.ok) return NextResponse.json({ error: result.error || 'Seat update failed' }, { status: 502 })
  return NextResponse.json({ ok: true, totalSeats: result.totalSeats, extraSeats: result.extraSeats })
}
