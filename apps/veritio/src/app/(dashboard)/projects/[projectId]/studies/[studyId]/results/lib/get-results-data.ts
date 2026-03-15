import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, StudySegment } from '@veritio/study-types'
import type { ResultsData } from '../types'
import { createServiceRoleClient } from '@/lib/supabase/server'

import { getCardSortOverview } from '@/services/results/card-sort-overview'
import { getTreeTestOverview } from '@/services/results/tree-test-overview'
import { getSurveyOverview } from '@/services/results/survey-overview'
import { getPrototypeTestOverview } from '@/services/results/prototype-test-overview'
import { getFirstClickOverview } from '@/services/results/first-click-overview'
import { getFirstImpressionOverview } from '@/services/results/first-impression-overview'

export interface ResultsServerData {
  results: ResultsData
  projectName: string
  savedSegments: StudySegment[]
  hasResponses: boolean
}

export async function getResultsDataForStudy(
  supabase: SupabaseClient<Database>,
  studyId: string
): Promise<ResultsServerData> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('study_type, project_id')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    throw new Error('Study not found')
  }

  // Fetch project name, results, and segments in parallel
  const [projectData, resultsData, segmentsData] = await Promise.all([
    supabase
      .from('projects')
      .select('name')
      .eq('id', study.project_id)
      .single(),
    fetchResultsByType(supabase, studyId, study.study_type),
    supabase
      .from('study_segments')
      .select('*')
      .eq('study_id', studyId),
  ])

  if (resultsData.error || !resultsData.data) {
    throw new Error(resultsData.error?.message || 'Failed to fetch results')
  }

  const projectName = projectData.data?.name || 'Project'
  const savedSegments = segmentsData.data || []

  const results = resultsData.data as ResultsData
  const hasResponses = calculateHasResponses(results)

  return {
    results,
    projectName,
    savedSegments,
    hasResponses,
  }
}

// Service role client bypasses RLS (cookie-based client can't read some tables)
async function fetchResultsByType(
  _supabase: SupabaseClient<Database>,
  studyId: string,
  studyType: string
) {
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

    default:
      // Fallback to card sort for unknown types
      return getCardSortOverview(serviceClient, studyId)
  }
}

function calculateHasResponses(results: ResultsData): boolean {
  const r = results as any
  const count = r.metrics?.completedParticipants ?? r.stats?.completedParticipants ?? 0
  return count > 0
}
