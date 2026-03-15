import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetPrototypeTestTaskAttemptPaths',
  description: 'Get task attempts with path_taken data for paths visualization',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype-test-task-attempt-paths',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['study-content'],
} satisfies StepConfig

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const handler = async (
  req: ApiRequest,
  _ctx: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: attempts, error } = await supabase
    .from('prototype_test_task_attempts')
    .select('id, participant_id, task_id, path_taken, outcome, is_direct, success_pathway_snapshot, session_id')
    .eq('study_id', params.studyId)

  if (error) {
    return {
      status: 500,
      body: { error: `Failed to fetch task attempt paths: ${error.message}` },
    }
  }

  return {
    status: 200,
    body: attempts || [],
  }
}
