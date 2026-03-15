/**
 * Generative UI Registry
 *
 * Maps LLM tool names to React components that render inline in the chat bubble.
 * Write tools (manage_cards, etc.) stream props live during arg generation.
 * Read tools (get_*_results) render all-at-once after the tool result arrives.
 */

import type React from 'react'
import type { z } from 'zod'

// ---------------------------------------------------------------------------
// Registry types
// ---------------------------------------------------------------------------

export type PropStatus = 'streaming' | 'complete'

export type GenerativeComponentProps<T = Record<string, unknown>> = T & {
  propStatus?: Record<string, PropStatus>
  onStateChange?: (state: T) => void
}

export interface GenerativeComponentDef<T = Record<string, unknown>> {
  component: React.ComponentType<GenerativeComponentProps<T>>
  propsSchema: z.ZodType<T>
  description: string
  interactable?: boolean
  /** Which top-level arg key in the tool call contains the renderable list data */
  streamingDataKey?: string
}

// ---------------------------------------------------------------------------
// Lazy component loader — avoids circular deps at module init time
// ---------------------------------------------------------------------------

type ComponentLoader = () => Promise<{ default: React.ComponentType<any> }>

interface RegistryEntry {
  loader: ComponentLoader
  description: string
  interactable?: boolean
  streamingDataKey?: string
}

