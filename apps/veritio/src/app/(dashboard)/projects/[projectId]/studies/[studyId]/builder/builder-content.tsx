/**
 * Builder Content - Server Component (Phase 3 Streaming)
 *
 * Fetches heavy data: flow questions + study-type-specific content.
 * This component streams last (~800ms) after header and nav are visible.
 *
 * Receives study + project metadata as props (fetched by BuilderShell).
 * Only fetches heavy data (flow questions + content).
 *
 * Reuses get-builder-data.ts logic but split for streaming:
 * - Flow questions (all sections)
 * - Content (cards/nodes/tasks/etc based on study type)
 * - Settings extraction
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { listFlowQuestions } from '@/services/flow-question-service'
import { listCards } from '@/services/card-service'
import { listCategories } from '@/services/category-service'
import { listTreeNodes } from '@/services/tree-node-service'
import { listTasks } from '@/services/task-service'
import { getPrototype, listFrames } from '@/services/prototype-service'
import { listPrototypeTasks, invalidatePrototypeTasksCache } from '@/services/prototype-task-service'
import { listDesigns } from '@/services/first-impression-service'
import { migrateToStudyFlowSettings } from '@/lib/study-flow/defaults'
import type {
  CardSortSettings,
  TreeTestSettings,
  PrototypeTestSettings,
  StudyFlowSettings,
} from '@veritio/study-types'
import type {
  ExtendedCardSortSettings,
  ExtendedTreeTestSettings,
} from '@veritio/study-types/study-flow-types'
import { DEFAULT_FIRST_IMPRESSION_SETTINGS } from '@veritio/study-types/study-flow-types'

// Client component
import { BuilderContentClient } from './builder-content-client'
import type { Database } from '@veritio/study-types'

type Study = Database['public']['Tables']['studies']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface BuilderContentProps {
  studyId: string
  projectId: string
  study: Study
  project: Pick<Project, 'id' | 'name' | 'organization_id'>
}

export async function BuilderContent({ studyId, projectId, study, project }: BuilderContentProps) {
  const supabase = await createClient()

  // Data received as props - no metadata fetching needed

  // Parallel fetch of flow questions and content
  const [flowQuestionsResult, content] = await Promise.all([
    listFlowQuestions(supabase, studyId),
    fetchContentByType(supabase, studyId, study.study_type as string, study),
  ])

  // Parse flow questions by section
  const allFlowQuestions = flowQuestionsResult.data || []
  const flowQuestions = {
    screening: allFlowQuestions.filter((q) => q.section === 'screening'),
    preStudy: allFlowQuestions.filter((q) => q.section === 'pre_study'),
    postStudy: allFlowQuestions.filter((q) => q.section === 'post_study'),
    survey: allFlowQuestions.filter((q) => q.section === 'survey'),
  }

  // Extract flow settings
  const rawSettings = (study.settings && typeof study.settings === 'object' && !Array.isArray(study.settings)
    ? study.settings
    : {}) as Record<string, any>

  const flowSettings: StudyFlowSettings =
    rawSettings.studyFlow ||
    migrateToStudyFlowSettings(
      (study as any).welcome_message,
      (study as any).thank_you_message,
      undefined,
      study.study_type as any
    )

  // Pass focused props to client component (not monolithic initialData)
  return (
    <BuilderContentClient
      studyId={studyId}
      projectId={projectId}
      study={study}
      project={project}
      studyType={study.study_type as any}
      flowQuestions={flowQuestions}
      flowSettings={flowSettings}
      content={content}
    />
  )
}

// ============================================================================
// Content Fetching (extracted from get-builder-data.ts)
// ============================================================================

/**
 * Routes to correct content fetcher based on study type
 */
async function fetchContentByType(
  supabase: any,
  studyId: string,
  studyType: string,
  study: any
): Promise<any> {
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
    case 'live_website_test':
      return fetchLiveWebsiteContent(supabase, studyId, study)
    case 'survey':
      return null
    default:
      throw new Error(`Unknown study type: ${studyType}`)
  }
}

/**
 * Card Sort: cards + categories + settings
 */
