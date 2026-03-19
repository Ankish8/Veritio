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
import { normalizeOptionLabels, ensureOptionIds } from './option-normalizers'
import { BUILDER_ONLY_TYPES, VALID_STUDY_TYPES } from './shared-constants'
import { createStudy, updateStudy } from '../study-service'
import { createProject } from '../project-service'
import { bulkUpdateCards } from '../card-service'
import { bulkUpdateCategories } from '../category-service'
import { bulkUpdateTreeNodes } from '../tree-node-service'
import { bulkUpdateTasks } from '../task-service'
import { bulkUpdateFlowQuestions } from '../flow-question-service'
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

// ---------------------------------------------------------------------------
// Draft guard helpers
// ---------------------------------------------------------------------------

/** Guard: require conversationId and an existing draft. Returns the draft or an error result. */
function requireDraft(context: CreateToolContext): { draft: DraftStudy } | { error: ToolExecutionResult } {
  const { conversationId } = context
  if (!conversationId) {
    return { error: { result: { error: 'Draft tools require state manager (internal error)' } } }
  }
  const draft = draftCache.get(conversationId) as DraftStudy | null
  if (!draft) {
    return { error: { result: { error: 'No draft found. Call set_draft_basics first.' } } }
  }
  return { draft }
}

/** Guard: require conversationId only (draft may not exist yet, e.g. set_draft_basics). */
function requireConversationId(context: CreateToolContext): { conversationId: string } | { error: ToolExecutionResult } {
  if (!context.conversationId) {
    return { error: { result: { error: 'Draft tools require state manager (internal error)' } } }
  }
  return { conversationId: context.conversationId }
}

// ---------------------------------------------------------------------------
// Generic preview handler factory
// ---------------------------------------------------------------------------

/**
 * Generic factory for preview_* handlers. Each preview handler:
 * 1. Guards for conversationId + draft
 * 2. Validates a non-empty array from args
 * 3. Maps raw items through a transform function
 * 4. Stores the result on the draft under `fieldName`
 * 5. Returns the items with count and message
 */
function handlePreviewField<TRaw, TMapped>(
  args: Record<string, unknown>,
  context: CreateToolContext,
  config: {
    argName: string
    fieldName: keyof DraftStudy
    itemLabel: string
    mapFn: (raw: TRaw, index: number) => TMapped
    extraResult?: (draft: DraftStudy) => Record<string, unknown>
    extraDraftUpdate?: (draft: DraftStudy, args: Record<string, unknown>) => void
    extraResultFields?: (args: Record<string, unknown>) => Record<string, unknown>
  },
): ToolExecutionResult {
  const guard = requireDraft(context)
  if ('error' in guard) return guard.error

  const rawItems = args[config.argName] as TRaw[] | undefined
  if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
    return { result: { error: `${config.argName} array is required and must not be empty` } }
  }

  const items = rawItems.map(config.mapFn)
  const { draft } = guard

  ;(draft as any)[config.fieldName] = items
  config.extraDraftUpdate?.(draft, args)
  draftCache.set(context.conversationId!, draft)

  return {
    result: {
      [config.argName]: items,
      count: items.length,
      ...config.extraResult?.(draft),
      ...config.extraResultFields?.(args),
      message: `${items.length} ${config.itemLabel} ready for review.`,
    },
  }
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

  if (!VALID_STUDY_TYPES.includes(studyType as any)) {
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
      _createdStudy: true,
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
  const guard = requireConversationId(context)
  if ('error' in guard) return guard.error
  const { conversationId } = guard

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

  if (!VALID_STUDY_TYPES.includes(studyType as any)) {
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
      _draftSet: true,
    },
  }
}

