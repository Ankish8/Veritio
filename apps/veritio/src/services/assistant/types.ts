// Message types

export type MessageRole = 'user' | 'assistant' | 'tool' | 'system'

/**
 * UI hint types — backend sends these in message metadata, frontend renders them.
 */
export type MessageMetadataType =
  | 'text'              // plain markdown text
  | 'tool_progress'     // "Fetching data..." step indicator
  | 'connect_prompt'    // inline OAuth connect button
  | 'error'             // error message
  | 'component'         // generative UI component

/** File attachment metadata for user messages */
export type FileAttachmentType = 'image' | 'pdf' | 'document' | 'spreadsheet' | 'text'

export interface FileAttachment {
  url: string
  filename: string
  size?: number
  type: FileAttachmentType
  mimeType?: string
}

/** @deprecated Use FileAttachment instead */
export type ImageAttachment = FileAttachment

export interface MessageMetadata {
  type: MessageMetadataType

  /** For 'connect_prompt': which toolkit to connect */
  toolkit?: string

  /** For 'tool_progress': step status */
  toolName?: string
  status?: 'running' | 'done' | 'error'

  /** URL extracted from a tool execution result (e.g. spreadsheet link, Notion page) */
  resultUrl?: string

  /** Quick-reply suggestions shown as clickable chips below the message */
  suggestions?: string[]

  /** File attachments on user messages (stored as Supabase Storage URLs) */
  files?: FileAttachment[]
  /** @deprecated Use files instead */
  images?: ImageAttachment[]

  /** For 'component': generative UI component metadata */
  componentName?: string
  componentId?: string
  componentProps?: Record<string, unknown>
  componentPropStatus?: Record<string, 'streaming' | 'complete'>
  componentStreamingDone?: boolean
  interactable?: boolean
}

export interface AssistantMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string | null
  toolCalls?: unknown | null       // OpenAI tool_calls array (for assistant messages)
  toolCallId?: string | null       // for tool result messages
  metadata: MessageMetadata | null
  createdAt: string
}

// Conversation types

export interface Conversation {
  id: string
  studyId: string | null
  userId: string
  title: string | null
  mode: 'results' | 'builder' | 'create'
  /** Study type (enriched on list, not stored on conversation) */
  studyType?: string | null
  createdAt: string
  updatedAt: string
}

// SSE event types

export type SSEEvent =
  | { type: 'text_delta'; content: string }
  | { type: 'text_replace'; content: string }
  | { type: 'tool_start'; toolName: string; description?: string }
  | { type: 'tool_done'; toolName: string; result?: unknown }
  | { type: 'connect_required'; toolkit: string }
  | { type: 'study_data_changed'; sections: string[]; data?: Record<string, unknown> }
  | { type: 'study_created'; studyId: string; studyType: string; projectId: string; builderUrl: string; studyTitle?: string }
  | { type: 'message_complete'; messageId: string; conversationId: string; content?: string; metadata?: MessageMetadata }
  | { type: 'error'; message: string; code?: string }
  | { type: 'rate_limit'; info: RateLimitInfo }
  | { type: 'refine_text_delta'; content: string }
  | { type: 'refine_complete'; refined: string; rationale: string }
  // Generative UI events
  | { type: 'component_props_delta'; componentId: string; componentName: string; partialArgs: string }
  | { type: 'component_render'; componentId: string; componentName: string; props: Record<string, unknown> }

// API request / response contracts

export interface ChatRequest {
  studyId?: string
  conversationId?: string
  message: string
}

export interface ConversationListResponse {
  conversations: Conversation[]
}

export interface MessagesResponse {
  messages: AssistantMessage[]
}

export interface RateLimitInfo {
  remaining: number
  limit: number
  resetsAt: string
}

// Study data tool types

export type StudyDataToolName =
  | 'get_study_overview'
  | 'get_task_metrics'
  | 'get_responses'
  | 'get_participant_list'
  | 'get_card_sort_results'
  | 'get_tree_test_results'
  | 'get_prototype_test_results'
  | 'get_first_click_results'
  | 'get_first_impression_results'
  | 'get_survey_results'
  | 'get_live_website_results'
  | 'export_study_data'
  | 'create_export_job'
  | 'generate_insights_report'

export type BuilderToolName =
  | 'get_study_config'
  | 'validate_study_setup'
  | 'get_task_list'
  | 'check_launch_readiness'
  | 'get_best_practices'
  | 'get_study_flow_reference'

