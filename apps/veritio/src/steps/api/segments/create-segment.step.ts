import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createSegment } from '../../../services/segment-service'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

// All supported condition types (shared across study types)
const segmentConditionTypeSchema = z.enum([
  // Universal conditions
  'status', 'url_tag', 'question_response', 'time_taken', 'participant_id',
  // Card Sort
  'categories_created',
  // First Impression
  'device_type', 'design_assignment', 'response_rate',
  // Tree Test
  'task_success_rate', 'direct_success_rate', 'tasks_completed',
  // Prototype Test
  'misclick_count',
  // First Click
  'correct_clicks_rate',
  // Survey
  'questions_answered',
])

const segmentConditionSchema = z.object({
  id: z.string(),
  type: segmentConditionTypeSchema,
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.string()), z.tuple([z.number(), z.number()])]),
  questionId: z.string().optional(),
  questionText: z.string().optional(),
  tagKey: z.string().optional(),
  designId: z.string().optional(), // For design_assignment condition
})

// V2 condition group schema
const segmentConditionGroupSchema = z.object({
  id: z.string(),
  conditions: z.array(segmentConditionSchema),
})

// V2 conditions format with groups (OR logic between groups, AND within)
const segmentConditionsV2Schema = z.object({
  version: z.literal(2),
  groups: z.array(segmentConditionGroupSchema),
})

const bodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  // Support both V1 (flat array) and V2 (groups) formats
  conditions: z.union([z.array(segmentConditionSchema), segmentConditionsV2Schema]),
  participantCount: z.number().int().min(0).optional(),
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

export const config = {
  name: 'CreateSegment',
  description: 'Create a new segment for a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/segments',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: segmentSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    409: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['segment-created'],
  flows: ['segments'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)

  logger.info('Creating segment', { userId, studyId: params.studyId, name: body.name })

  const supabase = getMotiaSupabaseClient()
  const { data: segment, error } = await createSegment(supabase, params.studyId, userId, {
    name: body.name,
    description: body.description,
    conditions: body.conditions,
    participantCount: body.participantCount,
  })

  if (error) {
    if (error.message.includes('already exists')) {
      logger.warn('Segment name already exists', { userId, studyId: params.studyId, name: body.name })
      return {
        status: 409,
        body: { error: error.message },
      }
    }

    logger.error('Failed to create segment', { userId, studyId: params.studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to create segment' },
    }
  }

  logger.info('Segment created successfully', { userId, studyId: params.studyId, segmentId: segment?.id })

  enqueue({
    topic: 'segment-created',
    data: { resourceType: 'segment', action: 'create', userId, studyId: params.studyId, segmentId: segment?.id },
  }).catch(() => {})

  return {
    status: 201,
    body: segment,
  }
}
