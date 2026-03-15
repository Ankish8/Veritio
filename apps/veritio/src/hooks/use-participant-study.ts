'use client'

import useSWR from 'swr'
import type { BrandingSettings } from '@/components/builders/shared/types'
import type { StudyFlowQuestion } from '@veritio/study-types/study-flow-types'
import type { Card, Category, TreeNode, Task, Study, PrototypeTestPrototype, PrototypeTestFrame, PrototypeTestTask, FirstClickTask, FirstClickImage, FirstClickAOI } from '@veritio/study-types'
import type { SurveyRule } from '@/lib/supabase/survey-rules-types'

export interface ParticipantStudyData extends Omit<Study, 'branding'> {
  cards: Card[]
  categories: Category[]
  tree_nodes: TreeNode[]
  tasks: Task[]
  screening_questions: StudyFlowQuestion[]
  pre_study_questions: StudyFlowQuestion[]
  post_study_questions: StudyFlowQuestion[]
  survey_questions: StudyFlowQuestion[]
  branding?: BrandingSettings | null
  // PERFORMANCE: Pre-loaded survey rules (for survey type only)
  survey_rules?: SurveyRule[]
  // Prototype test data
  prototype_test_prototype?: PrototypeTestPrototype | null
  prototype_test_frames?: PrototypeTestFrame[]
  prototype_test_tasks?: PrototypeTestTask[]
  prototype_test_component_instances?: Array<{
    instance_id: string
    frame_node_id: string
    relative_x: number
    relative_y: number
    width?: number | null
    height?: number | null
  }>
  // First-click test data
  first_click_tasks?: Array<FirstClickTask & {
    image: FirstClickImage | null
    aois: FirstClickAOI[]
  }>
  // Live website test data
  live_website_tasks?: Array<{
    id: string
    title: string
    instructions: string
    target_url: string
    success_url: string | null
    success_criteria_type: 'self_reported' | 'url_match' | 'exact_path'
    success_path: unknown
    time_limit_seconds: number | null
    order_position: number
    post_task_questions: unknown
  }>
  // AB testing variants (live website test)
  live_website_variants?: Array<{
    id: string
    name: string
    url: string
    weight: number
    position: number
  }>
  // AB testing task variants (live website test) — per-variant overrides
  live_website_task_variants?: Array<{
    task_id: string
    variant_id: string
    starting_url?: string | null
    success_criteria_type?: string
    success_url?: string | null
    success_path?: unknown
    time_limit_seconds?: number | null
  }>
  // Assigned variant for this participant (live website test AB testing)
  assigned_variant_id?: string | null
}

export interface PasswordRequiredResponse {
  password_required: true
  study_id: string
  title: string
  branding: BrandingSettings | null
}

export function isPasswordRequired(data: unknown): data is PasswordRequiredResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'password_required' in data &&
    (data as Record<string, unknown>).password_required === true
  )
}

interface UseParticipantStudyOptions {
  studyCode: string
  password?: string
  isPreview?: boolean
  /** Skip the fetch entirely (e.g., when we have server-side data) */
  skip?: boolean
}

interface UseParticipantStudyResult {
  study: ParticipantStudyData | null
  passwordRequired: PasswordRequiredResponse | null
  isLoading: boolean
  error: string | null
  /** True when the error is specifically a password validation error (401) */
  isPasswordError: boolean
  refetch: () => void
}

function buildCacheKey(studyCode: string, password?: string, isPreview?: boolean): string {
  const params = new URLSearchParams()
  if (isPreview) params.set('preview', 'true')
  if (password) params.set('password', password)
  const queryString = params.toString()
  return `/api/participate/${studyCode}${queryString ? `?${queryString}` : ''}`
}

async function participantStudyFetcher(url: string): Promise<{
  data: ParticipantStudyData | PasswordRequiredResponse
  abVariants?: Array<{ id: string; name: string; url: string; weight: number; position: number }>
  abTaskVariants?: Array<{
    task_id: string
    variant_id: string
    starting_url?: string | null
    success_criteria_type?: string
    success_url?: string | null
    success_path?: unknown
    time_limit_seconds?: number | null
  }>
}> {
  const response = await fetch(url)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('INCORRECT_PASSWORD')
    }
    const errorData = await response.json().catch(() => ({ error: 'Failed to load study' }))
    throw new Error(errorData.error || 'Study not found')
  }

  return response.json()
}

/** Fetches participant study data with SWR caching and password handling. */
export function useParticipantStudy({
  studyCode,
  password,
  isPreview,
  skip = false,
}: UseParticipantStudyOptions): UseParticipantStudyResult {
  const cacheKey = skip ? null : buildCacheKey(studyCode, password, isPreview)

  const { data, error, isLoading, mutate } = useSWR(
    cacheKey,
    participantStudyFetcher,
    {
      // Participant-specific settings - longer cache, no auto-revalidation
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 60 seconds
      shouldRetryOnError: false, // Don't retry on password errors
    }
  )

  let study: ParticipantStudyData | null = null
  let passwordRequired: PasswordRequiredResponse | null = null

  if (data?.data) {
    if (isPasswordRequired(data.data)) {
      passwordRequired = data.data
    } else {
      const baseStudy = data.data as ParticipantStudyData
      // Merge abVariants from GET response into live_website_variants
      study = data.abVariants?.length
        ? { ...baseStudy, live_website_variants: data.abVariants }
        : baseStudy

      // Merge abTaskVariants: store on study so player client can apply per-variant overrides
      if (data.abTaskVariants?.length) {
        study = { ...study, live_website_task_variants: data.abTaskVariants } as ParticipantStudyData
      }
    }
  }

  const isPasswordError = error?.message === 'INCORRECT_PASSWORD'
  const errorMessage = isPasswordError
    ? 'Incorrect password. Please try again.'
    : error?.message || null

  return {
    study,
    passwordRequired,
    isLoading,
    error: errorMessage,
    isPasswordError,
    refetch: () => mutate(),
  }
}
