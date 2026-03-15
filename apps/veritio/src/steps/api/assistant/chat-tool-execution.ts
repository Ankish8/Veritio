import type { ChatCompletionTool } from '../../../services/assistant/openai'
import { executeTool, extractResultUrl, constructUrlFromParams, humanizeToolName } from '../../../services/assistant/tool-executor'
import { getBuilderTools, getBuilderWriteToolsForStudyType, getDraftTools, CREATE_TOOL_NAMES, DRAFT_TOOL_NAMES } from '../../../services/assistant/tool-definitions'
import { getMethodologyGuidance } from '../../../services/assistant/methodology-guidance'
import { listToolsForToolkit } from '../../../services/composio/index'
import { getExportData } from '../../../services/assistant/study-tools'
import { writeExportToIntegration } from '../../../services/assistant/export-writer'
import { addMessage, updateConversationStudyId } from '../../../services/assistant/conversation-service'
import { TOOL_COMPONENT_MAP } from '../../../lib/generative-ui/registry'
import type { SSEEvent } from '../../../services/assistant/types'
import { resolveAttachmentRefs, truncateToolResult } from './chat-utils'

export interface ToolExecutionContext {
  supabase: any
  conversationId: string
  userId: string
  organizationId?: string
  currentStudyId?: string
  currentStudyType?: string
  isCreateMode: boolean
  isBuilderMode: boolean
  connectedIntegrations: string[]
  allTools: ChatCompletionTool[]
  events: SSEEvent[]
  pushEvent: (event: SSEEvent) => Promise<void>
  logger: any
  state: any
  enqueue: (event: any) => Promise<void>
  files?: Array<{ url: string; filename: string; type: string; size?: number; mimeType?: string }>
  streamComponentIds: Map<number, string>
  lastResultUrl: string | null
  changedSections: Set<string>
  openaiMessages: any[]
}

