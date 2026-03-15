import 'server-only'

import { cache } from 'react'
import { createServiceRoleClient } from '../supabase/server'
import { getServerUserId } from '@veritio/auth/server'

export interface ProjectWithStudyCount {
  id: string
  name: string
  description: string | null
  user_id: string | null
  organization_id: string | null
  visibility: string | null
  is_archived: boolean
  created_at: string | null
  updated_at: string | null
  study_count: number
}

/**
 * Get all projects for the current user.
 * Uses organization-based access control - shows all projects in user's organizations.
 * Uses React cache() for request deduplication.
 */
export const getProjects = cache(async (): Promise<ProjectWithStudyCount[]> => {
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
    // User has no organizations - return empty
    return []
  }

  // Use count subquery to avoid transferring all study rows
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      user_id,
      organization_id,
      visibility,
      is_archived,
      created_at,
      updated_at,
      studies(count)
    `)
    .in('organization_id', orgIds)
    .eq('is_archived', false)
    .eq('studies.is_archived', false)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error.message, error.code)
    return []
  }

  return (data || []).map((project) => {
    const countResult = project.studies as unknown as Array<{ count: number }>
    return {
      ...project,
      study_count: countResult?.[0]?.count ?? 0,
      studies: undefined,
    }
  })
})

/**
 * Get a single project by ID.
 * Uses organization-based access control - verifies user has access via organization membership.
 * Uses React cache() for request deduplication.
 */
export const getProject = cache(async (projectId: string): Promise<ProjectWithStudyCount | null> => {
  const userId = await getServerUserId()
  if (!userId) {
    return null
  }

  const supabase = createServiceRoleClient()

  // Get all organizations the user belongs to
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .not('joined_at', 'is', null)

  if (memberError) {
    console.error('[getProject] Error fetching organization memberships:', memberError.message)
    return null
  }

  const orgIds = memberships?.map((m) => m.organization_id) || []

  if (orgIds.length === 0) {
    return null
  }

  // Query the project directly with organization filter
  // Use .maybeSingle() instead of .single() to avoid PGRST116 errors
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .in('organization_id', orgIds)
    .maybeSingle()

  if (error) {
    console.error('[getProject] Error fetching project:', {
      message: error.message,
      code: error.code,
      hint: error.hint,
      details: error.details,
      projectId,
      orgIds,
    })
    return null
  }

  if (!data) {
    return null
  }

  // Get study count separately to avoid the PGRST116 error with count aggregation
  const { count: studyCount } = await supabase
    .from('studies')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('is_archived', false)

  return {
    ...data,
    study_count: studyCount || 0,
  }
})
