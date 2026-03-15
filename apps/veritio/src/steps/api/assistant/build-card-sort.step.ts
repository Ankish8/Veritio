import type { StepConfig } from 'motia'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import type { ChatCompletionTool } from '../../../services/assistant/openai'
import type { ToolExecutionResult, SSEEvent } from '../../../services/assistant/types'
import type { parseSuggestions as _parseSuggestions } from '../../../services/assistant/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { handleBuildContent } from '../../../services/assistant/build-content-handler'
import { getCardSortBuildPrompt } from '../../../services/assistant/build-content-system-prompts'
import { bulkUpdateCards, createCard, listCards, invalidateCardsCache } from '../../../services/card-service'
import { bulkUpdateCategories, createCategory, listCategories, invalidateCategoriesCache } from '../../../services/category-service'
import { updateStudy } from '../../../services/study-service'
import {
  getConversation,
  getMessages,
  addMessage,
  touchConversation,
} from '../../../services/assistant/conversation-service'
import { checkRateLimit, incrementMessageCount } from '../../../services/assistant/rate-limit'

const bodySchema = z.object({
  studyId: z.string().uuid(),
  message: z.string().min(1).max(10000),
  streamId: z.string().uuid().optional(),
  conversationId: z.string().uuid().optional(),
})

export const config = {
  name: 'BuildCardSortContent',
  description: 'Build card sort content via guided AI conversation',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/build-card-sort',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

const APPLY_CARD_SORT_CONTENT_TOOL: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'apply_card_sort_content',
    description: 'Apply card sort content changes — cards, categories, and/or settings. Can update any combination. Call this ONCE after gathering all information from the user.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['replace_all', 'add', 'update_settings'],
          description: '"replace_all" replaces all cards/categories, "add" appends new ones, "update_settings" only changes settings without modifying cards.',
        },
        cards: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Card label (2-5 words, clear noun phrase)' },
              description: { type: 'string', description: 'Optional card description' },
            },
            required: ['label'],
          },
          description: 'Array of cards to create. For replace_all/add actions, include cards and/or categories (at least one). Omit for update_settings.',
        },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Category label' },
              description: { type: 'string', description: 'Optional category description' },
            },
            required: ['label'],
          },
          description: 'Categories (required for closed/hybrid sort, omit for open sort).',
        },
        settings: {
          type: 'object',
          properties: {
            mode: { type: 'string', enum: ['open', 'closed', 'hybrid'], description: 'Sort mode' },
            randomizeCards: { type: 'boolean', description: 'Shuffle cards per participant (default: true)' },
            randomizeCategories: { type: 'boolean', description: 'Shuffle categories per participant (default: false)' },
            showProgress: { type: 'boolean', description: 'Show progress indicator (default: true)' },
            allowSkip: { type: 'boolean', description: 'Allow submitting without sorting all cards' },
            includeUnclearCategory: { type: 'boolean', description: 'Include "Unclear" category for closed/hybrid sort' },
            showCardDescriptions: { type: 'boolean', description: 'Show card descriptions in builder and to participants' },
            showCategoryDescriptions: { type: 'boolean', description: 'Show category descriptions in builder and to participants' },
          },
          description: 'Card sort settings to apply. Include only the fields you want to change.',
        },
      },
      required: ['action'],
    },
  },
}

