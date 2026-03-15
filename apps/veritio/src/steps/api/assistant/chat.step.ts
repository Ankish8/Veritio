import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { ChatCompletionMessageParam } from '../../../services/assistant/openai'
import { buildSystemPrompt, FLOW_SECTION_META } from '../../../services/assistant/system-prompt'
import {
  addMessage,
  getMessages,
  touchConversation,
} from '../../../services/assistant/conversation-service'
import { checkRateLimit, incrementMessageCount } from '../../../services/assistant/rate-limit'
import { getComposioConnections } from '../../../services/composio/index'
import { getPendingEvents, surfaceEvents } from '../../../services/assistant/pending-events-service'
import { getMethodologyGuidance } from '../../../services/assistant/methodology-guidance'
import { getStudyFlowReference } from '../../../services/assistant/study-flow-reference'
import { listCards } from '../../../services/card-service'
import { listCategories } from '../../../services/category-service'
import type { SSEEvent } from '../../../services/assistant/types'
import { parseSuggestions } from '../../../services/assistant/types'

import {
  HttpError,
  MAX_TOOL_ITERATIONS_DEFAULT,
  MAX_TOOL_ITERATIONS_CREATE,
  INTEGRATION_PROXY_TOOL,
  INTEGRATION_BATCH_TOOL,
  WRITE_EXPORT_TOOL,
  buildStudyTools,
  buildAllTools,
  enforceTokenBudget,
  consumeStreamWithTimeout,
  handleFinalResponse,
  generateTitle,
} from './chat-utils'
import { reconstructConversationHistory, buildCurrentUserMessage, detectPreviousCreateState, loadStudyAndCheckAccess, loadOrCreateConversation } from './chat-message-builder'
import type { StudyMeta } from './chat-message-builder'
import { executeOneToolCall, SEQUENTIAL_TOOLS } from './chat-tool-execution'
import type { ToolExecutionContext } from './chat-tool-execution'
import {
  DRAFT_PREVIEW_TOOLS,
  FLOW_CONFIG_TOOLS,
  handleDraftBasicsGate,
  handleStudyCreatedGate,
  handleDraftPreviewGate,
  handleFlowConfigGate,
} from './chat-gates'

const fileAttachmentSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      try {
        const parsed = new URL(url)
        const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '')
        return supabaseHost && parsed.hostname === supabaseHost
      } catch { return false }
    },
    { message: 'File URL must be from Supabase storage' }
  ),
  filename: z.string(),
  size: z.number().optional(),
  type: z.enum(['image', 'pdf', 'document', 'spreadsheet', 'text']),
  mimeType: z.string().optional(),
})

const bodySchema = z.object({
  studyId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(10000),
  files: z.array(fileAttachmentSchema).max(10).optional(),
  streamId: z.string().uuid().optional(),
  mode: z.enum(['results', 'builder', 'create']).optional().default('results'),
  // Pre-selected context from dashboard dropdowns (create mode only)
  preSelectedProjectId: z.string().uuid().optional(),
  preSelectedProjectName: z.string().max(200).optional(),
  preSelectedStudyType: z.string().max(50).optional(),
  // Current organization ID — scopes project listing to this org
  organizationId: z.string().uuid().optional(),
  // Active builder tab (builder mode only) — injected into system prompt
  activeTab: z.string().max(50).optional(),
  // Active flow section within the study-flow tab (builder mode only)
  activeFlowSection: z.string().max(50).optional(),
})

