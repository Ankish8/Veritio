import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ consumeLimits: vi.fn() }))

vi.mock('../middlewares/rate-limit', () => ({
  consumeDistributedRateLimits: mocks.consumeLimits,
}))

import { consumeAiFollowupQuota, estimateAiFollowupCostPoints } from './ai-followup-quota'

describe('AI follow-up cost quota', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.consumeLimits.mockResolvedValue({ allowed: true })
  })

  it('weights a request by estimated input and output tokens', () => {
    expect(estimateAiFollowupCostPoints([{ content: 'x'.repeat(400) }], 100)).toBe(2)
    expect(estimateAiFollowupCostPoints([{ content: '' }], 0)).toBe(1)
  })

  it('consumes participant, study, and organization budgets with the same cost', async () => {
    await expect(
      consumeAiFollowupQuota(
        { organizationId: 'org-1', studyId: 'study-1', participantId: 'participant-1' },
        [{ content: 'x'.repeat(400) }],
        100
      )
    ).resolves.toBe(true)

    expect(mocks.consumeLimits).toHaveBeenCalledWith([
      { tier: 'ai-followup-participant', identifier: 'ai-followup:participant:participant-1', points: 2 },
      { tier: 'ai-followup-study', identifier: 'ai-followup:study:study-1', points: 2 },
      { tier: 'ai-followup-organization', identifier: 'ai-followup:organization:org-1', points: 2 },
    ])
  })

  it('denies the provider call when any distributed budget is exhausted', async () => {
    mocks.consumeLimits.mockResolvedValue({ allowed: false, retryAfterSeconds: 60 })

    await expect(
      consumeAiFollowupQuota(
        { organizationId: 'org-1', studyId: 'study-1', participantId: 'participant-1' },
        [{ content: 'prompt' }],
        120
      )
    ).resolves.toBe(false)
  })
})
