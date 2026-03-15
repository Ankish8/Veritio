import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetRrwebSession',
  description: 'Get a single rrweb recording session with full metadata',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/rrweb-sessions/:sessionId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  sessionId: z.string().min(1),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId, sessionId } = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  // Look up by DB row id (UUID) — the frontend passes the UUID from the list
  const { data, error } = await (supabase
    .from('live_website_rrweb_sessions' as any) as any)
    .select('*')
    .eq('study_id', studyId)
    .eq('id', sessionId)
    .single()

  if (error || !data) {
    return {
      status: 404,
      body: { error: 'Session not found' },
    }
  }

  return {
    status: 200,
    body: { session: data },
  }
}