/** Execute a single tool call and append its result to openaiMessages */
export async function executeOneToolCall(
  toolCall: any,
  ctx: ToolExecutionContext,
  toolCallIndex?: number,
): Promise<{ studyCreated?: { studyId: string; studyType: string; projectId: string; builderUrl: string } }> {
  const toolName = toolCall.function.name
  let toolArgs: Record<string, unknown> = {}
  try {
    toolArgs = JSON.parse(toolCall.function.arguments || '{}')
  } catch {
    toolArgs = {}
  }

  // Resolve attachment:// references to actual file URLs
  if (ctx.files && ctx.files.length > 0) {
    toolArgs = resolveAttachmentRefs(toolArgs, ctx.files.map((file) => file.url))
  }

  const toolStartEvt: SSEEvent = { type: 'tool_start', toolName, description: `${humanizeToolName(toolName)}...` }
  ctx.events.push(toolStartEvt)
  ctx.pushEvent(toolStartEvt)

  ctx.logger.info('Tool call', { toolName, toolArgs: Object.keys(toolArgs), fullArgs: JSON.stringify(toolArgs).slice(0, 800) })

  // ─── Integration proxy: lazy-load tools ────────────────────────────
  if (toolName === 'get_integration_tools') {
    const result = await handleGetIntegrationTools(toolArgs, ctx)
    const resultContent = JSON.stringify(result)
    const toolDoneEvt: SSEEvent = { type: 'tool_done', toolName, result }
    ctx.events.push(toolDoneEvt)
    ctx.pushEvent(toolDoneEvt)
    ctx.openaiMessages.push({ role: 'tool', content: resultContent, tool_call_id: toolCall.id })
    await addMessage(ctx.supabase, ctx.conversationId, 'tool', resultContent, { toolCallId: toolCall.id })
    return {}
  }

  // ─── Batch integration execution ───────────────────────────────────
  if (toolName === 'execute_integration_batch') {
    await handleBatchExecution(toolCall, toolArgs, ctx)
    return {}
  }

  // ─── Server-side export writer ─────────────────────────────────────
  if (toolName === 'write_export_to_integration') {
    await handleWriteExport(toolCall, toolArgs, ctx)
    return {}
  }

  // ─── Normal tool execution ─────────────────────────────────────────
  let toolResult: Awaited<ReturnType<typeof executeTool>>
  try {
    toolResult = await executeTool(toolName, toolArgs, {
      supabase: ctx.supabase,
      context: { studyId: ctx.currentStudyId, studyType: ctx.currentStudyType, userId: ctx.userId, organizationId: ctx.organizationId },
      state: ctx.state,
      conversationId: ctx.conversationId,
    })
  } catch (toolErr) {
    const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr)
    ctx.logger.error('Tool execution crashed', { toolName, error: errMsg, errorJson: JSON.stringify(toolErr), stack: toolErr instanceof Error ? toolErr.stack : undefined })
    toolResult = { result: { error: `Tool failed: ${errMsg}` } }
    const errDoneEvt: SSEEvent = { type: 'tool_done', toolName, result: toolResult.result }
    ctx.events.push(errDoneEvt)
    ctx.pushEvent(errDoneEvt)
    ctx.openaiMessages.push({ role: 'tool', content: JSON.stringify(toolResult.result), tool_call_id: toolCall.id })
    await addMessage(ctx.supabase, ctx.conversationId, 'tool', JSON.stringify(toolResult.result), { toolCallId: toolCall.id })
    return {}
  }

  // Track sections changed by write tools
  if (toolResult.dataChanged) {
    const newSections: string[] = []
    for (const section of toolResult.dataChanged) {
      if (!ctx.changedSections.has(section)) newSections.push(section)
      ctx.changedSections.add(section)
    }
    if (newSections.length > 0 || toolResult.dataPayload) {
      const dataChangedEvt: SSEEvent = {
        type: 'study_data_changed',
        sections: newSections.length > 0 ? newSections : toolResult.dataChanged,
        ...(toolResult.dataPayload ? { data: toolResult.dataPayload } : {}),
      }
      ctx.events.push(dataChangedEvt)
      ctx.pushEvent(dataChangedEvt)
    }
  }

  // Draft mode transition: detect set_draft_basics in create mode
  if (ctx.isCreateMode && toolName === 'set_draft_basics') {
    handleDraftBasicsTransition(toolResult, ctx)
  }

  // Phase 2 transition: detect study creation in create mode
  let studyCreated: { studyId: string; studyType: string; projectId: string; builderUrl: string } | undefined
  if (ctx.isCreateMode && (toolName === 'create_study' || toolName === 'create_complete_study')) {
    studyCreated = await handleStudyCreationTransition(toolResult, ctx)
  }

  const resultStr = typeof toolResult.result === 'object'
    ? JSON.stringify(toolResult.result)
    : String(toolResult.result)
  const isError = resultStr.includes('"error"')
  ctx.logger.info('Tool result', {
    toolName,
    metadataType: toolResult.metadata?.type,
    hasResult: toolResult.result !== null && toolResult.result !== undefined,
    isError,
    dataChanged: toolResult.dataChanged,
    resultPreview: resultStr.slice(0, isError ? 500 : 200),
  })

  if (toolResult.metadata?.type === 'connect_prompt') {
    const connectEvt: SSEEvent = { type: 'connect_required', toolkit: toolResult.metadata.toolkit! }
    ctx.events.push(connectEvt)
    ctx.pushEvent(connectEvt)
    const connectContent = JSON.stringify(toolResult.result)
    ctx.openaiMessages.push({ role: 'tool', content: connectContent, tool_call_id: toolCall.id })
    await addMessage(ctx.supabase, ctx.conversationId, 'tool', connectContent, { toolCallId: toolCall.id })
    return {}
  }

  // Emit background event if the tool handler requests it
  if (toolResult.emitEvent) {
    ctx.enqueue(toolResult.emitEvent).catch(() => {})
  }

  // Track URL for the final message
  const toolUrl = extractResultUrl(toolResult.result) ?? constructUrlFromParams(toolName, toolArgs)
  if (toolUrl) ctx.lastResultUrl = toolUrl

  const rawResultContent = JSON.stringify(toolResult.result)
  const toolDoneEvt: SSEEvent = { type: 'tool_done', toolName, result: toolResult.result }
  ctx.events.push(toolDoneEvt)
  ctx.pushEvent(toolDoneEvt)

  // Generative UI: emit component_render for tools with a component mapping (create mode only)
  const componentMapping = ctx.isCreateMode ? TOOL_COMPONENT_MAP[toolName] : undefined
  if (componentMapping && toolResult.result && typeof toolResult.result === 'object') {
    const componentId = (toolCallIndex !== undefined ? ctx.streamComponentIds.get(toolCallIndex) : undefined) ?? crypto.randomUUID()
    const componentProps = componentMapping.deriveProps(toolResult.result)
    const componentRenderEvt: SSEEvent = {
      type: 'component_render',
      componentId,
      componentName: componentMapping.componentName,
      props: componentProps,
    }
    ctx.events.push(componentRenderEvt)
    ctx.pushEvent(componentRenderEvt)
  }

  // Layer 2: Hard character limit on current-turn tool results (safety net)
  const resultContent = truncateToolResult(rawResultContent)
  ctx.openaiMessages.push({ role: 'tool', content: resultContent, tool_call_id: toolCall.id })
  await addMessage(ctx.supabase, ctx.conversationId, 'tool', resultContent, { toolCallId: toolCall.id })

  return { studyCreated }
}

