import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'ListRrwebSessions',
  description: 'List rrweb recording sessions for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/rrweb-sessions',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const querySchema = z.object({
  status: z.enum(['recording', 'completed', 'failed']).optional(),
  participant_id: z.string().uuid().optional(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})
  const supabase = getMotiaSupabaseClient()

  let qb = (supabase
    .from('live_website_rrweb_sessions' as any) as any)
    .select('id, session_id, participant_id, started_at, ended_at, duration_ms, event_count, chunks_uploaded, total_size_bytes, status, viewport_width, viewport_height, page_count, user_agent')
    .eq('study_id', studyId)
    .order('started_at', { ascending: false })

  if (query.status) {
    qb = qb.eq('status', query.status)
  }

  if (query.participant_id) {
    qb = qb.eq('participant_id', query.participant_id)
  }

  const { data, error } = await qb

  if (error) {
    return {
      status: 500,
      body: { error: 'Failed to list sessions' },
    }
  }

  return {
    status: 200,
    body: { sessions: data || [] },
  }
}
