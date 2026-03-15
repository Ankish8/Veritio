import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetGazeData',
  description: 'Get eye tracking gaze data for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/gaze-data',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await (supabase
    .from('live_website_gaze_data' as any) as any)
    .select('id, study_id, session_id, participant_id, task_id, page_url, viewport_width, viewport_height, gaze_points, point_count, created_at')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true })
    .limit(5000)

  if (error) {
    logger.error('Failed to fetch gaze data', { error })
    return { status: 500, body: { error: 'Failed to fetch gaze data' } }
  }

  return {
    status: 200,
    body: { gazeData: data || [] },
  }
}
