/**
 * Cached Query Utilities for RSC Streaming
 *
 * Provides React cache() wrapped queries with request-scoped performance logging.
 * Uses React cache() for automatic per-request isolation (no module-level state).
 *
 * CRITICAL: React cache() deduplicates within a single request.
 * Multiple boundaries calling the same cached function will only execute once.
 */

import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { trackQuery } from '@/lib/observability/query-tracking'

// Development-only performance logging
const DEV_PERF_LOGGING = process.env.NODE_ENV === 'development'

/**
 * Get study metadata (lightweight select for header/nav)
 *
 * Used by multiple boundaries - React cache() ensures single query per request
 */
export const getStudyMetadata = cache(async (studyId: string) => {
  // Track query start
  if (DEV_PERF_LOGGING) {
    await trackQuery('getStudyMetadata', studyId)
  }

  // Use service role to bypass RLS - Better Auth sessions don't set JWT claims
  // that Supabase RLS expects. Permission checks happen at the app layer.
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('studies')
    .select('*')
    .eq('id', studyId)
    .single()

  // Handle "not found" vs other errors differently
  if (error) {
    // PGRST116 = "JSON object requested, multiple (or no) rows returned"
    // This means the study doesn't exist or user has no access
    if (error.code === 'PGRST116') {
      notFound()
    }
    throw new Error(`Failed to fetch study: ${error.message}`)
  }

  return data
})

/**
 * Get project metadata (name only, for header)
 */
export const getProjectMetadata = cache(async (projectId: string) => {
  // Track query start
  if (DEV_PERF_LOGGING) {
    await trackQuery('getProjectMetadata', projectId)
  }

  // Use service role to bypass RLS - Better Auth sessions don't set JWT claims
  // that Supabase RLS expects. Permission checks happen at the app layer.
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, organization_id')
    .eq('id', projectId)
    .single()

  // Handle "not found" vs other errors differently
  if (error) {
    if (error.code === 'PGRST116') {
      notFound()
    }
    throw new Error(`Failed to fetch project: ${error.message}`)
  }

  return data
})
