/**
 * Veritio AI Assistant — Create Mode Tool Executor
 *
 * Handlers for create-mode and draft-mode tools. These use existing services
 * (studyService, projectService, cardService, categoryService) to create
 * studies and projects.
 *
 * Draft tools store study content in Motia state (no DB writes) until the user
 * calls create_complete_study, which bulk-writes everything in one go.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CreateToolName, DraftToolName, ToolExecutionResult } from './types'
import { draftCache } from './draft-cache'
import { createStudy, updateStudy } from '../study-service'
import { createProject } from '../project-service'
import { bulkUpdateCards } from '../card-service'
import { bulkUpdateCategories } from '../category-service'
import { bulkUpdateTreeNodes } from '../tree-node-service'
import { bulkUpdateTasks } from '../task-service'
import { bulkUpdateFlowQuestions } from '../flow-question-service'
import { createDesign } from '../first-impression-service'
import { createPrototypeTask } from '../prototype-task-service'
import { saveTasks as saveLiveWebsiteTasks } from '../live-website-service'

export interface CreateToolContext {
  supabase: SupabaseClient
  userId: string
  /** Current organization ID — scopes project listing */
  organizationId?: string
  /** Conversation ID used as draft cache key */
  conversationId?: string
}

/** Draft study shape stored in Motia state */
export interface DraftStudy {
  studyType: string
  projectId: string
  title: string
  description?: string
  purpose?: string
  participantRequirements?: string
  cards: Array<{ tempId: string; label: string; description?: string }>
  categories: Array<{ tempId: string; label: string; description?: string }>
  settings: Record<string, unknown>
  // Tree test
  treeNodes: Array<{ tempId: string; label: string; parentTempId?: string }>
  treeTasks: Array<{ tempId: string; question: string; correctNodeTempId?: string }>
  // Survey
  surveyQuestions: Array<{ tempId: string; questionType: string; questionText: string; description?: string; isRequired?: boolean; config?: Record<string, unknown> }>
  // First click
  firstClickTasks: Array<{ tempId: string; instruction: string; imageUrl?: string }>
  // First impression
  firstImpressionDesigns: Array<{ tempId: string; name: string; imageUrl?: string; isPractice?: boolean; questions?: Array<Record<string, unknown>> }>
  // Prototype test
  prototypeTasks: Array<{ tempId: string; title: string; description?: string }>
  // Live website test
  liveWebsiteTasks: Array<{ tempId: string; title: string; instructions?: string; targetUrl: string; successUrl?: string; successCriteriaType?: string; timeLimitSeconds?: number }>
}

const STUDY_TYPE_INFO = [
  {
    type: 'card_sort',
    name: 'Card Sort',
    description: 'Participants organize items into groups to help you understand their mental models.',
    when_to_use: 'Designing navigation, organizing content, labeling categories. Ideal when you want to understand how users group and categorize information.',
  },
  {
    type: 'tree_test',
    name: 'Tree Test',
    description: 'Participants navigate a hierarchical tree to find specific items, testing your information architecture.',
    when_to_use: 'Validating navigation structure, testing findability, evaluating menu labels. Use after card sort or when redesigning site navigation.',
  },
  {
    type: 'survey',
    name: 'Survey',
    description: 'Collect responses via multiple question types: multiple choice, rating scales, open text, matrix, ranking, and more.',
    when_to_use: 'Gathering user opinions, measuring satisfaction, collecting demographics, pre/post-study questionnaires, or any structured data collection.',
  },
  {
    type: 'prototype_test',
    name: 'Prototype Test',
    description: 'Participants complete tasks in a Figma prototype while you track clicks, navigation paths, and success rates.',
    when_to_use: 'Testing interactive prototypes, validating user flows, measuring task completion. Requires a Figma prototype.',
  },
  {
    type: 'first_click',
    name: 'First Click',
    description: 'Participants click where they would go first to complete a task on a static design or screenshot.',
    when_to_use: 'Testing visual hierarchy, CTA placement, page layout effectiveness. Great for quick validation of design decisions.',
  },
  {
    type: 'first_impression',
    name: 'First Impression',
    description: 'Participants view a design briefly then answer questions about their initial reaction and perception.',
    when_to_use: 'Testing brand perception, visual appeal, clarity of messaging. Shows a design for a limited time (e.g. 5 seconds) to capture gut reactions.',
  },
  {
    type: 'live_website_test',
    name: 'Live Website Test',
    description: 'Participants complete tasks on a live production website while you track navigation, clicks, and task success.',
    when_to_use: 'Testing usability on live websites, validating real-world navigation, measuring task completion without prototypes.',
  },
]

