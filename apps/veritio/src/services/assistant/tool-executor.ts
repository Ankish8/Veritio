/**
 * Veritio AI Assistant -- Tool Executor
 *
 * Routes tool calls from the LLM to the correct handler:
 * - Builder read tools  -> builder-tools.ts
 * - Builder write tools -> builder-write-tools.ts
 * - Study data tools    -> study-tools.ts
 * - Composio tools      -> Composio SDK
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudyDataToolName, BuilderToolName, BuilderWriteToolName, CreateToolName, DraftToolName, ToolExecutionContext, ToolExecutionResult } from './types'
import { executeStudyTool } from './study-tools'
import { executeBuilderTool } from './builder-tools'
import { executeBuilderWriteTool } from './builder-write-tools'
import { executeCreateTool } from './create-tools'
import { executeAction as executeComposioAction, getComposioConnection } from '../composio/index'

/**
 * Tool registry with categorization and display names.
 * Single source of truth for all tool routing and humanization.
 */
type ToolCategory = 'create' | 'draft' | 'builder' | 'builder_write' | 'study'

interface ToolInfo {
  category: ToolCategory
  displayName: string
}

const TOOL_REGISTRY: Record<string, ToolInfo> = {
  // Create tools
  list_study_types: { category: 'create', displayName: 'Loading study types' },
  list_projects: { category: 'create', displayName: 'Fetching projects' },
  create_project: { category: 'create', displayName: 'Creating project' },
  create_study: { category: 'create', displayName: 'Creating study' },

  // Draft tools (create mode — no DB writes until finalization)
  set_draft_basics: { category: 'draft', displayName: 'Setting up draft' },
  update_draft_details: { category: 'draft', displayName: 'Updating study details' },
  preview_cards: { category: 'draft', displayName: 'Previewing cards' },
  preview_categories: { category: 'draft', displayName: 'Previewing categories' },
  preview_settings: { category: 'draft', displayName: 'Previewing settings' },
  preview_tree_nodes: { category: 'draft', displayName: 'Previewing tree nodes' },
  preview_tree_tasks: { category: 'draft', displayName: 'Previewing tree tasks' },
  preview_survey_questions: { category: 'draft', displayName: 'Previewing survey questions' },
  preview_first_click_tasks: { category: 'draft', displayName: 'Previewing first click tasks' },
  preview_first_impression_designs: { category: 'draft', displayName: 'Previewing designs' },
  preview_prototype_tasks: { category: 'draft', displayName: 'Previewing prototype tasks' },
  preview_live_website_tasks: { category: 'draft', displayName: 'Previewing website tasks' },
  get_draft_state: { category: 'draft', displayName: 'Loading draft state' },
  create_complete_study: { category: 'draft', displayName: 'Creating study from draft' },

  // Builder tools (read-only)
  get_study_config: { category: 'builder', displayName: 'Loading study config' },
  validate_study_setup: { category: 'builder', displayName: 'Validating setup' },
  get_task_list: { category: 'builder', displayName: 'Loading tasks' },
  check_launch_readiness: { category: 'builder', displayName: 'Checking readiness' },
  get_best_practices: { category: 'builder', displayName: 'Loading best practices' },
  get_study_flow_reference: { category: 'builder', displayName: 'Loading study flow reference' },

  // Builder write tools
  update_study: { category: 'builder_write', displayName: 'Updating study' },
  update_study_settings: { category: 'builder_write', displayName: 'Updating settings' },
  manage_flow_questions: { category: 'builder_write', displayName: 'Updating flow questions' },
  manage_cards: { category: 'builder_write', displayName: 'Updating cards' },
  manage_categories: { category: 'builder_write', displayName: 'Updating categories' },
  manage_tree_nodes: { category: 'builder_write', displayName: 'Updating tree nodes' },
  manage_tree_test_tasks: { category: 'builder_write', displayName: 'Updating tree test tasks' },
  manage_survey_questions: { category: 'builder_write', displayName: 'Updating survey questions' },
  manage_prototype_tasks: { category: 'builder_write', displayName: 'Updating prototype tasks' },
  manage_first_click_tasks: { category: 'builder_write', displayName: 'Updating first click tasks' },
  manage_first_impression_designs: { category: 'builder_write', displayName: 'Updating first impression designs' },
  manage_live_website_tasks: { category: 'builder_write', displayName: 'Updating live website tasks' },
  manage_custom_sections: { category: 'builder_write', displayName: 'Updating custom sections' },
  manage_ab_tests: { category: 'builder_write', displayName: 'Updating A/B tests' },
  manage_survey_rules: { category: 'builder_write', displayName: 'Updating survey rules' },
  configure_flow_section: { category: 'builder_write', displayName: 'Configuring flow section' },
  configure_flow_questions: { category: 'builder_write', displayName: 'Configuring flow questions' },
  configure_participant_id: { category: 'builder_write', displayName: 'Configuring participant ID' },

  // Study data tools
  get_study_overview: { category: 'study', displayName: 'Fetching study overview' },
  get_task_metrics: { category: 'study', displayName: 'Fetching task metrics' },
  get_responses: { category: 'study', displayName: 'Fetching responses' },
  get_participant_list: { category: 'study', displayName: 'Fetching participant list' },
  get_card_sort_results: { category: 'study', displayName: 'Fetching card sort results' },
  get_tree_test_results: { category: 'study', displayName: 'Fetching tree test results' },
  get_prototype_test_results: { category: 'study', displayName: 'Fetching prototype test results' },
  get_first_click_results: { category: 'study', displayName: 'Fetching first click results' },
  get_first_impression_results: { category: 'study', displayName: 'Fetching first impression results' },
  get_survey_results: { category: 'study', displayName: 'Fetching survey results' },
  get_live_website_results: { category: 'study', displayName: 'Fetching live website results' },
  export_study_data: { category: 'study', displayName: 'Preparing export data' },
  create_export_job: { category: 'study', displayName: 'Creating export job' },
  generate_insights_report: { category: 'study', displayName: 'Generating insights report' },

  // Integration tools
  execute_integration_batch: { category: 'create', displayName: 'Executing batch operations' },
  write_export_to_integration: { category: 'create', displayName: 'Writing export data' },
}

