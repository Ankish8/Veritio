import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUser } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { redeemCode } from '@/services/billing/redemption-service'
import { PLAN_LABEL } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/billing/redeem { code }
 * Redeems a lifetime-deal code into the caller's organization. Account-first:
 * requires an authenticated owner/admin of an org.
 */
export async function POST(req: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Please sign in to redeem a code.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code = typeof body?.code === 'string' ? body.code : ''
  if (!code) return NextResponse.json({ error: 'Enter a code to redeem.' }, { status: 400 })

  const supabase = getMotiaSupabaseClient()
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .not('joined_at', 'is', null)
    .limit(1)
    .maybeSingle()

  const orgId = (membership as { organization_id?: string } | null)?.organization_id
  const role = (membership as { role?: string } | null)?.role ?? ''
  if (!orgId) return NextResponse.json({ error: 'Finish setting up your workspace first.' }, { status: 400 })
  if (!['owner', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Only an owner or admin can redeem a code.' }, { status: 403 })
  }

  const result = await redeemCode(supabase, { code, orgId, userId: user.id })
  if (!result.ok) {
    const status = result.reason === 'error' ? 502 : 409
    return NextResponse.json({ error: result.message }, { status })
  }

  return NextResponse.json({ ok: true, plan: result.plan, planLabel: PLAN_LABEL[result.plan] })
}
