/**
 * Server-Side Data Fetching for Builder Pages
 *
 * Consolidates all builder data fetching into a single server function.
 * Fetches study metadata, project info, content (cards/nodes/tasks/etc), and flow questions.
 *
 * This replaces the client-side useBuilderData hook for SSR performance.
 */

import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Database,
  Study,
  Card,
  Category,
  CardSortSettings,
  TreeNode,
  Task,
  TreeTestSettings,
  PrototypeTestSettings,
  StudyFlowQuestionRow,
  StudyFlowSettings,
} from '@veritio/study-types'
import type {
  FirstImpressionDesign,
  ExtendedCardSortSettings,
  ExtendedTreeTestSettings,
  ExtendedPrototypeTestSettings,
  ExtendedFirstImpressionSettings,
} from '@veritio/study-types/study-flow-types'
import { DEFAULT_FIRST_IMPRESSION_SETTINGS } from '@veritio/study-types/study-flow-types'

// Service imports
import { listCards } from '@/services/card-service'
import { listCategories } from '@/services/category-service'
import { listTreeNodes } from '@/services/tree-node-service'
import { listTasks } from '@/services/task-service'
import { listFlowQuestions } from '@/services/flow-question-service'
import { getPrototype, listFrames } from '@/services/prototype-service'
import { listPrototypeTasks, invalidatePrototypeTasksCache } from '@/services/prototype-task-service'
import { listDesigns } from '@/services/first-impression-service'
import { migrateToStudyFlowSettings } from '@/lib/study-flow/defaults'

// ============================================================================
// Type Definitions
// ============================================================================

/** Base data shared by all study types */
interface BaseBuilderServerData {
  study: Study
  project: {
    id: string
    name: string
  }
  flowQuestions: {
    screening: StudyFlowQuestionRow[]
    preStudy: StudyFlowQuestionRow[]
    postStudy: StudyFlowQuestionRow[]
    survey: StudyFlowQuestionRow[]
  }
  flowSettings: StudyFlowSettings
}

/** Discriminated union for study-type-specific content */
export type BuilderServerData =
  | (BaseBuilderServerData & {
      studyType: 'card_sort'
      content: {
        cards: Card[]
        categories: Category[]
        settings: CardSortSettings
      }
    })
  | (BaseBuilderServerData & {
      studyType: 'tree_test'
      content: {
        nodes: TreeNode[]
        tasks: Task[]
        settings: TreeTestSettings
      }
    })
  | (BaseBuilderServerData & {
      studyType: 'prototype_test'
      content: {
        prototype: any | null
        frames: any[]
        tasks: any[]
        settings: PrototypeTestSettings
      }
    })
  | (BaseBuilderServerData & {
      studyType: 'first_click'
      content: {
        tasks: any[]
        settings: any
      }
    })
  | (BaseBuilderServerData & {
      studyType: 'first_impression'
      content: {
        designs: FirstImpressionDesign[]
        settings: any
      }
    })
  | (BaseBuilderServerData & {
      studyType: 'survey'
      content: null
    })

// ============================================================================
// Main Server Function
// ============================================================================

/**
 * Fetches all builder data server-side for a given study.
 *
 * @param supabase - Server-side Supabase client (cookie-based, RLS-aware)
 * @param studyId - Study ID to fetch data for
 * @returns Complete builder data structure
 * @throws Error if study not found, unauthorized, or invalid study type
 */
