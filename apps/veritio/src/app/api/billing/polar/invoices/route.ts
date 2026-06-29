import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { assertOrgAccess, listInvoices } from '@/lib/billing/polar-data'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/billing/polar/invoices?orgId= → BillingInvoice[] */
export async function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get('orgId')
  const userId = await assertOrgAccess(orgId)
  if (!userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  const invoices = await listInvoices(orgId!)
  return NextResponse.json({ invoices })
}