async function executeApplyCardSortContent(
  toolCall: { id: string; function: { name: string; arguments: string } },
  supabase: SupabaseClient,
  studyId: string,
  userId: string,
  preloadedSettings: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(toolCall.function.arguments || '{}')
  } catch {
    return { result: { error: 'Invalid tool arguments (malformed JSON)' } }
  }

  const action = args.action as string // 'replace_all' | 'add' | 'update_settings'
  const cards = args.cards as Array<{ label: string; description?: string }> | undefined
  const categories = args.categories as Array<{ label: string; description?: string }> | undefined
  const settings = args.settings as Record<string, unknown> | undefined

  // At least one of cards/categories required for replace_all/add actions
  const hasCards = cards && cards.length > 0
  const hasCategories = categories && categories.length > 0
  if (action !== 'update_settings' && !hasCards && !hasCategories) {
    return { result: { error: 'Missing required fields: at least one of cards or categories must be provided for replace_all/add action' } }
  }

  // Auto-enable description toggles when items have descriptions
  const cardsHaveDescriptions = hasCards && cards.some((c) => c.description && c.description.trim().length > 0)
  const categoriesHaveDescriptions = hasCategories && categories.some((c: any) => c.description && c.description.trim().length > 0)
  if (cardsHaveDescriptions || categoriesHaveDescriptions) {
    const autoSettings = { ...(settings || {}) }
    if (cardsHaveDescriptions && autoSettings.showCardDescriptions === undefined) {
      autoSettings.showCardDescriptions = true
    }
    if (categoriesHaveDescriptions && autoSettings.showCategoryDescriptions === undefined) {
      autoSettings.showCategoryDescriptions = true
    }
    ;(args as Record<string, unknown>).settings = autoSettings
  }
  // Re-read settings after potential auto-enable
  const finalSettings = args.settings as Record<string, unknown> | undefined

  const results: string[] = []
  const changedSections: string[] = []

  // 1. Write cards and categories in parallel for replace_all
  if (action === 'replace_all') {
    const writes: Promise<{ error: any }>[] = []

    if (cards && cards.length > 0) {
      const cardsWithIds = cards.map((card, i) => ({
        id: crypto.randomUUID(),
        label: card.label,
        description: card.description || null,
        position: i,
      }))
      writes.push(bulkUpdateCards(supabase, studyId, cardsWithIds))
    }

    if (categories && categories.length > 0) {
      const catsWithIds = categories.map((cat, i) => ({
        id: crypto.randomUUID(),
        label: cat.label,
        description: cat.description || null,
        position: i,
      }))
      writes.push(bulkUpdateCategories(supabase, studyId, catsWithIds))
    }

    const writeResults = await Promise.all(writes)

    let idx = 0
    if (cards && cards.length > 0) {
      if (writeResults[idx]?.error) {
        return { result: { error: `Failed to write cards: ${writeResults[idx].error.message}` } }
      }
      results.push(`Replaced all cards with ${cards.length} new cards`)
      changedSections.push('cards')
      idx++
    }
    if (categories && categories.length > 0) {
      if (writeResults[idx]?.error) {
        return { result: { error: `Failed to write categories: ${writeResults[idx].error.message}` } }
      }
      results.push(`Replaced all categories with ${categories.length} new categories`)
      changedSections.push('categories')
    }
  } else if (action !== 'update_settings') {
    // Add mode — sequential per item
    if (cards && cards.length > 0) {
      for (const card of cards) {
        const { error } = await createCard(supabase, studyId, {
          label: card.label,
          description: card.description || null,
        })
        if (error) {
          return { result: { error: `Failed to add card "${card.label}": ${error.message}` } }
        }
      }
      results.push(`Added ${cards.length} cards`)
      changedSections.push('cards')
    }

    if (categories && categories.length > 0) {
      for (const cat of categories) {
        const { error } = await createCategory(supabase, studyId, {
          label: cat.label,
          description: cat.description || null,
        })
        if (error) {
          return { result: { error: `Failed to add category "${cat.label}": ${error.message}` } }
        }
      }
      results.push(`Added ${categories.length} categories`)
      changedSections.push('categories')
    }
  }

  // 2. Update settings using pre-loaded settings (no DB re-read needed)
  let settingsPayload: Record<string, unknown> | undefined
  if (finalSettings && Object.keys(finalSettings).length > 0) {
    const mergedSettings = { ...preloadedSettings, ...finalSettings }
    settingsPayload = mergedSettings

    const { error } = await updateStudy(supabase, studyId, userId, { settings: mergedSettings })
    if (error) {
      return { result: { error: `Failed to update settings: ${error.message}` } }
    }
    results.push(`Updated settings: ${Object.keys(finalSettings).join(', ')}`)
    changedSections.push('settings', 'study')
  }

  if (changedSections.length === 0) {
    return { result: { error: 'No changes to apply' } }
  }

  // Invalidate caches after writes (only when data actually changed)
  if (changedSections.includes('cards')) invalidateCardsCache(studyId)
  if (changedSections.includes('categories')) invalidateCategoriesCache(studyId)

  return {
    result: { success: true, actions: results },
    dataChanged: changedSections,
    dataPayload: settingsPayload ? { settings: settingsPayload } : undefined,
    autoResponse: `Done! ${results.join('. ')}. You can review and edit in the builder.`,
  }
}

// ---------------------------------------------------------------------------
// Fast-path: detect "Apply descriptions" confirmations and skip the LLM
// ---------------------------------------------------------------------------

