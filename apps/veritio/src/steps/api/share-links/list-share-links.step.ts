import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listStudyShareLinks } from '../../../services/share-link-service'

const linkSchema = z.object({
  id: z.string().uuid(),
  study_id: z.string().uuid(),
  share_token: z.string(),
  expires_at: z.string().nullable(),
  allow_download: z.boolean(),
  allow_comments: z.boolean(),
  label: z.string().nullable(),
  created_by_user_id: z.string(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
  view_count: z.number(),
  last_viewed_at: z.string().nullable(),
  has_password: z.boolean(),
})

const responseSchema = z.array(linkSchema)

export const config = {
  name: 'ListShareLinks',
  description: 'List share links for a study (requires editor role)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/share-links',
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

  if (!studyId) {
    return {
      status: 400,
      body: { error: 'Study ID is required' },
    }
  }

  logger.info('Listing share links', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: links, error } = await listStudyShareLinks(supabase, studyId, userId)

  if (error) {
    if (error.message.includes('Permission denied')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message.includes('not found')) {
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }
    logger.error('Failed to list share links', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch share links' },
    }
  }

  logger.info('Share links listed successfully', { userId, studyId, count: links?.length || 0 })

  return {
    status: 200,
    body: links || [],
  }
}
