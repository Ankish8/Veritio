import type { PrototypeTestTaskAttempt, PrototypeTestFrame } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { castJsonArray } from '@veritio/core/database'
export type ResultType =
  | 'direct_success'
  | 'indirect_success'
  | 'direct_failure'
  | 'indirect_failure'
  | 'direct_abandoned'
  | 'indirect_abandoned'
  | 'direct_skipped'
  | 'indirect_skipped'
export const RESULT_TYPE_CONFIG: Record<
  ResultType,
  { label: string; color: string; dotColor: string }
> = {
  direct_success: {
    label: 'Direct success',
    color: 'text-green-700',
    dotColor: '#16a34a', // green-600
  },
  indirect_success: {
    label: 'Indirect success',
    color: 'text-green-500',
    dotColor: '#4ade80', // green-400
  },
  direct_failure: {
    label: 'Direct failure',
    color: 'text-red-700',
    dotColor: '#dc2626', // red-600
  },
  indirect_failure: {
    label: 'Indirect failure',
    color: 'text-red-500',
    dotColor: '#f87171', // red-400
  },
  direct_abandoned: {
    label: 'Direct abandoned',
    color: 'text-orange-700',
    dotColor: '#ea580c', // orange-600
  },
  indirect_abandoned: {
    label: 'Indirect abandoned',
    color: 'text-orange-500',
    dotColor: '#fb923c', // orange-400
  },
  direct_skipped: {
    label: 'Direct skip',
    color: 'text-gray-600',
    dotColor: '#6b7280', // gray-500
  },
  indirect_skipped: {
    label: 'Indirect skip',
    color: 'text-gray-400',
    dotColor: '#9ca3af', // gray-400
  },
}
export const ALL_RESULT_TYPES: ResultType[] = [
  'direct_success',
  'indirect_success',
  'direct_failure',
  'indirect_failure',
  'direct_abandoned',
  'indirect_abandoned',
  'direct_skipped',
  'indirect_skipped',
]
export interface AggregatedPathData {
  pathKey: string // Unique key for the path (joined frame IDs)
  pathTaken: string[] // Array of frame IDs
  frameLabels: string[] // Array of frame names
  breadcrumbString: string // "Frame1 > Frame2 > ..." format
  resultType: ResultType
  participantCount: number
  percentage: number
  participantIds: string[]
}
export interface IndividualPathData {
  attemptId: string
  participantId: string
  participantIndex: number // 1-based display index
  pathTaken: string[]
  frameLabels: string[]
  breadcrumbString: string
  resultType: ResultType
}
export interface SortConfig {
  field: 'result' | 'participants' | 'path'
  direction: 'asc' | 'desc'
}
export function getResultType(attempt: {
  outcome: string
  is_direct: boolean | null
}): ResultType {
  const { outcome, is_direct } = attempt
  const isDirect = is_direct === true

  switch (outcome) {
    case 'success':
      return isDirect ? 'direct_success' : 'indirect_success'
    case 'failure':
      return isDirect ? 'direct_failure' : 'indirect_failure'
    case 'abandoned':
      return isDirect ? 'direct_abandoned' : 'indirect_abandoned'
    case 'skipped':
    default:
      return isDirect ? 'direct_skipped' : 'indirect_skipped'
  }
}
export function filterByResultTypes(
  attempts: PrototypeTestTaskAttempt[],
  selectedTypes: Set<ResultType>
): PrototypeTestTaskAttempt[] {
  if (selectedTypes.size === ALL_RESULT_TYPES.length) {
    // All types selected, no filtering needed
    return attempts
  }

  return attempts.filter((a) => {
    const resultType = getResultType({
      outcome: a.outcome,
      is_direct: a.is_direct,
    })
    return selectedTypes.has(resultType)
  })
}
export function buildFrameLabels(
  pathTaken: string[],
  frameMap: Map<string, PrototypeTestFrame>
): string[] {
  return pathTaken.map((frameId) => frameMap.get(frameId)?.name || 'Unknown')
}
export function parsePathTaken(attempt: PrototypeTestTaskAttempt): string[] {
  return castJsonArray<string>(attempt.path_taken)
}
export function computeAggregatedPaths(
  attempts: PrototypeTestTaskAttempt[],
  frameMap: Map<string, PrototypeTestFrame>,
  totalParticipants: number
): AggregatedPathData[] {
  // Group by path + result type (as string key)
  const pathGroups = new Map<
    string,
    {
      pathTaken: string[]
      resultType: ResultType
      participantIds: string[]
    }
  >()

  for (const attempt of attempts) {
    const pathTaken = parsePathTaken(attempt)
    const resultType = getResultType({
      outcome: attempt.outcome,
      is_direct: attempt.is_direct,
    })
    // Include result type in key to keep different outcomes separate
    const pathKey = `${pathTaken.join('>')}::${resultType}`

    if (!pathGroups.has(pathKey)) {
      pathGroups.set(pathKey, {
        pathTaken,
        resultType,
        participantIds: [attempt.participant_id],
      })
    } else {
      const group = pathGroups.get(pathKey)!
      // Only add if not already counted (dedupe same participant)
      if (!group.participantIds.includes(attempt.participant_id)) {
        group.participantIds.push(attempt.participant_id)
      }
    }
  }

  // Convert to array
  const aggregatedPaths: AggregatedPathData[] = []

  for (const [pathKey, group] of pathGroups) {
    const frameLabels = buildFrameLabels(group.pathTaken, frameMap)
    const breadcrumbString = frameLabels.join(' > ')

    aggregatedPaths.push({
      pathKey,
      pathTaken: group.pathTaken,
      frameLabels,
      breadcrumbString,
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
export function computeIndividualPaths(
  attempts: PrototypeTestTaskAttempt[],
  frameMap: Map<string, PrototypeTestFrame>,
  participantIndexMap: Map<string, number>
): IndividualPathData[] {
  return attempts.map((attempt) => {
    const pathTaken = parsePathTaken(attempt)
    const frameLabels = buildFrameLabels(pathTaken, frameMap)
    const breadcrumbString = frameLabels.join(' > ')

    return {
      attemptId: attempt.id,
      participantId: attempt.participant_id,
      participantIndex: participantIndexMap.get(attempt.participant_id) ?? 0,
      pathTaken,
      frameLabels,
      breadcrumbString,
      resultType: getResultType({
        outcome: attempt.outcome,
        is_direct: attempt.is_direct,
      }),
    }
  })
}
const RESULT_TYPE_ORDER: Record<ResultType, number> = {
  direct_success: 1,
  indirect_success: 2,
  direct_failure: 3,
  indirect_failure: 4,
  direct_abandoned: 5,
  indirect_abandoned: 6,
  direct_skipped: 7,
  indirect_skipped: 8,
}
export function sortAggregatedPaths(
  data: AggregatedPathData[],
  sortConfig: SortConfig
): AggregatedPathData[] {
  const sorted = [...data]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortConfig.field) {
      case 'result':
        comparison =
          RESULT_TYPE_ORDER[a.resultType] - RESULT_TYPE_ORDER[b.resultType]
        break
      case 'participants':
        comparison = a.participantCount - b.participantCount
        break
      case 'path':
        comparison = a.breadcrumbString.localeCompare(b.breadcrumbString)
        break
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}
export function sortIndividualPaths(
  data: IndividualPathData[],
  sortConfig: SortConfig
): IndividualPathData[] {
  const sorted = [...data]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortConfig.field) {
      case 'result':
        comparison =
          RESULT_TYPE_ORDER[a.resultType] - RESULT_TYPE_ORDER[b.resultType]
        break
      case 'participants':
        comparison = a.participantIndex - b.participantIndex
        break
      case 'path':
        comparison = a.breadcrumbString.localeCompare(b.breadcrumbString)
        break
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}
