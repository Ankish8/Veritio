import type { SupabaseClient } from '@supabase/supabase-js'
import type { ChatCompletionTool, ChatCompletionMessageParam } from './openai'
import type { ApiHandlerContext, ApiRequest } from '../../lib/motia/types'
import type { SSEEvent, ToolExecutionResult } from './types'
import { parseSuggestions } from './types'
import { enforceTokenBudget, truncateToolResult, summarizeToolResult } from './token-budget'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { streamChat } from './openai'
import { getUserAiOverrides } from '../user-ai-config-service'
import { getAdminAiConfigRaw } from '../admin-ai-config-service'
import {
  createConversation,
  getConversation,
  addMessage,
  getMessages,
  touchConversation,
} from './conversation-service'
import { generateTitle } from '../../steps/api/assistant/chat-utils'
import { checkRateLimit, incrementMessageCount } from './rate-limit'

const MAX_TOOL_ITERATIONS = 5
const STREAM_ITERATION_TIMEOUT_MS = 120_000

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export interface BuildContentOptions {
  req: ApiRequest
  context: ApiHandlerContext
  systemPrompt: string
  tools: ChatCompletionTool[]
  executeTool: (
    toolCall: { id: string; function: { name: string; arguments: string } },
    supabase: SupabaseClient,
    studyId: string,
    userId: string,
  ) => Promise<ToolExecutionResult>
  conversationType: string // 'build-card-sort', 'build-tree-test', etc.
}

