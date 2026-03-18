import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createShareLink } from '../../../services/share-link-service'
import { createShareLinkSchema } from '../../../lib/supabase/collaboration-types'
import { classifyError } from '../../../lib/api/classify-error'

const responseSchema = z.object({
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

export const config = {
  name: 'CreateShareLink',
  description: 'Create a share link for a study (requires editor role)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/share-links',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: createShareLinkSchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['share-link-created'],
  flows: ['collaboration'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const studyId = req.pathParams?.studyId as string

  if (!studyId) {
    return {
      status: 400,
      body: { error: 'Study ID is required' },
    }
  }

  const validation = validateRequest(createShareLinkSchema, req.body, logger)
  if (!validation.success) return validation.response

  logger.info('Creating share link', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: link, error } = await createShareLink(supabase, studyId, userId, {
    password: validation.data.password,
    expiresInDays: validation.data.expires_in_days,
    allowDownload: validation.data.allow_download,
    allowComments: validation.data.allow_comments,
    label: validation.data.label,
  })

  if (error) {
    return classifyError(error, logger, 'Create share link', {
      fallbackMessage: 'Failed to create share link',
    })
  }

  logger.info('Share link created successfully', { userId, studyId, linkId: link?.id })

  enqueue({
    topic: 'share-link-created',
    data: {
      shareLinkId: link!.id,
      studyId,
      userId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: link!,
  }
}