const TOOLKIT_DISPLAY_NAMES: Record<string, string> = {
  GOOGLESHEETS: 'Google Sheets', GOOGLEDOCS: 'Google Docs',
  GOOGLESLIDES: 'Google Slides', GOOGLEDRIVE: 'Google Drive',
  GMAIL: 'Gmail', SLACK: 'Slack', NOTION: 'Notion',
  AIRTABLE: 'Airtable', TRELLO: 'Trello', GITHUB: 'GitHub',
  JIRA: 'Jira', ASANA: 'Asana', LINEAR: 'Linear',
  DROPBOX: 'Dropbox', HUBSPOT: 'HubSpot', ZENDESK: 'Zendesk',
}

const ACTION_PATTERNS: Array<{ regex: RegExp; verb: (toolkit: string) => string }> = [
  { regex: /^(list|search|get|fetch|find|read|query)/, verb: (t) => `Searching ${t}` },
  { regex: /^(create|add|insert|new)/, verb: (t) => `Creating in ${t}` },
  { regex: /^(update|write|batch|set|put|modify|edit|append)/, verb: (t) => `Writing to ${t}` },
  { regex: /^(delete|remove|archive)/, verb: (t) => `Removing from ${t}` },
  { regex: /^(send|forward|reply|post|publish)/, verb: (t) => `Sending via ${t}` },
]

/**
 * Convert internal tool names into user-friendly progress labels.
 */
