import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'
import { getServerUserId } from '@veritio/auth/server'
import { getMotiaSupabaseClient } from '@/lib/supabase/motia-client'
import { generateRedemptionCodes } from '@/services/billing/redemption-service'
import { isLifetimePlan } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireSuperadmin(): Promise<string | null> {
  const superadmin = process.env.SUPERADMIN_USER_ID
  if (!superadmin) return null
  const userId = await getServerUserId()
  return userId && userId === superadmin ? userId : null
}

/**
 * POST /api/billing/ltd-codes { plan, count, source?, batch?, note?, expiresAt? }
 * Superadmin-only. Generates a batch of lifetime-deal codes to hand to an LTD
 * marketplace, and returns them (also downloadable as CSV via ?format=csv).
 */
export async function POST(req: NextRequest) {
  if (!(await requireSuperadmin())) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const plan = typeof body?.plan === 'string' ? body.plan : ''
  const count = Number(body?.count)
  if (!isLifetimePlan(plan)) {
    return NextResponse.json({ error: 'plan must be lifetime_tier1 | lifetime_tier2 | lifetime_team' }, { status: 400 })
  }
  if (!Number.isFinite(count) || count < 1) {
    return NextResponse.json({ error: 'count must be a positive integer' }, { status: 400 })
  }

  const supabase = getMotiaSupabaseClient()
  const { codes, error } = await generateRedemptionCodes(supabase, {
    plan,
    count,
    source: typeof body?.source === 'string' ? body.source : null,
    batch: typeof body?.batch === 'string' ? body.batch : null,
    note: typeof body?.note === 'string' ? body.note : null,
    expiresAt: typeof body?.expiresAt === 'string' ? body.expiresAt : null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 502 })

  if (req.nextUrl.searchParams.get('format') === 'csv') {
    const csv = ['code', ...codes].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="veritio-${plan}-codes.csv"`,
      },
    })
  }

  return NextResponse.json({ ok: true, plan, count: codes.length, codes })
}