const APPLY_CONFIRMATION_PATTERNS = [
  /^apply\s*(descriptions|them|these|it|all|cards|categories|content)?$/i,
  /^yes[,.]?\s*(apply|go ahead|do it|please)?$/i,
  /^go\s*ahead$/i,
  /^do\s*it$/i,
  /^confirm$/i,
]

function isApplyConfirmation(message: string): boolean {
  const trimmed = message.trim()
  return APPLY_CONFIRMATION_PATTERNS.some((p) => p.test(trimmed))
}

/**
 * Parse card descriptions from the AI's numbered-list markdown.
 * Handles formats:
 *   1. Homepage — Main landing page...
 *   1. **Homepage** — Main landing page...
 *   1. Homepage - Main landing page...
 */
function parseDescriptionsFromMessage(content: string): Array<{ label: string; description: string }> | null {
  // Match numbered list items with label — description
  const linePattern = /^\d+\.\s+\*{0,2}([^*—–\-\n]+?)\*{0,2}\s*[—–\-]+\s*(.+)$/gm
  const results: Array<{ label: string; description: string }> = []

  let match: RegExpExecArray | null
  while ((match = linePattern.exec(content)) !== null) {
    const label = match[1].trim()
    const description = match[2].trim()
    if (label && description) {
      results.push({ label, description })
    }
  }

  return results.length >= 3 ? results : null // Need at least 3 to be a real list
}

/**
 * Match parsed descriptions to existing cards by label (fuzzy: case-insensitive).
 * Returns merged cards with descriptions applied, or null if too few matches.
 */
function matchDescriptionsToCards(
  parsed: Array<{ label: string; description: string }>,
  existingCards: Array<{ label: string; description?: string | null }>,
): Array<{ label: string; description: string }> | null {
  const descriptionMap = new Map(parsed.map((p) => [p.label.toLowerCase(), p.description]))

  const merged: Array<{ label: string; description: string }> = []
  for (const card of existingCards) {
    const desc = descriptionMap.get(card.label.toLowerCase())
    if (desc) {
      merged.push({ label: card.label, description: desc })
    } else {
      // Keep card but with no description update — means the AI didn't list it
      merged.push({ label: card.label, description: card.description || '' })
    }
  }

  // At least half of parsed descriptions should match existing cards
  const matchCount = existingCards.filter((c) => descriptionMap.has(c.label.toLowerCase())).length
  return matchCount >= Math.min(parsed.length, existingCards.length) * 0.5 ? merged : null
}

