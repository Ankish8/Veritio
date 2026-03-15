import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { submitLiveWebsiteResponse } from '../../../../services/participant/index'
import { storeFingerprint } from '../../../../services/response-prevention-service'
import { getClientIP } from '../../../../lib/utils/visitor-hash'

const PostTaskResponseSchema = z.object({
  questionId: z.string(),
  value: z.any(),
})

const ResponseSchema = z.object({
  taskId: z.string(),
  status: z.enum(['completed', 'abandoned', 'timed_out', 'skipped']),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  completionMethod: z.enum(['auto_url', 'auto_url_direct', 'auto_url_indirect', 'auto_path', 'auto_path_direct', 'auto_path_indirect', 'self_reported', 'skip', 'abandon', 'timeout']).nullable().optional(),
  postTaskResponses: z.array(PostTaskResponseSchema).optional().default([]),
})

const BodySchema = z.object({
  sessionToken: z.string(),
  sessionId: z.string().optional(),
  responses: z.array(ResponseSchema),
  demographicData: z.any().nullable().optional(),
  variantId: z.string().uuid().nullish(),
  // Optional fingerprint data for duplicate prevention (nullish: accepts null or undefined)
  cookieId: z.string().nullish(),
  fingerprintHash: z.string().nullish(),
  fingerprintConfidence: z.number().nullish(),
  // When true, the companion script (snippet widget) handles task submission.
  // The player only sends demographics — don't mark participant as completed here.
  companionSubmitted: z.boolean().optional(),
})

export const config = {
  name: 'SubmitLiveWebsiteResponse',
  description: 'Submit live website test study response (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/live-website/submit',
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

  // When companionSubmitted=true (recording-controller mode), the companion script
  // submits task responses via /api/snippet/:snippetId/submit. This player endpoint
  // should only save demographics — don't insert empty responses or mark completed.
  const { success, studyId, participantId, error } = await submitLiveWebsiteResponse(
    supabase,
    params.shareCode,
    {
      sessionToken: body.sessionToken,
      responses: body.responses as any,
      demographicData: body.demographicData,
      variantId: body.variantId ?? null,
    },
    logger,
    body.companionSubmitted,
  )

  if (error) {
    const errorStatusMap: Record<string, number> = {
      'Study not found': 404,
      'Invalid session': 401,
      'Response already submitted': 409,
      'This endpoint is only for live_website_test studies': 400,
    }
    return {
      status: errorStatusMap[error.message] ?? 500,
      body: { error: error.message },
    }
  }

  // Backfill participant_id on events so they can be linked during analysis
  if (studyId && participantId && body.sessionId) {
    try {
      await (supabase
        .from('live_website_events' as any) as any)
        .update({ participant_id: participantId })
        .eq('session_id', body.sessionId)
        .eq('study_id', studyId)
    } catch (err) {
      logger.warn('Failed to backfill event participant_id', { error: (err as Error).message })
    }
  }

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

  if (studyId && participantId) {
    enqueue({
      topic: 'response-submitted',
      data: {
        studyId,
        participantId,
        studyType: 'live_website_test',
        shareCode: params.shareCode,
      },
    }).catch(() => {})
  }

  return {
    status: 200,
    body: { success },
  }
}
