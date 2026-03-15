import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetPrototypeTestSessions',
  description: 'Get prototype test sessions for lazy loading',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/prototype-test-sessions',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['results-analysis'],
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

  const PAGE_SIZE = 1000
  let allSessions: any[] = []
  let cursor: string | null = null
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('prototype_test_sessions')
      .select('*')
      .eq('study_id', params.studyId)
      .order('created_at', { ascending: true })
      .limit(PAGE_SIZE)

    if (cursor) {
      query = query.gt('created_at', cursor)
    }

    const { data, error } = await query

    if (error) {
      return {
        status: 500,
        body: { error: `Failed to fetch sessions: ${error.message}` },
      }
    }

    if (data && data.length > 0) {
      allSessions = [...allSessions, ...data]
      const lastRow = data[data.length - 1]
      cursor = lastRow.created_at as string
      hasMore = data.length === PAGE_SIZE
    } else {
      hasMore = false
    }
  }

  return {
    status: 200,
    body: allSessions,
  }
}