export const config = {
  name: 'AssistantChat',
  description: 'Send a message to the AI assistant and get a response with tool-calling support',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/chat',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, streams, enqueue, state }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId: rawStudyId, conversationId: existingConversationId, message, files, streamId, mode, preSelectedProjectId, preSelectedProjectName, preSelectedStudyType, organizationId, activeTab, activeFlowSection } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const isCreateMode = mode === 'create'

  if (isCreateMode) {
    logger.info('[chat] Create mode — organizationId', { organizationId: organizationId ?? 'NOT SET' })
  }

  if (!isCreateMode && !rawStudyId) {
    return { status: 400, body: { error: 'studyId is required for this mode' } }
  }

  const pendingSends: Promise<void>[] = []
  const pushEvent = (event: SSEEvent): Promise<void> => {
    const groupId = streamId || conversationId
    if (!groupId || !streams.assistantChat) return Promise.resolve()
    const p = streams.assistantChat.send({ groupId }, { type: 'event', data: event } as any).catch(() => {})
    pendingSends.push(p)
    return p
  }

  const _t0 = Date.now()
  logger.info('[chat] Rate limit check', { studyId: rawStudyId })
  const { allowed, info: rateLimitInfo } = await checkRateLimit(supabase, userId)
  if (!allowed) {
    const rateLimitEvent: SSEEvent = { type: 'rate_limit', info: rateLimitInfo }
    return { status: 429, body: { events: [rateLimitEvent], rateLimitInfo } }
  }

  const isBuilderMode = mode === 'builder'

  let study: StudyMeta | null = null
  let conversationId: string
  let isNewConversation = false
  let connectedIntegrations: string[] = []
  let pendingEventsList: any[] = []

  try {
    const [studyResult, convResult, connectionsResult, pendingResult] = await Promise.all([
      loadStudyAndCheckAccess(supabase, rawStudyId!, userId, isCreateMode, isBuilderMode),
      loadOrCreateConversation(supabase, userId, existingConversationId, rawStudyId, isCreateMode, mode),
      isCreateMode ? Promise.resolve({ data: [] as any[] }) : getComposioConnections(supabase, userId),
      isCreateMode ? Promise.resolve({ data: [] as any[] }) : getPendingEvents(supabase, userId).catch(() => ({ data: [] as any[] })),
    ])
    logger.info('[chat] Phase 2 done', { ms: Date.now() - _t0 })

    study = studyResult
    conversationId = convResult.id
    isNewConversation = convResult.isNew
    connectedIntegrations = (connectionsResult.data ?? [])
      .filter((c) => c.status === 'active')
      .map((c) => c.toolkit)
    pendingEventsList = pendingResult.data ?? []
  } catch (err) {
    if (err instanceof HttpError) {
      return { status: err.status, body: { error: err.message } }
    }
    throw err
  }

  // Mutable study tracking for create mode (Phase 2 transition)
  let currentStudyId = rawStudyId ?? undefined
  let currentStudyType = study?.study_type ?? undefined

  const pendingEvents = pendingEventsList.map((e: any) => ({
    toolkit: e.toolkit,
    triggerSlug: e.trigger_slug,
    eventType: e.event_type,
    summary: e.event_summary,
    payload: e.event_payload as Record<string, unknown> | undefined,
    createdAt: e.created_at,
  }))

  logger.info('[chat] Secondary loading', { ms: Date.now() - _t0 })
  const [participantCounts, existingMessages, , , builderFlowSteps, builderTasks, builderFlowQuestions, builderCards, builderCategories] = await Promise.all([
    (!isCreateMode && rawStudyId)
      ? Promise.all([
          supabase.from('participants').select('id', { count: 'exact', head: true }).eq('study_id', rawStudyId),
          supabase.from('participants').select('id', { count: 'exact', head: true }).eq('study_id', rawStudyId).eq('status', 'completed'),
        ]).then(([tp, cp]) => ({ total: tp.count ?? 0, completed: cp.count ?? 0 }))
      : Promise.resolve({ total: 0, completed: 0 }),
    existingConversationId
      ? getMessages(supabase, conversationId!)
      : Promise.resolve([]),
    addMessage(supabase, conversationId!, 'user', message, files && files.length > 0 ? { metadata: { type: 'text', files } } : undefined),
    incrementMessageCount(supabase, userId),
    (isBuilderMode && rawStudyId)
      ? (supabase as any).from('study_flow_steps').select('id, step_type, config, order_position')
          .eq('study_id', rawStudyId).order('order_position', { ascending: true })
          .then(({ data }: { data: any[] | null }) => data ?? [])
      : Promise.resolve([] as any[]),
    (isBuilderMode && rawStudyId)
      ? (study?.study_type === 'live_website_test'
          ? (supabase as any).from('live_website_tasks')
              .select('id, title, instructions, target_url, success_url, success_criteria_type, time_limit_seconds, order_position, post_task_questions')
              .eq('study_id', rawStudyId).order('order_position', { ascending: true })
              .then(({ data }: { data: any[] | null }) => data ?? [])
          : supabase.from('tasks').select('id, title, description, order_position')
              .eq('study_id', rawStudyId).order('order_position', { ascending: true })
              .then(({ data }) => data ?? []))
      : Promise.resolve([] as any[]),
    (isBuilderMode && rawStudyId)
      ? supabase.from('study_flow_questions')
          .select('id, section, question_type, question_text, description, is_required, config, position')
          .eq('study_id', rawStudyId)
          .order('position', { ascending: true })
          .then(({ data }: { data: any[] | null }) => data ?? [])
      : Promise.resolve([] as any[]),
    (isBuilderMode && rawStudyId && study?.study_type === 'card_sort')
      ? listCards(supabase as any, rawStudyId).then(({ data }) => data ?? [])
      : Promise.resolve([] as any[]),
    (isBuilderMode && rawStudyId && study?.study_type === 'card_sort')
      ? listCategories(supabase as any, rawStudyId).then(({ data }) => data ?? [])
      : Promise.resolve([] as any[]),
  ])

  logger.info('[chat] Secondary loading done', { ms: Date.now() - _t0 })
  const totalParticipants = participantCounts.total
  const completedParticipants = participantCounts.completed

  // Detect previously created study or draft in conversation history
  let hasDraftBasics = false
  if (isCreateMode && !currentStudyId && existingMessages.length > 0) {
    const detected = detectPreviousCreateState(existingMessages, logger)
    if (detected.currentStudyId) {
      currentStudyId = detected.currentStudyId
      currentStudyType = detected.currentStudyType
    }
    hasDraftBasics = detected.hasDraftBasics
  }

  // Create mode Phase 3: load study data when study was previously created in this conversation
  if (isCreateMode && currentStudyId && !study) {
    const { data: restoredStudy } = await supabase
      .from('studies')
      .select('id, title, study_type, status, user_id, settings, created_at, updated_at, share_code')
      .eq('id', currentStudyId)
      .single() as { data: StudyMeta | null; error: any }
    if (restoredStudy) {
      study = restoredStudy
      currentStudyType = restoredStudy.study_type
      logger.info('Loaded study data for restored create-mode conversation', {
        studyId: currentStudyId,
        studyType: currentStudyType,
        title: restoredStudy.title,
      })
    }
  }

  let preloadedContext: { studyConfig?: any; bestPractices?: string; flowReference?: string } | undefined
  if (isBuilderMode && study) {
    const bestPractices = getMethodologyGuidance(study.study_type)
    const sectionRefKey = activeTab === 'study-flow' && activeFlowSection
      ? FLOW_SECTION_META[activeFlowSection]?.referenceKey
      : undefined
    const flowReference = getStudyFlowReference(sectionRefKey || undefined)
    preloadedContext = {
      studyConfig: {
        study: { id: study.id, title: study.title, study_type: study.study_type, status: study.status, settings: study.settings, created_at: study.created_at, updated_at: study.updated_at, share_code: study.share_code },
        flowSteps: builderFlowSteps,
        tasks: builderTasks,
        flowQuestions: builderFlowQuestions,
        ...(builderCards.length > 0 ? { cards: builderCards } : {}),
        ...(builderCategories.length > 0 ? { categories: builderCategories } : {}),
      },
      bestPractices: bestPractices ?? undefined,
      flowReference,
    }
  }

  const systemPrompt = buildSystemPrompt({
    mode,
    studyTitle: study?.title ?? undefined,
    studyType: study?.study_type ?? undefined,
    studyStatus: study?.status ?? undefined,
    participantCount: totalParticipants,
    completedCount: completedParticipants,
    connectedIntegrations,
    pendingEvents: pendingEvents.length > 0 ? pendingEvents : undefined,
    ...(isCreateMode && preSelectedProjectId ? { preSelectedProjectId, preSelectedProjectName } : {}),
    ...(isCreateMode && preSelectedStudyType ? { preSelectedStudyType } : {}),
    ...(isCreateMode && currentStudyId ? { createdStudyId: currentStudyId } : {}),
    ...(isBuilderMode ? { activeTab, activeFlowSection, preloadedContext } : {}),
  })

  const openaiMessages: ChatCompletionMessageParam[] = [{ role: 'system', content: systemPrompt }]

  // Reconstruct conversation history
  reconstructConversationHistory(existingMessages, openaiMessages)

  // Add current user message
  buildCurrentUserMessage(message, files, openaiMessages)

  const studyTools = buildStudyTools(isCreateMode, mode, currentStudyId, currentStudyType, study, logger, hasDraftBasics, message)
  const allTools = buildAllTools(studyTools, connectedIntegrations, INTEGRATION_PROXY_TOOL, INTEGRATION_BATCH_TOOL, WRITE_EXPORT_TOOL, isBuilderMode, preloadedContext, isCreateMode, !!currentStudyId)

  logger.info('Built OpenAI messages', {
    messageCount: openaiMessages.length,
    toolCount: allTools.length,
    roles: openaiMessages.map((m) => m.role),
  })

  const events: SSEEvent[] = []
  let iterations = 0
  let lastResultUrl: string | null = null
  let studyCreatedSuccessfully = false
  const changedSections = new Set<string>()
  const maxIterations = isCreateMode ? MAX_TOOL_ITERATIONS_CREATE : MAX_TOOL_ITERATIONS_DEFAULT

  logger.info('[chat] Starting LLM loop', { ms: Date.now() - _t0, toolCount: allTools.length, messageCount: openaiMessages.length })

  while (iterations < maxIterations) {
    iterations++
    logger.info('[chat] Iteration', { iteration: iterations, ms: Date.now() - _t0 })
    let fullContent = ''
    let toolCallsDetected: any[] = []
    let streamComponentIds = new Map<number, string>()

    // Token budget enforcement
    enforceTokenBudget(openaiMessages, logger)

    try {
      await consumeStreamWithTimeout(openaiMessages, allTools, pushEvent, (content, toolCalls, componentIds) => {
        fullContent = content
        toolCallsDetected = toolCalls
        streamComponentIds = componentIds
      }, isCreateMode)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const errorStack = err instanceof Error ? err.stack : undefined
      logger.error('OpenAI streaming error', {
        error: errorMessage,
        stack: errorStack,
        studyId: currentStudyId,
        studyType: currentStudyType,
        iteration: iterations,
        messageCount: openaiMessages.length,
        toolCount: allTools.length,
      })
      const userMessage = process.env.NODE_ENV === 'production' ? 'Failed to get AI response. Please try again.' : `LLM API error: ${errorMessage}`
      const errEvt: SSEEvent = { type: 'error', message: userMessage }
      events.push(errEvt)
      pushEvent(errEvt)
      break
    }

    logger.info('[chat] Stream done', { iteration: iterations, ms: Date.now() - _t0, hasToolCalls: toolCallsDetected.length > 0, toolNames: toolCallsDetected.map((tc: any) => tc.function?.name) })

    // No tool calls means final response
    if (toolCallsDetected.length === 0) {
      await handleFinalResponse(supabase, conversationId!, fullContent, lastResultUrl, events, pushEvent)
      break
    }

    // Save assistant message with tool_calls
    await addMessage(supabase, conversationId!, 'assistant', fullContent || null, {
      toolCalls: toolCallsDetected,
    })

    // Add assistant message with tool_calls to OpenAI conversation
    openaiMessages.push({
      role: 'assistant',
      content: fullContent || null,
      tool_calls: toolCallsDetected,
    } as any)

    // Build shared tool execution context
    const toolCtx: ToolExecutionContext = {
      supabase,
      conversationId: conversationId!,
      userId,
      organizationId,
      currentStudyId,
      currentStudyType,
      isCreateMode,
      isBuilderMode,
      connectedIntegrations,
      allTools,
      events,
      pushEvent,
      logger,
      state,
      enqueue,
      files,
      streamComponentIds,
      lastResultUrl,
      changedSections,
      openaiMessages,
    }

    // Gate: set_draft_basics — execute only it, drop the rest, force-break
    const hasDraftBasicsCall = isCreateMode && toolCallsDetected.some((tc: any) => tc.function.name === 'set_draft_basics')
    if (hasDraftBasicsCall) {
      await handleDraftBasicsGate(toolCallsDetected, toolCtx)
      lastResultUrl = toolCtx.lastResultUrl
      break
    }

    // Parallelize tool execution when safe
    const hasCreateStudy = isCreateMode && toolCallsDetected.some((tc: any) => SEQUENTIAL_TOOLS.has(tc.function.name))

    if (hasCreateStudy || toolCallsDetected.length === 1) {
      for (let i = 0; i < toolCallsDetected.length; i++) {
        const result = await executeOneToolCall(toolCallsDetected[i], toolCtx, i)
        if (result.studyCreated) {
          studyCreatedSuccessfully = true
          currentStudyId = result.studyCreated.studyId
          currentStudyType = result.studyCreated.studyType
        }
      }
    } else {
      const results = await Promise.all(toolCallsDetected.map((tc, i) => executeOneToolCall(tc, toolCtx, i)))
      for (const result of results) {
        if (result.studyCreated) {
          studyCreatedSuccessfully = true
          currentStudyId = result.studyCreated.studyId
          currentStudyType = result.studyCreated.studyType
        }
      }
    }

    // Sync mutable state back from context
    lastResultUrl = toolCtx.lastResultUrl

    // Gate: after create_complete_study succeeds, force-break with flow section chips
    if (studyCreatedSuccessfully) {
      toolCtx.currentStudyId = currentStudyId
      toolCtx.currentStudyType = currentStudyType
      await handleStudyCreatedGate(toolCtx)
      break
    }

    // Gate: after a draft preview tool executes, force-break with next-step chips
    const executedDraftPreview = isCreateMode && toolCallsDetected.some((tc: any) => DRAFT_PREVIEW_TOOLS.has(tc.function.name))
    if (executedDraftPreview) {
      await handleDraftPreviewGate(toolCallsDetected, toolCtx)
      break
    }

    // Gate: after a flow config tool executes in create mode, force-break with next-step chips
    const executedFlowConfig = isCreateMode && toolCallsDetected.some((tc: any) => FLOW_CONFIG_TOOLS.has(tc.function.name))
    if (executedFlowConfig) {
      await handleFlowConfigGate(toolCallsDetected, toolCtx)
      break
    }

    logger.info('[chat] Tools done, continuing loop', { iteration: iterations, ms: Date.now() - _t0 })
  }

  // Safety net: if the loop exhausted max iterations without message_complete
  const hasMessageComplete = events.some((e) => e.type === 'message_complete')
  if (!hasMessageComplete) {
    logger.warn('[chat] Loop ended without message_complete — max iterations likely hit', {
      iterations,
      maxIterations,
      ms: Date.now() - _t0,
    })

    const accumulatedText = events
      .filter((e): e is SSEEvent & { type: 'text_delta' } => e.type === 'text_delta')
      .map((e) => (e as any).content as string)
      .join('')
    const parsed = parseSuggestions(accumulatedText)

    const fallbackSuffix = '\n\nI completed the operations shown above. You can send another message to continue.'
    const fallbackContent = parsed ? parsed.cleanContent + fallbackSuffix : (accumulatedText || '') + fallbackSuffix
    const fallbackMetadata: Record<string, unknown> = { type: 'text' as const }
    if (lastResultUrl) fallbackMetadata.resultUrl = lastResultUrl
    if (parsed) fallbackMetadata.suggestions = parsed.suggestions

    const fallbackMsg = await addMessage(supabase, conversationId!, 'assistant', fallbackContent, {
      metadata: fallbackMetadata as any,
    })
    await touchConversation(supabase, conversationId!)

    const textEvt: SSEEvent = { type: 'text_delta', content: fallbackSuffix }
    pushEvent(textEvt)

    const doneEvt: SSEEvent = {
      type: 'message_complete',
      messageId: fallbackMsg.id,
      conversationId: conversationId!,
      metadata: fallbackMetadata as any,
    }
    events.push(doneEvt)
    pushEvent(doneEvt)
  }

  logger.info('[chat] Handler complete', { ms: Date.now() - _t0, iterations, eventCount: events.length })

  // Flush all stream.send() calls before returning HTTP response
  await Promise.allSettled(pendingSends)

  // Mark pending events as surfaced in this conversation
  if (pendingEvents.length > 0 && conversationId) {
    const pendingEventIds = (pendingEventsList ?? []).map((e: any) => e.id as string)
    surfaceEvents(supabase, userId, pendingEventIds, conversationId!).catch((err) => {
      logger.warn('Failed to surface pending events', { error: err instanceof Error ? err.message : 'unknown' })
    })
  }

  // Generate title for new conversations
  if (isNewConversation) {
    generateTitle(supabase, conversationId!, message, logger).catch(() => {})
  }

  return {
    status: 200,
    body: {
      conversationId: conversationId!,
      events,
    },
  }
}
