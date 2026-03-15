import type { LiveWebsiteEvent, LiveWebsiteResponse } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { ResolvedParticipantDisplay } from '@/lib/utils/participant-display'
import {
  type ParticipantPath,
  type AggregatedPathData,
  type IndividualPathData,
  type LiveWebsiteResultType,
  getResultType,
  shortenUrl,
} from './paths-utils'

/** Group items by a key extracted from each item. */
function groupBy<T>(items: T[], keyFn: (item: T) => string | null | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    if (!key) continue
    const group = map.get(key)
    if (group) group.push(item)
    else map.set(key, [item])
  }
  return map
}

/**
 * Build participant paths from events and responses for a specific task.
 * Groups events by participant, deduplicates consecutive URLs, merges response data.
 */
export function buildParticipantPaths(
  taskId: string,
  events: LiveWebsiteEvent[],
  responses: LiveWebsiteResponse[],
  participantIndexMap: Map<string, number>,
  participantDisplayMap?: Map<string, ResolvedParticipantDisplay>,
): ParticipantPath[] {
  const isNavEvent = (e: LiveWebsiteEvent) =>
    e.task_id === taskId && (e.event_type === 'page_view' || e.event_type === 'navigation')

  const responseByParticipant = new Map<string, LiveWebsiteResponse>()
  for (const r of responses) {
    if (r.task_id === taskId) responseByParticipant.set(r.participant_id, r)
  }

  const eventsByParticipant = groupBy(
    events.filter(isNavEvent),
    (e) => e.participant_id,
  )

  const paths: ParticipantPath[] = []

  for (const [participantId, evts] of eventsByParticipant) {
    evts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Deduplicate consecutive same-URL entries
    const urls: string[] = []
    const timestamps: string[] = []
    for (const evt of evts) {
      if (evt.page_url && urls[urls.length - 1] !== evt.page_url) {
        urls.push(evt.page_url)
        timestamps.push(evt.timestamp)
      }
    }
    if (urls.length === 0) continue

    const response = responseByParticipant.get(participantId)
    const index = participantIndexMap.get(participantId) ?? 0
    const display = participantDisplayMap?.get(participantId)

    paths.push({
      participantId,
      participantIndex: index,
      displayLabel: display?.primary ?? `P${index}`,
      displaySecondary: display?.secondary ?? null,
      urls,
      timestamps,
      resultType: response ? getResultType(response) : 'abandoned',
      durationMs: response?.duration_ms ?? 0,
      startedAt: response?.started_at ?? null,
    })
  }

  return paths
}

/**
 * Compute aggregated paths — group by (urlSequence + resultType).
 */
export function computeAggregatedPaths(
  participantPaths: ParticipantPath[],
  totalParticipants: number,
): AggregatedPathData[] {
  const groups = new Map<string, AggregatedPathData>()

  for (const path of participantPaths) {
    const key = `${path.urls.map(shortenUrl).join('>')}::${path.resultType}`

    if (groups.has(key)) {
      const group = groups.get(key)!
      group.participantPaths.push(path)
      group.participantCount++
    } else {
      groups.set(key, {
        pathKey: key,
        urlSequence: path.urls,
        resultType: path.resultType,
        participantCount: 1,
        percentage: 0,
        avgDurationMs: 0,
        participantPaths: [path],
      })
    }
  }

  const aggregated = Array.from(groups.values())

  for (const group of aggregated) {
    group.percentage = totalParticipants > 0
      ? Math.round((group.participantCount / totalParticipants) * 100)
      : 0

    const durations = group.participantPaths
      .map((p) => p.durationMs)
      .filter((d) => d > 0)
    group.avgDurationMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0
  }

  // Sort by count descending by default
  return aggregated.sort((a, b) => b.participantCount - a.participantCount)
}

/**
 * Compute individual paths -- 1:1 mapping from participant paths.
 * ParticipantPath and IndividualPathData share the same shape.
 */
export function computeIndividualPaths(
  participantPaths: ParticipantPath[],
): IndividualPathData[] {
  return participantPaths.map((p) => ({ ...p }))
}

/** Filter paths (aggregated or individual) by selected result types. */
function filterByResultTypes<T extends { resultType: LiveWebsiteResultType }>(
  paths: T[],
  selectedTypes: Set<LiveWebsiteResultType>,
): T[] {
  if (selectedTypes.size === 0) return paths
  return paths.filter((p) => selectedTypes.has(p.resultType))
}

export function filterAggregatedByResultTypes(
  paths: AggregatedPathData[],
  selectedTypes: Set<LiveWebsiteResultType>,
): AggregatedPathData[] {
  return filterByResultTypes(paths, selectedTypes)
}

export function filterIndividualByResultTypes(
  paths: IndividualPathData[],
  selectedTypes: Set<LiveWebsiteResultType>,
): IndividualPathData[] {
  return filterByResultTypes(paths, selectedTypes)
}
