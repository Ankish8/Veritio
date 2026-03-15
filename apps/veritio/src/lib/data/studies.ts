import 'server-only'

import { cache } from 'react'
import { createServiceRoleClient } from '../supabase/server'
import { getServerUserId } from '@veritio/auth/server'

export interface Study {
  id: string
  project_id: string
  title: string
  description: string | null
  study_type: 'card_sort' | 'tree_test'
  status: 'draft' | 'active' | 'paused' | 'completed'
  settings: Record<string, unknown> | null
  welcome_message: string | null
  thank_you_message: string | null
  share_code: string
  user_id: string
  created_at: string
  updated_at: string
  launched_at: string | null
}

/**
 * Get all studies for a project.
 * Uses organization-based access control via project ownership.
 * Uses React cache() for request deduplication.
 */
export const getStudiesByProject = cache(async (projectId: string): Promise<Study[]> => {
  const userId = await getServerUserId()
  if (!userId) return []

  const supabase = createServiceRoleClient()

  // First verify user has access to the project via organization membership
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) return []

  // Verify project belongs to one of user's organizations
  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .in('organization_id', orgIds)
    .single()

  if (!project) return []

  // Fetch studies for this project (no user_id filter needed)
  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching studies:', error)
    return []
  }

  return (data || []) as Study[]
})

/**
 * Study with participant count for display in tables/lists.
 * Matches the shape expected by useStudies hook.
 */
export interface StudyWithCount {
  id: string
  project_id: string | null
  title: string
  description: string | null
  study_type: string
  status: string
  share_code: string | null
  user_id: string | null
  settings: unknown
  welcome_message: string | null
  thank_you_message: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  launched_at: string | null
  email_notification_settings: unknown
  response_prevention_settings: unknown
  participant_count: number
  purpose: string | null
  branding: unknown
}


export interface StudiesPage {
  data: StudyWithCount[]
  hasMore: boolean
}

/**
 * Get studies for a project with participant counts.
 * Supports optional limit for server-side pagination (first page only on SSR).
 * Uses organization-based access control via project ownership.
 * Uses React cache() for request deduplication.
 */
export const getStudiesByProjectWithCount = cache(async (
  projectId: string,
  options?: { limit?: number }
): Promise<StudiesPage> => {
  const userId = await getServerUserId()
  if (!userId) return { data: [], hasMore: false }

  const supabase = createServiceRoleClient()

  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) return { data: [], hasMore: false }

  const { data: project } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .in('organization_id', orgIds)
    .single()

  if (!project) return { data: [], hasMore: false }

  const limit = options?.limit
  const fetchLimit = limit ? limit + 1 : undefined

  let query = supabase
    .from('studies')
    .select(`
      id,
      project_id,
      title,
      description,
      study_type,
      status,
      share_code,
      user_id,
      settings,
      welcome_message,
      thank_you_message,
      is_archived,
      created_at,
      updated_at,
      launched_at,
      email_notification_settings,
      response_prevention_settings,
      purpose,
      branding,
      participants(count)
    `)
    .eq('project_id', projectId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })

  if (fetchLimit) {
    query = query.limit(fetchLimit)
  }

  const { data, error } = await query

  if (error) {
    return { data: [], hasMore: false }
  }

  const hasMore = limit ? (data ?? []).length > limit : false
  const rows = hasMore ? (data ?? []).slice(0, limit) : (data ?? [])

  return {
    hasMore,
    data: rows.map((study) => ({
      id: study.id,
      project_id: study.project_id,
      title: study.title,
      description: study.description,
      study_type: study.study_type,
      status: study.status ?? 'draft',
      share_code: study.share_code,
      user_id: study.user_id,
      settings: study.settings,
      welcome_message: study.welcome_message,
      thank_you_message: study.thank_you_message,
      is_archived: study.is_archived,
      created_at: study.created_at,
      updated_at: study.updated_at,
      launched_at: study.launched_at,
      email_notification_settings: study.email_notification_settings,
      response_prevention_settings: study.response_prevention_settings,
      purpose: study.purpose,
      branding: study.branding,
      participant_count: Array.isArray(study.participants)
        ? (study.participants[0] as { count: number } | undefined)?.count ?? 0
        : 0,
    })),
  }
})

/**
 * Get a single study by ID.
 * Uses organization-based access control via project ownership.
 * Uses React cache() for request deduplication.
 */
export const getStudy = cache(async (studyId: string): Promise<Study | null> => {
  const userId = await getServerUserId()
  if (!userId) return null

  const supabase = createServiceRoleClient()

  // Get user's organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) return null

  // Fetch study with organization check
  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .in('organization_id', orgIds)
    .single()

  if (error) {
    console.error('Error fetching study:', error)
    return null
  }

  return data as Study
})

