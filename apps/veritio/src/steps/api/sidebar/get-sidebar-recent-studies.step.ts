import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'GetSidebarRecentStudies',
  description: 'Lightweight endpoint for sidebar recent studies navigation',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/sidebar/recent-studies',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = req.queryParams?.organizationId as string | undefined

  logger.info('Fetching sidebar recent studies', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()

  if (!organizationId) {
    return { status: 200, body: { recentStudies: [] } }
  }

  // Run membership check and studies fetch in parallel to avoid two sequential round-trips
  const [membershipResult, studiesResult] = await Promise.all([
    supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .not('joined_at', 'is', null)
      .maybeSingle(),
    supabase
      .from('studies')
      .select('id, title, project_id, study_type, status, updated_at, last_opened_at')
      .eq('organization_id', organizationId)
      .eq('is_archived', false)
      .order('last_opened_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  if (membershipResult.error) {
    logger.error('Failed to verify org membership', { userId, organizationId, error: membershipResult.error.message })
    return { status: 500, body: { error: 'Failed to verify organization membership' } }
  }

  if (!membershipResult.data) {
    return { status: 200, body: { recentStudies: [] } }
  }

  const { data: studies, error } = studiesResult

  if (error) {
    logger.error('Failed to fetch sidebar recent studies', { userId, error: error.message })
    return { status: 500, body: { error: 'Failed to fetch recent studies' } }
  }

  return {
    status: 200,
    body: {
      recentStudies: (studies || []).map(({ last_opened_at: _last_opened_at, ...study }) => study),
    },
  }
}
