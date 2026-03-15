/**
 * Flow Paths
 *
 * Session path building, filtering, and optimal path identification.
 * Builds ordered frame sequences from navigation events or task attempt data.
 */

import type {
  FlowDiagramFilters,
  OptimalPath,
  NavigationEventInput,
  TaskAttemptInput,
  TaskInput,
} from './types'
import type { TaskOutcome } from '../../types/analytics'
export interface SessionPath {
  sessionId: string
  participantId: string
  frameIds: string[]
  outcome: TaskOutcome
  isDirect: boolean
}
export function filterTaskAttempts(
  attempts: TaskAttemptInput[],
  filters: FlowDiagramFilters
): TaskAttemptInput[] {
  return attempts.filter((a) => {
    // Filter by outcome
    const outcome = a.outcome as TaskOutcome
    if (!filters.outcomes.has(outcome)) {
      return false
    }

    // Filter by directness
    if (filters.directness === 'direct' && a.is_direct !== true) {
      return false
    }
    if (filters.directness === 'indirect' && a.is_direct === true) {
      return false
    }

    return true
  })
}
export function buildSessionPaths(
  navEvents: NavigationEventInput[],
  sessionToAttempt: Map<string, TaskAttemptInput>
): SessionPath[] {
  // Group events by session
  const eventsBySession = new Map<string, NavigationEventInput[]>()
  for (const event of navEvents) {
    const existing = eventsBySession.get(event.session_id) || []
    existing.push(event)
    eventsBySession.set(event.session_id, existing)
  }

  const paths: SessionPath[] = []

  for (const [sessionId, events] of eventsBySession) {
    const attempt = sessionToAttempt.get(sessionId)
    if (!attempt) continue

    // Sort by sequence number
    const sorted = [...events].sort((a, b) => a.sequence_number - b.sequence_number)

    // Build frame sequence (start with first from_frame if present, then all to_frames)
    const frameIds: string[] = []
    for (const event of sorted) {
      if (event.from_frame_id && frameIds.length === 0) {
        frameIds.push(event.from_frame_id)
      }
      if (event.to_frame_id && frameIds[frameIds.length - 1] !== event.to_frame_id) {
        frameIds.push(event.to_frame_id)
      }
    }

    paths.push({
      sessionId,
      participantId: attempt.participant_id,
      frameIds,
      outcome: attempt.outcome as TaskOutcome,
      isDirect: attempt.is_direct === true,
    })
  }

  return paths
}
export function buildSessionPathsFromAttempts(
  attempts: TaskAttemptInput[]
): SessionPath[] {
  const paths: SessionPath[] = []

  for (const attempt of attempts) {
    if (!attempt.path_taken || !Array.isArray(attempt.path_taken) || attempt.path_taken.length === 0) continue

    paths.push({
      sessionId: attempt.session_id,
      participantId: attempt.participant_id,
      frameIds: attempt.path_taken,
      outcome: attempt.outcome as TaskOutcome,
      isDirect: attempt.is_direct === true,
    })
  }

  return paths
}
export function identifyOptimalPaths(
  sessionPaths: SessionPath[],
  task: TaskInput,
  _sessionToAttempt: Map<string, TaskAttemptInput>,
  _filteredAttempts: TaskAttemptInput[]
): {
  criteria: OptimalPath | null
  shortest: OptimalPath | null
  common: OptimalPath | null
} {
  // Get only successful paths
  const successfulPaths = sessionPaths.filter((p) => p.outcome === 'success')

  if (successfulPaths.length === 0) {
    return { criteria: null, shortest: null, common: null }
  }

  // 1. Criteria path (from task definition)
  let criteriaPath: OptimalPath | null = null
  if (task.success_criteria_type === 'pathway' && task.success_pathway) {
    criteriaPath = {
      type: 'criteria',
      nodeIds: task.success_pathway.frames,
      description: 'Expected pathway (from task definition)',
      participantCount: countPathMatches(successfulPaths, task.success_pathway.frames),
    }
  } else if (task.start_frame_id && (task.success_frame_ids?.length ?? 0) > 0) {
    // Simple start → end path for destination-based success
    const simplePath = [task.start_frame_id, ...task.success_frame_ids!]
    criteriaPath = {
      type: 'criteria',
      nodeIds: simplePath,
      description: 'Start to destination (shortest expected)',
      participantCount: countPathMatches(successfulPaths, simplePath),
    }
  }

  // 2. Shortest successful path
  let shortestPath: OptimalPath | null = null
  if (successfulPaths.length > 0) {
    const shortest = successfulPaths.reduce((min, p) =>
      p.frameIds.length < min.frameIds.length ? p : min
    )
    shortestPath = {
      type: 'shortest',
      nodeIds: shortest.frameIds,
      description: `Shortest path taken (${shortest.frameIds.length} screens)`,
      participantCount: countPathMatches(successfulPaths, shortest.frameIds),
    }
  }

  // 3. Most common path
  let commonPath: OptimalPath | null = null
  const pathCounts = new Map<string, { frameIds: string[]; count: number }>()
  for (const p of successfulPaths) {
    const key = p.frameIds.join('→')
    const existing = pathCounts.get(key) || { frameIds: p.frameIds, count: 0 }
    existing.count++
    pathCounts.set(key, existing)
  }

  if (pathCounts.size > 0) {
    const mostCommon = Array.from(pathCounts.values()).reduce((max, p) =>
      p.count > max.count ? p : max
    )
    commonPath = {
      type: 'common',
      nodeIds: mostCommon.frameIds,
      description: `Most common path (${mostCommon.count} participants)`,
      participantCount: mostCommon.count,
    }
  }

  return { criteria: criteriaPath, shortest: shortestPath, common: commonPath }
}
function countPathMatches(paths: SessionPath[], targetPath: string[]): number {
  if (!targetPath || targetPath.length === 0) return 0
  const targetKey = targetPath.join('→')
  return paths.filter((p) => p.frameIds.join('→') === targetKey).length
}
