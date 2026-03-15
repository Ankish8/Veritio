import type { PrototypeTestFrame } from '@veritio/study-types'
import type { NavigationEventRow, ComponentStateEventRow } from '@/hooks/use-prototype-test-attempt-events'
import {
  type RichPathStep,
  type ResultType,
  type AggregatedPathData,
  type IndividualPathData,
  buildRichPath,
  richPathKey,
} from './paths-utils'

interface TaskAttemptPath {
  id: string
  session_id: string | null
  task_id: string
  path_taken: unknown
}

/**
 * Enrich individual path data with rich steps (frame + component state interleaving).
 * For each individual path row, looks up the corresponding attempt path to get session_id,
 * then builds a rich path from navigation and state events.
 */
export function enrichIndividualPathsWithEvents(
  individualData: IndividualPathData[],
  taskAttemptPaths: TaskAttemptPath[],
  navEvents: NavigationEventRow[],
  stateEvents: ComponentStateEventRow[],
  frameMap: Map<string, PrototypeTestFrame>,
  goalFrameIds: Set<string>,
  variantLabelMap: { labels: Map<string, string>; componentNames: Map<string, string> },
): IndividualPathData[] {
  return individualData.map(row => {
    const attemptPath = taskAttemptPaths.find(p => p.id === row.attemptId)
    if (!attemptPath?.session_id) return row // no session_id → old data

    const richSteps = buildRichPath(
      attemptPath.session_id, attemptPath.task_id,
      row.pathTaken, navEvents, stateEvents,
      frameMap, goalFrameIds, variantLabelMap
    )
    if (!richSteps) return row // no events → use frame-only

    const breadcrumbString = richSteps.map(s => s.label).join(' > ')
    return { ...row, richSteps, breadcrumbString }
  })
}

/**
 * Re-aggregate from enriched individual data so grouping uses rich path keys.
 * This avoids duplicate keys when multiple frame-only groups collapse to the same rich path.
 */
export function reaggregatePathsFromIndividual(
  enrichedIndividualData: IndividualPathData[],
  totalParticipants: number,
): AggregatedPathData[] {
  const groups = new Map<string, {
    richSteps?: RichPathStep[]
    pathTaken: string[]
    frameLabels: string[]
    breadcrumbString: string
    resultType: ResultType
    participantIds: string[]
  }>()

  for (const row of enrichedIndividualData) {
    const key = row.richSteps
      ? `${richPathKey(row.richSteps)}::${row.resultType}`
      : `${row.pathTaken.join('>')}::${row.resultType}`

    if (!groups.has(key)) {
      groups.set(key, {
        richSteps: row.richSteps,
        pathTaken: row.pathTaken,
        frameLabels: row.frameLabels,
        breadcrumbString: row.breadcrumbString,
        resultType: row.resultType,
        participantIds: [row.participantId],
      })
    } else {
      const group = groups.get(key)!
      if (!group.participantIds.includes(row.participantId)) {
        group.participantIds.push(row.participantId)
      }
    }
  }

  const result: AggregatedPathData[] = []
  for (const [pathKey, group] of groups) {
    result.push({
      pathKey,
      pathTaken: group.pathTaken,
      frameLabels: group.frameLabels,
      breadcrumbString: group.breadcrumbString,
      resultType: group.resultType,
      participantCount: group.participantIds.length,
      percentage: totalParticipants > 0
        ? Math.round((group.participantIds.length / totalParticipants) * 100)
        : 0,
      participantIds: group.participantIds,
      richSteps: group.richSteps,
    })
  }

  return result
}
