/**
 * Composio Trigger Event Router
 *
 * Routes trigger events to configured actions:
 * - notify: emit notification event
 * - assistant_queue: insert into assistant_pending_events
 * - analysis: emit results-analysis-requested event
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { EmitFunction, MotiaLogger } from '../../lib/motia/types'

type SupabaseClientType = SupabaseClient<Database>

export type TriggerAction = 'notify' | 'assistant_queue' | 'analysis'

const DEFAULT_ACTIONS: TriggerAction[] = ['notify', 'assistant_queue']

interface TriggerData {
  triggerId: string
  userId: string
  toolkit: string
  triggerSlug: string
  triggerConfig: Record<string, unknown>
}

interface RouteResult {
  data: { actionsExecuted: string[] } | null
  error: Error | null
}

 
const fromPendingEvents = (supabase: SupabaseClientType) => (supabase as any).from('assistant_pending_events')

function buildEventSummary(toolkit: string, triggerSlug: string, payload: Record<string, unknown>): string {
  // Google Sheets
  if (triggerSlug === 'GOOGLESHEETS_NEW_ROWS_TRIGGER') {
    const sheetName = (payload.sheet_name as string) || 'a sheet'
    const rowNumber = payload.row_number as number | undefined
    const rowData = payload.row_data as string[] | undefined
    const preview = rowData?.length ? `: "${rowData[0]}"` : ''
    return rowNumber
      ? `New row #${rowNumber} added in "${sheetName}"${preview}`
      : `New row added in "${sheetName}"${preview}`
  }

  if (triggerSlug === 'GOOGLESHEETS_CELL_UPDATED_TRIGGER') {
    const sheetName = (payload.sheet_name as string) || 'a sheet'
    return `A cell was updated in "${sheetName}"`
  }

  // GitHub
  if (triggerSlug === 'GITHUB_NEW_ISSUE_TRIGGER' || triggerSlug === 'GITHUB_ISSUE_ADDED_EVENT') {
    const title = (payload.title as string) || (payload.issue_title as string)
    return title ? `New issue: "${title}"` : 'A new issue was created'
  }

  if (triggerSlug === 'GITHUB_PULL_REQUEST_EVENT') {
    const title = (payload.title as string) || (payload.pull_request_title as string)
    return title ? `New pull request: "${title}"` : 'A new pull request was opened'
  }

  // Slack
  if (triggerSlug === 'SLACK_NEW_MESSAGE_TRIGGER' || triggerSlug === 'SLACK_RECEIVE_MESSAGE') {
    const channel = (payload.channel_name as string) || (payload.channel as string)
    return channel ? `New message in #${channel}` : 'New Slack message received'
  }

  // Generic fallback
  const humanSlug = triggerSlug
    .replace(/^[A-Z]+_/, '')
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')

  return `${humanSlug} (${toolkit})`
}

async function executeNotifyAction(
  triggerData: TriggerData,
  eventPayload: Record<string, unknown>,
  emit: EmitFunction
): Promise<void> {
  const { userId, toolkit, triggerSlug } = triggerData
  const summary = buildEventSummary(toolkit, triggerSlug, eventPayload)
  const eventType = (eventPayload.type as string) || 'unknown'

  emit({
    topic: 'notification',
    data: {
      userId,
      type: 'composio-trigger',
      title: `${toolkit}: ${summary}`,
      message: summary,
      metadata: { toolkit, triggerSlug, eventType },
    },
  }).catch(() => {})
}

async function executeAssistantQueueAction(
  supabase: SupabaseClientType,
  triggerData: TriggerData,
  eventPayload: Record<string, unknown>,
  logger: MotiaLogger
): Promise<boolean> {
  const { triggerId, userId, toolkit, triggerSlug } = triggerData
  const eventSummary = buildEventSummary(toolkit, triggerSlug, eventPayload)
  const eventType = (eventPayload.type as string) || 'unknown'

  const { error } = await fromPendingEvents(supabase).insert({
    user_id: userId,
    trigger_id: triggerId,
    toolkit,
    trigger_slug: triggerSlug,
    event_type: eventType,
    event_summary: eventSummary,
    event_payload: eventPayload,
    status: 'pending',
  })

  if (error) {
    logger.error('Failed to queue assistant pending event', { error: error.message, triggerId })
    return false
  }

  return true
}

async function executeAnalysisAction(
  triggerData: TriggerData,
  emit: EmitFunction,
  logger: MotiaLogger
): Promise<boolean> {
  const { triggerId, toolkit, triggerSlug, triggerConfig } = triggerData
  const studyId = triggerConfig.studyId as string | undefined
  const studyType = triggerConfig.studyType as string | undefined

  if (!studyId || !studyType) {
    logger.warn('Analysis action skipped: missing studyId or studyType', {
      triggerId, toolkit, triggerSlug,
    })
    return false
  }

  emit({
    topic: 'results-analysis-requested',
    data: { studyId, studyType, priority: 'normal' },
  }).catch(() => {})

  return true
}

export async function routeTriggerEvent(
  supabase: SupabaseClientType,
  triggerData: TriggerData,
  eventPayload: Record<string, unknown>,
  emit: EmitFunction,
  logger: MotiaLogger
): Promise<RouteResult> {
  const { triggerId, triggerConfig } = triggerData
  const actions = (triggerConfig.actions as TriggerAction[] | undefined) ?? DEFAULT_ACTIONS
  const actionsExecuted: string[] = []

  for (const action of actions) {
    try {
      let success = false

      switch (action) {
        case 'notify':
          await executeNotifyAction(triggerData, eventPayload, emit)
          success = true
          break
        case 'assistant_queue':
          success = await executeAssistantQueueAction(supabase, triggerData, eventPayload, logger)
          break
        case 'analysis':
          success = await executeAnalysisAction(triggerData, emit, logger)
          break
        default:
          logger.warn('Unknown trigger action', { action, triggerId })
      }

      if (success) actionsExecuted.push(action)
    } catch (err) {
      logger.error('Trigger action failed', {
        action,
        triggerId,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  logger.info('Trigger event routed', { triggerId, actionsExecuted })
  return { data: { actionsExecuted }, error: null }
}