// ─── Integration tool handlers ───────────────────────────────────────

async function handleGetIntegrationTools(toolArgs: Record<string, unknown>, ctx: ToolExecutionContext): Promise<Record<string, unknown>> {
  const toolkit = toolArgs.toolkit as string

  if (!ctx.connectedIntegrations.includes(toolkit)) {
    return { error: `Integration "${toolkit}" is not connected. Connected: ${ctx.connectedIntegrations.join(', ') || 'none'}` }
  }

  try {
    const { data: tools, error: toolsError } = await listToolsForToolkit(toolkit)
    if (toolsError || !tools || tools.length === 0) {
      return { error: `Failed to load tools for ${toolkit}: ${toolsError?.message || 'no tools found'}` }
    }

    // Inject into allTools so the LLM can call them in subsequent iterations
    const newTools = tools.map((tool): ChatCompletionTool => ({
      type: 'function',
      function: {
        name: tool.slug,
        description: tool.description,
        parameters: tool.inputParameters as any,
      },
    }))
    ctx.allTools.push(...newTools)
    ctx.logger.info('Lazy-loaded integration tools', { toolkit, count: tools.length, totalTools: ctx.allTools.length })
    return {
      toolkit,
      available_actions: tools.map(t => ({ name: t.slug, description: t.description?.slice(0, 120) })),
      message: `Loaded ${tools.length} tools for ${toolkit}. Call them directly.`,
    }
  } catch (err) {
    return { error: `Failed to load tools: ${err instanceof Error ? err.message : 'unknown'}` }
  }
}

