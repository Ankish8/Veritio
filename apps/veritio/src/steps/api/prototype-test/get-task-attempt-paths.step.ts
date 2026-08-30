import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { fetchAllByRange } from '../../../services/results/pagination'

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
  ctx: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  // Paginated: a bare select stops at PostgREST's 1000-row cap, which silently
  // truncated the paths view for any study past ~1000 task attempts.
  const { data: attempts, error } = await fetchAllByRange<Record<string, unknown>>(
    (from, to) =>
      supabase
        .from('prototype_test_task_attempts')
        .select('id, participant_id, task_id, path_taken, outcome, is_direct, success_pathway_snapshot, session_id')
        .eq('study_id', params.studyId)
        .order('id', { ascending: true })
        .range(from, to),
    ctx.logger,
    'prototype_test_task_attempts'
  )

  if (error) {
    ctx.logger.error(`[${config.name}] Failed to load task attempt paths`, { error: error.message })
    return {
      status: 500,
      body: { error: 'Internal server error' },
    }
  }

  return {
    status: 200,
    body: attempts || [],
  }
}
