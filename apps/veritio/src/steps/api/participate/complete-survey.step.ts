import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { completeSurveyParticipation } from '../../../services/participant-service'
import { completeSurveySchema } from '../../../services/types'
import { storeFingerprint } from '../../../services/response-prevention-service'
import { getClientIP } from '../../../lib/utils/visitor-hash'

export const config = {
  name: 'CompleteSurvey',
  description: 'Complete a survey study participation (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/complete/survey',
    middleware: [errorHandlerMiddleware],
    bodySchema: completeSurveySchema as any,
  }],
  enqueues: ['survey-completed'],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
})

export const handler = async (
  req: ApiRequest,
  { enqueue, logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = completeSurveySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { success, studyId, participantId, error } = await completeSurveyParticipation(
    supabase,
    params.shareCode,
    body
  )

  if (error) {
    if (error.message === 'Study not found') {
      return {
        status: 404,
        body: { error: error.message },
      }
    }
    if (error.message === 'Invalid session') {
      return {
        status: 401,
        body: { error: error.message },
      }
    }
    if (error.message === 'Survey already completed') {
      return {
        status: 409,
        body: { error: error.message },
      }
    }
    if (error.message === 'This endpoint is only for survey studies') {
      return {
        status: 400,
        body: { error: error.message },
      }
    }
    return {
      status: 500,
      body: { error: error.message },
    }
  }

  // Must await - fire-and-forget doesn't work in serverless environments
  if (studyId && participantId) {
    const clientIP = getClientIP(req.headers)
    try {
      const result = await storeFingerprint(supabase, studyId, participantId, {
        cookieId: body.cookieId,
        ipAddress: clientIP,
        fingerprintHash: body.fingerprintHash,
        fingerprintConfidence: body.fingerprintConfidence,
      })
      if (!result.success) {
        logger.warn('Failed to store fingerprint', { error: result.error?.message })
      }
    } catch (err) {
      logger.warn('Failed to store fingerprint', { error: (err as Error).message })
    }
  }

  enqueue({
    topic: 'survey-completed',
    data: {
      studyId: studyId!,
      participantId: participantId!,
      studyType: 'survey',
      shareCode: params.shareCode,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