export const handler = async (req: ApiRequest, context: ApiHandlerContext) => {
  const { studyId, message, conversationId: existingConversationId, streamId } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string
  const { logger, streams } = context

  // Cache invalidation moved to executeApplyCardSortContent (only after actual writes)
  const [cardsResult, categoriesResult, studyResult] = await Promise.all([
    listCards(supabase, studyId),
    listCategories(supabase, studyId),
    supabase.from('studies').select('title, settings').eq('id', studyId).single(),
  ])

  const existingCards = cardsResult.data ?? []
  const existingCategories = categoriesResult.data ?? []
  const existingCardCount = existingCards.length
  const existingCategoryCount = existingCategories.length
  const studyTitle = studyResult.data?.title ?? undefined
  const studySettings = (studyResult.data?.settings as Record<string, unknown>) ?? {}
  const currentSortMode = (studySettings.mode as string) ?? 'open'

  if (cardsResult.error) {
    context.logger.warn('[build-card-sort] Failed to load cards', { studyId, error: cardsResult.error.message })
  }
  if (categoriesResult.error) {
    context.logger.warn('[build-card-sort] Failed to load categories', { studyId, error: categoriesResult.error.message })
  }

  // ---- Fast-path: "Apply descriptions" confirmation → skip LLM ----
  if (isApplyConfirmation(message) && existingConversationId && existingCards.length > 0) {
    logger.info('[build-card-sort] Fast-path: detected apply confirmation', { message, studyId })

    // Rate limit check
    const rateLimitResult = await checkRateLimit(supabase, userId)
    if (!rateLimitResult.allowed) {
      const rateLimitEvent: SSEEvent = { type: 'rate_limit', info: rateLimitResult.info }
      return { status: 429, body: { events: [rateLimitEvent], rateLimitInfo: rateLimitResult.info } }
    }

    // Verify conversation access
    const conv = await getConversation(supabase, existingConversationId, userId)
    if (!conv) {
      return { status: 404, body: { error: 'Conversation not found' } }
    }

    // Load recent messages to find the AI's description list
    const recentMessages = await getMessages(supabase, existingConversationId, { limit: 10 })
    const lastAssistantMsg = [...recentMessages].reverse().find((m) => m.role === 'assistant' && m.content)

    if (lastAssistantMsg?.content) {
      const parsed = parseDescriptionsFromMessage(lastAssistantMsg.content)
      if (parsed) {
        const matched = matchDescriptionsToCards(parsed, existingCards)
        if (matched) {
          logger.info('[build-card-sort] Fast-path: matched descriptions', {
            parsedCount: parsed.length,
            matchedCount: matched.length,
            existingCount: existingCards.length,
          })

          const pendingSends: Promise<void>[] = []
          const pushEvent = (event: SSEEvent) => {
            const groupId = streamId || existingConversationId
            if (!groupId) return
            const p = (streams.assistantChat?.send({ groupId }, { type: 'event', data: event } as any) ?? Promise.resolve()).catch(() => {})
            pendingSends.push(p)
          }

          const events: SSEEvent[] = []

          // Save user message + increment counter
          await Promise.all([
            addMessage(supabase, existingConversationId, 'user', message),
            incrementMessageCount(supabase, userId),
          ])

          // Push tool_start
          const toolStartEvt: SSEEvent = { type: 'tool_start', toolName: 'apply_card_sort_content', description: 'Applying card-sort content...' }
          events.push(toolStartEvt)
          pushEvent(toolStartEvt)

          // Execute the apply directly
          const fakeToolCall = {
            id: crypto.randomUUID(),
            function: {
              name: 'apply_card_sort_content',
              arguments: JSON.stringify({
                action: 'replace_all',
                cards: matched,
                settings: { showCardDescriptions: true },
              }),
            },
          }
          const toolResult = await executeApplyCardSortContent(fakeToolCall, supabase, studyId, userId, studySettings)

          // Push data changed
          if (toolResult.dataChanged) {
            const dataChangedEvt: SSEEvent = {
              type: 'study_data_changed',
              sections: toolResult.dataChanged,
              ...(toolResult.dataPayload ? { data: toolResult.dataPayload } : {}),
            }
            events.push(dataChangedEvt)
            pushEvent(dataChangedEvt)
          }

          // Push tool_done
          const toolDoneEvt: SSEEvent = { type: 'tool_done', toolName: 'apply_card_sort_content', result: toolResult.result }
          events.push(toolDoneEvt)
          pushEvent(toolDoneEvt)

          // Save assistant response + push text + message_complete
          const responseText = toolResult.autoResponse || `Done! Applied descriptions to ${matched.length} cards.`
          const textEvt: SSEEvent = { type: 'text_delta', content: responseText }
          events.push(textEvt)
          pushEvent(textEvt)

          const assistantMsg = await addMessage(supabase, existingConversationId, 'assistant', responseText, {
            metadata: { type: 'text' },
          })
          await touchConversation(supabase, existingConversationId)

          const doneEvt: SSEEvent = {
            type: 'message_complete',
            messageId: assistantMsg.id,
            conversationId: existingConversationId,
            metadata: { type: 'text' },
          }
          events.push(doneEvt)
          pushEvent(doneEvt)

          logger.info('[build-card-sort] Fast-path: complete', { studyId, cardCount: matched.length })

          await Promise.allSettled(pendingSends)
          return { status: 200, body: { conversationId: existingConversationId, events } }
        }
      }
    }

    // Fall through to normal LLM path if fast-path couldn't match
    logger.info('[build-card-sort] Fast-path: could not match descriptions, falling back to LLM')
  }

  const systemPrompt = getCardSortBuildPrompt({
    studyTitle,
    existingCardCount,
    existingCategoryCount,
    currentSortMode,
    existingCards: existingCards.map((c) => ({ label: c.label, description: c.description })),
    existingCategories: existingCategories.map((c) => ({ label: c.label, description: c.description })),
  })

  return handleBuildContent({
    req,
    context,
    systemPrompt,
    tools: [APPLY_CARD_SORT_CONTENT_TOOL],
    executeTool: (toolCall, supabase, studyId, userId) =>
      executeApplyCardSortContent(toolCall, supabase, studyId, userId, studySettings),
    conversationType: 'build-card-sort',
  })
}
