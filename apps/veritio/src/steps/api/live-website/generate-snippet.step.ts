import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { generateSnippetId } from '../../../services/live-website-service'

export const config = {
  name: 'GenerateLiveWebsiteSnippet',
  description: 'Generate a JS snippet ID for live website testing',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/live-website/snippet',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const snippetId = await generateSnippetId(supabase, studyId)

  return {
    status: 200,
    body: {
      snippetId,
      scriptTag: `<script src="/api/snippet/${snippetId}.js" async></script>`,
    },
  }
}
