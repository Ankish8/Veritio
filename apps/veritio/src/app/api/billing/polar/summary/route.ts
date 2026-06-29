import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { assertOrgAccess, getBillingSummary } from '@/lib/billing/polar-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/billing/polar/summary?orgId= → { subscription, customer, paymentMethod } */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')
  const userId = await assertOrgAccess(orgId)
  if (!userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  const summary = await getBillingSummary(orgId!)
  return NextResponse.json(summary)
}
