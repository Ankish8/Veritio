import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../middlewares/rate-limit'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { buildFollowupThread, evaluateFollowup } from '../../../services/ai-followup'

const followupTurnSchema = z.object({
  question: z.string().max(500),
  answer: z.string().max(4000),
})

const bodySchema = z.object({
  participantId: z.string().uuid(),
  questionId: z.string().uuid(),
  // Question text, type and probing guidance are read from the database. These
  // fields are still accepted (bounded) for older player bundles, but ignored.
  questionText: z.string().min(1).max(1000).optional(),
  questionType: z.string().max(64).optional(),
  depthHint: z.string().max(1000).optional(),
  followupPosition: z.number().int().min(1).max(2).optional(),
  answer: z.string().max(4000).optional(),
  responseContext: z.string().max(8000).optional(),
  // Earlier probes on this question with the participant's replies, oldest first.
  thread: z.array(followupTurnSchema).max(1).optional(),
})

export const config = {
  name: 'EvaluateAiFollowup',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId/ai-followup-evaluate',
    method: 'POST',
    middleware: [rateLimitMiddleware({ tier: 'public-mutation' }), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['flow-responses'],
} satisfies StepConfig

const NO_FOLLOWUP = { status: 200, body: { shouldFollowUp: false } } as const

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>, { studyId: string }>,
  { logger }: ApiHandlerContext
) => {
  const body = bodySchema.parse(req.body)
  const { participantId, questionId } = body
  const { studyId } = req.pathParams

  try {
    const supabase = getMotiaSupabaseClient()

    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('id', participantId)
      .eq('study_id', studyId)
      .single()

    if (!participant) {
      return { status: 400, body: { error: 'Invalid participant' } }
    }

    // Plan gate, trusted context and the max cap live in evaluateFollowup.
    // The server, not the player, decides the position from stored probes.
    const result = await evaluateFollowup({
      supabase,
      studyId,
      questionId,
      quotaKey: participantId,
      responseContext: body.responseContext,
      logger,
      resolveThread: async () => {
        // ai_followup_* tables are not in the generated types for this client.
        const { data: existing } = await supabase
          .from('ai_followup_questions' as any)
          .select('question_text, position')
          .eq('study_id', studyId)
          .eq('participant_id', participantId)
          .eq('parent_question_id', questionId)
          .order('position', { ascending: true }) as unknown as { data: { question_text: string }[] | null }
        return buildFollowupThread((existing ?? []).map((row) => row.question_text), body.answer, body.thread)
      },
    })
    if (!result) return NO_FOLLOWUP
    const { followup, position } = result

    const { data: inserted } = await supabase
      .from('ai_followup_questions' as any)
      .insert({
        study_id: studyId,
        participant_id: participantId,
        parent_question_id: questionId,
        question_text: followup.question,
        trigger_reason: followup.triggerReason,
        position,
        model_used: followup.modelUsed,
        followup_question_type: followup.followupType,
        followup_question_config: followup.followupConfig,
      })
      .select('id, question_text')
      .single() as unknown as { data: { id: string; question_text: string } | null }

    if (!inserted) return NO_FOLLOWUP

    return {
      status: 200,
      body: {
        shouldFollowUp: true,
        followUpQuestion: inserted.question_text,
        followupQuestionId: inserted.id,
        followupType: followup.followupType,
        followupConfig: followup.followupConfig,
      },
    }
  } catch (error) {
    // Fail-open: any error means no follow-up
    logger.error('AI followup evaluation failed', { error })
    return NO_FOLLOWUP
  }
}
