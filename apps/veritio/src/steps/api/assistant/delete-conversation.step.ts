import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteConversation } from '../../../services/assistant/conversation-service'

export const config = {
  name: 'AssistantDeleteConversation',
  description: 'Delete an assistant conversation',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/assistant/conversations/:id',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger: _logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const conversationId = (req.pathParams as Record<string, string>).id

  if (!conversationId) {
    return { status: 400, body: { error: 'Conversation ID is required' } }
  }

  const supabase = getMotiaSupabaseClient()
  await deleteConversation(supabase, conversationId, userId)
  return { status: 200, body: { success: true } }
}
