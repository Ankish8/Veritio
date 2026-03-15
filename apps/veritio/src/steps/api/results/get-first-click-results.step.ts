import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getFirstClickResults } from '../../../services/results/first-click'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetFirstClickResults',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/first-click-results',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger: _logger }: ApiHandlerContext) => {
  const { studyId } = req.pathParams
  const supabase = getMotiaSupabaseClient()

  const result = await getFirstClickResults(supabase, studyId)

  if (result.error || !result.data) {
    const isNotFound = result.error?.message === 'Study not found'
    return {
      status: isNotFound ? 404 : 500,
      body: { error: result.error?.message || 'Failed to fetch results' },
    }
  }

  return { status: 200, body: result.data }
}