async function handleBatchExecution(toolCall: any, toolArgs: Record<string, unknown>, ctx: ToolExecutionContext): Promise<void> {
  const toolName = toolCall.function.name
  const actions = (toolArgs.actions as Array<{ tool: string; arguments: Record<string, unknown> }>) ?? []

  if (!Array.isArray(actions) || actions.length === 0) {
    const errResult = { error: 'No actions provided. Pass an array of {tool, arguments} objects.' }
    const errContent = JSON.stringify(errResult)
    const errDoneEvt: SSEEvent = { type: 'tool_done', toolName, result: errResult }
    ctx.events.push(errDoneEvt)
    ctx.pushEvent(errDoneEvt)
    ctx.openaiMessages.push({ role: 'tool', content: errContent, tool_call_id: toolCall.id })
    await addMessage(ctx.supabase, ctx.conversationId, 'tool', errContent, { toolCallId: toolCall.id })
    return
  }

  ctx.logger.info('Batch execution starting', { actionCount: actions.length, tools: actions.map(a => a.tool) })

  const batchResults: Array<{ tool: string; ok: boolean; error?: string; url?: string }> = []
  let batchUrl: string | null = null
  const forwarded: Record<string, unknown> = {}

  for (const action of actions) {
    const actionToolName = action.tool
    const actionArgs = { ...(action.arguments ?? {}) }

    // Validate tool name exists
    const toolExists = ctx.allTools.some((t: any) => t.function.name === actionToolName)
    if (!toolExists) {
      const integrationToolNames = ctx.allTools
        .map((t: any) => t.function.name as string)
        .filter((n) => n === n.toUpperCase() && n.includes('_'))
      const suggestion = integrationToolNames.length > 0
        ? `Available integration tools: ${integrationToolNames.join(', ')}`
        : 'No integration tools loaded. Call get_integration_tools first.'
      batchResults.push({
        tool: actionToolName,
        ok: false,
        error: `Tool "${actionToolName}" not found. Did you call get_integration_tools first? ${suggestion}`,
      })
      const errEvt: SSEEvent = { type: 'tool_done', toolName: actionToolName, result: { error: `Tool not found: ${actionToolName}` } }
      ctx.events.push(errEvt)
      ctx.pushEvent(errEvt)
      continue
    }

    // Auto-inject forwarded spreadsheet_id
    if (forwarded.spreadsheet_id && !actionArgs.spreadsheet_id) {
      actionArgs.spreadsheet_id = forwarded.spreadsheet_id
    }

    const subStartEvt: SSEEvent = { type: 'tool_start', toolName: actionToolName, description: `${humanizeToolName(actionToolName)}...` }
    ctx.events.push(subStartEvt)
    ctx.pushEvent(subStartEvt)

    const actionResult = await executeTool(actionToolName, actionArgs, {
      supabase: ctx.supabase,
      context: { studyId: ctx.currentStudyId, studyType: ctx.currentStudyType, userId: ctx.userId, organizationId: ctx.organizationId },
      state: ctx.state,
      conversationId: ctx.conversationId,
    })

    // Extract resource IDs for forwarding
    if (Object.keys(forwarded).length > 0) {
      ctx.logger.info('Batch forwarded values applied', { tool: actionToolName, forwarded })
    }
    if (actionResult.result && typeof actionResult.result === 'object') {
      const r = actionResult.result as Record<string, unknown>
      if (r.spreadsheetId) forwarded.spreadsheet_id = r.spreadsheetId
      if (r.spreadsheet_id) forwarded.spreadsheet_id = r.spreadsheet_id
      if (r.NewSpreadsheet && typeof r.NewSpreadsheet === 'object') {
        const ns = r.NewSpreadsheet as Record<string, unknown>
        if (ns.spreadsheetId) forwarded.spreadsheet_id = ns.spreadsheetId
      }
    }

    const resultStr = typeof actionResult.result === 'object'
      ? JSON.stringify(actionResult.result)
      : String(actionResult.result)
    const isError = resultStr.includes('"error"')

    const actionUrl = extractResultUrl(actionResult.result) ?? constructUrlFromParams(actionToolName, actionArgs)
    if (actionUrl) batchUrl = actionUrl

    batchResults.push({
      tool: actionToolName,
      ok: !isError,
      ...(isError ? { error: resultStr.slice(0, 200) } : {}),
      ...(actionUrl ? { url: actionUrl } : {}),
    })

    const subDoneEvt: SSEEvent = { type: 'tool_done', toolName: actionToolName, result: isError ? { error: resultStr.slice(0, 200) } : { ok: true } }
    ctx.events.push(subDoneEvt)
    ctx.pushEvent(subDoneEvt)

    if (isError) {
      ctx.logger.warn('Batch action failed, continuing', { tool: actionToolName, error: resultStr.slice(0, 200) })
    }
  }

  if (batchUrl) ctx.lastResultUrl = batchUrl

  const succeeded = batchResults.filter(r => r.ok).length
  const failed = batchResults.filter(r => !r.ok).length
  const batchResult = {
    completed: actions.length,
    succeeded,
    failed,
    ...(batchUrl ? { url: batchUrl } : {}),
    ...(failed > 0 ? { failures: batchResults.filter(r => !r.ok) } : {}),
  }

  ctx.logger.info('Batch execution complete', { total: actions.length, succeeded, failed })

  const batchContent = JSON.stringify(batchResult)
  const batchDoneEvt: SSEEvent = { type: 'tool_done', toolName: toolCall.function.name, result: batchResult }
  ctx.events.push(batchDoneEvt)
  ctx.pushEvent(batchDoneEvt)
  ctx.openaiMessages.push({ role: 'tool', content: batchContent, tool_call_id: toolCall.id })
  await addMessage(ctx.supabase, ctx.conversationId, 'tool', batchContent, { toolCallId: toolCall.id })
}

