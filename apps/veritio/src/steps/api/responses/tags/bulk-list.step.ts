import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import type { ResponseTag } from '../../../../types/response-tags'

const bodySchema = z.object({
  response_ids: z.array(z.string().uuid()).min(1).max(500),
})

export const config = {
  name: 'BulkListTagsForResponses',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/responses/tags/bulk-list',
  }],
  enqueues: [],
} satisfies StepConfig

interface _TagAssignmentWithTag {
  response_id: string
  tag: ResponseTag
}

export const handler = async (
  req: ApiRequest<typeof config>,
  ctx: ApiHandlerContext
) => {
  try {
    const input = bodySchema.parse(req.body)
    const supabase = getMotiaSupabaseClient()

     
    const { data, error } = await (supabase as any)
      .from('response_tag_assignments')
      .select(`
        response_id,
        response_tags (*)
      `)
      .in('response_id', input.response_ids)

    if (error) throw error

    const tagsByResponse: Record<string, ResponseTag[]> = {}

    for (const assignment of data || []) {
      const responseId = (assignment as any).response_id
      const tag = (assignment as any).response_tags as unknown as ResponseTag

      if (!tagsByResponse[responseId]) {
        tagsByResponse[responseId] = []
      }
      if (tag) {
        tagsByResponse[responseId].push(tag)
      }
    }

    return {
      status: 200 as const,
      body: tagsByResponse,
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: 400 as const,
        body: { error: 'Invalid input', issues: error.issues },
      }
    }

    ctx.logger.error('Failed to bulk list tags for responses', { error })
    return {
      status: 500 as const,
      body: { error: 'Failed to list tags' },
    }
  }
}