export async function executeCreateTool(
  toolName: CreateToolName | DraftToolName,
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'list_study_types':
      return handleListStudyTypes()
    case 'list_projects':
      return handleListProjects(context)
    case 'create_project':
      return handleCreateProject(args, context)
    case 'create_study':
      return handleCreateStudy(args, context)
    // Draft tools
    case 'set_draft_basics':
      return handleSetDraftBasics(args, context)
    case 'update_draft_details':
      return handleUpdateDraftDetails(args, context)
    case 'preview_cards':
      return handlePreviewCards(args, context)
    case 'preview_categories':
      return handlePreviewCategories(args, context)
    case 'preview_settings':
      return handlePreviewSettings(args, context)
    case 'preview_tree_nodes':
      return handlePreviewTreeNodes(args, context)
    case 'preview_tree_tasks':
      return handlePreviewTreeTasks(args, context)
    case 'preview_survey_questions':
      return handlePreviewSurveyQuestions(args, context)
    case 'preview_first_click_tasks':
      return handlePreviewFirstClickTasks(args, context)
    case 'preview_first_impression_designs':
      return handlePreviewFirstImpressionDesigns(args, context)
    case 'preview_prototype_tasks':
      return handlePreviewPrototypeTasks(args, context)
    case 'preview_live_website_tasks':
      return handlePreviewLiveWebsiteTasks(args, context)
    case 'get_draft_state':
      return handleGetDraftState(context)
    case 'create_complete_study':
      return handleCreateCompleteStudy(args, context)
    default:
      return { result: { error: `Unknown create tool: ${toolName}` } }
  }
}

function handleListStudyTypes(): ToolExecutionResult {
  return { result: { study_types: STUDY_TYPE_INFO } }
}

async function handleListProjects(context: CreateToolContext): Promise<ToolExecutionResult> {
  const { supabase, userId, organizationId } = context

  // Use the current organization if provided, otherwise fall back to all memberships
  let orgIds: string[]
  if (organizationId) {
    orgIds = [organizationId]
  } else {
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId)

    if (!memberships || memberships.length === 0) {
      return { result: { error: 'No organization membership found. The user needs to be part of an organization.' } }
    }
    orgIds = memberships.map((m: { organization_id: string }) => m.organization_id)
  }

  const { data: projects, error } = await (supabase as any)
    .from('projects')
    .select('id, name, description, organization_id, created_at')
    .in('organization_id', orgIds)
    .order('created_at', { ascending: false })

  if (error) return { result: { error: `Failed to list projects: ${error.message}` } }

  const projectList = (projects ?? []).map((p: { id: string; name: string; description: string }) => ({
    id: p.id,
    name: p.name,
    description: p.description,
  }))

  return { result: { projects: projectList, total: projectList.length } }
}

async function handleCreateProject(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { supabase, userId } = context
  const name = args.name as string
  const description = (args.description as string) || undefined

  if (!name) return { result: { error: 'Project name is required' } }

  const orgId = context.organizationId ?? await getUserOrgId(supabase, userId)
  if (!orgId) return { result: { error: 'No organization membership found.' } }

  const { data: project, error } = await createProject(supabase, userId, {
    name,
    description: description ?? null,
    organizationId: orgId,
  })

  if (error) return { result: { error: `Failed to create project: ${error.message}` } }

  return {
    result: {
      project_id: project!.id,
      name: project!.name,
      message: `Project "${name}" created successfully.`,
    },
  }
}

async function handleCreateStudy(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { supabase, userId } = context
  const projectId = args.project_id as string
  const title = args.title as string
  const studyType = args.study_type as string
  const description = (args.description as string) || undefined

  if (!projectId || !title || !studyType) {
    return { result: { error: 'project_id, title, and study_type are required' } }
  }

  if (!VALID_STUDY_TYPES.includes(studyType)) {
    return { result: { error: `Invalid study_type. Must be one of: ${VALID_STUDY_TYPES.join(', ')}` } }
  }


  const { data: study, error } = await createStudy(supabase, projectId, userId, {
    title,
    study_type: studyType as any,
    description: description ?? null,
  })

  if (error) return { result: { error: `Failed to create study: ${error.message}` } }

  return {
    result: {
      study_id: study!.id,
      project_id: projectId,
      study_type: studyType,
      title: study!.title,
      builder_url: `/projects/${projectId}/studies/${study!.id}/builder`,
      message: `Study "${title}" created successfully. You now have builder tools to configure it.`,
      _createdStudy: true, // Marker for chat step to detect Phase 2 transition
    },
  }
}

