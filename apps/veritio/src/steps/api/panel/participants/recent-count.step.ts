import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelParticipantService } from '../../../../services/panel/index'

export const config = {
  name: 'GetRecentParticipantsCount',
  description: 'Get count of participants who signed up in the last 7 days',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants/recent-count',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''

  logger.info('Getting recent participants count', { userId })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelParticipantService(supabase)

  try {
    // Fetch the user's last-viewed timestamp for mark-as-read badge
    const { data: prefs } = await (supabase as any)
      .from('user_preferences')
      .select('panel_participants_last_viewed_at')
      .eq('user_id', userId)
      .maybeSingle()

    const lastViewedAt = prefs?.panel_participants_last_viewed_at ?? null

    const count = await service.getRecentSignupCount(userId, organizationId, 7, lastViewedAt)

    logger.info('Recent participants count fetched', { userId, count })

    return {
      status: 200,
      body: { count },
    }
  } catch (error) {
    logger.error('Failed to get recent participants count', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to get recent participants count' },
    }
  }
}