async function handleUpdateDraftDetails(
  args: Record<string, unknown>,
  context: CreateToolContext,
): Promise<ToolExecutionResult> {
  const guard = requireDraft(context)
  if ('error' in guard) return guard.error
  const { draft } = guard

  if (args.title !== undefined) draft.title = String(args.title)
  if (args.description !== undefined) draft.description = String(args.description)
  if (args.purpose !== undefined) draft.purpose = String(args.purpose)
  if (args.participant_requirements !== undefined) draft.participantRequirements = String(args.participant_requirements)
  if (args.sort_mode !== undefined) {
    const sortMode = String(args.sort_mode)
    draft.settings = { ...draft.settings, mode: sortMode }
  }

  draftCache.set(context.conversationId!, draft)

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

function handlePreviewCards(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ label: string; description?: string }, DraftStudy['cards'][number]>(args, context, {
    argName: 'cards', fieldName: 'cards', itemLabel: 'cards',
    mapFn: (c) => ({ tempId: crypto.randomUUID(), label: String(c.label || ''), description: c.description ? String(c.description) : undefined }),
  })
}

function handlePreviewCategories(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ label: string; description?: string }, DraftStudy['categories'][number]>(args, context, {
    argName: 'categories', fieldName: 'categories', itemLabel: 'categories',
    mapFn: (c) => ({ tempId: crypto.randomUUID(), label: String(c.label || ''), description: c.description ? String(c.description) : undefined }),
  })
}

function handlePreviewSettings(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  const guard = requireDraft(context)
  if ('error' in guard) return guard.error
  const settings = (args.settings as Record<string, unknown>) ?? {}
  const { draft } = guard
  draft.settings = { ...draft.settings, ...settings }
  draftCache.set(context.conversationId!, draft)
  return { result: { settings: draft.settings, studyType: draft.studyType, message: 'Settings configured.' } }
}

function handlePreviewTreeNodes(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ temp_id?: string; label: string; parent_temp_id?: string }, DraftStudy['treeNodes'][number]>(args, context, {
    argName: 'nodes', fieldName: 'treeNodes', itemLabel: 'tree nodes',
    mapFn: (n, i) => ({ tempId: n.temp_id ? String(n.temp_id) : `node_${i}`, label: String(n.label || ''), parentTempId: n.parent_temp_id ? String(n.parent_temp_id) : undefined }),
  })
}

function handlePreviewTreeTasks(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ question: string; correct_node_temp_id?: string }, DraftStudy['treeTasks'][number]>(args, context, {
    argName: 'tasks', fieldName: 'treeTasks', itemLabel: 'tree test tasks',
    mapFn: (t) => ({ tempId: crypto.randomUUID(), question: String(t.question || ''), correctNodeTempId: t.correct_node_temp_id ? String(t.correct_node_temp_id) : undefined }),
    extraResult: (draft) => ({ treeNodes: draft.treeNodes ?? [] }),
  })
}

function handlePreviewSurveyQuestions(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ question_type: string; question_text: string; description?: string; is_required?: boolean; config?: Record<string, unknown> }, DraftStudy['surveyQuestions'][number]>(args, context, {
    argName: 'questions', fieldName: 'surveyQuestions', itemLabel: 'survey questions',
    mapFn: (q) => ({ tempId: crypto.randomUUID(), questionType: String(q.question_type || 'single_line_text'), questionText: String(q.question_text || ''), description: q.description ? String(q.description) : undefined, isRequired: q.is_required !== false, config: q.config ?? undefined }),
  })
}

function handlePreviewFirstClickTasks(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ instruction: string; image_url?: string }, DraftStudy['firstClickTasks'][number]>(args, context, {
    argName: 'tasks', fieldName: 'firstClickTasks', itemLabel: 'first click tasks',
    mapFn: (t) => ({ tempId: crypto.randomUUID(), instruction: String(t.instruction || ''), imageUrl: t.image_url ? String(t.image_url) : undefined }),
  })
}

