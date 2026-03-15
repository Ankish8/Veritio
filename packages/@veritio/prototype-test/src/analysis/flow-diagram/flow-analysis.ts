/**
 * Flow Analysis
 *
 * Dead-end detection and summary statistics computation.
 */

import type {
  FlowNode,
  FlowLink,
  FlowDiagramData,
  TaskAttemptInput,
} from './types'
import type { SessionPath } from './flow-paths'
export function identifyDeadEnds(
  nodes: FlowNode[],
  links: FlowLink[],
  _attempts: TaskAttemptInput[],
  sessionPaths: SessionPath[]
): Set<string> {
  const deadEnds = new Set<string>()

  // Find frames where abandoned sessions ended
  const abandonedPaths = sessionPaths.filter((p) => p.outcome === 'abandoned')

  for (const path of abandonedPaths) {
    if (path.frameIds.length > 0) {
      const lastFrame = path.frameIds[path.frameIds.length - 1]
      deadEnds.add(lastFrame)
    }
  }

  // Also mark nodes with high abandonment rates
  for (const node of nodes) {
    if (node.type === 'frame') {
      const abandonRate =
        node.visitCount > 0 ? node.outcomeBreakdown.abandoned / node.visitCount : 0
      if (abandonRate > 0.3 && node.outcomeBreakdown.abandoned >= 2) {
        deadEnds.add(node.id)
      }
    }
  }

  // Update node roles for dead ends
  for (const node of nodes) {
    if (deadEnds.has(node.id) && node.role === 'regular') {
      node.role = 'dead_end'
    }
  }

  return deadEnds
}
export function computeStats(
  sessionPaths: SessionPath[],
  links: FlowLink[],
  attempts: TaskAttemptInput[]
): FlowDiagramData['stats'] {
  const totalParticipants = new Set(attempts.map((a) => a.participant_id)).size
  const totalTransitions = links.reduce((sum, l) => sum + l.value, 0)

  // Count unique paths
  const uniquePathKeys = new Set(sessionPaths.map((p) => p.frameIds.join('→')))
  const uniquePaths = uniquePathKeys.size

  // Path lengths
  const pathLengths = sessionPaths.map((p) => p.frameIds.length)
  const avgPathLength =
    pathLengths.length > 0
      ? pathLengths.reduce((a, b) => a + b, 0) / pathLengths.length
      : 0
  const maxPathLength = pathLengths.length > 0 ? Math.max(...pathLengths) : 0

  // Backtrack rate
  const backtracks = links.filter((l) => l.isBacktrack)
  const backtrackTransitions = backtracks.reduce((sum, l) => sum + l.value, 0)
  const backtrackRate =
    totalTransitions > 0 ? (backtrackTransitions / totalTransitions) * 100 : 0

  return {
    totalParticipants,
    totalTransitions,
    uniquePaths,
    avgPathLength,
    maxPathLength,
    backtrackRate,
  }
}
