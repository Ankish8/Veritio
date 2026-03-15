import type { ChatCompletionMessageParam, ChatCompletionTool } from '../../../services/assistant/openai'
import { streamChat, createChatCompletion } from '../../../services/assistant/openai'
import { getToolsForStudyType, getBuilderTools, getBuilderOndemandTools, getBuilderWriteToolsForStudyType, getCreateTools, getDraftTools, getExportTools, getReportTools } from '../../../services/assistant/tool-definitions'
import { parseSuggestions } from '../../../services/assistant/types'
import type { SSEEvent } from '../../../services/assistant/types'
import { addMessage, updateConversationTitle, touchConversation } from '../../../services/assistant/conversation-service'
import { TOOL_COMPONENT_MAP, STREAMING_WRITE_TOOLS } from '../../../lib/generative-ui/registry'

export const MAX_TOOL_ITERATIONS_DEFAULT = 3
export const MAX_TOOL_ITERATIONS_CREATE = 6
export const STREAM_ITERATION_TIMEOUT_MS = 120_000
export const MAX_TOOL_RESULT_CHARS = 8_000
export const TOKEN_BUDGET_CHARS = 80_000
export const TOOL_RESULT_MAX_CHARS = 400

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

// ─── Tool builders ───────────────────────────────────────────────────

const EXPORT_KEYWORDS = /\b(export|download|csv|spreadsheet|google\s*sheet|xlsx)\b/i
const REPORT_KEYWORDS = /\b(report|insights?\s*report|generate\s*report|pdf\s*report)\b/i
const BUILDER_ONDEMAND_KEYWORDS = /\b(validate|check|launch|ready|readiness|task\s*list|tasks)\b/i

export function buildStudyTools(isCreateMode: boolean, mode: string, currentStudyId: string | undefined, currentStudyType: string | undefined, study: any, logger: any, hasDraftBasics = false, userMessage = ''): ChatCompletionTool[] {
  if (isCreateMode) {
    // Phase 3: study created — full builder capabilities
    if (currentStudyId && currentStudyType) {
      const tools = [...getBuilderTools(), ...getBuilderWriteToolsForStudyType(currentStudyType)] as ChatCompletionTool[]
      logger.info('Create mode Phase 3 (study created)', { studyId: currentStudyId, studyType: currentStudyType, toolCount: tools.length })
      return tools
    }

    // Phase 2: draft active — only draft tools (5 tools)
    if (hasDraftBasics) {
      const tools = getDraftTools() as ChatCompletionTool[]
      logger.info('Create mode Phase 2 (draft active)', { toolCount: tools.length })
      return tools
    }

    // Phase 1: gathering info — only create tools (4 tools)
    const tools = getCreateTools() as ChatCompletionTool[]
    logger.info('Create mode Phase 1 (gathering info)', { toolCount: tools.length })
    return tools
  }

  if (mode === 'builder') {
    const tools = [...getBuilderTools(), ...getBuilderWriteToolsForStudyType(study!.study_type)] as ChatCompletionTool[]
    // Add validate/launch/task-list tools only when user asks
    if (BUILDER_ONDEMAND_KEYWORDS.test(userMessage)) {
      tools.push(...(getBuilderOndemandTools() as ChatCompletionTool[]))
      logger.info('Builder on-demand tools added', { toolCount: tools.length })
    }
    return tools
  }

  // Results mode: analysis tools only — export/report tools added on demand
  const tools = getToolsForStudyType(study!.study_type) as ChatCompletionTool[]
  if (EXPORT_KEYWORDS.test(userMessage)) {
    tools.push(...(getExportTools() as ChatCompletionTool[]))
    logger.info('Export tools added', { toolCount: tools.length })
  }
  if (REPORT_KEYWORDS.test(userMessage)) {
    tools.push(...(getReportTools() as ChatCompletionTool[]))
    logger.info('Report tools added', { toolCount: tools.length })
  }
  return tools
}

