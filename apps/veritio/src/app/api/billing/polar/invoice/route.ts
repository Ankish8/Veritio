import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { assertOrgAccess, getInvoiceUrl } from '@/lib/billing/polar-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/billing/polar/invoice?orgId=&orderId= → 302 to the invoice PDF. */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')
  const orderId = req.nextUrl.searchParams.get('orderId')
  const userId = await assertOrgAccess(orgId)
  if (!userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  if (!orderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })

  const url = await getInvoiceUrl(orgId!, orderId)
  if (!url) return NextResponse.json({ error: 'Invoice not available' }, { status: 404 })
  return NextResponse.redirect(url)
}
