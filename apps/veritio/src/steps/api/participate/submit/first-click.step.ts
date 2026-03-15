import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { submitFirstClickResponse } from '../../../../services/participant/index'
import { storeFingerprint } from '../../../../services/response-prevention-service'
import { getClientIP } from '../../../../lib/utils/visitor-hash'

const ResponseSchema = z.object({
  taskId: z.string(),
  click: z.object({
    x: z.number(),
    y: z.number(),
    timeToClickMs: z.number(),
    viewportWidth: z.number(),
    viewportHeight: z.number(),
    imageRenderedWidth: z.number(),
    imageRenderedHeight: z.number(),
    isCorrect: z.boolean(),
    matchedAoiId: z.string().nullable(),
  }).optional(),
  skipped: z.boolean(),
  postTaskResponses: z.array(z.object({
    questionId: z.string(),
    value: z.unknown(),
  })).optional(),
})

const BodySchema = z.object({
  sessionToken: z.string(),
  responses: z.array(ResponseSchema),
  demographicData: z.any().nullable().optional(), // Participant demographic data to save
  // Optional fingerprint data for duplicate prevention (nullish: accepts null or undefined)
  cookieId: z.string().nullish(),
  fingerprintHash: z.string().nullish(),
  fingerprintConfidence: z.number().nullish(),
})

export const config = {
  name: 'SubmitFirstClickResponse',
  description: 'Submit first-click test study response (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/first-click/submit',
    middleware: [errorHandlerMiddleware],
    bodySchema: BodySchema as any,
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
  const body = BodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { success, studyId, participantId, error } = await submitFirstClickResponse(
    supabase,
    params.shareCode,
    {
      sessionToken: body.sessionToken,
      responses: body.responses as any,
      demographicData: body.demographicData,
    }
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
    if (error.message === 'Response already submitted') {
      return {
        status: 409,
        body: { error: error.message },
      }
    }
    if (error.message === 'This endpoint is only for first_click studies') {
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
    topic: 'response-submitted',
    data: {
      studyId: studyId!,
      participantId: participantId!,
      studyType: 'first_click',
      shareCode: params.shareCode,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