/** Build complete tool list with integration tools */
export function buildAllTools(
  studyTools: ChatCompletionTool[],
  connectedIntegrations: string[],
  integrationProxyTool: ChatCompletionTool,
  integrationBatchTool: ChatCompletionTool,
  writeExportTool: ChatCompletionTool,
  isBuilderMode: boolean,
  preloadedContext: any,
  isCreateMode = false,
  hasStudy = false,
): ChatCompletionTool[] {
  const allTools: ChatCompletionTool[] = [...studyTools]

  // Skip integration tools in create mode until a study exists (Phase 3)
  if (connectedIntegrations.length > 0 && !(isCreateMode && !hasStudy)) {
    allTools.push(integrationProxyTool, integrationBatchTool, writeExportTool)
  }

  // Strip pre-loaded tools in builder mode
  if (isBuilderMode && preloadedContext) {
    const preloadedToolNames = new Set(['get_study_config', 'get_best_practices', 'get_study_flow_reference'])
    for (let i = allTools.length - 1; i >= 0; i--) {
      if (preloadedToolNames.has((allTools[i] as any).function.name)) {
        allTools.splice(i, 1)
      }
    }
  }

  return allTools
}

// ─── Token budget ────────────────────────────────────────────────────

/** Enforce token budget by trimming largest tool results */
export function enforceTokenBudget(messages: ChatCompletionMessageParam[], logger: any) {
  let totalChars = estimateTotalChars(messages)
  while (totalChars > TOKEN_BUDGET_CHARS) {
    const trimmed = trimLargestToolResult(messages)
    if (!trimmed) break
    const newTotal = estimateTotalChars(messages)
    logger.warn('[chat] Token budget exceeded, trimmed largest tool result', {
      beforeChars: totalChars,
      afterChars: newTotal,
      budgetChars: TOKEN_BUDGET_CHARS,
    })
    totalChars = newTotal
  }
}

/** Estimate total characters across all messages */
export function estimateTotalChars(messages: ChatCompletionMessageParam[]): number {
  let total = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += msg.content.length
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content as any[]) {
        if (part.text) total += part.text.length
        if (part.image_url) total += 200 // rough estimate for image token overhead
      }
    }
  }
  return total
}

/** Find and shrink the largest tool result */
export function trimLargestToolResult(messages: ChatCompletionMessageParam[]): boolean {
  let largestIdx = -1
  let largestLen = 0
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if ((msg as any).role === 'tool' && typeof msg.content === 'string') {
      if (msg.content.length > largestLen) {
        largestLen = msg.content.length
        largestIdx = i
      }
    }
  }
  if (largestIdx === -1 || largestLen <= 1000) return false

  const msg = messages[largestIdx]
  ;(msg as any).content = summarizeToolResult((msg as any).content, undefined)
  return true
}

// ─── Tool result truncation / summarization ──────────────────────────

export function truncateToolResult(content: string): string {
  if (content.length <= MAX_TOOL_RESULT_CHARS) return content

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    return content.slice(0, MAX_TOOL_RESULT_CHARS) + '... [truncated — original was ' + content.length + ' chars]'
  }

  // Build a compact summary preserving top-level structure
  const summary: Record<string, unknown> = { _truncated: true, _originalChars: content.length }
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === undefined) continue
    if (Array.isArray(value)) {
      // Keep first 3 items as samples, drop rest
      summary[key] = { _count: value.length, _sample: value.slice(0, 3) }
    } else if (typeof value === 'object') {
      const nested = JSON.stringify(value)
      if (nested.length > 2000) {
        summary[key] = { _objectKeys: Object.keys(value as Record<string, unknown>).slice(0, 20), _chars: nested.length }
      } else {
        summary[key] = value
      }
    } else {
      summary[key] = typeof value === 'string' && value.length > 500 ? value.slice(0, 500) + '...' : value
    }
  }

  const result = JSON.stringify(summary)
  if (result.length > MAX_TOOL_RESULT_CHARS) {
    return result.slice(0, MAX_TOOL_RESULT_CHARS) + '... [truncated]'
  }
  return result
}

