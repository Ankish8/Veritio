import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetFirstClickData',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/first-click',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  try {
    // Fetch tasks and settings in parallel
    const [tasksResult, studyResult] = await Promise.all([
      supabase
        .from('first_click_tasks')
        .select(`
          *,
          image:first_click_images(*),
          aois:first_click_aois(*)
        `)
        .eq('study_id', studyId)
        .order('position'),
      supabase
        .from('studies')
        .select('settings')
        .eq('id', studyId)
        .single(),
    ])

    if (tasksResult.error) throw tasksResult.error
    if (studyResult.error) throw studyResult.error

    return {
      status: 200,
      body: {
        tasks: (tasksResult.data || []).map(task => ({
          ...task,
          image: Array.isArray(task.image) ? task.image[0] : task.image,
          aois: task.aois || [],
        })),
        settings: (studyResult.data.settings as any) || {},
      },
    }
  } catch (error) {
    logger.error('Failed to fetch first-click data', { error, studyId })
    return {
      status: 500,
      body: { error: 'Failed to fetch first-click data' },
    }
  }
}
