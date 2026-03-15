/**
 * Path computation and sorting utilities for tree test analysis.
 *
 * Functions for classifying responses, filtering by result type, building
 * breadcrumb paths, and aggregating/sorting path data for the table.
 */

import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { TreeNode } from '@veritio/study-types'
import type {
  ResultType,
  AggregatedPathData,
  IndividualPathData,
  SortConfig,
} from './paths-types'
import { ALL_RESULT_TYPES, RESULT_TYPE_ORDER } from './paths-types'

// Re-export all types and constants so existing imports work
export * from './paths-types'

// ============================================================================
// Classification
// ============================================================================

/** Classify a response into one of the 6 result types. */
export function getResultType(response: {
  is_correct: boolean | null
  is_direct: boolean | null
  is_skipped: boolean | null
}): ResultType {
  const { is_correct, is_direct, is_skipped } = response

  if (is_skipped === true) {
    return is_direct === true ? 'direct_skip' : 'indirect_skip'
  }

  if (is_correct === true) {
    return is_direct === true ? 'direct_success' : 'indirect_success'
  }

  // is_correct is false or null (treated as failure)
  return is_direct === true ? 'direct_failure' : 'indirect_failure'
}

// ============================================================================
// Filtering
// ============================================================================

/** Filter responses by selected result types. */
export function filterByResultTypes(
  responses: TreeTestResponse[],
  selectedTypes: Set<ResultType>
): TreeTestResponse[] {
  if (selectedTypes.size === ALL_RESULT_TYPES.length) {
    return responses
  }

  return responses.filter((r) => {
    const resultType = getResultType(r)
    return selectedTypes.has(resultType)
  })
}

// ============================================================================
// Breadcrumbs
// ============================================================================

/** Build breadcrumb path from node IDs using a node map. */
export function buildPathBreadcrumb(
  pathTaken: string[],
  nodeMap: Map<string, TreeNode>
): string[] {
  return pathTaken.map((nodeId) => nodeMap.get(nodeId)?.label || 'Unknown')
}

// ============================================================================
// Aggregation
// ============================================================================

/** Group responses by unique path and compute counts/percentages. */
export function computeAggregatedPaths(
  responses: TreeTestResponse[],
  nodeMap: Map<string, TreeNode>,
  totalParticipants: number
): AggregatedPathData[] {
  const pathGroups = new Map<
    string,
    {
      pathTaken: string[]
      resultType: ResultType
      participantIds: string[]
    }
  >()

  for (const response of responses) {
    const pathKey = response.path_taken.join('>')
    const resultType = getResultType(response)

    if (!pathGroups.has(pathKey)) {
      pathGroups.set(pathKey, {
        pathTaken: response.path_taken,
        resultType,
        participantIds: [response.participant_id],
      })
    } else {
      pathGroups.get(pathKey)!.participantIds.push(response.participant_id)
    }
  }

  const aggregatedPaths: AggregatedPathData[] = []

  for (const [pathKey, group] of pathGroups) {
    const breadcrumbPath = buildPathBreadcrumb(group.pathTaken, nodeMap)

    aggregatedPaths.push({
      pathKey,
      pathTaken: group.pathTaken,
      breadcrumbPath,
      breadcrumbString: breadcrumbPath.join(' > '),
      resultType: group.resultType,
      participantCount: group.participantIds.length,
      percentage:
        totalParticipants > 0
          ? Math.round((group.participantIds.length / totalParticipants) * 100)
          : 0,
      participantIds: group.participantIds,
    })
  }

  return aggregatedPaths
}

/** Compute individual path data - one row per participant response. */
export function computeIndividualPaths(
  responses: TreeTestResponse[],
  nodeMap: Map<string, TreeNode>,
  participantIndexMap: Map<string, number>
): IndividualPathData[] {
  return responses.map((response) => {
    const breadcrumbPath = buildPathBreadcrumb(response.path_taken, nodeMap)

    return {
      responseId: response.id,
      participantId: response.participant_id,
      participantIndex: participantIndexMap.get(response.participant_id) ?? 0,
      pathTaken: response.path_taken,
      breadcrumbPath,
      breadcrumbString: breadcrumbPath.join(' > '),
      resultType: getResultType(response),
    }
  })
}

// ============================================================================
// Sorting
// ============================================================================

/** Generic sort for path data arrays. */
function sortPathData<T extends { resultType: ResultType; breadcrumbString: string }>(
  data: T[],
  sortConfig: SortConfig,
  getParticipantSortValue: (item: T) => number
): T[] {
  const sorted = [...data]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortConfig.field) {
      case 'result':
        comparison = RESULT_TYPE_ORDER[a.resultType] - RESULT_TYPE_ORDER[b.resultType]
        break
      case 'participants':
        comparison = getParticipantSortValue(a) - getParticipantSortValue(b)
        break
      case 'path':
        comparison = a.breadcrumbString.localeCompare(b.breadcrumbString)
        break
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

export function sortAggregatedPaths(data: AggregatedPathData[], sortConfig: SortConfig): AggregatedPathData[] {
  return sortPathData(data, sortConfig, (item) => item.participantCount)
}

export function sortIndividualPaths(data: IndividualPathData[], sortConfig: SortConfig): IndividualPathData[] {
  return sortPathData(data, sortConfig, (item) => item.participantIndex)
}