/** Summarize tool result for conversation history */
export function summarizeToolResult(content: string, toolName?: string): string {
  if (content.length <= TOOL_RESULT_MAX_CHARS) return content

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    return content.slice(0, TOOL_RESULT_MAX_CHARS) + '... [truncated]'
  }

  if (parsed.error || parsed.status) return content

  const summary: Record<string, unknown> = { _summarized: true }
  if (toolName) summary._tool = toolName

  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      summary[key] = `[${value.length} items]`
    } else if (typeof value === 'object') {
      const nested = value as Record<string, unknown>
      const compacted: Record<string, unknown> = {}
      let kept = 0
      for (const [nk, nv] of Object.entries(nested)) {
        if (Array.isArray(nv)) {
          compacted[nk] = `[${nv.length} items]`
        } else if (typeof nv !== 'object' || nv === null) {
          compacted[nk] = nv
          kept++
        }
      }
      summary[key] = kept > 0 || Object.keys(compacted).length > 0 ? compacted : '[object]'
    } else {
      summary[key] = typeof value === 'string' && value.length > 200 ? value.slice(0, 200) + '...' : value
    }
  }

  const result = JSON.stringify(summary)
  if (result.length > TOOL_RESULT_MAX_CHARS) {
    return result.slice(0, TOOL_RESULT_MAX_CHARS) + '... [truncated]'
  }
  return result
}

// ─── Attachment reference resolution ─────────────────────────────────

const ATTACHMENT_REF_PATTERNS = [
  /^attachment:\/\/(?:image|file)[_\-]?(\d+)$/i,   // attachment://image_0, attachment://file-1
  /^attachment:\/\/(\d+)$/i,                       // attachment://0
  /^(?:image|file)[_\-]?(\d+)$/i,                  // image_0, file-1
  /^\[?attached\s*(?:image|file)\s*(\d+)\]?$/i,    // [Attached image 1], Attached file 1
]

function resolveAttachmentRef(value: string, fileUrls: string[]): string {
  for (const pattern of ATTACHMENT_REF_PATTERNS) {
    const match = value.match(pattern)
    if (match) {
      let index = parseInt(match[1], 10)
      // "Attached image 1" is 1-indexed; "image_0" is 0-indexed
      if (pattern.source.includes('attached') && index >= 1) {
        index = index - 1
      }
      if (index >= 0 && index < fileUrls.length) {
        return fileUrls[index]
      }
    }
  }
  return value
}

export function resolveAttachmentRefs<T>(obj: T, fileUrls: string[]): T {
  if (typeof obj === 'string') {
    return resolveAttachmentRef(obj, fileUrls) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveAttachmentRefs(item, fileUrls)) as unknown as T
  }
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveAttachmentRefs(value, fileUrls)
    }
    return result as T
  }
  return obj
}

// ─── Stream consumer ─────────────────────────────────────────────────

/** Consume OpenAI stream with timeout protection */
export async function consumeStreamWithTimeout(
  messages: ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  pushEvent: (event: SSEEvent) => void | Promise<void>,
  onComplete: (fullContent: string, toolCalls: any[], componentIds: Map<number, string>) => void,
  enableGenerativeUI = false,
) {
  let fullContent = ''
  let toolCallsDetected: any[] = []

  // Generative UI: track partial arg buffers and component IDs per tool call index
  const partialArgBuffers = new Map<number, string>()
  const activeComponentIds = new Map<number, string>()
  const toolNamesByIndex = new Map<number, string>()

  const consumeStream = async () => {
    let chunkIdx = 0
    for await (const chunk of streamChat(messages, tools, { provider: 'openai' })) {
      chunkIdx++
      if (chunk.type === 'text_delta') {
        fullContent += chunk.content
        // Await the first few pushes to ensure WebSocket delivery isn't batched
        const p = pushEvent({ type: 'text_delta', content: chunk.content })
        if (chunkIdx <= 5 && p instanceof Promise) await p
      } else if (chunk.type === 'text_replace') {
        fullContent = chunk.content
        pushEvent({ type: 'text_replace', content: chunk.content })
      } else if (chunk.type === 'tool_call_delta') {
        if (!enableGenerativeUI) continue

        partialArgBuffers.set(chunk.index, (partialArgBuffers.get(chunk.index) ?? '') + chunk.argumentsDelta)
        if (chunk.toolName) toolNamesByIndex.set(chunk.index, chunk.toolName)

        const resolvedToolName = chunk.toolName || toolNamesByIndex.get(chunk.index) || ''

        if (STREAMING_WRITE_TOOLS.has(resolvedToolName)) {
          const mapping = TOOL_COMPONENT_MAP[resolvedToolName]
          if (mapping) {
            if (!activeComponentIds.has(chunk.index)) {
              activeComponentIds.set(chunk.index, crypto.randomUUID())
            }
            const componentId = activeComponentIds.get(chunk.index)!
            pushEvent({
              type: 'component_props_delta',
              componentId,
              componentName: mapping.componentName,
              partialArgs: partialArgBuffers.get(chunk.index)!,
            })
          }
        }
      } else if (chunk.type === 'tool_calls') {
        toolCallsDetected = chunk.toolCalls
      }
    }
  }

  let timeoutId: ReturnType<typeof setTimeout>
  await Promise.race([
    consumeStream(),
    new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`OpenAI stream timed out after ${STREAM_ITERATION_TIMEOUT_MS / 1000}s`)), STREAM_ITERATION_TIMEOUT_MS)
    }),
  ]).finally(() => clearTimeout(timeoutId!))

  onComplete(fullContent, toolCallsDetected, activeComponentIds)
}

