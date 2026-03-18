import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateStudyTag } from '../../../services/study-tags-service'
import { classifyError } from '../../../lib/api/classify-error'

const paramsSchema = z.object({
  tagId: z.string().uuid(),
})

const bodySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  description: z.string().max(255).nullable().optional(),
  tag_group: z.enum(['product_area', 'team', 'methodology', 'status', 'custom']).optional(),
  position: z.number().int().min(0).optional(),
})

export const config = {
  name: 'UpdateStudyTag',
  description: 'Update a study tag',
  triggers: [{
    type: 'http',
    method: 'PUT',
    path: '/api/study-tags/:tagId',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['study-tag-updated'],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { tagId } = paramsSchema.parse(req.pathParams)

  const validation = validateRequest(bodySchema, req.body, logger)
  if (!validation.success) return validation.response

  logger.info('Updating study tag', { userId, tagId })

  const supabase = getMotiaSupabaseClient()
  const { data: tag, error } = await updateStudyTag(supabase, tagId, userId, validation.data)

  if (error) {
    return classifyError(error, logger, 'Update study tag', {
      fallbackMessage: 'Failed to update study tag',
    })
  }

  logger.info('Study tag updated successfully', { userId, tagId })

  enqueue({
    topic: 'study-tag-updated',
    data: {
      tagId: tag!.id,
      organizationId: tag!.organization_id,
      updatedBy: userId,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: tag,
  }
}
