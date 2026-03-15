import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetFirstClickTaskDetails',
  description: 'Get first-click task with images and AOIs for lazy loading',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/first-click-tasks/:taskId/details',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
  taskId: z.string().uuid(),
})

export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { studyId, taskId } = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: task, error } = await supabase
    .from('first_click_tasks')
    .select(`
      *,
      image:first_click_images(*),
      aois:first_click_aois(*)
    `)
    .eq('id', taskId)
    .eq('study_id', studyId)
    .single()

  if (error || !task) {
    return { status: 404, body: { error: 'Task not found' } }
  }

  return { status: 200, body: task }
}
