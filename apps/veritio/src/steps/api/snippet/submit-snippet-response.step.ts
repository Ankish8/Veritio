import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { submitLiveWebsiteResponse } from '../../../services/participant/index'
import { storeFingerprint } from '../../../services/response-prevention-service'
import { getClientIP } from '../../../lib/utils/visitor-hash'

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
  variantId: z.string().uuid().nullish(),
  preventionData: z.object({
    cookieId: z.string().nullish(),
    fingerprintHash: z.string().nullish(),
    fingerprintConfidence: z.number().nullish(),
  }).optional(),
})

export const config = {
  name: 'SubmitSnippetResponse',
  description: 'Submit live website test response via snippet (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/submit',
    middleware: [errorHandlerMiddleware],
    // No bodySchema — companion may send without Content-Type in edge cases.
    // We parse and validate manually in the handler.
  }],
  enqueues: ['response-submitted'],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

export const handler = async (
  req: ApiRequest,
  { enqueue, logger }: ApiHandlerContext
) => {
  const { snippetId } = paramsSchema.parse(req.pathParams)
  // Handle missing Content-Type (direct CORS calls from companion without Content-Type header)
  const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const body = BodySchema.parse(rawBody)
  const supabase = getMotiaSupabaseClient()

  const { data: studies } = await supabase
    .from('studies')
    .select('id, share_code')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Snippet not found' },
    }
  }

  const shareCode = studies[0].share_code

  if (!shareCode) {
    return { status: 400, body: { error: 'Study has no share code' } }
  }

  const { success, studyId, participantId, error } = await submitLiveWebsiteResponse(
    supabase,
    shareCode,
    {
      sessionToken: body.sessionToken,
      responses: body.responses as any,
      variantId: body.variantId ?? null,
    }
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
      headers: { 'Access-Control-Allow-Origin': '*' },
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

  if (studyId && participantId && body.preventionData) {
    const clientIP = getClientIP(req.headers)
    try {
      const result = await storeFingerprint(supabase, studyId, participantId, {
        cookieId: body.preventionData.cookieId,
        ipAddress: clientIP,
        fingerprintHash: body.preventionData.fingerprintHash,
        fingerprintConfidence: body.preventionData.fingerprintConfidence,
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
        shareCode,
      },
    }).catch(() => {})
  }

  return {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { success },
  }
}
