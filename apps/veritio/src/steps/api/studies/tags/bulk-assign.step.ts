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
  response_ids: z.array(z.string().uuid()).min(1).max(100),
  response_type: z.enum(['first_impression', 'flow_question', 'questionnaire']),
})

export const config = {
  name: 'BulkAssignTag',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/tags/:tagId/bulk-assign',
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

    const count = await service.bulkAssignTag({
      tag_id: tagId,
      response_ids: input.response_ids,
      response_type: input.response_type,
    })

    return {
      status: 200 as const,
      body: {
        assigned: count,
        total: input.response_ids.length,
      },
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: 'Invalid input', issues: error.issues },
      }
    }

    ctx.logger.error('Failed to bulk assign tag', { error, studyId, tagId })
    return {
      status: 500 as const,
      body: { error: 'Failed to bulk assign tag' },
    }
  }
}
