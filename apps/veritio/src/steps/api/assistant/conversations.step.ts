import type { StepConfig } from 'motia'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { listConversations } from '../../../services/assistant/conversation-service'
import { generateTitle } from './chat-utils'

export const config = {
  name: 'AssistantListConversations',
  description: 'List assistant conversations for a study',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/assistant/conversations',
    middleware: [authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const params = req.queryParams as Record<string, string>
  const studyId = params.studyId
  const mode = params.mode as 'results' | 'builder' | 'create' | undefined

  if (!studyId && mode !== 'create') {
    return { status: 400, body: { error: 'studyId query parameter is required' } }
  }

  const supabase = getMotiaSupabaseClient()
  const conversations = await listConversations(supabase, userId, studyId || null, mode)

  await enrichUntitledConversations(supabase, conversations, logger)
  await enrichStudyTypes(supabase, conversations)

  return { status: 200, body: { conversations } }
}

async function enrichUntitledConversations(supabase: any, conversations: any[], logger: any) {
  const untitledIds = conversations.filter((c) => !c.title).map((c) => c.id)
  if (untitledIds.length === 0) return

  const { data: firstMessages } = await supabase
    .from('assistant_messages')
    .select('conversation_id, content')
    .in('conversation_id', untitledIds)
    .eq('role', 'user')
    .order('created_at', { ascending: true })

  const firstMsgMap = new Map<string, string>()
  for (const msg of firstMessages ?? []) {
    if (!firstMsgMap.has(msg.conversation_id) && msg.content) {
      firstMsgMap.set(msg.conversation_id, msg.content)
    }
  }

  for (const conv of conversations) {
    if (!conv.title) {
      const firstMsg = firstMsgMap.get(conv.id)
      if (firstMsg) {
        conv.title = firstMsg.length > 40 ? firstMsg.slice(0, 40) + '...' : firstMsg
      }
    }
  }

  for (const [convId, firstMsg] of firstMsgMap) {
    generateTitle(supabase, convId, firstMsg, logger).catch(() => {})
  }
}

async function enrichStudyTypes(supabase: any, conversations: any[]) {
  const studyIds = conversations.map((c) => c.studyId).filter(Boolean) as string[]
  if (studyIds.length === 0) return

  const { data: studies } = await supabase
    .from('studies')
    .select('id, study_type')
    .in('id', studyIds)

  const studyTypeMap = new Map<string, string>()
  for (const s of studies ?? []) {
    studyTypeMap.set(s.id, s.study_type)
  }

  for (const conv of conversations) {
    if (conv.studyId) {
      conv.studyType = studyTypeMap.get(conv.studyId) ?? null
    }
  }
}