/**
 * Get study with all related data for builder (cards, categories, or nodes, tasks)
 * Uses organization-based access control via project ownership.
 * Single query to avoid N+1 pattern
 */
export const getStudyWithData = cache(async (studyId: string) => {
  const userId = await getServerUserId()
  if (!userId) return null

  const supabase = createServiceRoleClient()

  // Get user's organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) return null

  // Fetch study with organization check
  const { data, error: studyError } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .in('organization_id', orgIds)
    .single()

  if (studyError || !data) {
    console.error('Error fetching study:', studyError)
    return null
  }

  const study = data as any

  // Fetch related data based on study type
  if (study.study_type === 'card_sort') {
    const [cardsRes, categoriesRes] = await Promise.all([
      supabase
        .from('cards')
        .select('*')
        .eq('study_id', studyId)
        .order('position', { ascending: true }),
      supabase
        .from('categories')
        .select('*')
        .eq('study_id', studyId)
        .order('position', { ascending: true }),
    ])

    return {
      study,
      cards: cardsRes.data || [],
      categories: categoriesRes.data || [],
      nodes: [],
      tasks: [],
    }
  } else {
    const [nodesRes, tasksRes] = await Promise.all([
      supabase
        .from('tree_nodes')
        .select('*')
        .eq('study_id', studyId)
        .order('position', { ascending: true }),
      supabase
        .from('tasks')
        .select('*')
        .eq('study_id', studyId)
        .order('position', { ascending: true }),
    ])

    return {
      study,
      cards: [],
      categories: [],
      nodes: nodesRes.data || [],
      tasks: tasksRes.data || [],
    }
  }
})

/**
 * Get participant statistics for a study
 * Uses organization-based access control via project ownership.
 */
export const getStudyStats = cache(async (studyId: string) => {
  const userId = await getServerUserId()
  if (!userId) return { total: 0, completed: 0, inProgress: 0 }

  const supabase = createServiceRoleClient()

  // Get user's organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) return { total: 0, completed: 0, inProgress: 0 }

  // Verify study access via organization
  const { data: study } = await supabase
    .from('studies')
    .select('id')
    .eq('id', studyId)
    .in('organization_id', orgIds)
    .single()

  if (!study) return { total: 0, completed: 0, inProgress: 0 }

  const { data: participants } = await supabase
    .from('participants')
    .select('id, completed_at')
    .eq('study_id', studyId)

  if (!participants) return { total: 0, completed: 0, inProgress: 0 }

  const total = participants.length
  const completed = participants.filter((p) => p.completed_at).length
  const inProgress = total - completed

  return { total, completed, inProgress }
})

/**
 * Study with project name for cross-project views (e.g., /studies page).
 * Matches the shape expected by useAllStudies hook.
 */
export interface StudyWithProject {
  id: string
  title: string
  study_type: string
  status: string
  user_id: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  launched_at: string | null
  project_id: string
  project_name: string
  participant_count: number
}

/**
 * Get all studies across all projects for the current user.
 * Uses organization-based access control - shows all studies in user's organizations.
 * Uses React cache() for request deduplication.
 *
 * Optimized for /studies page with project_name join.
 */
export const getAllStudies = cache(async (): Promise<StudyWithProject[]> => {
  const userId = await getServerUserId()
  if (!userId) return []

  const supabase = createServiceRoleClient()

  // Get all organizations the user belongs to
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    console.error('Error fetching organization memberships:', memberError.message)
    return []
  }

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) {
    return []
  }

  // Fetch studies with project names using inner join
  // This filters to only studies in projects the user has access to
  const { data, error } = await supabase
    .from('studies')
    .select(`
      id,
      title,
      study_type,
      status,
      user_id,
      is_archived,
      created_at,
      updated_at,
      launched_at,
      project_id,
      projects!inner(name),
      participants(count)
    `)
    .in('organization_id', orgIds)
    .eq('is_archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching all studies:', error.message, error.code)
    return []
  }

  // Transform the data to include project_name and participant_count
  return (data || []).map((study) => {
    const projects = study.projects as any
    const participants = study.participants as any[]

    return {
      id: study.id,
      title: study.title,
      study_type: study.study_type,
      status: study.status || 'draft',
      user_id: study.user_id,
      is_archived: study.is_archived,
      created_at: study.created_at,
      updated_at: study.updated_at,
      launched_at: study.launched_at,
      project_id: study.project_id,
      project_name: projects?.name || 'Unknown Project',
      participant_count: participants?.[0]?.count ?? 0,
    }
  })
})
