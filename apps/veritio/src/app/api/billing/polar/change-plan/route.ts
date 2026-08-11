import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import {
  assertOrgBillingAccess,
  changePlan,
  isEducationOrg,
  EDUCATION_BILLING_MESSAGE,
} from '@/lib/billing/polar-data'
import type { BillingInterval, PaidPlan } from '@/lib/billing/polar-plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAID: PaidPlan[] = ['starter', 'pro', 'team']

/** POST /api/billing/polar/change-plan { orgId, plan, interval } → updates the active subscription. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const orgId = typeof body?.orgId === 'string' ? body.orgId : null
  const plan = body?.plan as PaidPlan
  const interval = (body?.interval === 'year' ? 'year' : 'month') as BillingInterval

  const userId = await assertOrgBillingAccess(orgId)
  if (!userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  if (!PAID.includes(plan)) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  // Education licenses are invoiced; switching one to a card plan here would
  // strip the cohort's seats. See isEducationOrg().
  if (await isEducationOrg(orgId)) {
    return NextResponse.json({ error: EDUCATION_BILLING_MESSAGE }, { status: 409 })
  }

  const result = await changePlan(orgId!, plan, interval)
  if (!result.ok) return NextResponse.json({ error: result.error || 'Plan change failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
