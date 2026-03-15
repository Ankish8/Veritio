/**
 * Results Tabs - Server Component (Phase 2 Streaming)
 *
 * Fetches heavy results data: full responses + segments.
 * This component streams last (~1s) after header is visible.
 *
 * Reuses get-results-data.ts logic but split for streaming:
 * - Study metadata (cached from header)
 * - Full results data (by study type)
 * - Saved segments
 */

import 'server-only'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getStudyMetadata, getProjectMetadata } from '@/app/(dashboard)/lib/cached-queries'

// Import overview service functions
import { getCardSortOverview } from '@/services/results/card-sort-overview'
import { getTreeTestOverview } from '@/services/results/tree-test-overview'
import { getSurveyOverview } from '@/services/results/survey-overview'
import { getPrototypeTestOverview } from '@/services/results/prototype-test-overview'
import { getFirstClickOverview } from '@/services/results/first-click-overview'
import { getFirstImpressionOverview } from '@/services/results/first-impression-overview'
import { getLiveWebsiteOverview } from '@/services/results/live-website-overview'
import type { ResultsData } from './types'

// Client component
import { ResultsContentClient } from './results-content-client'

interface ResultsTabsProps {
  studyId: string
  projectId: string
}

export async function ResultsTabs({ studyId, projectId }: ResultsTabsProps) {
  const supabase = await createClient()

  // Reuse cached study metadata (deduped from header)
  const [study, project] = await Promise.all([
    getStudyMetadata(studyId),
    getProjectMetadata(projectId),
  ])

  // Parallel fetch of results, segments, and excluded participant IDs
  const [resultsData, segmentsData, excludedData] = await Promise.all([
    fetchResultsByType(supabase, studyId, study.study_type as string),
    supabase
      .from('study_segments')
      .select('*')
      .eq('study_id', studyId),
    supabase
      .from('participant_analysis_flags')
      .select('participant_id')
      .eq('study_id', studyId)
      .eq('is_excluded', true),
  ])

  if (resultsData.error || !resultsData.data) {
    throw new Error(resultsData.error?.message || 'Failed to fetch results')
  }

  const savedSegments = segmentsData.data || []
  const initialExcludedIds = (excludedData.data || []).map(f => f.participant_id)

  // Cast service response to frontend ResultsData type
  const results = resultsData.data as ResultsData

  // Determine if study has responses
  const hasResponses = calculateHasResponses(results)

  // Pass focused props to client component
  return (
    <ResultsContentClient
      projectId={projectId}
      studyId={studyId}
      study={study}
      project={project}
      results={results}
      savedSegments={savedSegments}
      hasResponses={hasResponses}
      initialExcludedIds={initialExcludedIds}
    />
  )
}

// ============================================================================
// Results Fetching (extracted from get-results-data.ts)
// ============================================================================

/**
 * Route to correct overview service function based on study type.
 *
 * NOTE: Uses service role client to bypass RLS. This is safe because:
 * 1. This function is only called from authenticated dashboard routes
 * 2. Study ownership is verified before this point
 * 3. Results tables don't have read RLS policies for authenticated users
 */
async function fetchResultsByType(
  _supabase: any,
  studyId: string,
  studyType: string
) {
  // Use service role client to bypass RLS for results fetching
  // Cookie-based client can't read prototype_test_task_attempts due to missing RLS policy
  const serviceClient = createServiceRoleClient()

  switch (studyType) {
    case 'card_sort':
      return getCardSortOverview(serviceClient, studyId)

    case 'tree_test':
      return getTreeTestOverview(serviceClient, studyId)

    case 'survey':
      return getSurveyOverview(serviceClient, studyId)

    case 'prototype_test':
      return getPrototypeTestOverview(serviceClient, studyId)

    case 'first_click':
      return getFirstClickOverview(serviceClient, studyId)

    case 'first_impression':
      return getFirstImpressionOverview(serviceClient, studyId)

    case 'live_website_test':
      return getLiveWebsiteOverview(serviceClient, studyId)

    default:
      // Fallback to card sort for unknown types
      return getCardSortOverview(serviceClient, studyId)
  }
}

/**
 * Check if study has completed participants
 */
function calculateHasResponses(results: ResultsData): boolean {
  const study = results.study as any

  // Tree Test
  if (study.study_type === 'tree_test') {
    const metrics = (results as any).metrics
    return metrics?.completedParticipants > 0
  }

  // Survey
  if (study.study_type === 'survey') {
    const stats = (results as any).stats
    return stats?.completedParticipants > 0
  }

  // Prototype Test
  if (study.study_type === 'prototype_test') {
    const metrics = (results as any).metrics
    return metrics?.completedParticipants > 0
  }

  // First Click
  if (study.study_type === 'first_click') {
    const metrics = (results as any).metrics
    return metrics?.completedParticipants > 0
  }

  // First Impression
  if (study.study_type === 'first_impression') {
    const metrics = (results as any).metrics
    return metrics?.completedParticipants > 0
  }

  // Live Website Test
  if (study.study_type === 'live_website_test') {
    const metrics = (results as any).metrics
    return metrics?.completedParticipants > 0
  }

  // Card Sort (default)
  const stats = (results as any).stats
  return stats?.completedParticipants > 0
}