function handlePreviewFirstImpressionDesigns(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ name: string; image_url?: string; is_practice?: boolean }, DraftStudy['firstImpressionDesigns'][number]>(args, context, {
    argName: 'designs', fieldName: 'firstImpressionDesigns', itemLabel: 'designs',
    mapFn: (d) => ({ tempId: crypto.randomUUID(), name: String(d.name || ''), imageUrl: d.image_url ? String(d.image_url) : undefined, isPractice: d.is_practice ?? false }),
  })
}

function handlePreviewPrototypeTasks(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  return handlePreviewField<{ title: string; description?: string }, DraftStudy['prototypeTasks'][number]>(args, context, {
    argName: 'tasks', fieldName: 'prototypeTasks', itemLabel: 'prototype test tasks',
    mapFn: (t) => ({ tempId: crypto.randomUUID(), title: String(t.title || ''), description: t.description ? String(t.description) : undefined }),
  })
}

function handlePreviewLiveWebsiteTasks(args: Record<string, unknown>, context: CreateToolContext): ToolExecutionResult {
  type RawTask = { title: string; instructions?: string; target_url: string; success_url?: string; success_criteria_type?: string; time_limit_seconds?: number }
  return handlePreviewField<RawTask, DraftStudy['liveWebsiteTasks'][number]>(args, context, {
    argName: 'tasks', fieldName: 'liveWebsiteTasks', itemLabel: 'live website tasks',
    mapFn: (t) => ({ tempId: crypto.randomUUID(), title: String(t.title || ''), instructions: t.instructions ? String(t.instructions) : undefined, targetUrl: String(t.target_url || ''), successUrl: t.success_url ? String(t.success_url) : undefined, successCriteriaType: t.success_criteria_type ? String(t.success_criteria_type) : undefined, timeLimitSeconds: t.time_limit_seconds ?? undefined }),
    extraDraftUpdate: (draft, a) => {
      const websiteUrl = a.website_url ? String(a.website_url) : undefined
      const modeArg = String(a.mode || '')
      const mode = ['url_only', 'reverse_proxy', 'snippet'].includes(modeArg) ? modeArg : undefined
      if (websiteUrl || mode) {
        draft.settings = { ...draft.settings, ...(websiteUrl ? { websiteUrl } : {}), ...(mode ? { mode } : {}) }
      }
    },
    extraResultFields: (a) => {
      const websiteUrl = a.website_url ? String(a.website_url) : undefined
      const modeArg = String(a.mode || '')
      const mode = ['url_only', 'reverse_proxy', 'snippet'].includes(modeArg) ? modeArg : undefined
      return { ...(websiteUrl ? { website_url: websiteUrl } : {}), ...(mode ? { mode } : {}) }
    },
  })
}

