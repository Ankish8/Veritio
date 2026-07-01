import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  setOrgPlan: vi.fn(),
  planForProductId: vi.fn(),
  supabase: { from: vi.fn() },
}))

vi.mock('@/lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => mocks.supabase,
}))

vi.mock('@/services/entitlements-service', () => ({
  setOrgPlan: mocks.setOrgPlan,
}))

vi.mock('@/lib/billing/polar-plans', () => ({
  planForProductId: mocks.planForProductId,
}))

const billingUpdate = {
  eq: vi.fn().mockResolvedValue({ error: null }),
}

const settingsSelect = {
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: { settings: { type: 'personal', branding: { primaryColor: '#111111' } } } }),
}

const organizationQuery = {
  select: vi.fn().mockReturnValue(settingsSelect),
  update: vi.fn().mockReturnValue(billingUpdate),
}

describe('handlePolarEvent', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.setOrgPlan.mockResolvedValue({ error: null })
    mocks.planForProductId.mockReturnValue({ plan: 'pro', interval: 'month' })
    billingUpdate.eq.mockClear()
    settingsSelect.eq.mockClear()
    settingsSelect.single.mockClear()
    organizationQuery.select.mockClear()
    organizationQuery.update.mockClear()
    mocks.supabase.from.mockReturnValue(organizationQuery)
  })

  it('stores the external trial end for Polar trialing subscriptions', async () => {
    const { handlePolarEvent } = await import('../polar-billing-service')
    const trialEnd = '2026-07-07T00:00:00.000Z'

    await handlePolarEvent({
      type: 'subscription.created',
      data: {
        id: 'sub_123',
        status: 'trialing',
        productId: 'product_pro_monthly',
        customerId: 'cust_123',
        customerExternalId: '11111111-1111-1111-1111-111111111111',
        currentPeriodEnd: trialEnd,
      },
    })

    expect(mocks.setOrgPlan).toHaveBeenCalledWith(
      mocks.supabase,
      '11111111-1111-1111-1111-111111111111',
      {
        plan: 'pro',
        plan_status: 'trialing',
        trial_ends_at: trialEnd,
        extra_seats: 0,
      }
    )
  })

  it('clears trial end for active subscriptions', async () => {
    const { handlePolarEvent } = await import('../polar-billing-service')

    await handlePolarEvent({
      type: 'subscription.active',
      data: {
        id: 'sub_123',
        status: 'active',
        productId: 'product_pro_monthly',
        customerExternalId: '11111111-1111-1111-1111-111111111111',
        currentPeriodEnd: '2026-07-07T00:00:00.000Z',
      },
    })

    expect(mocks.setOrgPlan).toHaveBeenCalledWith(
      mocks.supabase,
      '11111111-1111-1111-1111-111111111111',
      {
        plan: 'pro',
        plan_status: 'active',
        trial_ends_at: null,
        extra_seats: 0,
      }
    )
  })

  it('syncs Team subscription seats into extra seats and marks the workspace as team', async () => {
    mocks.planForProductId.mockReturnValue({ plan: 'team', interval: 'month' })
    const { handlePolarEvent } = await import('../polar-billing-service')

    await handlePolarEvent({
      type: 'subscription.seats_updated',
      data: {
        id: 'sub_123',
        status: 'active',
        productId: 'product_team_monthly',
        customerExternalId: '11111111-1111-1111-1111-111111111111',
        seats: 5,
      },
    })

    expect(mocks.setOrgPlan).toHaveBeenCalledWith(
      mocks.supabase,
      '11111111-1111-1111-1111-111111111111',
      {
        plan: 'team',
        plan_status: 'active',
        trial_ends_at: null,
        extra_seats: 2,
      }
    )
    expect(organizationQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      settings: { type: 'team', branding: { primaryColor: '#111111' } },
    }))
  })
})
