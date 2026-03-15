import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

// JSON schema for response values - using z.any() for Zod v4 JSON schema compatibility
const jsonSchema = z.any()

// Schema for individual response (matches StudyFlowResponseInsert from store)
const responseSchema = z.object({
  study_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  question_id: z.string().uuid(),
  response_value: jsonSchema,
  response_time_ms: z.number().int().min(0).optional().nullable(),
})

// Schema for the request body
const submitFlowResponsesSchema = z.object({
  responses: z.array(responseSchema).min(1),
})

export const config = {
  name: 'SubmitFlowResponses',
  description: 'Submit study flow question responses (screening, pre-study, post-study)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/flow-responses',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
    bodySchema: submitFlowResponsesSchema as any,
  }],
  enqueues: ['flow-responses-submitted'],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  { enqueue, logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = submitFlowResponsesSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  // All responses should have the same study_id matching the URL param
  const firstResponse = body.responses[0]
  if (firstResponse.study_id !== params.studyId) {
    return {
      status: 400,
      body: { error: 'Study ID mismatch in request' },
    }
  }

  // Extract unique participant ID (should be same for all responses)
  const participantId = firstResponse.participant_id

  // Verify the authenticated participant matches the one in the request body
  const authenticatedParticipantId = req.headers['x-participant-id']
  if (!authenticatedParticipantId || authenticatedParticipantId !== participantId) {
    return {
      status: 403,
      body: { error: 'Participant ID does not match authenticated session' },
    }
  }

  // Verify participant belongs to this study
  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, study_id, status')
    .eq('id', participantId)
    .eq('study_id', params.studyId)
    .single()

  if (participantError || !participant) {
    return {
      status: 404,
      body: { error: 'Participant not found for this study' },
    }
  }

  // Prepare responses for upsert (normalize to ensure consistency)
  const responsesToUpsert = body.responses.map((r) => ({
    study_id: params.studyId,
    participant_id: participantId,
    question_id: r.question_id,
    response_value: r.response_value,
    response_time_ms: r.response_time_ms ?? null,
  }))

  // Upsert responses (update if exists based on unique constraint)
  const { error: upsertError } = await supabase
    .from('study_flow_responses')
    .upsert(responsesToUpsert, {
      onConflict: 'participant_id,question_id',
      ignoreDuplicates: false,
    })

  if (upsertError) {
    logger.error('Error upserting flow responses', { error: upsertError })
    return {
      status: 500,
      body: { error: 'Failed to save responses' },
    }
  }

  // Emit event for tracking
  enqueue({
    topic: 'flow-responses-submitted',
    data: {
      studyId: params.studyId,
      participantId,
      responseCount: body.responses.length,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      success: true,
      savedCount: body.responses.length,
    },
  }
}
