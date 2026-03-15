/**
 * Recruit Content - Server Component
 *
 * Fetches recruitment data: sharing settings, analytics, participant stats.
 * Streams last after header is visible.
 *
 * Receives study + project metadata as props (fetched by page.tsx).
 * Fetches recruitment-specific data here.
 */

import 'server-only'
import type { Database } from '@veritio/study-types'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  calculateTimeEstimate,
  formatTimeEstimate,
  isSimpleQuestion,
  isComplexQuestion,
} from '@/lib/utils/time-estimate'
import type { StudyContentCounts } from '@/lib/utils/time-estimate'

// Client component
import { RecruitClient } from './recruit-client'

type Study = Database['public']['Tables']['studies']['Row']
type Project = Database['public']['Tables']['projects']['Row']

interface RecruitContentProps {
  studyId: string
  projectId: string
  study: Study
  project: Pick<Project, 'id' | 'name'>
}

/**
 * Fetch study content counts from DB and compute time estimate server-side.
 */
async function getTimeEstimateAndFlowSettings(studyId: string, studyType: string): Promise<{ timeEstimate: string; flowSettings: Record<string, any> }> {
  const supabase = createServiceRoleClient()

  // Fetch study settings + questions (shared across all study types)
  // Note: flow settings are stored inside the `settings` JSONB column at `settings.studyFlow`
  const [settingsResult, questionsResult] = await Promise.all([
    supabase.from('studies').select('settings').eq('id', studyId).single(),
    supabase.from('study_flow_questions').select('question_type, section').eq('study_id', studyId),
  ])

  const studySettings = (settingsResult.data?.settings ?? {}) as Record<string, any>
  const flowSettings = (studySettings?.studyFlow ?? {}) as Record<string, any>
  const questions = questionsResult.data ?? []

  // Classify questions
  let simpleCount = 0
  let complexCount = 0
  for (const q of questions) {
    if (isSimpleQuestion(q.question_type)) simpleCount++
    else if (isComplexQuestion(q.question_type)) complexCount++
    else simpleCount++ // default unknown
  }

  // Activity-specific counts (run in parallel)
  let cardCount = 0
  let categoryCount = 0
  let treeTaskCount = 0
  let prototypeTaskCount = 0
  let firstClickTaskCount = 0
  let designCount = 0
  let liveWebsiteTaskCount = 0
  let postTaskQuestionCount = 0

  switch (studyType) {
    case 'card_sort': {
      const [cardsRes, catsRes] = await Promise.all([
        supabase.from('cards').select('id', { count: 'exact', head: true }).eq('study_id', studyId),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('study_id', studyId),
      ])
      cardCount = cardsRes.count ?? 0
      categoryCount = catsRes.count ?? 0
      break
    }
    case 'tree_test': {
      const res = await supabase.from('tasks').select('post_task_questions').eq('study_id', studyId)
      const tasks = res.data ?? []
      treeTaskCount = tasks.length
      for (const t of tasks) {
        if (Array.isArray(t.post_task_questions)) postTaskQuestionCount += t.post_task_questions.length
      }
      break
    }
    case 'prototype_test': {
      const res = await supabase.from('prototype_test_tasks').select('post_task_questions').eq('study_id', studyId)
      const tasks = res.data ?? []
      prototypeTaskCount = tasks.length
      for (const t of tasks) {
        if (Array.isArray(t.post_task_questions)) postTaskQuestionCount += t.post_task_questions.length
      }
      break
    }
    case 'first_click': {
      const res = await supabase.from('first_click_tasks').select('post_task_questions').eq('study_id', studyId)
      const tasks = res.data ?? []
      firstClickTaskCount = tasks.length
      for (const t of tasks) {
        if (Array.isArray(t.post_task_questions)) postTaskQuestionCount += t.post_task_questions.length
      }
      break
    }
    case 'first_impression': {
      const res = await supabase.from('first_impression_designs').select('questions').eq('study_id', studyId)
      const designs = res.data ?? []
      designCount = designs.length
      for (const d of designs) {
        if (Array.isArray(d.questions)) postTaskQuestionCount += d.questions.length
      }
      break
    }
    case 'live_website_test': {
      const res = await (supabase as any).from('live_website_tasks').select('post_task_questions').eq('study_id', studyId)
      const tasks = (res.data ?? []) as { post_task_questions: unknown[] | null }[]
      liveWebsiteTaskCount = tasks.length
      for (const t of tasks) {
        if (Array.isArray(t.post_task_questions)) postTaskQuestionCount += t.post_task_questions.length
      }
      break
    }
  }

  const counts: StudyContentCounts = {
    studyType,
    cardCount,
    categoryCount,
    treeTaskCount,
    prototypeTaskCount,
    firstClickTaskCount,
    designCount,
    liveWebsiteTaskCount,
    screeningQuestionCount: questions.filter((q) => q.section === 'screening').length,
    preStudyQuestionCount: questions.filter((q) => q.section === 'pre_study').length,
    postStudyQuestionCount: questions.filter((q) => q.section === 'post_study').length,
    surveyQuestionCount: questions.filter((q) => q.section === 'survey').length,
    simpleQuestionCount: simpleCount,
    complexQuestionCount: complexCount,
    hasWelcome: flowSettings?.welcome?.enabled ?? false,
    hasThankYou: flowSettings?.thankYou?.enabled ?? false,
    hasInstructions: flowSettings?.activityInstructions?.enabled ?? false,
    postTaskQuestionCount,
  }

  return {
    timeEstimate: formatTimeEstimate(calculateTimeEstimate(counts)),
    flowSettings,
  }
}

export async function RecruitContent({ studyId, projectId, study, project }: RecruitContentProps) {
  // This server component passes through study metadata
  // Analytics data is fetched by the client component via hooks

  // Determine study code (prefer url_slug over share_code)
  const studyCode = study.url_slug || study.share_code || ''

  // Construct participant URL on server to avoid hydration mismatch
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
  const participantUrl = studyCode ? `${baseUrl}/s/${studyCode}` : ''

  // Compute time estimate and get flow settings (single DB query for settings)
  const { timeEstimate, flowSettings } = await getTimeEstimateAndFlowSettings(studyId, study.study_type || 'card_sort')

  // Check if email collection is enabled in participant identifier settings
  const identifier = flowSettings?.participantIdentifier
  const hasEmailEnabled = identifier?.type === 'demographic_profile' &&
    (identifier.demographicProfile?.sections ?? []).some((s: any) =>
      s.fields?.some((f: any) => f.fieldType === 'email' && f.enabled)
    )

  return (
    <RecruitClient
      studyId={studyId}
      projectId={projectId}
      study={study}
      project={project}
      studyCode={studyCode}
      participantUrl={participantUrl}
      baseUrl={baseUrl}
      timeEstimate={timeEstimate}
      hasEmailEnabled={hasEmailEnabled}
    />
  )
}