async function handleWriteExport(toolCall: any, toolArgs: Record<string, unknown>, ctx: ToolExecutionContext): Promise<void> {
  const toolName = toolCall.function.name
  const dataRef = toolArgs.data_ref as string
  const toolkit = toolArgs.toolkit as string
  const title = toolArgs.title as string

  let result: Record<string, unknown>

  if (!dataRef || !toolkit || !title) {
    result = { error: 'Missing required parameters: data_ref, toolkit, and title are all required.' }
  } else {
    const cachedData = getExportData(dataRef)
    if (!cachedData) {
      result = { error: 'Export data expired or not found. Call export_study_data again to get a fresh dataRef.' }
    } else {
      const writeResult = await writeExportToIntegration(
        cachedData.sheets,
        toolkit,
        title,
        ctx.userId,
        ctx.supabase,
        (subToolName, description, phase) => {
          if (phase === 'start') {
            const subEvt: SSEEvent = { type: 'tool_start', toolName: subToolName, description }
            ctx.events.push(subEvt)
            ctx.pushEvent(subEvt)
          } else {
            const subEvt: SSEEvent = { type: 'tool_done', toolName: subToolName, result: { ok: true } }
            ctx.events.push(subEvt)
            ctx.pushEvent(subEvt)
          }
        },
      )

      if (writeResult.error) {
        result = { error: writeResult.error, details: writeResult.details }
      } else {
        if (writeResult.url) ctx.lastResultUrl = writeResult.url
        const succeeded = writeResult.details.filter((d) => d.ok).length
        const failed = writeResult.details.filter((d) => !d.ok).length
        result = {
          success: true,
          url: writeResult.url,
          sheetsWritten: succeeded,
          sheetsFailed: failed,
          details: writeResult.details,
        }
      }
    }
  }

  const resultContent = JSON.stringify(result)
  const doneEvt: SSEEvent = { type: 'tool_done', toolName, result }
  ctx.events.push(doneEvt)
  ctx.pushEvent(doneEvt)
  ctx.openaiMessages.push({ role: 'tool', content: resultContent, tool_call_id: toolCall.id })
  await addMessage(ctx.supabase, ctx.conversationId, 'tool', resultContent, { toolCallId: toolCall.id })
}

// ─── Create-mode state transitions ──────────────────────────────────

