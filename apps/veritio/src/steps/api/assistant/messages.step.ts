import type { StepConfig } from 'motia'
import type { ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getConversation, getMessages } from '../../../services/assistant/conversation-service'

export const config = {
  name: 'AssistantGetMessages',
  description: 'Get all messages for an assistant conversation',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/assistant/conversations/:id/messages',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

export const handler = async (req: ApiRequest) => {
  const userId = req.headers['x-user-id'] as string
  const conversationId = (req.pathParams as Record<string, string>).id

  if (!conversationId) {
    return { status: 400, body: { error: 'Conversation ID is required' } }
  }

  const supabase = getMotiaSupabaseClient()

  const conversation = await getConversation(supabase, conversationId, userId)
  if (!conversation) {
    return { status: 404, body: { error: 'Conversation not found' } }
  }

  const messages = await getMessages(supabase, conversationId)
  return { status: 200, body: { messages, studyId: conversation.studyId ?? null } }
}