export type BuilderWriteToolName =
  | 'update_study'
  | 'update_study_settings'
  | 'manage_flow_questions'
  | 'manage_cards'
  | 'manage_categories'
  | 'manage_tree_nodes'
  | 'manage_tree_test_tasks'
  | 'manage_survey_questions'
  | 'manage_prototype_tasks'
  | 'manage_first_click_tasks'
  | 'manage_first_impression_designs'
  | 'manage_live_website_tasks'
  | 'manage_custom_sections'
  | 'manage_ab_tests'
  | 'manage_survey_rules'
  | 'configure_flow_section'
  | 'configure_flow_questions'
  | 'configure_participant_id'

export type DashboardToolName =
  | 'list_recent_studies'
  | 'get_organization_stats'
  | 'compare_studies'

export type ProjectToolName =
  | 'list_project_studies'
  | 'get_project_summary'

/** Context passed to tool execution */
export interface ToolExecutionContext {
  studyId?: string
  studyType?: string
  userId: string
  /** Current organization ID — scopes project listing */
  organizationId?: string
}

export type CreateToolName =
  | 'list_study_types'
  | 'list_projects'
  | 'create_project'
  | 'create_study'

export type DraftToolName =
  | 'set_draft_basics'
  | 'update_draft_details'
  | 'preview_cards'
  | 'preview_categories'
  | 'preview_settings'
  | 'preview_tree_nodes'
  | 'preview_tree_tasks'
  | 'preview_survey_questions'
  | 'preview_first_click_tasks'
  | 'preview_first_impression_designs'
  | 'preview_prototype_tasks'
  | 'preview_live_website_tasks'
  | 'get_draft_state'
  | 'create_complete_study'

/** Result of executing a tool */
export interface ToolExecutionResult {
  result: unknown
  metadata?: MessageMetadata
  /** Sections changed by a write tool — triggers frontend data refresh */
  dataChanged?: string[]
  /** Actual changed data for direct frontend application (skips API roundtrip) */
  dataPayload?: Record<string, unknown>
  /** Event to emit after tool execution (for triggering background processing) */
  emitEvent?: { topic: string; data: Record<string, unknown> }
  /** Auto-generated response text — skips the follow-up LLM call when set */
  autoResponse?: string
}

// Quick-reply suggestion parsing

/** Pattern for quick-reply suggestions: <<Option A|Option B|Option C>> */
const SUGGESTION_PATTERN_END = /<<([^>]+)>>\s*$/
/** Same pattern but matches anywhere in the text (for mid-text chips when fallback appends after them) */
const SUGGESTION_PATTERN_ANY = /<<([^>]+)>>/g

/**
 * Parse quick-reply suggestions from an LLM response.
 * Checks end-of-string first, then falls back to mid-text match.
 * Returns the cleaned content and extracted suggestions, or null if none found.
 */
export function parseSuggestions(content: string): { cleanContent: string; suggestions: string[] } | null {
  // Prefer end-of-string match (normal case)
  const endMatch = content.match(SUGGESTION_PATTERN_END)
  if (endMatch) {
    const suggestions = endMatch[1].split('|').map((s) => s.trim()).filter(Boolean)
    if (suggestions.length > 0) {
      return {
        cleanContent: content.replace(SUGGESTION_PATTERN_END, '').trimEnd(),
        suggestions,
      }
    }
  }

  // Fallback: match <<...>> anywhere (happens when iteration limit appends text after chips)
  const anyMatches = [...content.matchAll(SUGGESTION_PATTERN_ANY)]
  if (anyMatches.length > 0) {
    // Use the last match's suggestions
    const lastMatch = anyMatches[anyMatches.length - 1]
    const suggestions = lastMatch[1].split('|').map((s) => s.trim()).filter(Boolean)
    if (suggestions.length > 0) {
      return {
        cleanContent: content.replace(SUGGESTION_PATTERN_ANY, '').replace(/[^\S\n]{2,}/g, ' ').trimEnd(),
        suggestions,
      }
    }
  }

  return null
}

/**
 * Strip the suggestion marker from content (for display purposes).
 */
export function stripSuggestionMarkers(content: string | null): string {
  if (!content) return ''
  return content.replace(SUGGESTION_PATTERN_ANY, '').replace(/[^\S\n]{2,}/g, ' ').trimEnd()
}
