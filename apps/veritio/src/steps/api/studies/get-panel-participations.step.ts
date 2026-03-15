import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { PanelStudyParticipationWithDetails } from '../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

const querySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
})

export const config = {
  name: 'GetStudyPanelParticipations',
  description: 'Get all panel participations for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/panel-participations',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel', 'studies'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = paramsSchema.parse(req.pathParams)
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Getting panel participations for study', { userId, studyId })

  const supabase = getMotiaSupabaseClient()

  try {
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id')
      .eq('id', studyId)
      .eq('user_id', userId)
      .single()

    if (studyError || !study) {
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    let dbQuery = (supabase as any)
      .from('panel_study_participations')
      .select(`
        *,
        panel_participant:panel_participants (
          id,
          email,
          first_name,
          last_name
        )
      `, { count: 'exact' })
      .eq('study_id', studyId)

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }
    if (query.source) {
      dbQuery = dbQuery.eq('source', query.source)
    }

    const offset = (query.page - 1) * query.limit
    dbQuery = dbQuery
      .order('invited_at', { ascending: false })
      .range(offset, offset + query.limit - 1)

    const { data: participations, error, count } = await dbQuery

    if (error) throw error

    const result = (participations || []).map((p: any) => ({
      ...p,
      study: {
        id: studyId,
        title: '',
        study_type: '',
        status: '',
      },
    })) as PanelStudyParticipationWithDetails[]

    logger.info('Fetched study panel participations', {
      userId,
      studyId,
      count: result.length,
      total: count
    })

    return {
      status: 200,
      body: {
        data: result,
        total: count || 0,
        page: query.page,
        limit: query.limit,
        hasMore: offset + result.length < (count || 0),
      },
    }
  } catch (error) {
    logger.error('Failed to get study panel participations', {
      userId,
      studyId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to get participations' },
    }
  }
}