export async function getBuilderDataForStudy(
  supabase: SupabaseClient<Database>,
  studyId: string
): Promise<BuilderServerData> {
  // 1. Fetch study with RLS check
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    throw new Error('Study not found or access denied')
  }

  // 2. Fetch project and flow questions in parallel
  const [projectResult, flowQuestionsResult] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', study.project_id).single(),
    listFlowQuestions(supabase, studyId),
  ])

  if (projectResult.error || !projectResult.data) {
    throw new Error('Project not found')
  }

  const project = projectResult.data

  // 3. Parse flow questions by section
  const allFlowQuestions = flowQuestionsResult.data || []
  const flowQuestions = {
    screening: allFlowQuestions.filter((q) => q.section === 'screening'),
    preStudy: allFlowQuestions.filter((q) => q.section === 'pre_study'),
    postStudy: allFlowQuestions.filter((q) => q.section === 'post_study'),
    survey: allFlowQuestions.filter((q) => q.section === 'survey'),
  }

  // 4. Extract or migrate flow settings
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as Record<string, any>

  const flowSettings =
    rawSettings.studyFlow ||
    migrateToStudyFlowSettings(
      (study as any).welcome_message,
      (study as any).thank_you_message,
      undefined,
      study.study_type as any
    )

  // 5. Fetch content based on study type
  const studyType = study.study_type as
    | 'card_sort'
    | 'tree_test'
    | 'prototype_test'
    | 'first_click'
    | 'first_impression'
    | 'survey'
  const content = await fetchContentByType(supabase, studyId, studyType, study)

  // 6. Build base data
  const baseData: BaseBuilderServerData = {
    study,
    project,
    flowQuestions,
    flowSettings,
  }

  // 7. Return discriminated union based on study type
  return {
    ...baseData,
    studyType,
    content,
  } as BuilderServerData
}

// ============================================================================
// Content Fetchers
// ============================================================================

/**
 * Routes to the correct content fetcher based on study type
 */
async function fetchContentByType(
  supabase: SupabaseClient<Database>,
  studyId: string,
  studyType: string,
  study: Study
): Promise<BuilderServerData['content']> {
  switch (studyType) {
    case 'card_sort':
      return fetchCardSortContent(supabase, studyId, study)

    case 'tree_test':
      return fetchTreeTestContent(supabase, studyId, study)

    case 'prototype_test':
      return fetchPrototypeTestContent(supabase, studyId, study)

    case 'first_click':
      return fetchFirstClickContent(supabase, studyId, study)

    case 'first_impression':
      return fetchFirstImpressionContent(supabase, studyId, study)

    case 'survey':
      return null

    default:
      throw new Error(`Unknown study type: ${studyType}`)
  }
}

/**
 * Fetch Card Sort content: cards, categories, settings
 */
async function fetchCardSortContent(
  supabase: SupabaseClient<Database>,
  studyId: string,
  study: Study
) {
  const [cardsResult, categoriesResult] = await Promise.all([
    listCards(supabase, studyId),
    listCategories(supabase, studyId),
  ])

  // Extract settings from study.settings (exclude studyFlow)
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as unknown as ExtendedCardSortSettings & { studyFlow?: StudyFlowSettings }

   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  // Provide defaults if settings are missing
  const settings: CardSortSettings = {
    mode: (baseSettings as any).mode || 'open',
    randomizeCards: (baseSettings as any).randomizeCards ?? true,
    allowSkip: (baseSettings as any).allowSkip ?? false,
    showProgress: (baseSettings as any).showProgress ?? true,
  }

  return {
    cards: cardsResult.data || [],
    categories: categoriesResult.data || [],
    settings,
  }
}

/**
 * Fetch Tree Test content: nodes, tasks, settings
 */
async function fetchTreeTestContent(
  supabase: SupabaseClient<Database>,
  studyId: string,
  study: Study
) {
  const [nodesResult, tasksResult] = await Promise.all([
    listTreeNodes(supabase, studyId),
    listTasks(supabase, studyId),
  ])

  // Extract settings from study.settings (exclude studyFlow)
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as unknown as ExtendedTreeTestSettings & { studyFlow?: StudyFlowSettings }

   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  // Provide defaults if settings are missing
  const settings: TreeTestSettings = {
    randomizeTasks: (baseSettings as any).randomizeTasks ?? false,
    showBreadcrumbs: (baseSettings as any).showBreadcrumbs ?? true,
    allowBack: (baseSettings as any).allowBack ?? true,
    showTaskProgress: (baseSettings as any).showTaskProgress ?? true,
  }

  return {
    nodes: nodesResult.data || [],
    tasks: tasksResult.data || [],
    settings,
  }
}

