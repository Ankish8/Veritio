/**
 * Checkout route: education licenses must never reach Polar.
 *
 * These orgs are invoiced against a purchase order. Completing a checkout would
 * fire the webhook, call setOrgPlan(), and overwrite edu_* with the purchased
 * plan — collapsing a 40-seat cohort to 1 and uncapped responses to 100. Worse,
 * the stale access_ends_at would keep them locked on the plan they just bought.
 *
 * The UI hides the upgrade path, but that is not access control, so the actual
 * HTTP response is asserted here rather than only the predicate behind it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'faculty@university.edu' } as { id: string; email?: string } | null,
  role: 'owner' as string | null,
  isEducation: false,
  checkoutCreated: 0,
}))

vi.mock('@veritio/auth/server', () => ({ getServerUser: async () => state.user }))

vi.mock('@/lib/billing/polar-data', () => ({
  isEducationOrg: async () => state.isEducation,
  EDUCATION_BILLING_MESSAGE: 'This organization is on an education license.',
}))

vi.mock('@/lib/billing/polar', () => ({
  getPolar: () => ({
    checkouts: {
      create: async () => {
        state.checkoutCreated += 1
        return { url: 'https://polar.sh/checkout/test' }
      },
    },
  }),
}))

vi.mock('@/lib/billing/polar-plans', () => ({
  productIdFor: () => 'prod_test',
}))

vi.mock('@/lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => {
    const chain: Record<string, unknown> = {}
    chain.select = () => chain
    chain.eq = () => chain
    chain.not = () => chain
    chain.single = async () => ({ data: state.role ? { role: state.role } : null })
    return { from: () => chain }
  },
}))

const { GET } = await import('./route')

// The handler reads req.nextUrl, so it needs a real NextRequest.
const url = (orgId = 'org-1', plan = 'pro') =>
  new NextRequest(
    `http://localhost/api/billing/polar/checkout?orgId=${orgId}&plan=${plan}&interval=month`,
  )

beforeEach(() => {
  state.user = { id: 'user-1', email: 'faculty@university.edu' }
  state.role = 'owner'
  state.isEducation = false
  state.checkoutCreated = 0
})

describe('GET /api/billing/polar/checkout', () => {
  it('refuses an education license with 409 and never creates a checkout', async () => {
    state.isEducation = true

    const res = await GET(url())

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/education licen[cs]e/i)
    expect(state.checkoutCreated).toBe(0)
  })

  it('refuses even the org owner, since the UI is not the access control', async () => {
    state.isEducation = true
    state.role = 'owner'

    expect((await GET(url())).status).toBe(409)
  })

  it('still lets a normal paid org through to checkout', async () => {
    state.isEducation = false

    const res = await GET(url())

    // A redirect to Polar, not a refusal.
    expect(res.status).toBeLessThan(400)
    expect(state.checkoutCreated).toBe(1)
  })

  it('checks membership before revealing anything about the plan', async () => {
    // A non-member must get 403, not a 409 that confirms an education license
    // exists at that org id.
    state.role = null
    state.isEducation = true

    expect((await GET(url())).status).toBe(403)
  })

  it('rejects an unauthenticated caller before any plan lookup', async () => {
    state.user = null
    state.isEducation = true

    const res = await GET(url())
    expect(res.status).toBe(307)
    expect(state.checkoutCreated).toBe(0)
  })
})
