import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../middlewares/rate-limit'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { captureFollowupAnswered } from '../../../services/ai-followup/telemetry'

const bodySchema = z.object({
  participantId: z.string().uuid(),
  followupQuestionId: z.string().uuid(),
  // Follow-up answers are one short value; cap the stored JSON.
  responseValue: z.record(z.unknown()).refine((value) => JSON.stringify(value).length <= 8000, {
    message: 'Response too large',
  }),
  responseTimeMs: z.number().int().optional(),
})

export const config = {
  name: 'SubmitAiFollowupResponse',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId/ai-followup-respond',
    method: 'POST',
    middleware: [rateLimitMiddleware({ tier: 'public-mutation' }), errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['flow-responses'],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<z.infer<typeof bodySchema>, { studyId: string }>,
  { logger }: ApiHandlerContext
) => {
  const { participantId, followupQuestionId, responseValue, responseTimeMs } = bodySchema.parse(req.body)
  const { studyId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  // Validate the follow-up was asked of this participant in this study, so one
  // participant cannot attach answers to another participant's follow-up.
  const { data: fq } = await supabase
    .from('ai_followup_questions' as any)
    .select('id, participant_id, followup_question_type, model_used')
    .eq('id', followupQuestionId)
    .eq('study_id', studyId)
    .single() as unknown as {
      data: { id: string; participant_id: string; followup_question_type: string; model_used: string } | null
    }

  if (!fq || fq.participant_id !== participantId) {
    return { status: 400, body: { error: 'Invalid followup question' } }
  }

  // Validate the participant belongs to this study — otherwise a caller with a
  // study's followupQuestionId could write/overwrite responses under any participant id.
  const { data: participant } = await supabase
    .from('participants')
    .select('id')
    .eq('id', participantId)
    .eq('study_id', studyId)
    .single() as unknown as { data: { id: string } | null }

  if (!participant) {
    return { status: 400, body: { error: 'Invalid participant' } }
  }

  const { error } = await supabase
    .from('ai_followup_responses' as any)
    .upsert(
      {
        followup_question_id: followupQuestionId,
        participant_id: participantId,
        study_id: studyId,
        response_value: responseValue,
        response_time_ms: responseTimeMs ?? null,
      },
      { onConflict: 'followup_question_id,participant_id' }
    )

  if (error) {
    logger.error('Failed to save AI followup response', { error })
    return { status: 500, body: { error: 'Failed to save response' } }
  }

  captureFollowupAnswered({
    studyId,
    followupType: fq.followup_question_type,
    modelUsed: fq.model_used,
    answerText: typeof responseValue.text === 'string' ? responseValue.text : String(responseValue.value ?? responseValue.optionId ?? ''),
    skipped: responseValue.skipped === true,
    responseTimeMs: responseTimeMs ?? null,
  })

  return { status: 200, body: { success: true } }
}
