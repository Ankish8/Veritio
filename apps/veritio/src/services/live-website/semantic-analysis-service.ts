/**
 * Semantic Analysis Service for Live Website Events
 *
 * Uses Mercury 2 (fast, low-token) to generate human-readable labels for
 * raw browser interaction events captured during live website testing.
 *
 * Two LLM calls:
 *   1. Per-participant: event labels + intent groups (batched by task)
 *   2. Per-study: page URL classifications (runs on 1st participant, then every 5th)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createChatCompletion } from '../assistant/openai'
import type { ChatCompletionMessageParam } from '../assistant/openai'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EventLabel {
  [eventId: string]: string
}

export interface IntentGroup {
  label: string
  event_ids: string[]
}

export interface PageLabel {
  label: string
  purpose: string
}

export interface PageLabels {
  [url: string]: PageLabel
}

export interface SemanticAnalysisResult {
  event_labels: EventLabel
  intent_groups: Record<string, IntentGroup[]> // keyed by "participantId_taskId"
}

interface RawEvent {
  id: string
  event_type: string
  page_url: string | null
  element_selector: string | null
  metadata: Record<string, unknown> | null
  task_id: string | null
  participant_id: string | null
  timestamp: string
}

interface Logger {
  info: (msg: string, data?: Record<string, unknown>) => void
  warn: (msg: string, data?: Record<string, unknown>) => void
  error: (msg: string, data?: Record<string, unknown>) => void
}

const MAX_EVENTS_PER_PARTICIPANT = 200

// Query params injected by our proxy/snippet that should be stripped for URL dedup
const TRACKING_PARAMS = new Set([
  '__sess', '__api', '__variant', '__optimal', '__study',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
])

function normalizePageUrl(raw: string): string | null {
  try {
    const u = new URL(raw)
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key)) u.searchParams.delete(key)
    }
    // Return origin + pathname + remaining params (if any)
    const qs = u.searchParams.toString()
    return `${u.origin}${u.pathname}${qs ? `?${qs}` : ''}`
  } catch {
    return raw || null
  }
}

// ---------------------------------------------------------------------------
// Event formatting — compact pipe-delimited for token efficiency
// ---------------------------------------------------------------------------

function formatEventLine(event: RawEvent): string {
  const text = (event.metadata?.elementText as string) || ''
  const aria = (event.metadata?.elementAriaLabel as string) || ''
  const selector = event.element_selector || ''
  const url = event.page_url || ''

  // Extra context varies by event type
  let extra = ''
  if (event.event_type === 'scroll') {
    const depth = event.metadata?.scrollPercentage ?? event.metadata?.scrollDepth ?? event.metadata?.scroll_depth
    if (depth !== undefined) extra = `depth:${Math.round(Number(depth))}%`
  } else if (event.event_type === 'form_change') {
    extra = 'form'
  } else if (event.event_type === 'error') {
    const msg = (event.metadata?.message as string) || (event.metadata?.error as string) || ''
    extra = msg ? `err:${msg.slice(0, 100)}` : 'error'
  } else if (event.event_type === 'path_success' || event.event_type === 'path_failure') {
    const mode = (event.metadata?.mode as string) || ''
    const steps = event.metadata?.stepsTotal ?? event.metadata?.steps_total
    extra = [mode, steps ? `steps:${steps}` : ''].filter(Boolean).join(',')
  } else if (event.event_type === 'task_complete' || event.event_type === 'task_start') {
    extra = 'task'
  }

  return `${event.id}|${event.event_type}|${url}|${selector}|${text}|${aria}|${extra}`
}

// ---------------------------------------------------------------------------
// Call 1: Per-participant event labels + intent groups
// ---------------------------------------------------------------------------

const EVENT_ANALYSIS_SYSTEM_PROMPT = `You are a UX research analyst interpreting browser interaction events from a usability study.

You receive a list of events in compact pipe-delimited format:
id|type|url|selector|text|aria|extra

Your job:
1. Generate a short human-readable label for each event (max 8 words). Focus on WHAT the user did, not technical details.
   - Good: "Added item to shopping cart", "Searched for 'running shoes'"
   - Bad: "Clicked #add-to-cart", "Clicked button"
2. Group consecutive events into higher-level intent groups (2-10 events per group).
   - Good: "Product search and filtering", "Checkout process"

Respond with JSON:
{
  "event_labels": { "event-id": "Human-readable label", ... },
  "intent_groups": [ { "label": "Group name", "event_ids": ["id1", "id2"] }, ... ]
}

Rules:
- For navigation/page_view events, describe the page destination briefly
- For scroll events, describe the scrolling behavior
- For click events, use the text/aria content to describe what was clicked
- For form_change events, describe what field was modified
- For error events, describe what went wrong based on the extra field (error message)
- For path_success events, describe what goal the user achieved (e.g., "Successfully reached bot page")
- For path_failure events, describe where the user went wrong
- For task_complete events, summarize the task outcome
- For task_start events, describe what task the user began
- Keep labels concise but meaningful
- Intent groups should represent coherent user goals`

export async function analyzeParticipantEvents(
  supabase: SupabaseClient,
  studyId: string,
  participantId: string,
  logger?: Logger,
): Promise<SemanticAnalysisResult> {
  // Fetch participant events
  const { data: events, error } = await supabase
    .from('live_website_events' as any)
    .select('id, event_type, page_url, element_selector, metadata, task_id, participant_id, timestamp')
    .eq('study_id', studyId)
    .eq('participant_id', participantId)
    .order('timestamp', { ascending: true })

  if (error) {
    logger?.error('Failed to fetch events for participant', { error: error.message, participantId })
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  const rawEvents = (events || []) as unknown as RawEvent[]

  if (rawEvents.length === 0) {
    logger?.info('No events for participant', { participantId })
    return { event_labels: {}, intent_groups: {} }
  }

  // Truncate if too many events
  const truncated = rawEvents.length > MAX_EVENTS_PER_PARTICIPANT
  const eventsToAnalyze = truncated ? rawEvents.slice(0, MAX_EVENTS_PER_PARTICIPANT) : rawEvents

  if (truncated) {
    logger?.warn('Truncating events for participant', {
      participantId,
      total: rawEvents.length,
      analyzed: MAX_EVENTS_PER_PARTICIPANT,
    })
  }

  // Group events by task_id for the prompt
  const taskGroups = new Map<string, RawEvent[]>()
  for (const event of eventsToAnalyze) {
    const key = event.task_id || '_no_task'
    const group = taskGroups.get(key) || []
    group.push(event)
    taskGroups.set(key, group)
  }

  // Build the user message with all tasks batched
  const sections: string[] = []
  for (const [taskId, taskEvents] of taskGroups) {
    sections.push(`--- Task: ${taskId} ---`)
    for (const event of taskEvents) {
      sections.push(formatEventLine(event))
    }
  }

  const userMessage = sections.join('\n')

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: EVENT_ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ]

  logger?.info('Calling LLM for event analysis', { participantId, eventCount: eventsToAnalyze.length, messageLength: userMessage.length })

  const response = await createChatCompletion(messages, {
    provider: 'openai',
    maxTokens: 2000,
    responseFormat: { type: 'json_object' },
    timeoutMs: 60000,
  })

  const content = response.content || '{}'
  logger?.info('LLM response received', { contentLength: content.length })

  let parsed: { event_labels?: EventLabel; intent_groups?: IntentGroup[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    logger?.error('Failed to parse LLM response for event analysis', { content: content.slice(0, 500) })
    return { event_labels: {}, intent_groups: {} }
  }

  logger?.info('Parsed labels', { eventLabelCount: Object.keys(parsed.event_labels || {}).length, intentGroupCount: (parsed.intent_groups || []).length })

  // Convert intent_groups array to keyed format
  const intentGroupsKeyed: Record<string, IntentGroup[]> = {}
  if (Array.isArray(parsed.intent_groups) && parsed.intent_groups.length > 0) {
    // Group by task_id prefix
    for (const [taskId, taskEvents] of taskGroups) {
      const taskEventIds = new Set(taskEvents.map(e => e.id))
      const taskIntentGroups = (parsed.intent_groups || []).filter(
        g => g.event_ids?.some(id => taskEventIds.has(id))
      )
      if (taskIntentGroups.length > 0) {
        intentGroupsKeyed[`${participantId}_${taskId}`] = taskIntentGroups
      }
    }
  }

  return {
    event_labels: parsed.event_labels || {},
    intent_groups: intentGroupsKeyed,
  }
}

// ---------------------------------------------------------------------------
// Call 2: Per-study page URL classification
// ---------------------------------------------------------------------------

const PAGE_CLASSIFICATION_SYSTEM_PROMPT = `You are a UX research analyst classifying web pages by their purpose.

You receive a list of URLs with visit statistics:
url | visits | clicks | rage_clicks

For each URL, provide:
- label: A short descriptive name for the page (e.g., "Product listing page", "Shopping cart")
- purpose: A brief description of the page's role (e.g., "Displays search results and product filters")

Respond with JSON:
{
  "/url/path": { "label": "Page Name", "purpose": "Brief description" }
}

Rules:
- Use the URL path structure to infer page purpose
- Consider query parameters as context (e.g., ?category=shoes suggests a filtered view)
- Keep labels under 5 words
- Keep purpose descriptions under 15 words`

export async function classifyStudyPages(
  supabase: SupabaseClient,
  studyId: string,
  logger?: Logger,
): Promise<PageLabels> {
  // Get unique page URLs with basic stats
  const { data: events, error } = await supabase
    .from('live_website_events' as any)
    .select('page_url, event_type')
    .eq('study_id', studyId)
    .not('page_url', 'is', null)

  if (error) {
    logger?.error('Failed to fetch events for page classification', { error: error.message })
    throw new Error(`Failed to fetch events: ${error.message}`)
  }

  const rawEvents = (events || []) as unknown as Array<{ page_url: string; event_type: string }>

  // Aggregate page stats — normalize URLs by stripping session/tracking params
  const pageStats = new Map<string, { visits: number; clicks: number; rageClicks: number }>()
  for (const event of rawEvents) {
    if (!event.page_url) continue
    const url = normalizePageUrl(event.page_url)
    if (!url) continue
    const stats = pageStats.get(url) || { visits: 0, clicks: 0, rageClicks: 0 }

    if (event.event_type === 'page_view' || event.event_type === 'navigation') stats.visits++
    else if (event.event_type === 'click') stats.clicks++
    else if (event.event_type === 'rage_click') stats.rageClicks++

    pageStats.set(url, stats)
  }

  if (pageStats.size === 0) {
    logger?.info('No page URLs to classify')
    return {}
  }

  // Format input
  const lines = ['url | visits | clicks | rage_clicks']
  for (const [url, stats] of pageStats) {
    lines.push(`${url} | ${stats.visits} | ${stats.clicks} | ${stats.rageClicks}`)
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: PAGE_CLASSIFICATION_SYSTEM_PROMPT },
    { role: 'user', content: lines.join('\n') },
  ]

  const response = await createChatCompletion(messages, {
    provider: 'openai',
    maxTokens: 1000,
    responseFormat: { type: 'json_object' },
    timeoutMs: 30000,
  })

  const content = response.content || '{}'
  try {
    return JSON.parse(content) as PageLabels
  } catch {
    logger?.error('Failed to parse LLM response for page classification', { content: content.slice(0, 200) })
    return {}
  }
}

// ---------------------------------------------------------------------------
// Merge helpers — for incremental upsert across participants
// ---------------------------------------------------------------------------

export function mergeResults(
  existing: { event_labels: EventLabel; intent_groups: Record<string, IntentGroup[]>; page_labels: PageLabels },
  newResult: SemanticAnalysisResult,
  newPageLabels?: PageLabels,
): { event_labels: EventLabel; intent_groups: Record<string, IntentGroup[]>; page_labels: PageLabels } {
  return {
    event_labels: { ...existing.event_labels, ...newResult.event_labels },
    intent_groups: { ...existing.intent_groups, ...newResult.intent_groups },
    page_labels: newPageLabels ? { ...existing.page_labels, ...newPageLabels } : existing.page_labels,
  }
}
