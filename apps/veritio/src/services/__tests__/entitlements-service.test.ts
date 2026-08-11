/**
 * Unit tests for the pure entitlement-resolution logic (computeEntitlements).
 * The DB-backed helpers (getOrgPlan, assert*) are covered by e2e.
 */

import { beforeEach, describe, it, expect, vi } from 'vitest'
import { EntitlementError } from '../../lib/api/classify-error'
import { cache } from '../../lib/cache/memory-cache'
import {
  assertOrgFeatureForUser,
  assertCanAddSeat,
  computeEntitlements,
  PLAN_ENTITLEMENTS,
  type OrgPlanRow,
} from '../entitlements-service'

const future = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

function row(over: Partial<OrgPlanRow>): OrgPlanRow {
  return { plan: 'starter', plan_status: 'active', trial_ends_at: null, extra_seats: 0, ...over }
}

function createSingleQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

function createEntitlementSupabaseMock(options: {
  membership: { data: unknown; error: unknown }
  plan: { data: unknown; error: unknown }
}) {
  const membershipQuery = createSingleQuery(options.membership)
  const planQuery = createSingleQuery(options.plan)
  const from = vi.fn((table: string) => {
    if (table === 'organization_members') return membershipQuery
    if (table === 'organizations') return planQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    supabase: { from },
    membershipQuery,
    planQuery,
  }
}

function createCountQuery(count: number) {
  const chain = { count } as Record<string, ReturnType<typeof vi.fn>> & { count: number }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  return chain
}

function createDataQuery(data: unknown[]) {
  const chain = { data } as Record<string, ReturnType<typeof vi.fn>> & { data: unknown[] }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  return chain
}

function createSeatSupabaseMock(options: {
  plan: OrgPlanRow
  memberCount: number
  pendingInvites: unknown[]
}) {
  const planQuery = createSingleQuery({ data: options.plan, error: null })
  const memberCountQuery = createCountQuery(options.memberCount)
  const pendingInvitesQuery = createDataQuery(options.pendingInvites)
  const from = vi.fn((table: string) => {
    if (table === 'organizations') return planQuery
    if (table === 'organization_members') return memberCountQuery
    if (table === 'organization_invitations') return pendingInvitesQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  return {
    supabase: { from },
    planQuery,
    memberCountQuery,
    pendingInvitesQuery,
  }
}

beforeEach(() => {
  cache.clear()
})

describe('computeEntitlements', () => {
  it('grants full plan entitlements when active', () => {
    expect(computeEntitlements(row({ plan: 'starter', plan_status: 'active' }))).toMatchObject({
      responsesPerStudy: 50,
      activeStudies: 5,
      seats: 1,
      recordings: false,
      ai: false,
      collaboration: false,
      locked: false,
    })
    expect(computeEntitlements(row({ plan: 'pro', plan_status: 'active' }))).toMatchObject({
      activeStudies: Infinity,
      recordings: true,
      ai: true,
      collaboration: false,
      locked: false,
    })
    expect(computeEntitlements(row({ plan: 'team', plan_status: 'active' }))).toMatchObject({
      seats: 3,
      collaboration: true,
      locked: false,
    })
  })

  it('grants lifetime-tier entitlements and never locks them', () => {
    expect(computeEntitlements(row({ plan: 'lifetime_tier1', plan_status: 'active', trial_ends_at: null }))).toMatchObject({
      responsesPerStudy: 50,
      activeStudies: 5,
      seats: 1,
      recordings: false,
      ai: true,
      aiFollowUp: false, // Solo: AI insights but no AI follow-up
      collaboration: false,
      locked: false,
    })
    expect(computeEntitlements(row({ plan: 'lifetime_tier2', plan_status: 'active', trial_ends_at: null }))).toMatchObject({
      responsesPerStudy: 100,
      activeStudies: Infinity,
      seats: 1,
      recordings: true,
      ai: true,
      aiFollowUp: true,
      collaboration: false,
      locked: false,
    })
    expect(computeEntitlements(row({ plan: 'lifetime_team', plan_status: 'active', trial_ends_at: null }))).toMatchObject({
      seats: 3,
      activeStudies: Infinity,
      aiFollowUp: true,
      collaboration: true,
      locked: false,
    })
  })

  it('grants entitlements during an unexpired trial', () => {
    const ent = computeEntitlements(row({ plan: 'pro', plan_status: 'trialing', trial_ends_at: future() }))
    expect(ent.locked).toBe(false)
    expect(ent.ai).toBe(true)
  })

  it('LOCKS when trial has expired', () => {
    const ent = computeEntitlements(row({ plan: 'pro', plan_status: 'trialing', trial_ends_at: past() }))
    expect(ent.locked).toBe(true)
    expect(ent.activeStudies).toBe(0)
    expect(ent.ai).toBe(false)
  })

  it('LOCKS when trialing with no trial_ends_at set', () => {
    expect(computeEntitlements(row({ plan_status: 'trialing', trial_ends_at: null })).locked).toBe(true)
  })

  it('LOCKS on past_due and canceled', () => {
    expect(computeEntitlements(row({ plan_status: 'past_due' })).locked).toBe(true)
    expect(computeEntitlements(row({ plan_status: 'canceled' })).locked).toBe(true)
  })

  it('adds extra_seats only to Team seat count', () => {
    expect(computeEntitlements(row({ plan: 'team', extra_seats: 2 })).seats).toBe(PLAN_ENTITLEMENTS.team.seats + 2)
    expect(computeEntitlements(row({ plan: 'pro', extra_seats: 2 })).seats).toBe(PLAN_ENTITLEMENTS.pro.seats)
    expect(computeEntitlements(row({ plan: 'starter', extra_seats: 2 })).seats).toBe(PLAN_ENTITLEMENTS.starter.seats)
  })

  it('treats a missing org as locked', () => {
    expect(computeEntitlements(null).locked).toBe(true)
  })
})

describe('assertCanAddSeat', () => {
  it('uses Team-specific copy when a Team workspace is full', async () => {
    const { supabase } = createSeatSupabaseMock({
      plan: row({ plan: 'team', plan_status: 'active' }),
      memberCount: 3,
      pendingInvites: [],
    })

    await expect(assertCanAddSeat(supabase as any, 'org-team')).rejects.toThrow(
      'Your Team plan includes 3 seats. Remove a member or pending invitation before adding more.'
    )
  })

  it('points solo plans to Team when adding another member', async () => {
    const { supabase } = createSeatSupabaseMock({
      plan: row({ plan: 'pro', plan_status: 'active' }),
      memberCount: 1,
      pendingInvites: [],
    })

    await expect(assertCanAddSeat(supabase as any, 'org-pro')).rejects.toThrow(
      'Your plan includes 1 seat. Upgrade to Team to add members.'
    )
  })

  it('counts remaining pending link uses as reserved seats', async () => {
    const { supabase } = createSeatSupabaseMock({
      plan: row({ plan: 'team', plan_status: 'active' }),
      memberCount: 1,
      pendingInvites: [
        { invite_type: 'email', max_uses: null, uses_count: 0 },
        { invite_type: 'link', max_uses: 2, uses_count: 1 },
      ],
    })

    await expect(assertCanAddSeat(supabase as any, 'org-team')).rejects.toThrow(
      'Your Team plan includes 3 seats. Remove a member or pending invitation before adding more.'
    )
  })
})

describe('assertOrgFeatureForUser', () => {
  it('allows members when the org includes the feature', async () => {
    const { supabase } = createEntitlementSupabaseMock({
      membership: { data: { role: 'viewer' }, error: null },
      plan: { data: row({ plan: 'pro', plan_status: 'active' }), error: null },
    })

    await expect(assertOrgFeatureForUser(supabase as any, 'org-pro', 'user-1', 'ai')).resolves.toBeUndefined()
  })

  it('blocks members when the org lacks the feature', async () => {
    const { supabase } = createEntitlementSupabaseMock({
      membership: { data: { role: 'viewer' }, error: null },
      plan: { data: row({ plan: 'starter', plan_status: 'active' }), error: null },
    })

    await expect(assertOrgFeatureForUser(supabase as any, 'org-starter', 'user-1', 'ai')).rejects.toBeInstanceOf(EntitlementError)
  })

  it('does not look up entitlements for non-members', async () => {
    const { supabase, planQuery } = createEntitlementSupabaseMock({
      membership: { data: null, error: { code: 'PGRST116', message: 'No rows' } },
      plan: { data: row({ plan: 'pro', plan_status: 'active' }), error: null },
    })

    await expect(assertOrgFeatureForUser(supabase as any, 'org-pro', 'user-1', 'ai')).rejects.toThrow(
      'Access denied'
    )
    expect(planQuery.single).not.toHaveBeenCalled()
  })
})

describe('education plans', () => {
  it('grants every gated feature and uncapped responses on all three tiers', () => {
    // The /education page promises recordings, AI insight reports, and
    // collaboration on the entry tier, plus no per-response fees anywhere.
    for (const plan of ['edu_classroom', 'edu_department', 'edu_campus'] as const) {
      expect(computeEntitlements(row({ plan, plan_status: 'active' }))).toMatchObject({
        responsesPerStudy: Infinity,
        activeStudies: Infinity,
        recordings: true,
        ai: true,
        aiFollowUp: true,
        collaboration: true,
        locked: false,
        lockReason: 'none',
      })
    }
  })

  it('sizes a cohort from base seats plus extra_seats, and leaves Campus unlimited', () => {
    expect(computeEntitlements(row({ plan: 'edu_classroom', plan_status: 'active' })).seats).toBe(40)
    // A 60-student cohort on Classroom: contracted size topped up per org.
    expect(
      computeEntitlements(row({ plan: 'edu_classroom', plan_status: 'active', extra_seats: 20 })).seats
    ).toBe(60)
    expect(computeEntitlements(row({ plan: 'edu_department', plan_status: 'active' })).seats).toBe(200)
    expect(
      computeEntitlements(row({ plan: 'edu_campus', plan_status: 'active', extra_seats: 500 })).seats
    ).toBe(Infinity)
  })

  it('locks when the access term has ended, and reports it as a term rather than a trial', () => {
    const ended = computeEntitlements(
      row({ plan: 'edu_classroom', plan_status: 'active', access_ends_at: past() })
    )
    expect(ended.locked).toBe(true)
    expect(ended.lockReason).toBe('term')
    expect(ended.seats).toBe(1)
    expect(ended.collaboration).toBe(false)
  })

  it('stays open while the term is still running', () => {
    expect(
      computeEntitlements(row({ plan: 'edu_department', plan_status: 'active', access_ends_at: future() }))
    ).toMatchObject({ locked: false, lockReason: 'none', seats: 200 })
  })

  it('ends access on the term date even while plan_status is still active', () => {
    // The term date is the source of truth; nothing has to sweep the row first.
    const row_ = row({ plan: 'edu_campus', plan_status: 'active', access_ends_at: past() })
    expect(computeEntitlements(row_).locked).toBe(true)
  })

  it('applies a term to non-education plans too, without affecting untermed orgs', () => {
    expect(computeEntitlements(row({ plan: 'team', plan_status: 'active', access_ends_at: past() })).locked).toBe(true)
    expect(computeEntitlements(row({ plan: 'team', plan_status: 'active' })).locked).toBe(false)
  })

  it('distinguishes an expired trial from lapsed billing', () => {
    expect(
      computeEntitlements(row({ plan: 'pro', plan_status: 'trialing', trial_ends_at: past() })).lockReason
    ).toBe('trial')
    expect(computeEntitlements(row({ plan: 'pro', plan_status: 'canceled' })).lockReason).toBe('billing')
  })

  it('tells an over-capacity cohort to extend the license, not to upgrade to Team', async () => {
    const { supabase } = createSeatSupabaseMock({
      plan: row({ plan: 'edu_classroom', plan_status: 'active' }),
      memberCount: 40,
      pendingInvites: [],
    })

    await expect(assertCanAddSeat(supabase as any, 'org-edu')).rejects.toThrow(/extend it to a larger cohort/)
  })
})