export async function handleBuildContent(
  options: BuildContentOptions,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const { req, context, systemPrompt, tools, executeTool, conversationType } = options
  const { logger, streams } = context

  const userId = req.headers['x-user-id'] as string
  const { studyId, conversationId: existingConversationId, message, streamId } = req.body as {
    studyId: string
    conversationId?: string
    message: string
    streamId?: string
  }

  const supabase = getMotiaSupabaseClient()
  const startTime = Date.now()

  // Mutable — set after conversation is created/loaded
  let conversationId: string = ''

  const pushEvent = (event: SSEEvent) => {
    const groupId = streamId || conversationId
    if (!groupId) return
    streams.assistantChat?.send({ groupId }, event as any).catch(() => {})
  }

  // Load study with access check
  const loadStudyAndCheckAccess = async () => {
    const { data: studyData, error: studyError } = await supabase
      .from('studies')
      .select('id, title, study_type, status, user_id, settings')
      .eq('id', studyId)
      .single()

    if (studyError || !studyData) {
      throw new HttpError(404, 'Study not found')
    }

    if (studyData.user_id !== userId) {
      const { data: projectAccess } = await supabase
        .from('studies')
        .select('project:projects!inner(organization_id, organization:organizations!inner(members:organization_members!inner(user_id)))')
        .eq('id', studyId)
        .eq('projects.organizations.organization_members.user_id', userId)
        .single()

      if (!projectAccess) {
        throw new HttpError(403, 'Access denied')
      }
    }

    return studyData as { id: string; title: string | null; study_type: string; status: string | null; user_id: string | null; settings: any }
  }

  // Load or create conversation
  const loadOrCreateConversation = async (): Promise<{ id: string; isNew: boolean }> => {
    if (existingConversationId) {
      const existing = await getConversation(supabase, existingConversationId, userId)
      if (!existing) {
        throw new HttpError(404, 'Conversation not found')
      }
      return { id: existingConversationId, isNew: false }
    }
    // Use 'builder' mode for build-content conversations
    const conversation = await createConversation(supabase, userId, studyId, undefined, 'builder')
    if (!conversation) {
      throw new HttpError(500, 'Failed to create conversation')
    }
    return { id: conversation.id, isNew: true }
  }

  let _study: Awaited<ReturnType<typeof loadStudyAndCheckAccess>>
  let isNewConversation = false

  try {
    // Parallelize rate limit, study access, and conversation loading
    const [rateLimitResult, studyResult, convResult] = await Promise.all([
      checkRateLimit(supabase, userId),
      loadStudyAndCheckAccess(),
      loadOrCreateConversation(),
    ])
    logger.info(`[build-content:${conversationType}] Setup done`, { ms: Date.now() - startTime })

    if (!rateLimitResult.allowed) {
      const rateLimitEvent: SSEEvent = { type: 'rate_limit', info: rateLimitResult.info }
      return { status: 429, body: { events: [rateLimitEvent], rateLimitInfo: rateLimitResult.info } }
    }

    _study = studyResult
    conversationId = convResult.id
    isNewConversation = convResult.isNew
  } catch (err) {
    if (err instanceof HttpError) {
      return { status: err.status, body: { error: err.message } }
    }
    throw err
  }

  const [existingMessages, , , aiOverridesResult, adminConfigResult] = await Promise.all([
    existingConversationId
      ? getMessages(supabase, conversationId, { limit: 50 })
      : Promise.resolve([]),
    // Save user message
    addMessage(supabase, conversationId, 'user', message),
    // Increment rate limit counter
    incrementMessageCount(supabase, userId),
    // Load per-user AI overrides
    getUserAiOverrides(supabase, userId),
    // Load admin AI config
    getAdminAiConfigRaw(supabase),
  ])
  const userOverrides = aiOverridesResult ?? undefined
  const adminConfig = adminConfigResult ?? undefined

  logger.info(`[build-content:${conversationType}] Messages loaded`, { ms: Date.now() - startTime, historyCount: existingMessages.length })

  const openaiMessages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }]

  // Reconstruct conversation history with correct OpenAI ordering
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

  for (const msg of existingMessages) {
    if (msg.role === 'user') {
      openaiMessages.push({ role: 'user', content: msg.content || '' })
    } else if (msg.role === 'assistant') {
      const hasToolCalls = msg.toolCalls && Array.isArray(msg.toolCalls) && msg.toolCalls.length > 0
      const assistantMsg: ChatCompletionMessageParam = {
        role: 'assistant',
        content: hasToolCalls ? (msg.content || null) : (msg.content || ''),
      }
      if (hasToolCalls) {
        (assistantMsg as any).tool_calls = msg.toolCalls
      }
      openaiMessages.push(assistantMsg)

      // Attach tool results for this assistant's tool_calls
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
    // tool messages handled above — skip in main loop
  }

  // Add current user message
  openaiMessages.push({ role: 'user', content: message })

  logger.info(`[build-content:${conversationType}] Built messages`, {
    messageCount: openaiMessages.length,
    toolCount: tools.length,
  })

  const events: SSEEvent[] = []
  let iterations = 0
  const changedSections = new Set<string>()

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    // Check if client disconnected (onLeave sets cancellation flag in state)
    const groupId = streamId || conversationId
    if (groupId) {
      try {
        const cancelFlag = await context.state.get<{ cancelled: boolean }>('assistant-cancel', groupId)
        if (cancelFlag?.cancelled) {
          logger.info(`[build-content:${conversationType}] Client disconnected, aborting`, { iteration: iterations, ms: Date.now() - startTime })
          await context.state.delete('assistant-cancel', groupId)
          break
        }
      } catch {
        // State read failed — continue normally
      }
    }

    logger.info(`[build-content:${conversationType}] Iteration`, { iteration: iterations, ms: Date.now() - startTime })
    let fullContent = ''
    let toolCallsDetected: any[] = []

    // Token budget enforcement
    enforceTokenBudget(openaiMessages, logger)

    try {
      await consumeStreamWithTimeout(openaiMessages, tools, pushEvent, (content, toolCalls) => {
        fullContent = content
        toolCallsDetected = toolCalls
      }, userOverrides, adminConfig)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('OpenAI streaming error', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
        studyId,
        iteration: iterations,
      })
      const userMessage = process.env.NODE_ENV === 'development'
        ? `OpenAI API error: ${errorMessage}`
        : 'Failed to get AI response. Please try again.'
      const errEvt: SSEEvent = { type: 'error', message: userMessage }
      events.push(errEvt)
      pushEvent(errEvt)
      break
    }

    logger.info(`[build-content:${conversationType}] Stream done`, {
      iteration: iterations,
      ms: Date.now() - startTime,
      hasToolCalls: toolCallsDetected.length > 0,
      toolNames: toolCallsDetected.map((tc: any) => tc.function?.name),
    })

    // No tool calls means final response
    if (toolCallsDetected.length === 0) {
      await handleFinalResponse(supabase, conversationId, fullContent, events, pushEvent)
      break
    }

    // Process tool calls
    await addMessage(supabase, conversationId, 'assistant', fullContent || null, {
      toolCalls: toolCallsDetected,
    })

    openaiMessages.push({
      role: 'assistant',
      content: fullContent || null,
      tool_calls: toolCallsDetected,
    } as any)

    // Execute tool calls sequentially (only 1 expected, but handle multiple)
    const toolAutoResponses: string[] = []
    for (const toolCall of toolCallsDetected) {
      const toolName = toolCall.function.name
      let toolArgs: Record<string, unknown> = {}
      try {
        toolArgs = JSON.parse(toolCall.function.arguments || '{}')
      } catch {
        toolArgs = {}
      }

      const toolStartEvt: SSEEvent = { type: 'tool_start', toolName, description: `Applying ${conversationType.replace('build-', '')} content...` }
      events.push(toolStartEvt)
      pushEvent(toolStartEvt)

      logger.info('Tool call', { toolName, toolArgs: Object.keys(toolArgs), fullArgs: JSON.stringify(toolArgs).slice(0, 800) })

      let toolResult: ToolExecutionResult
      try {
        toolResult = await executeTool(toolCall, supabase, studyId, userId)
      } catch (toolErr) {
        const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr)
        logger.error('Tool execution crashed', { toolName, error: errMsg, stack: toolErr instanceof Error ? toolErr.stack : undefined })
        toolResult = { result: { error: `Tool failed: ${errMsg}` } }
      }

      if (toolResult.autoResponse) {
        toolAutoResponses.push(toolResult.autoResponse)
      }

      // Track sections changed — push refresh event
      if (toolResult.dataChanged) {
        const newSections: string[] = []
        for (const section of toolResult.dataChanged) {
          if (!changedSections.has(section)) newSections.push(section)
          changedSections.add(section)
        }
        if (newSections.length > 0 || toolResult.dataPayload) {
          const dataChangedEvt: SSEEvent = {
            type: 'study_data_changed',
            sections: newSections.length > 0 ? newSections : toolResult.dataChanged,
            ...(toolResult.dataPayload ? { data: toolResult.dataPayload } : {}),
          }
          events.push(dataChangedEvt)
          pushEvent(dataChangedEvt)
        }
      }

      const resultStr = typeof toolResult.result === 'object'
        ? JSON.stringify(toolResult.result)
        : String(toolResult.result)
      const isError = typeof toolResult.result === 'object' && toolResult.result !== null && 'error' in (toolResult.result as Record<string, unknown>)

      logger.info('Tool result', {
        toolName,
        hasResult: toolResult.result !== null && toolResult.result !== undefined,
        isError,
        dataChanged: toolResult.dataChanged,
        resultPreview: resultStr.slice(0, isError ? 500 : 200),
      })

      const toolDoneEvt: SSEEvent = { type: 'tool_done', toolName, result: toolResult.result }
      events.push(toolDoneEvt)
      pushEvent(toolDoneEvt)

      // Truncate tool result for context window safety
      const resultContent = truncateToolResult(resultStr)

      openaiMessages.push({
        role: 'tool',
        content: resultContent,
        tool_call_id: toolCall.id,
      })

      await addMessage(supabase, conversationId, 'tool', resultContent, {
        toolCallId: toolCall.id,
      })
    }

    // Skip follow-up LLM call if all tools provided auto-responses
    if (toolAutoResponses.length === toolCallsDetected.length && toolAutoResponses.length > 0) {
      const autoContent = toolAutoResponses.join('\n\n')
      logger.info(`[build-content:${conversationType}] Using auto-response, skipping follow-up LLM call`, { iteration: iterations, ms: Date.now() - startTime })
      await handleFinalResponse(supabase, conversationId, autoContent, events, pushEvent, true)
      break
    }

    logger.info(`[build-content:${conversationType}] Tools done, continuing loop`, { iteration: iterations, ms: Date.now() - startTime })
  }

  // Safety net: if loop exhausted without message_complete or error
  const hasTerminalEvent = events.some((e) => e.type === 'message_complete' || e.type === 'error')
  if (!hasTerminalEvent) {
    logger.warn(`[build-content:${conversationType}] Loop ended without message_complete`, {
      iterations,
      maxIterations: MAX_TOOL_ITERATIONS,
      ms: Date.now() - startTime,
    })

    const fallbackContent = 'I ran into the limit for how many steps I can take in one turn. The operations I completed so far are shown above. You can send another message to continue.'
    const fallbackMetadata: Record<string, unknown> = { type: 'text' as const }

    const fallbackMsg = await addMessage(supabase, conversationId, 'assistant', fallbackContent, {
      metadata: fallbackMetadata as any,
    })
    await touchConversation(supabase, conversationId)

    const textEvt: SSEEvent = { type: 'text_delta', content: fallbackContent }
    pushEvent(textEvt)

    const doneEvt: SSEEvent = {
      type: 'message_complete',
      messageId: fallbackMsg.id,
      conversationId,
      metadata: fallbackMetadata as any,
    }
    events.push(doneEvt)
    pushEvent(doneEvt)
  }

  logger.info(`[build-content:${conversationType}] Handler complete`, { ms: Date.now() - startTime, iterations, eventCount: events.length })

  // Generate title for new conversations
  if (isNewConversation) {
    generateTitle(supabase, conversationId, message, logger).catch(() => {})
  }

  return {
    status: 200,
    body: {
      conversationId,
      events,
    },
  }
}