// ---------------------------------------------------------------------------
// Draft tool handlers
// ---------------------------------------------------------------------------

async function handleSetDraftBasics(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  const projectId = args.project_id as string
  const title = args.title as string
  const studyType = args.study_type as string
  const description = (args.description as string) || undefined
  const sortMode = (args.sort_mode as string) || undefined
  const purpose = (args.purpose as string) || undefined
  const participantRequirements = (args.participant_requirements as string) || undefined

  if (!projectId || !title || !studyType) {
    return { result: { error: 'project_id, title, and study_type are required' } }
  }

  if (!VALID_STUDY_TYPES.includes(studyType)) {
    return { result: { error: `Invalid study_type. Must be one of: ${VALID_STUDY_TYPES.join(', ')}` } }
  }

  const draft: DraftStudy = {
    studyType,
    projectId,
    title,
    description,
    purpose,
    participantRequirements,
    cards: [],
    categories: [],
    settings: sortMode ? { mode: sortMode } : (studyType === 'card_sort' ? { mode: 'open' } : {}),
    treeNodes: [],
    treeTasks: [],
    surveyQuestions: [],
    firstClickTasks: [],
    firstImpressionDesigns: [],
    prototypeTasks: [],
    liveWebsiteTasks: [],
  }

  draftCache.set(conversationId, draft)

  return {
    result: {
      title,
      description,
      sort_mode: sortMode ?? (studyType === 'card_sort' ? 'open' : undefined),
      study_type: studyType,
      purpose,
      participant_requirements: participantRequirements,
      project_id: projectId,
      message: `Draft "${title}" initialized as a ${studyType.replace(/_/g, ' ')}.`,
      _draftSet: true, // Marker for chat step to detect draft transition
    },
  }
}

async function handleUpdateDraftDetails(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  }

  // Merge only provided fields
  if (args.title !== undefined) draft.title = String(args.title)
  if (args.description !== undefined) draft.description = String(args.description)
  if (args.purpose !== undefined) draft.purpose = String(args.purpose)
  if (args.participant_requirements !== undefined) draft.participantRequirements = String(args.participant_requirements)
  if (args.sort_mode !== undefined) {
    const sortMode = String(args.sort_mode)
    draft.settings = { ...draft.settings, mode: sortMode }
  }

  draftCache.set(conversationId, draft)

  return {
    result: {
      title: draft.title,
      description: draft.description,
      sort_mode: (draft.settings.mode as string) ?? undefined,
      study_type: draft.studyType,
      purpose: draft.purpose,
      participant_requirements: draft.participantRequirements,
      project_id: draft.projectId,
      message: 'Study details updated.',
    },
  }
}

async function handlePreviewCards(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  const rawCards = args.cards as Array<{ label: string; description?: string }> | undefined
  if (!rawCards || !Array.isArray(rawCards) || rawCards.length === 0) {
    return { result: { error: 'cards array is required and must not be empty' } }
  }

  // Assign tempIds for tracking
  const cards = rawCards.map((c) => ({
    tempId: crypto.randomUUID(),
    label: String(c.label || ''),
    description: c.description ? String(c.description) : undefined,
  }))

  // Store in draft state
  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  }
  draft.cards = cards
  draftCache.set(conversationId, draft)

  return {
    result: {
      cards,
      count: cards.length,
      message: `${cards.length} cards ready for review.`,
    },
  }
}

