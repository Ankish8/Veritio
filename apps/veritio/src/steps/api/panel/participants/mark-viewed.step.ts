import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'

export const config = {
  name: 'MarkPanelParticipantsViewed',
  description: 'Update the last-viewed timestamp for panel participants badge',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/participants/mark-viewed',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Marking panel participants as viewed', { userId })

  const supabase = getMotiaSupabaseClient()

  try {
    const { error } = await (supabase as any)
      .from('user_preferences')
      .upsert(
        {
          user_id: userId,
          panel_participants_last_viewed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      logger.error('Supabase error in mark-viewed', { code: error.code, message: error.message })
      throw error
    }

    logger.info('Panel participants marked as viewed', { userId })

    return {
      status: 200,
      body: { success: true },
    }
  } catch (error) {
    logger.error('Failed to mark panel participants as viewed', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to mark participants as viewed' },
    }
  }
}
