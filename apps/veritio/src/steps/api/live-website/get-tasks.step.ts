import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getTasks, getVariants, getTaskVariants } from '../../../services/live-website-service'

export const config = {
  name: 'GetLiveWebsiteTasks',
  description: 'Get live website test tasks and settings',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/live-website',
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

  const { data: study } = await supabase
    .from('studies')
    .select('settings')
    .eq('id', studyId)
    .single()

  const rawSettings = (study?.settings && typeof study.settings === 'object')
    ? study.settings as Record<string, unknown>
    : {}
  const { studyFlow: _sf, ...settings } = rawSettings

  const abTestingEnabled = (settings as any).abTestingEnabled === true

  const [tasks, variants, taskVariants] = await Promise.all([
    getTasks(supabase, studyId),
    abTestingEnabled ? getVariants(supabase, studyId) : Promise.resolve([]),
    abTestingEnabled ? getTaskVariants(supabase, studyId) : Promise.resolve([]),
  ])

  return {
    status: 200,
    body: { tasks, settings, ...(abTestingEnabled ? { variants, taskVariants } : {}) },
  }
}
