import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ followup: null as unknown, participant: null as unknown, upsert: vi.fn(), capture: vi.fn() }))

vi.mock('../../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => ({
    from: (table: string) => {
      const single = async () => ({ data: table === 'participants' ? mocks.participant : mocks.followup })
      const chain = { select: () => chain, eq: () => chain, single, upsert: async (...args: unknown[]) => { mocks.upsert(...args); return { error: null } } }
      return chain
    },
  }),
}))
vi.mock('../../../services/ai-followup/telemetry', () => ({ captureFollowupAnswered: mocks.capture }))

import { config, handler } from './submit-ai-followup-response.step'

const P1 = '00000000-0000-4000-8000-000000000001'
const P2 = '00000000-0000-4000-8000-000000000002'
const FQ = '00000000-0000-4000-8000-000000000003'
const logger = { error: vi.fn() } as never

function call(participantId: string, responseValue: Record<string, unknown> = { text: 'because' }) {
  return handler({ body: { participantId, followupQuestionId: FQ, responseValue }, pathParams: { studyId: 's' } } as never, { logger } as never)
}

describe('SubmitAiFollowupResponse', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.followup = { id: FQ, participant_id: P1, followup_question_type: 'text', model_used: 'mercury-2' }
    mocks.participant = { id: P1 }
  })

  it('saves an answer from the participant the follow-up was asked of', async () => {
    expect(await call(P1)).toMatchObject({ status: 200 })
    expect(mocks.upsert).toHaveBeenCalledOnce()
    expect(mocks.capture).toHaveBeenCalledWith(expect.objectContaining({ answerText: 'because', followupType: 'text' }))
  })

  it("rejects an answer to another participant's follow-up", async () => {
    mocks.participant = { id: P2 }
    expect(await call(P2)).toMatchObject({ status: 400 })
    expect(mocks.upsert).not.toHaveBeenCalled()
  })

  it('caps the stored answer size', () => {
    const schema = (config.triggers[0] as { bodySchema: { safeParse: (v: unknown) => { success: boolean } } }).bodySchema
    expect(schema.safeParse({ participantId: P1, followupQuestionId: FQ, responseValue: { text: 'x'.repeat(9000) } }).success).toBe(false)
  })
})
