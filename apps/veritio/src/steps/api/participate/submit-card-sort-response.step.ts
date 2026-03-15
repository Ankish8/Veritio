import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { submitCardSortResponse } from '../../../services/participant-service'
import { submitCardSortSchema } from '../../../services/types'
import { storeFingerprint } from '../../../services/response-prevention-service'
import { getClientIP } from '../../../lib/utils/visitor-hash'

export const config = {
  name: 'SubmitCardSortResponse',
  description: 'Submit card sort study response (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/submit/card-sort',
    middleware: [errorHandlerMiddleware],
    bodySchema: submitCardSortSchema as any,
  }],
  enqueues: ['response-submitted'],
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
  const body = submitCardSortSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { success, studyId, participantId, error } = await submitCardSortResponse(supabase, params.shareCode, body as any)

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
    if (error.message === 'Response already submitted') {
      return {
        status: 409,
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
    topic: 'response-submitted',
    data: {
      studyId: studyId!,
      participantId: participantId!,
      studyType: 'card_sort',
      shareCode: params.shareCode,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
