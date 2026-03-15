import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { submitFirstImpressionResponse } from '../../../../services/participant/index'
import { storeFingerprint } from '../../../../services/response-prevention-service'
import { getClientIP } from '../../../../lib/utils/visitor-hash'

const FocusEventSchema = z.object({
  type: z.enum(['focus', 'blur']),
  timestamp: z.number(),
})

const ExposureEventSchema = z.object({
  designId: z.string(),
  exposureSequence: z.number(),
  startedAt: z.number(),
  endedAt: z.number(),
  actualDurationMs: z.number(),
  configuredDurationMs: z.number(),
  countdownDurationMs: z.number(),
  viewportWidth: z.number(),
  viewportHeight: z.number(),
  imageRenderedWidth: z.number(),
  imageRenderedHeight: z.number(),
  usedMobileImage: z.boolean(),
  focusEvents: z.array(FocusEventSchema),
})

const DesignResponseSchema = z.object({
  designId: z.string(),
  exposure: ExposureEventSchema,
  questionAnswers: z.record(z.unknown()),
  questionsStartedAt: z.number().nullable(),
  completedAt: z.number(),
})

const DeviceInfoSchema = z.object({
  deviceType: z.enum(['desktop', 'tablet', 'mobile']),
  userAgent: z.string(),
  viewportWidth: z.number(),
  viewportHeight: z.number(),
})

const BodySchema = z.object({
  sessionToken: z.string(),
  responses: z.array(DesignResponseSchema),
  selectedDesignId: z.string().optional(),
  assignmentMode: z.enum(['random_single', 'sequential_all']),
  deviceInfo: DeviceInfoSchema,
  // Participant demographic data collected during identifier step
  demographicData: z.record(z.unknown()).nullable().optional(),
  // Optional fingerprint data for duplicate prevention (nullish: accepts null or undefined)
  cookieId: z.string().nullish(),
  fingerprintHash: z.string().nullish(),
  fingerprintConfidence: z.number().nullish(),
})

export const config = {
  name: 'SubmitFirstImpressionResponse',
  description: 'Submit first impression test study response (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/first-impression/submit',
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

  const { success, studyId, participantId, error } = await submitFirstImpressionResponse(
    supabase,
    params.shareCode,
    {
      sessionToken: body.sessionToken,
      responses: body.responses,
      selectedDesignId: body.selectedDesignId,
      assignmentMode: body.assignmentMode,
      deviceInfo: body.deviceInfo,
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
    if (error.message === 'This endpoint is only for first_impression studies' ||
        error.message === 'No responses provided') {
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
      studyType: 'first_impression',
      shareCode: params.shareCode,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success },
  }
}
