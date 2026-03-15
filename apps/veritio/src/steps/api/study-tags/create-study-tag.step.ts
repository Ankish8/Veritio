import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { createStudyTag } from '../../../services/study-tags-service'

const paramsSchema = z.object({
  orgId: z.string().uuid(),
})

const bodySchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  description: z.string().max(255).nullable().optional(),
  tag_group: z.enum(['product_area', 'team', 'methodology', 'status', 'custom']).optional(),
  position: z.number().int().min(0).optional(),
})

export const config = {
  name: 'CreateStudyTag',
  description: 'Create a study tag for an organization',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/organizations/:orgId/study-tags',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: ['study-tag-created'],
  flows: ['research-repository'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { orgId } = paramsSchema.parse(req.pathParams)

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn('Study tag creation validation failed', { errors: parsed.error.issues })
    return {
      status: 400,
      body: {
        error: 'Validation failed',
        details: parsed.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    }
  }

  logger.info('Creating study tag', { userId, orgId, name: parsed.data.name })

  const supabase = getMotiaSupabaseClient()
  const { data: tag, error } = await createStudyTag(supabase, orgId, userId, parsed.data)

  if (error) {
    if (error.message.includes('authorized')) {
      return {
        status: 403,
        body: { error: error.message },
      }
    }
    if (error.message.includes('already exists')) {
      return {
        status: 409,
        body: { error: error.message },
      }
    }
    logger.error('Failed to create study tag', { userId, orgId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to create study tag' },
    }
  }

  logger.info('Study tag created successfully', { userId, orgId, tagId: tag?.id })

  enqueue({
    topic: 'study-tag-created',
    data: {
      tagId: tag!.id,
      organizationId: orgId,
      name: tag!.name,
      createdBy: userId,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: tag,
  }
}
