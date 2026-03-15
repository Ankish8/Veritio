import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { createResponseTagsService } from '../../../../services/response-tags'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  tagId: z.string().uuid(),
})

const bodySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  description: z.string().max(255).nullable().optional(),
})

export const config = {
  name: 'UpdateStudyTag',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/tags/:tagId',
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<typeof config>,
  ctx: ApiHandlerContext
) => {
  const { studyId, tagId } = paramsSchema.parse(req.pathParams)

  try {
    const input = bodySchema.parse(req.body)
    const supabase = getMotiaSupabaseClient()
    const service = createResponseTagsService(supabase)

    const tag = await service.updateTag(tagId, input)

    return {
      status: 200 as const,
      body: tag,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: 'Invalid input', issues: error.issues },
      }
    }

    if ((error as any)?.code === '23505') {
      return {
        status: 409 as const,
        body: { error: 'A tag with this name already exists' },
      }
    }

    ctx.logger.error('Failed to update tag', { error, studyId, tagId })
    return {
      status: 500 as const,
      body: { error: 'Failed to update tag' },
    }
  }
}
