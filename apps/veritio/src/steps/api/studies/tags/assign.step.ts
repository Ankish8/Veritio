import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { createResponseTagsService } from '../../../../services/response-tags'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'

const paramsSchema = z.object({
  responseId: z.string().uuid(),
})

const bodySchema = z.object({
  tag_id: z.string().uuid(),
  response_type: z.enum(['first_impression', 'flow_question', 'questionnaire']),
})

export const config = {
  name: 'AssignTagToResponse',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/responses/:responseId/tags',
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest<typeof config>,
  ctx: ApiHandlerContext
) => {
  const { responseId } = paramsSchema.parse(req.pathParams)

  try {
    const input = bodySchema.parse(req.body)
    const supabase = getMotiaSupabaseClient()
    const service = createResponseTagsService(supabase)

    const assignment = await service.assignTag({
      tag_id: input.tag_id,
      response_id: responseId,
      response_type: input.response_type,
    })

    return {
      status: 201 as const,
      body: assignment,
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
        body: { error: 'Tag already assigned to this response' },
      }
    }

    ctx.logger.error('Failed to assign tag', { error, responseId })
    return {
      status: 500 as const,
      body: { error: 'Failed to assign tag' },
    }
  }
}
