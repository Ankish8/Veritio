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
