import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  participantId: z.string().uuid(),
  followupQuestionId: z.string().uuid(),
  responseValue: z.record(z.unknown()),
  responseTimeMs: z.number().int().optional(),
})

export const config = {
  name: 'SubmitAiFollowupResponse',
  triggers: [{
    type: 'http',
    path: '/api/studies/:studyId/ai-followup-respond',
    method: 'POST',
    middleware: [errorHandlerMiddleware],
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

  // Validate followup question belongs to this study
  const { data: fq } = await supabase
    .from('ai_followup_questions' as any)
    .select('id')
    .eq('id', followupQuestionId)
    .eq('study_id', studyId)
    .single() as unknown as { data: { id: string } | null }

  if (!fq) {
    return { status: 400, body: { error: 'Invalid followup question' } }
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

  return { status: 200, body: { success: true } }
}