async function handleFinalResponse(
  supabase: SupabaseClient,
  conversationId: string,
  fullContent: string,
  events: SSEEvent[],
  pushEvent: (event: SSEEvent) => void,
  /** When true, the content came from an auto-response and hasn't been streamed yet */
  isAutoResponse = false,
) {
  const parsed = parseSuggestions(fullContent)
  const savedContent = parsed ? parsed.cleanContent : fullContent

  const finalMetadata: Record<string, unknown> = { type: 'text' as const }
  if (parsed) finalMetadata.suggestions = parsed.suggestions

  // Auto-responses haven't been streamed as text_delta yet — push so frontend shows the text
  if (isAutoResponse && savedContent) {
    const textEvt: SSEEvent = { type: 'text_delta', content: savedContent }
    events.push(textEvt)
    pushEvent(textEvt)
  }

  const [assistantMsg] = await Promise.all([
    addMessage(supabase, conversationId, 'assistant', savedContent, {
      metadata: finalMetadata as any,
    }),
    touchConversation(supabase, conversationId),
  ])

  const doneEvt: SSEEvent = {
    type: 'message_complete',
    messageId: assistantMsg.id,
    conversationId,
    content: savedContent,
    metadata: finalMetadata as any,
  }
  events.push(doneEvt)
  pushEvent(doneEvt)
}