async function handleGetDraftState(context: CreateToolContext): Promise<ToolExecutionResult> {
  const guard = requireConversationId(context)
  if ('error' in guard) return guard.error
  const draft = draftCache.get(guard.conversationId) as DraftStudy | null
  if (!draft) {
    return { result: { draft: null, message: 'No draft found. The user may need to start over — call set_draft_basics to begin.' } }
  }

  const draftSummary: Record<string, unknown> = {
    studyType: draft.studyType, projectId: draft.projectId, title: draft.title,
    description: draft.description, settings: draft.settings,
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

async function handleCreateCompleteStudy(args: Record<string, unknown>, context: CreateToolContext): Promise<ToolExecutionResult> {
  const { supabase, userId } = context
  if (args.confirm !== true) {
    return { result: { error: 'Set confirm: true to create the study from the draft.' } }
  }
  const guard = requireDraft(context)
  if ('error' in guard) {
    return { result: { error: 'No draft found. Call set_draft_basics first to set up the study, then use preview tools to add content.' } }
  }
  const { draft } = guard

  const validationError = validateDraftCompleteness(draft)
  if (validationError) return { result: { error: validationError } }

  const { data: study, error: studyError } = await createStudy(supabase, draft.projectId, userId, {
    title: draft.title, study_type: draft.studyType as any, description: draft.description ?? null,
  })
  if (studyError || !study) {
    return { result: { error: `Failed to create study: ${studyError?.message ?? 'unknown error'}` } }
  }
  const studyId = study.id

  try {
    await writeTypeSpecificContent(supabase as any, studyId, draft)
    if (draft.purpose || draft.participantRequirements) {
      const detailsUpdate: Record<string, unknown> = {}
      if (draft.purpose) detailsUpdate.purpose = draft.purpose
      if (draft.participantRequirements) detailsUpdate.participant_requirements = draft.participantRequirements
      const { error: detailsError } = await updateStudy(supabase as any, studyId, userId, detailsUpdate)
      if (detailsError) throw new Error(`Failed to apply study details: ${detailsError.message}`)
    }
    if (Object.keys(draft.settings).length > 0) {
      const existingSettings = (study.settings as Record<string, unknown>) ?? {}
      const mergedSettings = { ...existingSettings, ...draft.settings }
      if (draft.cards.some((c) => c.description)) mergedSettings.showCardDescriptions = true
      if (draft.categories.some((c) => c.description)) mergedSettings.showCategoryDescriptions = true
      const { error: settingsError } = await updateStudy(supabase as any, studyId, userId, { settings: mergedSettings })
      if (settingsError) throw new Error(`Failed to apply settings: ${settingsError.message}`)
    }
  } catch (err) {
    try { await supabase.from('studies').delete().eq('id', studyId) } catch { /* cleanup best-effort */ }
    return { result: { error: err instanceof Error ? err.message : 'Failed to configure study' } }
  }

  draftCache.delete(context.conversationId!)
  const resultSummary = buildCreationSummary(draft)

  return {
    result: {
      study_id: studyId, project_id: draft.projectId, study_type: draft.studyType,
      title: draft.title, builder_url: `/projects/${draft.projectId}/studies/${studyId}/builder`,
      ...resultSummary, settings_applied: Object.keys(draft.settings).length > 0,
      message: `Study "${draft.title}" created. ${resultSummary.summary} Open the builder to review and launch.`,
      _createdStudy: true,
    },
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateDraftCompleteness(draft: DraftStudy): string | null {
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
  if (BUILDER_ONLY_TYPES.has(draft.studyType)) return
  switch (draft.studyType) {
    case 'card_sort': await writeCardSortContent(supabase, studyId, draft); break
    case 'tree_test': await writeTreeTestContent(supabase, studyId, draft); break
    case 'survey': await writeSurveyContent(supabase, studyId, draft); break
    case 'live_website_test': await writeLiveWebsiteContent(supabase, studyId, draft); break
  }
}

async function writeCardSortContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  const writes: Promise<void>[] = []
  if (draft.cards.length > 0) {
    const cardsWithIds = draft.cards.map((c, i) => ({ id: crypto.randomUUID(), label: c.label, description: c.description ?? null, position: i }))
    writes.push(bulkUpdateCards(supabase as any, studyId, cardsWithIds).then(({ error }) => { if (error) throw new Error(`Failed to create cards: ${error.message}`) }))
  }
  if (draft.categories.length > 0) {
    const categoriesWithIds = draft.categories.map((c, i) => ({ id: crypto.randomUUID(), label: c.label, description: c.description ?? null, position: i }))
    writes.push(bulkUpdateCategories(supabase as any, studyId, categoriesWithIds).then(({ error }) => { if (error) throw new Error(`Failed to create categories: ${error.message}`) }))
  }
  await Promise.all(writes)
}

async function writeTreeTestContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.treeNodes.length === 0) return
  const tempToRealId = new Map<string, string>()
  const nodesWithIds = draft.treeNodes.map((n, i) => {
    const realId = crypto.randomUUID()
    tempToRealId.set(n.tempId, realId)
    return { tempId: n.tempId, id: realId, label: n.label, parentTempId: n.parentTempId, position: i }
  })
  const resolvedNodes = nodesWithIds.map((n) => ({
    id: n.id, label: n.label, parent_id: n.parentTempId ? (tempToRealId.get(n.parentTempId) ?? null) : null, position: n.position,
  }))
  const { error: nodesError } = await bulkUpdateTreeNodes(supabase as any, studyId, resolvedNodes)
  if (nodesError) throw new Error(`Failed to create tree nodes: ${nodesError.message}`)
  if (draft.treeTasks.length > 0) {
    const tasksWithIds = draft.treeTasks.map((t, i) => ({
      id: crypto.randomUUID(), question: t.question, correct_node_id: t.correctNodeTempId ? (tempToRealId.get(t.correctNodeTempId) ?? null) : null, position: i,
    }))
    const { error: tasksError } = await bulkUpdateTasks(supabase as any, studyId, tasksWithIds)
    if (tasksError) throw new Error(`Failed to create tree test tasks: ${tasksError.message}`)
  }
}

async function writeSurveyContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.surveyQuestions.length === 0) return
  const questions = draft.surveyQuestions.map((q, i) => {
    const config = ensureOptionIds(normalizeOptionLabels(q.config ?? {}))
    return {
      id: crypto.randomUUID(), section: 'survey' as const, position: i,
      question_type: q.questionType, question_text: q.questionText,
      description: q.description ?? null, is_required: q.isRequired !== false, config,
    }
  })
  const { error } = await bulkUpdateFlowQuestions(supabase as any, studyId, questions, 'survey')
  if (error) throw new Error(`Failed to create survey questions: ${error.message}`)
}