function handleDraftBasicsTransition(toolResult: any, ctx: ToolExecutionContext): void {
  const resultObj = toolResult.result as Record<string, unknown> | null
  if (resultObj && resultObj._draftSet) {
    const draftToolDefs = getDraftTools(resultObj.study_type as string) as ChatCompletionTool[]
    for (let i = ctx.allTools.length - 1; i >= 0; i--) {
      if (CREATE_TOOL_NAMES.has((ctx.allTools[i] as any).function.name)) {
        ctx.allTools.splice(i, 1)
      }
    }
    ctx.allTools.push(...draftToolDefs)

    ctx.logger.info('Draft mode transition: draft basics set, draft tools expanded', {
      studyType: resultObj.study_type,
      totalTools: ctx.allTools.length,
    })
  }
}

async function handleStudyCreationTransition(
  toolResult: any,
  ctx: ToolExecutionContext,
): Promise<{ studyId: string; studyType: string; projectId: string; builderUrl: string } | undefined> {
  const resultObj = toolResult.result as Record<string, unknown> | null
  if (!resultObj || !resultObj._createdStudy) return undefined

  const newStudyId = resultObj.study_id as string
  const newStudyType = resultObj.study_type as string
  const newProjectId = resultObj.project_id as string
  const builderUrl = resultObj.builder_url as string

  ctx.currentStudyId = newStudyId
  ctx.currentStudyType = newStudyType

  // Strip create-mode tools and add builder tools
  const builderToolDefs = [...getBuilderTools(), ...getBuilderWriteToolsForStudyType(newStudyType)] as ChatCompletionTool[]
  for (let i = ctx.allTools.length - 1; i >= 0; i--) {
    const fnName = (ctx.allTools[i] as any).function.name
    if (CREATE_TOOL_NAMES.has(fnName) || DRAFT_TOOL_NAMES.has(fnName)) {
      ctx.allTools.splice(i, 1)
    }
  }
  ctx.allTools.push(...builderToolDefs)

  // Strip tools whose data was pre-loaded into _preloadedContext
  const preloadedToolNames = new Set(['get_study_config', 'get_best_practices'])
  for (let i = ctx.allTools.length - 1; i >= 0; i--) {
    if (preloadedToolNames.has((ctx.allTools[i] as any).function.name)) {
      ctx.allTools.splice(i, 1)
    }
  }

  // Link conversation to the new study
  updateConversationStudyId(ctx.supabase, ctx.conversationId, newStudyId).catch((err) => {
    ctx.logger.warn('Failed to link conversation to study', { error: err instanceof Error ? err.message : 'unknown' })
  })

  // Pre-fetch best practices + study config
  const [bestPractices, studyConfig] = await Promise.all([
    getMethodologyGuidance(newStudyType),
    ctx.supabase
      .from('studies')
      .select('id, title, study_type, status, settings, created_at, updated_at, share_code')
      .eq('id', newStudyId)
      .single()
      .then(({ data }: { data: any }) => data),
  ])

  if (bestPractices || studyConfig) {
    const preloaded: Record<string, unknown> = { _preloaded: true }
    if (bestPractices) preloaded.best_practices = bestPractices
    if (studyConfig) preloaded.study_config = studyConfig
    ;(toolResult.result as Record<string, unknown>)._preloadedContext = preloaded
  }

  // Push study_created SSE event
  const studyCreatedEvt: SSEEvent = {
    type: 'study_created',
    studyId: newStudyId,
    studyType: newStudyType,
    projectId: newProjectId,
    builderUrl,
    studyTitle: studyConfig?.title ?? undefined,
  }
  ctx.events.push(studyCreatedEvt)
  ctx.pushEvent(studyCreatedEvt)

  ctx.logger.info('Phase 2 transition: study created, builder tools expanded, context pre-loaded', {
    studyId: newStudyId,
    studyType: newStudyType,
    totalTools: ctx.allTools.length,
    preloadedBestPractices: !!bestPractices,
    preloadedStudyConfig: !!studyConfig,
  })

  return { studyId: newStudyId, studyType: newStudyType, projectId: newProjectId, builderUrl }
}

// ─── Constants ───────────────────────────────────────────────────────

export const SEQUENTIAL_TOOLS = new Set(['create_study', 'set_draft_basics', 'create_complete_study'])