async function consumeStreamWithTimeout(
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  pushEvent: (event: SSEEvent) => void,
  onComplete: (fullContent: string, toolCalls: any[]) => void,
  userOverrides?: import('../user-ai-config-service').UserAiOverrides,
  adminConfig?: import('../admin-ai-config-service').AdminAiConfigRow,
) {
  let fullContent = ''
  let toolCallsDetected: any[] = []

  const consumeStream = async () => {
    for await (const chunk of streamChat(messages, tools, { provider: 'openai', userOverrides, adminConfig })) {
      if (chunk.type === 'text_delta') {
        fullContent += chunk.content
        pushEvent({ type: 'text_delta', content: chunk.content })
      } else if (chunk.type === 'text_replace') {
        fullContent = chunk.content
        pushEvent({ type: 'text_replace', content: chunk.content })
      } else if (chunk.type === 'tool_calls') {
        toolCallsDetected = chunk.toolCalls
      }
    }
  }

  let timeoutId: ReturnType<typeof setTimeout>
  await Promise.race([
    consumeStream(),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error(`OpenAI stream timed out after ${STREAM_ITERATION_TIMEOUT_MS / 1000}s`)),
        STREAM_ITERATION_TIMEOUT_MS,
      )
    }),
  ]).finally(() => clearTimeout(timeoutId!))

  onComplete(fullContent, toolCallsDetected)
}

// Token budget functions (enforceTokenBudget, truncateToolResult, summarizeToolResult)
// are imported from ./token-budget.ts

