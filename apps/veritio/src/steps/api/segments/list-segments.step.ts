import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listSegments } from '../../../services/segment-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const segmentConditionSchema = z.object({
  id: z.string(),
  type: z.enum(['status', 'url_tag', 'question_response', 'categories_created', 'time_taken', 'participant_id']),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.tuple([z.number(), z.number()])]),
  questionId: z.string().optional(),
  questionText: z.string().optional(),
  tagKey: z.string().optional(),
})

const segmentSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  conditions: z.array(segmentConditionSchema),
  participant_count: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
})

const responseSchema = z.array(segmentSchema)

export const config = {
  name: 'ListSegments',
  description: 'List all segments for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/segments',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['segments-fetched'],
  flows: ['segments'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)

  logger.info('Listing segments', { userId, studyId: params.studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: segments, error } = await listSegments(supabase, params.studyId)

  if (error) {
    logger.error('Failed to list segments', { userId, studyId: params.studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch segments' },
    }
  }

  logger.info('Segments listed successfully', { userId, studyId: params.studyId, count: segments?.length || 0 })

  enqueue({
    topic: 'segments-fetched',
    data: { resourceType: 'segment', action: 'list', userId, studyId: params.studyId, metadata: { count: segments?.length || 0 } },
  }).catch(() => {})

  return {
    status: 200,
    body: segments || [],
  }
}