export function humanizeToolName(toolName: string): string {
  // Check registry first
  const info = TOOL_REGISTRY[toolName]
  if (info) return info.displayName

  // Composio tools: TOOLKIT_ACTION_WORDS
  const firstUnderscore = toolName.indexOf('_')
  if (firstUnderscore === -1) return `Running ${toolName}`

  const toolkit = toolName.slice(0, firstUnderscore)
  const action = toolName.slice(firstUnderscore + 1).toLowerCase()
  const displayToolkit = TOOLKIT_DISPLAY_NAMES[toolkit] || toolkit.charAt(0) + toolkit.slice(1).toLowerCase()

  for (const { regex, verb } of ACTION_PATTERNS) {
    if (regex.test(action)) return verb(displayToolkit)
  }

  return `Using ${displayToolkit}`
}

/** Motia state manager interface for draft tools */
interface StateManager {
  get(groupId: string, key: string): Promise<unknown>
  set(groupId: string, key: string, value: unknown): Promise<void>
  delete(groupId: string, key: string): Promise<void>
}

export interface ExecuteToolOptions {
  supabase: SupabaseClient
  context: ToolExecutionContext
  /** Motia state manager — required for draft tools */
  state?: StateManager
  /** Conversation ID — required for draft tools (used as Motia state group key) */
  conversationId?: string
}

/**
 * Execute a tool call from the LLM.
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>,
  options: ExecuteToolOptions,
): Promise<ToolExecutionResult> {
  const toolInfo = TOOL_REGISTRY[toolName]

  // Registered tools
  if (toolInfo) {
    switch (toolInfo.category) {
      case 'create':
        return executeCreateTool(toolName as CreateToolName, args, {
          supabase: options.supabase,
          userId: options.context.userId,
          organizationId: options.context.organizationId,
          conversationId: options.conversationId,
        })

      case 'draft':
        return executeCreateTool(toolName as DraftToolName, args, {
          supabase: options.supabase,
          userId: options.context.userId,
          organizationId: options.context.organizationId,
          conversationId: options.conversationId,
        })

      case 'builder':
        if (!options.context.studyId) {
          return { result: { error: 'No study selected. Create a study first using create_study.' } }
        }
        return executeBuilderTool(toolName as BuilderToolName, args, {
          supabase: options.supabase,
          studyId: options.context.studyId,
          userId: options.context.userId,
        })

      case 'builder_write':
        if (!options.context.studyId) {
          return { result: { error: 'No study selected. Create a study first using create_study.' } }
        }
        return executeBuilderWriteTool(toolName as BuilderWriteToolName, args, {
          supabase: options.supabase,
          studyId: options.context.studyId,
          userId: options.context.userId,
          state: options.state,
          conversationId: options.conversationId,
        })

      case 'study':
        if (!options.context.studyId || !options.context.studyType) {
          return { result: { error: 'No study selected. Create a study first using create_study.' } }
        }
        return executeStudyTool(toolName as StudyDataToolName, args, {
          supabase: options.supabase,
          studyId: options.context.studyId,
          studyType: options.context.studyType,
          userId: options.context.userId,
        })
    }
  }

  // Composio tool (fallback)
  return executeComposioTool(toolName, args, options)
}

async function executeComposioTool(
  toolName: string,
  args: Record<string, unknown>,
  options: ExecuteToolOptions,
): Promise<ToolExecutionResult> {
  const { supabase, context } = options

  // Extract toolkit slug from tool name (e.g. "GOOGLESHEETS_CREATE_SPREADSHEET" -> "googlesheets")
  const toolkitSlug = toolName.split('_')[0]?.toLowerCase() || ''

  // Look up connected account
  const { data: connection } = await getComposioConnection(
    supabase,
    context.userId,
    toolkitSlug,
  )

  if (!connection) {
    return {
      result: { error: `Integration "${toolkitSlug}" is not connected. The user needs to connect it via the + button in the integration bar.` },
      metadata: {
        type: 'connect_prompt',
        toolkit: toolkitSlug,
      },
    }
  }

  // Execute the Composio action
  const { data, error } = await executeComposioAction(
    context.userId,
    toolName,
    args,
    connection.composio_account_id ?? undefined,
  )

  if (error) {
    // Return a clear error that distinguishes "execution failed" from "not connected".
    // The integration IS connected — the action itself failed (bad params, API error, etc.).
    return {
      result: {
        error: `Action "${toolName}" failed: ${error.message}`,
        connected: true,
        hint: 'The integration is connected. This is an execution error, not a connection issue. Try different parameters or inform the user about the specific error.',
      },
    }
  }

  return { result: data }
}

/**
 * Extract a URL from a tool execution result.
 * Works generically across all integrations — no hardcoded domains.
 *
 * Strategy:
 * 1. Check common URL property names at the top level
 * 2. Recurse into common wrapper objects (data, result, response)
 * 3. Recurse into ALL nested objects (one level)
 * 4. Last resort: match any string value starting with https://
 */