const REGISTRY: Record<string, RegistryEntry> = {
  CardStack: {
    loader: () => import('@/components/generative-ui/card-stack').then(m => ({ default: m.CardStack })),
    description: 'Displays a list of card sort cards with labels and optional descriptions',
    interactable: true,
    streamingDataKey: 'items',
  },
  QuestionList: {
    loader: () => import('@/components/generative-ui/question-list').then(m => ({ default: m.QuestionList })),
    description: 'Displays a list of survey or flow questions with their types and options',
    interactable: false,
    streamingDataKey: 'items',
  },
  MetricCard: {
    loader: () => import('@/components/generative-ui/metric-card').then(m => ({ default: m.MetricCard })),
    description: 'Displays a single metric with label, value, and optional trend',
    interactable: false,
  },
  StudySummaryCard: {
    loader: () => import('@/components/generative-ui/study-summary-card').then(m => ({ default: m.StudySummaryCard })),
    description: 'Displays an overview of study metadata: type, participants, completion rate, status',
    interactable: false,
  },
  CardSortResultsSummary: {
    loader: () => import('@/components/generative-ui/card-sort-results-summary').then(m => ({ default: m.CardSortResultsSummary })),
    description: 'Summarises card sort analysis with category agreement bars',
    interactable: false,
  },
  TreeTestResultsSummary: {
    loader: () => import('@/components/generative-ui/tree-test-results-summary').then(m => ({ default: m.TreeTestResultsSummary })),
    description: 'Summarises tree test task success rates and direct rates',
    interactable: false,
  },
  SurveyResultsSummary: {
    loader: () => import('@/components/generative-ui/survey-results-summary').then(m => ({ default: m.SurveyResultsSummary })),
    description: 'Summarises survey question responses with top answers',
    interactable: false,
  },
  PrototypeTestResultsSummary: {
    loader: () => import('@/components/generative-ui/prototype-test-results-summary').then(m => ({ default: m.PrototypeTestResultsSummary })),
    description: 'Summarises prototype test task success rates and timing metrics',
    interactable: false,
  },
  FirstClickResultsSummary: {
    loader: () => import('@/components/generative-ui/first-click-results-summary').then(m => ({ default: m.FirstClickResultsSummary })),
    description: 'Summarises first-click accuracy and timing by task',
    interactable: false,
  },
  FirstImpressionResultsSummary: {
    loader: () => import('@/components/generative-ui/first-impression-results-summary').then(m => ({ default: m.FirstImpressionResultsSummary })),
    description: 'Summarises first impression themes, sentiment, and design ratings',
    interactable: false,
  },
  LiveWebsiteResultsSummary: {
    loader: () => import('@/components/generative-ui/live-website-results-summary').then(m => ({ default: m.LiveWebsiteResultsSummary })),
    description: 'Summarises live website session activity: clicks, scrolls, task completion',
    interactable: false,
  },
  DraftCardStack: {
    loader: () => import('@/components/generative-ui/draft-card-stack').then(m => ({ default: m.DraftCardStack })),
    description: 'Editable list of draft card sort cards with inline add/edit/delete',
    interactable: true,
    streamingDataKey: 'cards',
  },
  DraftCategoryList: {
    loader: () => import('@/components/generative-ui/draft-category-list').then(m => ({ default: m.DraftCategoryList })),
    description: 'Editable list of draft card sort categories with inline add/edit/delete',
    interactable: true,
    streamingDataKey: 'categories',
  },
  DraftSettingsPanel: {
    loader: () => import('@/components/generative-ui/draft-settings-panel').then(m => ({ default: m.DraftSettingsPanel })),
    description: 'Interactive study settings panel with mode selector and toggles',
    interactable: true,
  },
  DraftTreeEditor: {
    loader: () => import('@/components/generative-ui/draft-tree-editor').then(m => ({ default: m.DraftTreeEditor })),
    description: 'Editable tree hierarchy for tree test with inline add/edit/delete',
    interactable: true,
    streamingDataKey: 'nodes',
  },
  DraftTreeTaskList: {
    loader: () => import('@/components/generative-ui/draft-tree-task-list').then(m => ({ default: m.DraftTreeTaskList })),
    description: 'Editable task list for tree test with target node reference',
    interactable: true,
    streamingDataKey: 'tasks',
  },
  DraftSurveyQuestionList: {
    loader: () => import('@/components/generative-ui/draft-survey-question-list').then(m => ({ default: m.DraftSurveyQuestionList })),
    description: 'Editable survey question list with type badges and option editing',
    interactable: true,
    streamingDataKey: 'questions',
  },
  DraftFirstClickTaskList: {
    loader: () => import('@/components/generative-ui/draft-first-click-task-list').then(m => ({ default: m.DraftFirstClickTaskList })),
    description: 'Editable first click task list with image thumbnails',
    interactable: true,
    streamingDataKey: 'tasks',
  },
  DraftFirstImpressionDesignList: {
    loader: () => import('@/components/generative-ui/draft-first-impression-design-list').then(m => ({ default: m.DraftFirstImpressionDesignList })),
    description: 'Editable first impression design cards with images and practice badge',
    interactable: true,
    streamingDataKey: 'designs',
  },
  DraftPrototypeTaskList: {
    loader: () => import('@/components/generative-ui/draft-prototype-task-list').then(m => ({ default: m.DraftPrototypeTaskList })),
    description: 'Editable prototype test task list with title and description',
    interactable: true,
    streamingDataKey: 'tasks',
  },
  DraftLiveWebsiteTaskList: {
    loader: () => import('@/components/generative-ui/draft-live-website-task-list').then(m => ({ default: m.DraftLiveWebsiteTaskList })),
    description: 'Editable live website task list with URL fields and success criteria',
    interactable: true,
    streamingDataKey: 'tasks',
  },
  DraftStudyDetails: {
    loader: () => import('@/components/generative-ui/draft-study-details').then(m => ({ default: m.DraftStudyDetails })),
    description: 'Editable study details panel with title, description, sort mode, purpose, and participant requirements',
    interactable: true,
  },
  DraftFlowSection: {
    loader: () => import('@/components/generative-ui/draft-flow-section').then(m => ({ default: m.DraftFlowSection })),
    description: 'Interactive flow section editor for welcome, agreement, thank you, and instructions',
    interactable: true,
  },
  DraftFlowQuestions: {
    loader: () => import('@/components/generative-ui/draft-flow-questions').then(m => ({ default: m.DraftFlowQuestions })),
    description: 'Editable question list for screening, pre-study, and post-study sections',
    interactable: true,
    streamingDataKey: 'questions',
  },
  DraftParticipantId: {
    loader: () => import('@/components/generative-ui/draft-participant-id').then(m => ({ default: m.DraftParticipantId })),
    description: 'Participant identifier configuration with anonymous or demographic profile options',
    interactable: true,
  },
}

