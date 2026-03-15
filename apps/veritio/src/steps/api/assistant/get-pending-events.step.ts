import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPendingEvents, getPendingEventCount } from '../../../services/assistant/pending-events-service'

export const config = {
  name: 'GetAssistantPendingEvents',
  description: 'Get pending trigger events for the AI assistant',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/assistant/pending-events',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const supabase = getMotiaSupabaseClient()

  const [countResult, eventsResult] = await Promise.all([
    getPendingEventCount(supabase, userId),
    getPendingEvents(supabase, userId),
  ])

  if (countResult.error) logger.error('Failed to get pending event count', { error: countResult.error.message })
  if (eventsResult.error) logger.error('Failed to get pending events', { error: eventsResult.error.message })

  return { status: 200, body: { count: countResult.data, events: eventsResult.data } }
}