const URL_PROPERTY_NAMES = [
  'url', 'spreadsheetUrl', 'webViewLink', 'link', 'href',
  'html_url', 'permalink', 'web_url', 'webUrl', 'htmlUrl',
  'shareUrl', 'share_url', 'viewUrl', 'view_url',
]

const WRAPPER_KEYS = ['data', 'result', 'response']

export function extractResultUrl(result: unknown, depth = 0): string | null {
  if (!result || typeof result !== 'object' || depth > 3) return null
  const obj = result as Record<string, unknown>

  // 1. Check known URL property names
  for (const key of URL_PROPERTY_NAMES) {
    const val = obj[key]
    if (typeof val === 'string' && val.startsWith('https://')) {
      return val
    }
  }

  // 2. Recurse into common wrapper keys
  for (const key of WRAPPER_KEYS) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = extractResultUrl(obj[key], depth + 1)
      if (found) return found
    }
  }

  // 3. Recurse into all nested objects
  for (const val of Object.values(obj)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const found = extractResultUrl(val, depth + 1)
      if (found) return found
    }
  }

  // 4. Last resort: any string value starting with https://
  for (const val of Object.values(obj)) {
    if (typeof val === 'string' && val.startsWith('https://')) {
      return val
    }
  }

  return null
}

/**
 * Construct a URL from known toolkit + param patterns when the tool response
 * doesn't include one. E.g. GOOGLESHEETS_BATCH_UPDATE returns no URL but
 * the params contain `spreadsheet_id` → build `https://docs.google.com/spreadsheets/d/{id}`.
 */
const TOOLKIT_URL_BUILDERS: Record<string, (params: Record<string, unknown>) => string | null> = {
  googlesheets: (p) => {
    const id = p.spreadsheet_id ?? p.spreadsheetId
    return typeof id === 'string' ? `https://docs.google.com/spreadsheets/d/${id}` : null
  },
  googledocs: (p) => {
    const id = p.document_id ?? p.documentId ?? p.doc_id
    return typeof id === 'string' ? `https://docs.google.com/document/d/${id}` : null
  },
  googleslides: (p) => {
    const id = p.presentation_id ?? p.presentationId
    return typeof id === 'string' ? `https://docs.google.com/presentation/d/${id}` : null
  },
  notion: (p) => {
    const id = p.page_id ?? p.pageId ?? p.database_id ?? p.databaseId
    return typeof id === 'string' ? `https://notion.so/${id.replace(/-/g, '')}` : null
  },
  airtable: (p) => {
    const baseId = p.base_id ?? p.baseId
    const tableId = p.table_id ?? p.tableId
    if (typeof baseId === 'string' && typeof tableId === 'string') {
      return `https://airtable.com/${baseId}/${tableId}`
    }
    return typeof baseId === 'string' ? `https://airtable.com/${baseId}` : null
  },
}

export function constructUrlFromParams(toolName: string, params: Record<string, unknown>): string | null {
  const toolkit = toolName.split('_')[0]?.toLowerCase() || ''
  const builder = TOOLKIT_URL_BUILDERS[toolkit]
  return builder ? builder(params) : null
}

