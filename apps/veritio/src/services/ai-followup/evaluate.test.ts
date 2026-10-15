import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getOrgIdForStudy: vi.fn(),
  hasFeature: vi.fn(),
  loadFollowupContext: vi.fn(),
  createFollowupCompletion: vi.fn(),
}))

vi.mock('../entitlements-service', () => ({
  getOrgIdForStudy: mocks.getOrgIdForStudy,
  hasFeature: mocks.hasFeature,
}))
vi.mock('./completion', () => ({ createFollowupCompletion: mocks.createFollowupCompletion }))
vi.mock('./context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./context')>()),
  loadFollowupContext: mocks.loadFollowupContext,
}))

import { evaluateFollowup } from './evaluate'

const context = {
  study: { title: 'Study', purpose: null, description: null, language: 'en' },
  question: { text: 'What was hard?', type: 'multi_line_text', config: { aiFollowup: { enabled: true, maxFollowups: 2 } } },
  aiConfig: { enabled: true, maxFollowups: 2 },
}
const logger = { warn: vi.fn() }

function run(thread: { question: string; answer: string }[] = []) {
  return evaluateFollowup({
    supabase: {} as never,
    studyId: 'study-1',
    questionId: 'q-1',
    quotaKey: 'participant-1',
    responseContext: undefined,
    logger,
    resolveThread: async () => ({ thread, answerText: 'it was confusing' }),
  })
}

describe('evaluateFollowup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getOrgIdForStudy.mockResolvedValue('org-1')
    mocks.hasFeature.mockResolvedValue(true)
    mocks.loadFollowupContext.mockResolvedValue(context)
    mocks.createFollowupCompletion.mockResolvedValue({ content: '{"f":true,"q":"What was confusing?","r":"vague"}', model: 'mercury-2' })
  })

  it('returns the probe at the next position and charges the caller quota key', async () => {
    const result = await run([{ question: 'Earlier?', answer: 'meh' }])
    expect(result).toMatchObject({ position: 2, followup: { question: 'What was confusing?' } })
    expect(mocks.createFollowupCompletion.mock.calls[0][0]).toEqual({
      organizationId: 'org-1',
      studyId: 'study-1',
      participantId: 'participant-1',
    })
  })

  it('skips without a model call when the plan lacks the feature', async () => {
    mocks.hasFeature.mockResolvedValue(false)
    expect(await run()).toBeNull()
    expect(mocks.loadFollowupContext).not.toHaveBeenCalled()
    expect(mocks.createFollowupCompletion).not.toHaveBeenCalled()
  })

  it('skips when probing is off for the question', async () => {
    mocks.loadFollowupContext.mockResolvedValue(null)
    expect(await run()).toBeNull()
  })

  it('enforces the saved max follow-ups', async () => {
    const twoAsked = [{ question: 'A?', answer: 'x' }, { question: 'B?', answer: 'y' }]
    expect(await run(twoAsked)).toBeNull()
    expect(mocks.createFollowupCompletion).not.toHaveBeenCalled()
  })
})