async function handlePreviewCategories(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  const rawCategories = args.categories as Array<{ label: string; description?: string }> | undefined
  if (!rawCategories || !Array.isArray(rawCategories) || rawCategories.length === 0) {
    return { result: { error: 'categories array is required and must not be empty' } }
  }

  const categories = rawCategories.map((c) => ({
    tempId: crypto.randomUUID(),
    label: String(c.label || ''),
    description: c.description ? String(c.description) : undefined,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  }
  draft.categories = categories
  draftCache.set(conversationId, draft)

  return {
    result: {
      categories,
      count: categories.length,
      message: `${categories.length} categories ready for review.`,
    },
  }
}

async function handlePreviewSettings(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  const settings = (args.settings as Record<string, unknown>) ?? {}

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  }
  // Merge new settings into existing
  draft.settings = { ...draft.settings, ...settings }
  draftCache.set(conversationId, draft)

  return {
    result: {
      settings: draft.settings,
      studyType: draft.studyType,
      message: 'Settings configured.',
    },
  }
}

// ---------------------------------------------------------------------------
// New study-type preview handlers
// ---------------------------------------------------------------------------

async function handlePreviewTreeNodes(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawNodes = args.nodes as Array<{ temp_id?: string; label: string; parent_temp_id?: string }> | undefined
  if (!rawNodes || !Array.isArray(rawNodes) || rawNodes.length === 0) {
    return { result: { error: 'nodes array is required and must not be empty' } }
  }

  // Use AI's temp_id if provided, otherwise generate from index.
  // Keep AI's parent_temp_id references as-is — they should match other nodes' temp_id values.
  // Real UUIDs are only generated during create_complete_study.
  const nodes = rawNodes.map((n, i) => ({
    tempId: n.temp_id ? String(n.temp_id) : `node_${i}`,
    label: String(n.label || ''),
    parentTempId: n.parent_temp_id ? String(n.parent_temp_id) : undefined,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.treeNodes = nodes
  draftCache.set(conversationId, draft)

  return { result: { nodes, count: nodes.length, message: `${nodes.length} tree nodes ready for review.` } }
}

async function handlePreviewTreeTasks(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawTasks = args.tasks as Array<{ question: string; correct_node_temp_id?: string }> | undefined
  if (!rawTasks || !Array.isArray(rawTasks) || rawTasks.length === 0) {
    return { result: { error: 'tasks array is required and must not be empty' } }
  }

  const tasks = rawTasks.map((t) => ({
    tempId: crypto.randomUUID(),
    question: String(t.question || ''),
    correctNodeTempId: t.correct_node_temp_id ? String(t.correct_node_temp_id) : undefined,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.treeTasks = tasks
  draftCache.set(conversationId, draft)

  // Include tree nodes so the component can show a node picker dropdown with labels
  const treeNodes = draft.treeNodes ?? []

  return { result: { tasks, treeNodes, count: tasks.length, message: `${tasks.length} tree test tasks ready for review.` } }
}

async function handlePreviewSurveyQuestions(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawQuestions = args.questions as Array<{ question_type: string; question_text: string; description?: string; is_required?: boolean; config?: Record<string, unknown> }> | undefined
  if (!rawQuestions || !Array.isArray(rawQuestions) || rawQuestions.length === 0) {
    return { result: { error: 'questions array is required and must not be empty' } }
  }

  const questions = rawQuestions.map((q) => ({
    tempId: crypto.randomUUID(),
    questionType: String(q.question_type || 'single_line_text'),
    questionText: String(q.question_text || ''),
    description: q.description ? String(q.description) : undefined,
    isRequired: q.is_required !== false,
    config: q.config ?? undefined,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.surveyQuestions = questions
  draftCache.set(conversationId, draft)

  return { result: { questions, count: questions.length, message: `${questions.length} survey questions ready for review.` } }
}

async function handlePreviewFirstClickTasks(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawTasks = args.tasks as Array<{ instruction: string; image_url?: string }> | undefined
  if (!rawTasks || !Array.isArray(rawTasks) || rawTasks.length === 0) {
    return { result: { error: 'tasks array is required and must not be empty' } }
  }

  const tasks = rawTasks.map((t) => ({
    tempId: crypto.randomUUID(),
    instruction: String(t.instruction || ''),
    imageUrl: t.image_url ? String(t.image_url) : undefined,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.firstClickTasks = tasks
  draftCache.set(conversationId, draft)

  return { result: { tasks, count: tasks.length, message: `${tasks.length} first click tasks ready for review.` } }
}

async function handlePreviewFirstImpressionDesigns(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawDesigns = args.designs as Array<{ name: string; image_url?: string; is_practice?: boolean }> | undefined
  if (!rawDesigns || !Array.isArray(rawDesigns) || rawDesigns.length === 0) {
    return { result: { error: 'designs array is required and must not be empty' } }
  }

  const designs = rawDesigns.map((d) => ({
    tempId: crypto.randomUUID(),
    name: String(d.name || ''),
    imageUrl: d.image_url ? String(d.image_url) : undefined,
    isPractice: d.is_practice ?? false,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.firstImpressionDesigns = designs
  draftCache.set(conversationId, draft)

  return { result: { designs, count: designs.length, message: `${designs.length} designs ready for review.` } }
}

async function handlePreviewPrototypeTasks(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawTasks = args.tasks as Array<{ title: string; description?: string }> | undefined
  if (!rawTasks || !Array.isArray(rawTasks) || rawTasks.length === 0) {
    return { result: { error: 'tasks array is required and must not be empty' } }
  }

  const tasks = rawTasks.map((t) => ({
    tempId: crypto.randomUUID(),
    title: String(t.title || ''),
    description: t.description ? String(t.description) : undefined,
  }))

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.prototypeTasks = tasks
  draftCache.set(conversationId, draft)

  return { result: { tasks, count: tasks.length, message: `${tasks.length} prototype test tasks ready for review.` } }
}

async function handlePreviewLiveWebsiteTasks(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) return { result: { error: 'Draft tools require state manager (internal error)' } }

  const rawTasks = args.tasks as Array<{ title: string; instructions?: string; target_url: string; success_url?: string; success_criteria_type?: string; time_limit_seconds?: number }> | undefined
  if (!rawTasks || !Array.isArray(rawTasks) || rawTasks.length === 0) {
    return { result: { error: 'tasks array is required and must not be empty' } }
  }

  const tasks = rawTasks.map((t) => ({
    tempId: crypto.randomUUID(),
    title: String(t.title || ''),
    instructions: t.instructions ? String(t.instructions) : undefined,
    targetUrl: String(t.target_url || ''),
    successUrl: t.success_url ? String(t.success_url) : undefined,
    successCriteriaType: t.success_criteria_type ? String(t.success_criteria_type) : undefined,
    timeLimitSeconds: t.time_limit_seconds ?? undefined,
  }))

  const websiteUrl = args.website_url ? String(args.website_url) : undefined
  const modeArg = String(args.mode || '')
  const mode = ['url_only', 'reverse_proxy', 'snippet'].includes(modeArg) ? modeArg : undefined

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) return { result: { error: 'No draft found. Call set_draft_basics first.' } }
  draft.liveWebsiteTasks = tasks
  if (websiteUrl || mode) {
    draft.settings = {
      ...draft.settings,
      ...(websiteUrl ? { websiteUrl } : {}),
      ...(mode ? { mode } : {}),
    }
  }
  draftCache.set(conversationId, draft)

  return {
    result: {
      tasks,
      count: tasks.length,
      ...(websiteUrl ? { website_url: websiteUrl } : {}),
      ...(mode ? { mode } : {}),
      message: `${tasks.length} live website tasks ready for review${websiteUrl ? ` for ${websiteUrl}` : ''}.`,
    },
  }
}

async function handleGetDraftState(
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return {
      result: {
        draft: null,
        message: 'No draft found. The user may need to start over — call set_draft_basics to begin.',
      },
    }
  }

  // Build type-specific summary
  const draftSummary: Record<string, unknown> = {
    studyType: draft.studyType,
    projectId: draft.projectId,
    title: draft.title,
    description: draft.description,
    settings: draft.settings,
  }

  switch (draft.studyType) {
    case 'card_sort':
      draftSummary.cardCount = draft.cards.length
      draftSummary.cards = draft.cards
      draftSummary.categoryCount = draft.categories.length
      draftSummary.categories = draft.categories
      break
    case 'tree_test':
      draftSummary.nodeCount = draft.treeNodes.length
      draftSummary.treeNodes = draft.treeNodes
      draftSummary.taskCount = draft.treeTasks.length
      draftSummary.treeTasks = draft.treeTasks
      break
    case 'survey':
      draftSummary.questionCount = draft.surveyQuestions.length
      draftSummary.surveyQuestions = draft.surveyQuestions
      break
    case 'first_click':
      draftSummary.taskCount = draft.firstClickTasks.length
      draftSummary.firstClickTasks = draft.firstClickTasks
      break
    case 'first_impression':
      draftSummary.designCount = draft.firstImpressionDesigns.length
      draftSummary.firstImpressionDesigns = draft.firstImpressionDesigns
      break
    case 'prototype_test':
      draftSummary.taskCount = draft.prototypeTasks.length
      draftSummary.prototypeTasks = draft.prototypeTasks
      break
    case 'live_website_test':
      draftSummary.taskCount = draft.liveWebsiteTasks.length
      draftSummary.liveWebsiteTasks = draft.liveWebsiteTasks
      break
  }

  return { result: { draft: draftSummary } }
}

async function handleCreateCompleteStudy(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const { supabase, userId, conversationId } = context
  if (!conversationId) {
    return { result: { error: 'Draft tools require state manager (internal error)' } }
  }

  if (args.confirm !== true) {
    return { result: { error: 'Set confirm: true to create the study from the draft.' } }
  }

  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return { result: { error: 'No draft found. Call set_draft_basics first to set up the study, then use preview tools to add content.' } }
  }

  // Validate completeness per study type
  const validationError = validateDraftCompleteness(draft)
  if (validationError) return { result: { error: validationError } }

  // 1. Create the study
  const { data: study, error: studyError } = await createStudy(supabase, draft.projectId, userId, {
    title: draft.title,
    study_type: draft.studyType as any,
    description: draft.description ?? null,
  })

  if (studyError || !study) {
    return { result: { error: `Failed to create study: ${studyError?.message ?? 'unknown error'}` } }
  }

  const studyId = study.id

  try {
    // 2. Write type-specific content
    await writeTypeSpecificContent(supabase as any, studyId, draft)

    // 3. Apply purpose and participant requirements
    if (draft.purpose || draft.participantRequirements) {
      const detailsUpdate: Record<string, unknown> = {}
      if (draft.purpose) detailsUpdate.purpose = draft.purpose
      if (draft.participantRequirements) detailsUpdate.participant_requirements = draft.participantRequirements
      const { error: detailsError } = await updateStudy(supabase as any, studyId, userId, detailsUpdate)
      if (detailsError) throw new Error(`Failed to apply study details: ${detailsError.message}`)
    }

    // 4. Apply settings
    if (Object.keys(draft.settings).length > 0) {
      const existingSettings = (study.settings as Record<string, unknown>) ?? {}
      const mergedSettings = { ...existingSettings, ...draft.settings }

      // Auto-enable description toggles for card sort
      if (draft.cards.some((c) => c.description)) mergedSettings.showCardDescriptions = true
      if (draft.categories.some((c) => c.description)) mergedSettings.showCategoryDescriptions = true

      const { error: settingsError } = await updateStudy(supabase as any, studyId, userId, { settings: mergedSettings })
      if (settingsError) throw new Error(`Failed to apply settings: ${settingsError.message}`)
    }
  } catch (err) {
    // Cleanup: delete the partially created study
    try { await supabase.from('studies').delete().eq('id', studyId) } catch { /* cleanup best-effort */ }
    return { result: { error: err instanceof Error ? err.message : 'Failed to configure study' } }
  }

  // Clean up draft state
  draftCache.delete(conversationId)

  // Build type-specific result summary
  const resultSummary = buildCreationSummary(draft)

  return {
    result: {
      study_id: studyId,
      project_id: draft.projectId,
      study_type: draft.studyType,
      title: draft.title,
      builder_url: `/projects/${draft.projectId}/studies/${studyId}/builder`,
      ...resultSummary,
      settings_applied: Object.keys(draft.settings).length > 0,
      message: `Study "${draft.title}" created. ${resultSummary.summary} Open the builder to review and launch.`,
      _createdStudy: true, // Marker for chat step to detect Phase 2 transition
    },
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Study types that are created empty via AI chat — content is added in the builder */
const BUILDER_ONLY_TYPES = new Set(['prototype_test', 'first_click', 'first_impression'])

function validateDraftCompleteness(draft: DraftStudy): string | null {
  // Builder-only types: no content validation — study is created empty
  if (BUILDER_ONLY_TYPES.has(draft.studyType)) return null

  switch (draft.studyType) {
    case 'card_sort': {
      if (draft.cards.length < 3) return `Card sort needs at least 3 cards. Current draft has ${draft.cards.length}.`
      const mode = (draft.settings.mode as string) ?? 'open'
      if ((mode === 'closed' || mode === 'hybrid') && draft.categories.length < 2) {
        return `${mode} card sort needs at least 2 categories. Current draft has ${draft.categories.length}.`
      }
      return null
    }
    case 'tree_test': {
      if (draft.treeNodes.length < 2) return `Tree test needs at least 2 nodes. Current draft has ${draft.treeNodes.length}.`
      if (draft.treeTasks.length < 1) return `Tree test needs at least 1 task.`
      const tasksWithoutAnswer = draft.treeTasks.filter(t => !t.correctNodeTempId)
      if (tasksWithoutAnswer.length > 0) return `${tasksWithoutAnswer.length} tree test task${tasksWithoutAnswer.length === 1 ? '' : 's'} missing a correct answer node. Each task must have a correct answer selected before creating the study.`
      return null
    }
    case 'survey':
      if (draft.surveyQuestions.length < 1) return `Survey needs at least 1 question. Current draft has ${draft.surveyQuestions.length}.`
      return null
    case 'live_website_test':
      if (draft.liveWebsiteTasks.length < 1) return `Live website test needs at least 1 task. Current draft has ${draft.liveWebsiteTasks.length}.`
      return null
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Type-specific DB writes
// ---------------------------------------------------------------------------

async function writeTypeSpecificContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  // Builder-only types are created empty — content is added in the builder
  if (BUILDER_ONLY_TYPES.has(draft.studyType)) return

  switch (draft.studyType) {
    case 'card_sort':
      await writeCardSortContent(supabase, studyId, draft)
      break
    case 'tree_test':
      await writeTreeTestContent(supabase, studyId, draft)
      break
    case 'survey':
      await writeSurveyContent(supabase, studyId, draft)
      break
    case 'live_website_test':
      await writeLiveWebsiteContent(supabase, studyId, draft)
      break
  }
}

async function writeCardSortContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.cards.length > 0) {
    const cardsWithIds = draft.cards.map((c, i) => ({
      id: crypto.randomUUID(),
      label: c.label,
      description: c.description ?? null,
      position: i,
    }))
    const { error } = await bulkUpdateCards(supabase as any, studyId, cardsWithIds)
    if (error) throw new Error(`Failed to create cards: ${error.message}`)
  }
  if (draft.categories.length > 0) {
    const categoriesWithIds = draft.categories.map((c, i) => ({
      id: crypto.randomUUID(),
      label: c.label,
      description: c.description ?? null,
      position: i,
    }))
    const { error } = await bulkUpdateCategories(supabase as any, studyId, categoriesWithIds)
    if (error) throw new Error(`Failed to create categories: ${error.message}`)
  }
}

async function writeTreeTestContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.treeNodes.length === 0) return

  // Build tempId → real UUID mapping
  const tempToRealId = new Map<string, string>()
  const nodesWithIds = draft.treeNodes.map((n, i) => {
    const realId = crypto.randomUUID()
    tempToRealId.set(n.tempId, realId)
    return { tempId: n.tempId, id: realId, label: n.label, parentTempId: n.parentTempId, position: i }
  })

  // Resolve parent references
  const resolvedNodes = nodesWithIds.map((n) => ({
    id: n.id,
    label: n.label,
    parent_id: n.parentTempId ? (tempToRealId.get(n.parentTempId) ?? null) : null,
    position: n.position,
  }))

  const { error: nodesError } = await bulkUpdateTreeNodes(supabase as any, studyId, resolvedNodes)
  if (nodesError) throw new Error(`Failed to create tree nodes: ${nodesError.message}`)

  // Create tasks with resolved node references
  if (draft.treeTasks.length > 0) {
    const tasksWithIds = draft.treeTasks.map((t, i) => ({
      id: crypto.randomUUID(),
      question: t.question,
      correct_node_id: t.correctNodeTempId ? (tempToRealId.get(t.correctNodeTempId) ?? null) : null,
      position: i,
    }))
    const { error: tasksError } = await bulkUpdateTasks(supabase as any, studyId, tasksWithIds)
    if (tasksError) throw new Error(`Failed to create tree test tasks: ${tasksError.message}`)
  }
}

async function writeSurveyContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.surveyQuestions.length === 0) return

  const questions = draft.surveyQuestions.map((q, i) => {
    let config = q.config ?? {}
    // Normalize option labels and ensure IDs (inline from builder-write-tools pattern)
    config = normalizeOptionLabelsForDraft(config)
    config = ensureOptionIdsForDraft(config)

    return {
      id: crypto.randomUUID(),
      section: 'survey' as const,
      position: i,
      question_type: q.questionType,
      question_text: q.questionText,
      description: q.description ?? null,
      is_required: q.isRequired !== false,
      config,
    }
  })

  const { error } = await bulkUpdateFlowQuestions(supabase as any, studyId, questions, 'survey')
  if (error) throw new Error(`Failed to create survey questions: ${error.message}`)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function writeFirstClickContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  // First click tasks are stored in the generic tasks table with instruction as question
  // and image stored in study settings or as task metadata
  for (let i = 0; i < draft.firstClickTasks.length; i++) {
    const task = draft.firstClickTasks[i]
    const { error } = await (supabase as any)
      .from('first_click_tasks')
      .insert({
        id: crypto.randomUUID(),
        study_id: studyId,
        instruction: task.instruction,
        image_url: task.imageUrl ?? null,
        position: i,
      })
    if (error) throw new Error(`Failed to create first click task: ${error.message}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function writeFirstImpressionContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  for (let i = 0; i < draft.firstImpressionDesigns.length; i++) {
    const design = draft.firstImpressionDesigns[i]
    const { error } = await createDesign(supabase as any, studyId, {
      name: design.name,
      image_url: design.imageUrl ?? null,
      is_practice: design.isPractice ?? false,
      questions: (design.questions ?? []) as any,
      position: i,
    })
    if (error) throw new Error(`Failed to create design "${design.name}": ${error.message}`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function writePrototypeTestContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  for (let i = 0; i < draft.prototypeTasks.length; i++) {
    const task = draft.prototypeTasks[i]
    const { error } = await createPrototypeTask(supabase as any, studyId, {
      title: task.title,
      instruction: task.description ?? '',
    })
    if (error) throw new Error(`Failed to create prototype task "${task.title}": ${error.message}`)
  }
}

async function writeLiveWebsiteContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.liveWebsiteTasks.length === 0) return

  const tasks = draft.liveWebsiteTasks.map((t, i) => ({
    id: crypto.randomUUID(),
    title: t.title,
    instructions: t.instructions ?? '',
    target_url: t.targetUrl,
    success_url: t.successUrl ?? null,
    success_criteria_type: (t.successCriteriaType as 'self_reported' | 'url_match' | 'exact_path') ?? 'self_reported',
    success_path: null,
    time_limit_seconds: t.timeLimitSeconds ?? null,
    order_position: i,
  }))

  await saveLiveWebsiteTasks(supabase as any, studyId, tasks)
}

// ---------------------------------------------------------------------------
// Creation summary builder
// ---------------------------------------------------------------------------

function buildCreationSummary(draft: DraftStudy): { summary: string } & Record<string, unknown> {
  switch (draft.studyType) {
    case 'card_sort':
      return {
        cards_created: draft.cards.length,
        categories_created: draft.categories.length,
        summary: `${draft.cards.length} cards${draft.categories.length > 0 ? ` and ${draft.categories.length} categories` : ''} created.`,
      }
    case 'tree_test':
      return {
        nodes_created: draft.treeNodes.length,
        tasks_created: draft.treeTasks.length,
        summary: `${draft.treeNodes.length} tree nodes and ${draft.treeTasks.length} tasks created.`,
      }
    case 'survey':
      return {
        questions_created: draft.surveyQuestions.length,
        summary: `${draft.surveyQuestions.length} survey questions created.`,
      }
    case 'first_click':
      return {
        summary: 'Study created. Upload images and add tasks in the builder.',
      }
    case 'first_impression':
      return {
        summary: 'Study created. Upload designs in the builder.',
      }
    case 'prototype_test':
      return {
        summary: 'Study created. Connect your Figma prototype and set up tasks in the builder.',
      }
    case 'live_website_test': {
      const websiteUrl = draft.settings.websiteUrl as string | undefined
      return {
        tasks_created: draft.liveWebsiteTasks.length,
        summary: `${draft.liveWebsiteTasks.length} live website task${draft.liveWebsiteTasks.length === 1 ? '' : 's'} created${websiteUrl ? ` for ${websiteUrl}` : ''}.`,
      }
    }
    default:
      return { summary: 'Study created.' }
  }
}

// ---------------------------------------------------------------------------
// Normalization helpers (inlined from builder-write-tools pattern)
// ---------------------------------------------------------------------------

function normalizeOptionLabelsForDraft(config: Record<string, unknown>): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let result = config
  for (const field of arrayFields) {
    const arr = result[field]
    if (!arr || !Array.isArray(arr)) continue
    let changed = false
    const normalized = arr.map((item: unknown) => {
      if (typeof item === 'string') { changed = true; return { label: item } }
      if (typeof item !== 'object' || item === null) return item
      const obj = item as Record<string, unknown>
      if (typeof obj.label === 'string' && obj.label.trim()) return obj
      for (const alt of ['text', 'value', 'name', 'title', 'content']) {
        const v = obj[alt]
        if (typeof v === 'string' && v.trim()) { changed = true; return { ...obj, label: v } }
      }
      return obj
    })
    if (changed) result = { ...result, [field]: normalized }
  }
  return result
}

function ensureOptionIdsForDraft(config: Record<string, unknown>): Record<string, unknown> {
  const arrayFields = ['options', 'rows', 'columns', 'items', 'scales']
  let result = config
  for (const field of arrayFields) {
    const arr = result[field]
    if (!arr || !Array.isArray(arr)) continue
    const seenIds = new Set<string>()
    const fixed = (arr as Record<string, unknown>[]).map((item) => {
      const id = item.id as string | undefined
      if (!id || seenIds.has(id)) return { ...item, id: crypto.randomUUID() }
      seenIds.add(id)
      return item
    })
    result = { ...result, [field]: fixed }
  }
  return result
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_STUDY_TYPES = ['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']

async function getUserOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)

  return memberships?.[0]?.organization_id ?? null
}
