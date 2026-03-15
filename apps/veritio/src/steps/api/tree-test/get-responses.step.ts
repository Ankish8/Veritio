import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { fetchAllTreeTestResponses } from '../../../services/results/pagination'

export const config = {
  name: 'GetTreeTestResponses',
  description: 'Get tree test responses - lazy loaded for performance',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/tree-test-responses',
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
  { }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('study_type')
    .eq('id', params.studyId)
    .single()

  if (studyError || !study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.study_type !== 'tree_test') {
    return {
      status: 400,
      body: { error: 'This endpoint is only for tree test studies' },
    }
  }

  const responses = await fetchAllTreeTestResponses(supabase, params.studyId)

  return {
    status: 200,
    body: responses,
  }
}