async function fetchCardSortContent(supabase: any, studyId: string, study: any) {
  const [cardsResult, categoriesResult] = await Promise.all([
    listCards(supabase, studyId),
    listCategories(supabase, studyId),
  ])

  const rawSettings = (study.settings || {}) as ExtendedCardSortSettings & { studyFlow?: StudyFlowSettings }
   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

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
 * Tree Test: nodes + tasks + settings
 */
async function fetchTreeTestContent(supabase: any, studyId: string, study: any) {
  const [nodesResult, tasksResult] = await Promise.all([
    listTreeNodes(supabase, studyId),
    listTasks(supabase, studyId),
  ])

  const rawSettings = (study.settings || {}) as ExtendedTreeTestSettings & { studyFlow?: StudyFlowSettings }
   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

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
 * Prototype Test: prototype + frames + tasks + settings
 */
async function fetchPrototypeTestContent(supabase: any, studyId: string, study: any) {
  // Invalidate task cache before SSR load to ensure fresh data.
  // Saves go through Motia (port 4000) which invalidates its own process cache,
  // but this SSR code runs in the Next.js process (port 4001) with a separate cache.
  invalidatePrototypeTasksCache(studyId)

  const [prototypeResult, framesResult, tasksResult] = await Promise.all([
    getPrototype(supabase, studyId),
    listFrames(supabase, studyId),
    listPrototypeTasks(supabase, studyId),
  ])

  const rawSettings = (study.settings || {}) as any
   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  const settings: PrototypeTestSettings = {
    randomizeTasks: (baseSettings as any).randomizeTasks ?? false,
    allowSkipTasks: (baseSettings as any).allowSkipTasks ?? true,
    showTaskProgress: (baseSettings as any).showTaskProgress ?? true,
    dontRandomizeFirstTask: (baseSettings as any).dontRandomizeFirstTask ?? false,
  }

  return {
    prototype: prototypeResult.data,
    frames: framesResult.data || [],
    tasks: tasksResult.data || [],
    settings,
  }
}

/**
 * First Click: tasks (with images/AOIs)
 */
async function fetchFirstClickContent(supabase: any, studyId: string, study: any) {
  const { data: tasks } = await supabase
    .from('first_click_tasks')
    .select('*, image:first_click_images(*), aois:first_click_aois(*)')
    .eq('study_id', studyId)
    .order('position')

  const rawSettings = (study.settings || {}) as any
   
  const { studyFlow: _studyFlow2, ...settings } = rawSettings

  return {
    tasks: (tasks || []).map((task: any) => ({
      ...task,
      image: Array.isArray(task.image) ? task.image[0] || null : task.image,
      aois: task.aois || [],
    })),
    settings: settings || {},
  }
}

/**
 * First Impression: designs + settings
 */
async function fetchFirstImpressionContent(supabase: any, studyId: string, study: any) {
  const designsResult = await listDesigns(supabase, studyId)

  const rawSettings = (study.settings || {}) as any
   
  const { studyFlow: _studyFlow, ...baseSettings } = rawSettings

  const settings = {
    ...DEFAULT_FIRST_IMPRESSION_SETTINGS,
    ...(baseSettings || {}),
  }

  return {
    designs: designsResult.data || [],
    settings,
  }
}

/**
 * Live Website Test: tasks + settings
 */
async function fetchLiveWebsiteContent(supabase: any, studyId: string, study: any) {
  const rawSettings = (study.settings || {}) as any
  const { studyFlow: _studyFlow, ...settings } = rawSettings
  const abTestingEnabled = settings.abTestingEnabled === true

  const fetches: Promise<any>[] = [
    supabase
      .from('live_website_tasks')
      .select('*')
      .eq('study_id', studyId)
      .order('order_position'),
  ]

  if (abTestingEnabled) {
    fetches.push(
      supabase.from('live_website_variants').select('*').eq('study_id', studyId).order('position'),
      supabase.from('live_website_task_variants').select('*').eq('study_id', studyId),
    )
  }

  const [tasksResult, variantsResult, taskVariantsResult] = await Promise.all(fetches)

  return {
    tasks: tasksResult.data || [],
    settings: settings || {},
    variants: variantsResult?.data || [],
    taskVariants: taskVariantsResult?.data || [],
  }
}

