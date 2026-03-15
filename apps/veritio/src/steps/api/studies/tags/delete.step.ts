import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { createResponseTagsService } from '../../../../services/response-tags'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  tagId: z.string().uuid(),
})

export const config = {
  name: 'DeleteStudyTag',
  triggers: [{
    type: 'http',
    method: 'DELETE',
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
    const supabase = getMotiaSupabaseClient()
    const service = createResponseTagsService(supabase)

    await service.deleteTag(tagId)

    return {
      status: 204 as const,
      body: null,
    }
  } catch (error) {
    ctx.logger.error('Failed to delete tag', { error, studyId, tagId })
    return {
      status: 500 as const,
      body: { error: 'Failed to delete tag' },
    }
  }
}