async function writeLiveWebsiteContent(supabase: SupabaseClient, studyId: string, draft: DraftStudy): Promise<void> {
  if (draft.liveWebsiteTasks.length === 0) return
  const tasks = draft.liveWebsiteTasks.map((t, i) => ({
    id: crypto.randomUUID(), title: t.title, instructions: t.instructions ?? '',
    target_url: t.targetUrl, success_url: t.successUrl ?? null,
    success_criteria_type: (t.successCriteriaType as 'self_reported' | 'url_match' | 'exact_path') ?? 'self_reported',
    success_path: null, time_limit_seconds: t.timeLimitSeconds ?? null, order_position: i,
  }))
  await saveLiveWebsiteTasks(supabase as any, studyId, tasks)
}

// ---------------------------------------------------------------------------
// Creation summary builder
// ---------------------------------------------------------------------------

function buildCreationSummary(draft: DraftStudy): { summary: string } & Record<string, unknown> {
  switch (draft.studyType) {
    case 'card_sort':
      return { cards_created: draft.cards.length, categories_created: draft.categories.length, summary: `${draft.cards.length} cards${draft.categories.length > 0 ? ` and ${draft.categories.length} categories` : ''} created.` }
    case 'tree_test':
      return { nodes_created: draft.treeNodes.length, tasks_created: draft.treeTasks.length, summary: `${draft.treeNodes.length} tree nodes and ${draft.treeTasks.length} tasks created.` }
    case 'survey':
      return { questions_created: draft.surveyQuestions.length, summary: `${draft.surveyQuestions.length} survey questions created.` }
    case 'first_click':
      return { summary: 'Study created. Upload images and add tasks in the builder.' }
    case 'first_impression':
      return { summary: 'Study created. Upload designs in the builder.' }
    case 'prototype_test':
      return { summary: 'Study created. Connect your Figma prototype and set up tasks in the builder.' }
    case 'live_website_test': {
      const websiteUrl = draft.settings.websiteUrl as string | undefined
      return { tasks_created: draft.liveWebsiteTasks.length, summary: `${draft.liveWebsiteTasks.length} live website task${draft.liveWebsiteTasks.length === 1 ? '' : 's'} created${websiteUrl ? ` for ${websiteUrl}` : ''}.` }
    }
    default:
      return { summary: 'Study created.' }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserOrgId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .limit(1)
  return memberships?.[0]?.organization_id ?? null
}
