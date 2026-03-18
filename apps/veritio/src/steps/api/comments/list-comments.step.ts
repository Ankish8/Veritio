import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listStudyComments } from '../../../services/comments-service'
import { classifyError } from '../../../lib/api/classify-error'

const commentSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  author_user_id: z.string(),
  content: z.string(),
  parent_comment_id: z.string().uuid().nullable(),
  thread_position: z.number(),
  mentions: z.array(z.string()),
  is_deleted: z.boolean(),
  deleted_at: z.string().nullable(),
  deleted_by_user_id: z.string().nullable(),
  edited_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  author: z.object({
    id: z.string(),
    name: z.string().nullable(),
    email: z.string(),
    image: z.string().nullable(),
  }),
})

// Paginated response schema
const paginatedResponseSchema = z.object({
  comments: z.array(commentSchema),
  nextCursor: z.string().nullable(),
  prevCursor: z.string().nullable(),
  hasMore: z.boolean(),
  totalCount: z.number(),
})

// Keep legacy array response for backward compatibility
const responseSchema = z.union([z.array(commentSchema), paginatedResponseSchema])

export const config = {
  name: 'ListStudyComments',
  description: 'List comments for a study with author info',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/comments',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const studyId = req.pathParams?.studyId as string

  // Pagination query params
  const limit = req.queryParams?.limit ? parseInt(req.queryParams.limit as string, 10) : 50
  const before = req.queryParams?.before as string | undefined
  const after = req.queryParams?.after as string | undefined
  // If paginated=true, return paginated response; otherwise return legacy array
  const paginated = req.queryParams?.paginated === 'true'

  if (!studyId) {
    return {
      status: 400,
      body: { error: 'Study ID is required' },
    }
  }

  logger.info('Listing study comments', { userId, studyId, limit, before, after, paginated })

  const supabase = getMotiaSupabaseClient()
  const { data: comments, error, pagination } = await listStudyComments(
    supabase,
    studyId,
    userId,
    { limit, before, after }
  )

  if (error) {
    return classifyError(error, logger, 'List comments', {
      fallbackMessage: 'Failed to fetch comments',
    })
  }

  logger.info('Comments listed successfully', {
    userId,
    studyId,
    commentCount: comments?.length || 0,
    hasMore: pagination?.hasMore,
    totalCount: pagination?.totalCount,
  })

  // Return paginated response if requested
  if (paginated && pagination) {
    return {
      status: 200,
      body: pagination,
    }
  }

  // Legacy: return flat array for backward compatibility
  return {
    status: 200,
    body: comments || [],
  }
}