/**
 * Fetch Prototype Test content: prototype, frames, tasks, settings
 */
async function fetchPrototypeTestContent(
  supabase: SupabaseClient<Database>,
  studyId: string,
  study: Study
) {
  // Invalidate task cache before SSR load to ensure fresh data.
  // Saves go through Motia (port 4000) which invalidates its own process cache,
  // but this SSR code runs in the Next.js process (port 4001) with a separate cache.
  invalidatePrototypeTasksCache(studyId)

  const [prototypeResult, framesResult, tasksResult] = await Promise.all([
    getPrototype(supabase, studyId),
    listFrames(supabase, studyId),
    listPrototypeTasks(supabase, studyId),
  ])

  // Extract settings from study.settings (exclude studyFlow)
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as ExtendedPrototypeTestSettings & { studyFlow?: StudyFlowSettings }

   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  // Provide defaults if settings are missing
  const settings: PrototypeTestSettings = {
    randomizeTasks: baseSettings.randomizeTasks ?? true,
    allowSkipTasks: baseSettings.allowSkipTasks ?? true,
    showTaskProgress: baseSettings.showTaskProgress ?? true,
    dontRandomizeFirstTask: baseSettings.dontRandomizeFirstTask ?? true,
    clickableAreaFlashing: baseSettings.clickableAreaFlashing ?? true,
    tasksEndAutomatically: baseSettings.tasksEndAutomatically ?? true,
    showEachParticipantTasks: baseSettings.showEachParticipantTasks || 'all',
  }

  return {
    prototype: prototypeResult.data || null,
    frames: framesResult.data || [],
    tasks: tasksResult.data || [],
    settings,
  }
}

/**
 * Fetch First Click content: tasks (with nested images/AOIs), settings
 */
async function fetchFirstClickContent(
  supabase: SupabaseClient<Database>,
  studyId: string,
  study: Study
) {
  // Fetch tasks with nested images and AOIs (no service exists, query directly)
  const tasksResult = await supabase
    .from('first_click_tasks')
    .select(`
      *,
      image:first_click_images(*),
      aois:first_click_aois(*)
    `)
    .eq('study_id', studyId)
    .order('position')

  // Extract settings from study.settings (exclude studyFlow)
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as unknown as Record<string, any> & { studyFlow?: StudyFlowSettings }

   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  // Provide defaults if settings are missing
  const settings = {
    allowSkipTasks: baseSettings.allowSkipTasks ?? true,
    startTasksImmediately: baseSettings.startTasksImmediately ?? false,
    randomizeTasks: baseSettings.randomizeTasks ?? true,
    dontRandomizeFirstTask: baseSettings.dontRandomizeFirstTask ?? true,
    showEachParticipantTasks: baseSettings.showEachParticipantTasks || 'all',
    showTaskProgress: baseSettings.showTaskProgress ?? true,
    imageScaling: baseSettings.imageScaling || 'scale_on_small',
  }

  // Normalize tasks - Supabase join returns arrays for 1:1 relations
  const tasks = (tasksResult.data || []).map((task: any) => ({
    ...task,
    image: Array.isArray(task.image) ? task.image[0] ?? null : task.image ?? null,
    aois: Array.isArray(task.aois) ? task.aois : [],
  }))

  return {
    tasks,
    settings,
  }
}

/**
 * Fetch First Impression content: designs, settings
 */
async function fetchFirstImpressionContent(
  supabase: SupabaseClient<Database>,
  studyId: string,
  study: Study
) {
  const designsResult = await listDesigns(supabase, studyId)

  // Extract settings from study.settings (exclude studyFlow)
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as unknown as ExtendedFirstImpressionSettings & { studyFlow?: StudyFlowSettings }

   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  // Provide defaults if settings are missing
  const settings = {
    ...DEFAULT_FIRST_IMPRESSION_SETTINGS,
    ...baseSettings,
  }

  return {
    designs: designsResult.data || [],
    settings,
  }
}
