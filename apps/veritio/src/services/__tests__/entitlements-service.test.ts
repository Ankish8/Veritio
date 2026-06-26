/**
 * Unit tests for the pure entitlement-resolution logic (computeEntitlements).
 * The DB-backed helpers (getOrgPlan, assert*) are covered by e2e.
 */

import { describe, it, expect } from 'vitest'
import { computeEntitlements, PLAN_ENTITLEMENTS, type OrgPlanRow } from '../entitlements-service'

const future = () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
const past = () => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

function row(over: Partial<OrgPlanRow>): OrgPlanRow {
  return { plan: 'starter', plan_status: 'active', trial_ends_at: null, extra_seats: 0, ...over }
}

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

  it('adds extra_seats to the base seat count', () => {
    expect(computeEntitlements(row({ plan: 'team', extra_seats: 2 })).seats).toBe(PLAN_ENTITLEMENTS.team.seats + 2)
  })

  it('treats a missing org as locked', () => {
    expect(computeEntitlements(null).locked).toBe(true)
  })
})