/** Synchronous registry used at runtime after components are loaded */
const _loaded: Record<string, React.ComponentType<any>> = {}

/** Preload a component into memory (call during app init or on demand) */
export async function preloadComponent(name: string): Promise<void> {
  const entry = REGISTRY[name]
  if (!entry || _loaded[name]) return
  const mod = await entry.loader()
  _loaded[name] = mod.default
}

/** Get a loaded component synchronously — returns null if not yet loaded */
export function getComponent(name: string): React.ComponentType<GenerativeComponentProps> | null {
  return _loaded[name] ?? null
}

/** Get registry metadata for a component name */
export function getRegistryEntry(name: string): RegistryEntry | null {
  return REGISTRY[name] ?? null
}

/** All known component names */
export const KNOWN_COMPONENT_NAMES = new Set(Object.keys(REGISTRY))

// ---------------------------------------------------------------------------
// Tool → Component mapping
// ---------------------------------------------------------------------------

export interface ToolComponentMapping {
  componentName: string
  /** Transform the raw tool result into component props */
  deriveProps: (result: unknown) => Record<string, unknown>
}

export const TOOL_COMPONENT_MAP: Record<string, ToolComponentMapping> = {
  // Write tools (streaming during arg generation)
  manage_cards: {
    componentName: 'CardStack',
    deriveProps: (r) => ({ items: r }),
  },
  manage_survey_questions: {
    componentName: 'QuestionList',
    deriveProps: (r) => ({ items: r }),
  },
  // manage_flow_questions — no component mapping; post-creation tools are text-only

  // Draft tools (streaming during arg generation, interactable)
  preview_cards: {
    componentName: 'DraftCardStack',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_categories: {
    componentName: 'DraftCategoryList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_settings: {
    componentName: 'DraftSettingsPanel',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  set_draft_basics: {
    componentName: 'DraftStudyDetails',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  update_draft_details: {
    componentName: 'DraftStudyDetails',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },

  // Draft tools — study-type-specific previews
  preview_tree_nodes: {
    componentName: 'DraftTreeEditor',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_tree_tasks: {
    componentName: 'DraftTreeTaskList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_survey_questions: {
    componentName: 'DraftSurveyQuestionList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_first_click_tasks: {
    componentName: 'DraftFirstClickTaskList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_first_impression_designs: {
    componentName: 'DraftFirstImpressionDesignList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_prototype_tasks: {
    componentName: 'DraftPrototypeTaskList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  preview_live_website_tasks: {
    componentName: 'DraftLiveWebsiteTaskList',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },

  // configure_flow_section, configure_flow_questions, configure_participant_id
  // — removed from component map; post-creation tools write directly to DB and respond as text only

  // Read tools (render all-at-once after tool completes)
  get_study_overview: {
    componentName: 'StudySummaryCard',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_task_metrics: {
    componentName: 'MetricCard',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_card_sort_results: {
    componentName: 'CardSortResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_tree_test_results: {
    componentName: 'TreeTestResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_survey_results: {
    componentName: 'SurveyResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_prototype_test_results: {
    componentName: 'PrototypeTestResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_first_click_results: {
    componentName: 'FirstClickResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_first_impression_results: {
    componentName: 'FirstImpressionResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
  get_live_website_results: {
    componentName: 'LiveWebsiteResultsSummary',
    deriveProps: (r) => (r as Record<string, unknown>) ?? {},
  },
}

// ---------------------------------------------------------------------------
// Write tools that should stream component props during arg generation
// ---------------------------------------------------------------------------

export const STREAMING_WRITE_TOOLS = new Set([
  'manage_cards',
  'manage_survey_questions',
  'manage_tree_nodes',
  'manage_prototype_tasks',
  'manage_first_click_tasks',
  'manage_first_impression_designs',
  'manage_live_website_tasks',
  'preview_cards',
  'preview_categories',
  'set_draft_basics',
  'update_draft_details',
  'preview_tree_nodes',
  'preview_tree_tasks',
  'preview_survey_questions',
  'preview_first_click_tasks',
  'preview_first_impression_designs',
  'preview_prototype_tasks',
  'preview_live_website_tasks',
])