// ─── Final response handling ─────────────────────────────────────────

/** Handle final assistant response without tool calls */
export async function handleFinalResponse(
  supabase: any,
  conversationId: string,
  fullContent: string,
  lastResultUrl: string | null,
  events: SSEEvent[],
  pushEvent: (event: SSEEvent) => void
) {
  const parsed = parseSuggestions(fullContent)
  const savedContent = parsed ? parsed.cleanContent : fullContent

  const finalMetadata: Record<string, unknown> = { type: 'text' as const }
  if (lastResultUrl) finalMetadata.resultUrl = lastResultUrl
  if (parsed) finalMetadata.suggestions = parsed.suggestions

  const assistantMsg = await addMessage(supabase, conversationId, 'assistant', savedContent, {
    metadata: finalMetadata as any,
  })
  await touchConversation(supabase, conversationId)

  const doneEvt: SSEEvent = {
    type: 'message_complete',
    messageId: assistantMsg.id,
    conversationId,
    content: fullContent,
    metadata: finalMetadata as any,
  }
  events.push(doneEvt)
  pushEvent(doneEvt)
}

// ─── Integration tool definitions ────────────────────────────────────

export const INTEGRATION_PROXY_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_integration_tools',
    description: 'Load actions for a connected integration. Call BEFORE using it.',
    parameters: {
      type: 'object',
      properties: {
        toolkit: { type: 'string' },
      },
      required: ['toolkit'],
    },
  },
}

export const INTEGRATION_BATCH_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'execute_integration_batch',
    description: 'Execute multiple integration actions in one batch. IDs auto-forwarded between steps.',
    parameters: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              tool: { type: 'string' },
              arguments: { type: 'object' },
            },
            required: ['tool', 'arguments'],
          },
        },
      },
      required: ['actions'],
    },
  },
}

export const WRITE_EXPORT_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'write_export_to_integration',
    description: 'Write exported data to integration using dataRef from export_study_data.',
    parameters: {
      type: 'object',
      properties: {
        data_ref: { type: 'string' },
        toolkit: { type: 'string' },
        title: { type: 'string' },
      },
      required: ['data_ref', 'toolkit', 'title'],
    },
  },
}

// ─── Title generation ────────────────────────────────────────────────

/** Generate a short title for a new conversation */
export async function generateTitle(
  supabase: any,
  conversationId: string,
  firstMessage: string,
  logger: any,
): Promise<void> {
  try {
    const titleResponse = await createChatCompletion([
      {
        role: 'system',
        content: 'Generate a short title (max 6 words) for this conversation. Return only the title, no quotes or punctuation.',
      },
      { role: 'user', content: firstMessage },
    ], { maxTokens: 20 })

    const title = titleResponse.content?.trim()
    if (title) {
      await updateConversationTitle(supabase, conversationId, title)
    }
  } catch (err) {
    logger.warn('Failed to generate conversation title', {
      error: err instanceof Error ? err.message : 'unknown',
    })
  }
}
