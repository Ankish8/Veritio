import type { ChatCompletionMessageParam } from '../../../services/assistant/openai'
import { createConversation, getConversation } from '../../../services/assistant/conversation-service'
import { HttpError, summarizeToolResult } from './chat-utils'

export type StudyMeta = {
  id: string
  title: string | null
  study_type: string
  status: string | null
  user_id: string | null
  settings?: any
  created_at?: string
  updated_at?: string
  share_code?: string | null
}

/** Load study with access check */
export async function loadStudyAndCheckAccess(
  supabase: any,
  rawStudyId: string,
  userId: string,
  isCreateMode: boolean,
  isBuilderMode: boolean,
): Promise<StudyMeta | null> {
  if (isCreateMode) return null

  const query = isBuilderMode
    ? supabase.from('studies').select('id, title, study_type, status, user_id, settings, created_at, updated_at, share_code').eq('id', rawStudyId).single()
    : supabase.from('studies').select('id, title, study_type, status, user_id').eq('id', rawStudyId).single()

  const { data: studyData, error: studyError } = await query as { data: StudyMeta | null; error: any }

  if (studyError || !studyData) {
    throw new HttpError(404, 'Study not found')
  }

  if (studyData.user_id !== userId) {
    const { data: projectAccess } = await supabase
      .from('studies')
      .select('project:projects!inner(organization_id, organization:organizations!inner(members:organization_members!inner(user_id)))')
      .eq('id', rawStudyId)
      .eq('projects.organizations.organization_members.user_id', userId)
      .single()

    if (!projectAccess) {
      throw new HttpError(403, 'Access denied')
    }
  }

  return studyData
}

/** Load or create conversation */
export async function loadOrCreateConversation(
  supabase: any,
  userId: string,
  existingConversationId: string | undefined,
  rawStudyId: string | undefined,
  isCreateMode: boolean,
  mode: 'results' | 'builder' | 'create',
): Promise<{ id: string; isNew: boolean }> {
  if (existingConversationId) {
    const existing = await getConversation(supabase, existingConversationId, userId)
    if (!existing) {
      throw new HttpError(404, 'Conversation not found')
    }
    if (existing.mode !== mode) {
      throw new HttpError(400, `Conversation mode mismatch: conversation is in "${existing.mode}" mode but request is in "${mode}" mode`)
    }
    return { id: existingConversationId, isNew: false }
  }
  const conversation = await createConversation(supabase, userId, isCreateMode ? null : rawStudyId!, undefined, mode)
  if (!conversation) {
    throw new HttpError(500, 'Failed to create conversation')
  }
  return { id: conversation.id, isNew: true }
}

/**
 * Reconstruct OpenAI conversation history from stored messages.
 * Handles multimodal messages (images), tool call ordering, and tool result summarization.
 */
export function reconstructConversationHistory(
  existingMessages: any[],
  openaiMessages: ChatCompletionMessageParam[],
): void {
  // Index tool calls and results for correct ordering
  const validToolCallIds = new Set<string>()
  const toolResultsByCallId = new Map<string, string>()

  for (const msg of existingMessages) {
    if (msg.role === 'assistant' && msg.toolCalls && Array.isArray(msg.toolCalls)) {
      for (const tc of msg.toolCalls as { id: string }[]) {
        if (tc.id) validToolCallIds.add(tc.id)
      }
    }
    if (msg.role === 'tool' && msg.toolCallId && validToolCallIds.has(msg.toolCallId)) {
      toolResultsByCallId.set(msg.toolCallId, msg.content || '')
    }
  }

  // Reconstruct messages with summarized tool results
  for (const msg of existingMessages) {
    if (msg.role === 'user') {
      const rawImages = (msg.metadata as unknown as Record<string, unknown>)?.images
      const msgImages = Array.isArray(rawImages)
        ? rawImages.filter((img): img is { url: string } => typeof img === 'object' && img !== null && typeof (img as any).url === 'string')
        : undefined
      if (msgImages && msgImages.length > 0) {
        const urlList = msgImages.map((img, i) => `[Attached image ${i + 1}]: ${img.url}`).join('\n')
        openaiMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: `${msg.content || ''}\n\n${urlList}` },
            ...msgImages.map((img) => ({ type: 'image_url' as const, image_url: { url: img.url } })),
          ],
        })
      } else {
        openaiMessages.push({ role: 'user', content: msg.content || '' })
      }
    } else if (msg.role === 'assistant') {
      const hasToolCalls = msg.toolCalls && Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0
      const assistantMsg: ChatCompletionMessageParam = {
        role: 'assistant',
        // OpenAI requires content: null (not '') for tool-calling assistant messages
        content: hasToolCalls ? (msg.content || null) : (msg.content || ''),
      }
      if (hasToolCalls) {
        (assistantMsg as any).tool_calls = msg.toolCalls
      }
      openaiMessages.push(assistantMsg)

      // Immediately attach tool results for this assistant's tool_calls
      if (hasToolCalls) {
        for (const tc of msg.toolCalls as { id: string; function?: { name?: string } }[]) {
          const content = toolResultsByCallId.get(tc.id)
          if (content !== undefined) {
            openaiMessages.push({
              role: 'tool',
              content: summarizeToolResult(content, tc.function?.name),
              tool_call_id: tc.id,
            })
          }
        }
      }
    }
    // tool messages are handled above — skip them in the main loop
  }
}

/**
 * Build the current user message with optional file attachments.
 * Includes file URLs as text so the LLM can reference them in tool calls.
 */
export function buildCurrentUserMessage(
  message: string,
  files: Array<{ url: string; filename: string; type: string; size?: number; mimeType?: string }> | undefined,
  openaiMessages: ChatCompletionMessageParam[],
): void {
  if (files && files.length > 0) {
    const urlList = files.map((file, i) => {
      const label = file.type === 'image' ? 'Attached image' : 'Attached file'
      return `[${label} ${i + 1}]: ${file.url}`
    }).join('\n')

    openaiMessages.push({
      role: 'user',
      content: [
        { type: 'text', text: `${message}\n\n${urlList}` },
        ...files.map((file) => {
          if (file.type === 'image') {
            return { type: 'image_url' as const, image_url: { url: file.url } } as any
          } else {
            return { type: 'input_file' as const, input_file: { url: file.url } } as any
          }
        }),
      ],
    } as any)
  } else {
    openaiMessages.push({ role: 'user', content: message })
  }
}

/**
 * Scan conversation history for previously created studies or draft basics (create mode).
 * Returns detected state for continuing conversations.
 */
export function detectPreviousCreateState(
  existingMessages: any[],
  logger: any,
): { currentStudyId?: string; currentStudyType?: string; hasDraftBasics: boolean } {
  let currentStudyId: string | undefined
  let currentStudyType: string | undefined
  let hasDraftBasics = false

  for (const msg of existingMessages) {
    if (msg.role === 'tool' && msg.content) {
      try {
        const parsed = JSON.parse(msg.content)
        if (parsed._createdStudy && parsed.study_id && parsed.study_type) {
          currentStudyId = parsed.study_id
          currentStudyType = parsed.study_type
          logger.info('Detected previously created study from conversation history', {
            studyId: currentStudyId,
            studyType: currentStudyType,
          })
          break
        }
        if (parsed._draftSet && !hasDraftBasics) {
          hasDraftBasics = true
          logger.info('Detected previously set draft basics from conversation history', {
            studyType: parsed.study_type,
          })
        }
      } catch {
        // Not JSON or missing fields — skip
      }
    }
  }

  return { currentStudyId, currentStudyType, hasDraftBasics }
}
