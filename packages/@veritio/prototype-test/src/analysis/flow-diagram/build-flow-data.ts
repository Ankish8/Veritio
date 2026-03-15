/**
 * Build Flow Data
 *
 * Main entry point and barrel re-exports for the flow diagram algorithm.
 * Orchestrates sub-modules: labels, paths, nodes, links, analysis, utils.
 */

import type {
  FlowDiagramData,
  FlowDiagramFilters,
  FlowLink,
  NavigationEventInput,
  ComponentStateEventInput,
  TaskAttemptInput,
  FrameInput,
  TaskInput,
  ComponentInstanceInput,
} from './types'

import { buildPathwayLabelMaps } from './flow-labels'
import { filterTaskAttempts, buildSessionPaths, buildSessionPathsFromAttempts, identifyOptimalPaths } from './flow-paths'
import { buildNodesFromPaths, buildComponentStateNodes } from './flow-nodes'
import { buildLinksFromPaths, buildUnifiedLinks } from './flow-links'
import { identifyDeadEnds, computeStats } from './flow-analysis'

// Re-export everything from sub-modules so existing imports don't break
export { buildPathwayLabelMaps } from './flow-labels'
export type { PathwayLabelMaps } from './flow-labels'
export { filterTaskAttempts, buildSessionPaths, buildSessionPathsFromAttempts, identifyOptimalPaths } from './flow-paths'
export type { SessionPath } from './flow-paths'
export { deduplicateCascadingStateEvents, pickRepresentativeEvent, buildNodesFromPaths, buildComponentStateNodes, buildNodes } from './flow-nodes'
export { getDominantOutcome, buildLinksFromPaths, buildLinks, buildUnifiedLinks } from './flow-links'
export { identifyDeadEnds, computeStats } from './flow-analysis'
export { filterLinksByMinParticipants, getConnectedNodes, isNodeOnPath, isLinkOnPath } from './flow-utils'
// Main Entry Point
export function buildFlowDiagramData(
  navigationEvents: NavigationEventInput[],
  componentStateEvents: ComponentStateEventInput[],
  taskAttempts: TaskAttemptInput[],
  frames: FrameInput[],
  task: TaskInput,
  filters: FlowDiagramFilters,
  componentInstances: ComponentInstanceInput[] = []
): FlowDiagramData {
  // Build lookup maps
  const frameMap = new Map(frames.map((f) => [f.id, f]))
  const sessionToAttempt = new Map(taskAttempts.map((a) => [a.session_id, a]))
  const instanceMap = new Map(componentInstances.map((c) => [c.instance_id, c]))

  // Build pathway label maps for V3 component state labeling.
  // When available, state events are filtered to pathway-defined components
  // and labeled with the same display names as the Participant Paths breadcrumb.
  const pathwayLabels = buildPathwayLabelMaps(task.raw_pathway)

  // Filter task attempts by outcome and directness
  const filteredAttempts = filterTaskAttempts(taskAttempts, filters)
  const filteredSessionIds = new Set(filteredAttempts.map((a) => a.session_id))
  const filteredNavEvents = navigationEvents.filter((e) => filteredSessionIds.has(e.session_id))

  // Build frame-only session paths (for stats + optimal path analysis)
  const pathsFromAttempts = buildSessionPathsFromAttempts(filteredAttempts)
  const sessionPaths = pathsFromAttempts.length > 0
    ? pathsFromAttempts
    : buildSessionPaths(filteredNavEvents, sessionToAttempt)

  // ─── Build nodes (one per unique frame, no return-visit duplicates) ───
  const nodes = buildNodesFromPaths(sessionPaths, frameMap, task)

  // ─── Build links ───
  // When States is ON, use unified timeline (nav events + pathway-filtered state events)
  // which creates proper links between frames AND component states.
  // When States is OFF, use frame-only links from session paths.
  let links: FlowLink[]

  if (filters.showComponentStates && componentStateEvents.length > 0) {
    const filteredStateEvents = componentStateEvents.filter((e) => filteredSessionIds.has(e.session_id))

    // Add component state nodes — uses pathway labels for filtering and naming
    const stateNodes = buildComponentStateNodes(
      filteredStateEvents, sessionToAttempt, instanceMap, pathwayLabels
    )
    nodes.push(...stateNodes)

    // Build unified links that interleave frames and states chronologically.
    // When pathway labels are available, only pathway-defined state events
    // are included — matching the Participant Paths breadcrumb exactly.
    links = buildUnifiedLinks(
      filteredNavEvents,
      filteredStateEvents,
      sessionToAttempt,
      filters.showBacktracks,
      filters.minParticipants,
      instanceMap,
      pathwayLabels
    )
  } else {
    // Frame-only links from session paths (path_taken or nav events)
    links = buildLinksFromPaths(
      sessionPaths,
      filters.showBacktracks,
      filters.minParticipants
    )
  }

  // Backfill positional nodes.
  // When pathwayLabels is available, buildUnifiedLinks assigns positional IDs
  // (e.g., "inbox:p3", "state:tabs:p1") so nodes at different journey depths
  // get separate Sankey columns. We create actual FlowNode entries for these
  // by cloning the base node (unsuffixed) with the positional ID.
  if (pathwayLabels) {
    const existingNodeIds = new Set(nodes.map((n) => n.id))
    for (const link of links) {
      for (const id of [link.source, link.target]) {
        if (!existingNodeIds.has(id) && id.includes(':p')) {
          const baseId = id.replace(/:p\d+$/, '')
          const baseNode = nodes.find((n) => n.id === baseId)
          if (baseNode) {
            nodes.push({ ...baseNode, id, role: baseNode.role === 'start' ? 'regular' : baseNode.role })
            existingNodeIds.add(id)
          }
        }
      }
    }
  }

  // Identify optimal paths (always uses frame-only session paths)
  const optimalPaths = identifyOptimalPaths(
    sessionPaths,
    task,
    sessionToAttempt,
    filteredAttempts
  )

  // Identify dead-ends
  const deadEndNodeIds = identifyDeadEnds(
    nodes,
    links,
    filteredAttempts,
    sessionPaths
  )

  // Compute statistics
  const stats = computeStats(sessionPaths, links, filteredAttempts)

  return {
    nodes,
    links,
    optimalPaths,
    deadEndNodeIds,
    stats,
  }
}
