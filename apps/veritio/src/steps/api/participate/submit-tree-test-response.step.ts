import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { submitTreeTestResponse } from '../../../services/participant-service'
import { submitTreeTestSchema } from '../../../services/types'
import { storeFingerprint } from '../../../services/response-prevention-service'
import { getClientIP } from '../../../lib/utils/visitor-hash'

export const config = {
  name: 'SubmitTreeTestResponse',
  description: 'Submit tree test study response (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/submit/tree-test',
    middleware: [errorHandlerMiddleware],
    bodySchema: submitTreeTestSchema as any,
  }],
  enqueues: ['response-submitted'],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1).regex(/^[a-zA-Z0-9_-]+$/),
})

export const handler = async (
  req: ApiRequest,
  { enqueue, logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = submitTreeTestSchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { success, studyId, participantId, error } = await submitTreeTestResponse(supabase, params.shareCode, body as any)

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
    console.error(`[SubmitTreeTestResponse]`, error instanceof Error ? error.message : error)
    return {
      status: 500,
      body: { error: 'Internal server error' },
    }
  }

  // Fire-and-forget: the backend is a persistent worker (not serverless), and
  // fingerprint storage only affects duplicate detection for FUTURE sessions —
  // it must not add latency to the participant's submit response.
  if (studyId && participantId) {
    const clientIP = getClientIP(req.headers)
    void storeFingerprint(supabase, studyId, participantId, {
        cookieId: body.cookieId,
        ipAddress: clientIP,
        fingerprintHash: body.fingerprintHash,
        fingerprintConfidence: body.fingerprintConfidence,
    })
      .then((result) => {
        if (!result.success) {
          logger.warn('Failed to store fingerprint', { error: result.error?.message })
        }
      })
      .catch((err) => {
        logger.warn('Failed to store fingerprint', { error: (err as Error).message })
      })
  }

  enqueue({
    topic: 'response-submitted',
    data: {
      studyId: studyId!,
      participantId: participantId!,
      studyType: 'tree_test',
      shareCode: params.shareCode,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
