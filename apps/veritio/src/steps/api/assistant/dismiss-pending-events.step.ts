import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { dismissEvents, dismissEvent } from '../../../services/assistant/pending-events-service'

const bodySchema = z.object({
  eventId: z.string().uuid().optional(),
}).optional()

export const config = {
  name: 'DismissAssistantPendingEvents',
  description: 'Dismiss pending trigger events for the AI assistant',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/pending-events/dismiss',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const supabase = getMotiaSupabaseClient()
  const eventId = (req.body as { eventId?: string } | undefined)?.eventId

  const { error } = eventId
    ? await dismissEvent(supabase, userId, eventId)
    : await dismissEvents(supabase, userId)

  if (error) {
    logger.error('Failed to dismiss pending events', { userId, eventId, error: error.message })
    return { status: 500, body: { error: 'Failed to dismiss pending events' } }
  }

  logger.info('Dismissed pending events', { userId, eventId: eventId || 'all' })
  return { status: 200, body: { success: true } }
}
