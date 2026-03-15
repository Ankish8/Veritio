import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { createResponseTagsService } from '../../../../services/response-tags'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'

const paramsSchema = z.object({
  responseId: z.string().uuid(),
})

export const config = {
  name: 'ListTagsForResponse',
  triggers: [{
    type: 'http',
    method: 'GET',
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
    const supabase = getMotiaSupabaseClient()
    const service = createResponseTagsService(supabase)

    const tags = await service.getTagsForResponse(responseId)

    return {
      status: 200 as const,
      body: tags,
    }
  } catch (error) {
    ctx.logger.error('Failed to list tags for response', { error, responseId })
    return {
      status: 500 as const,
      body: { error: 'Failed to list tags' },
    }
  }
}
