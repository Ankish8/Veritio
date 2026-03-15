/**
 * Flow Nodes
 *
 * Node construction for frame nodes and component state nodes.
 * Handles both pathway-aligned and fallback state node building,
 * as well as cascading event deduplication.
 */

import type {
  FlowNode,
  FlowNodeRole,
  NavigationEventInput,
  ComponentStateEventInput,
  TaskAttemptInput,
  FrameInput,
  TaskInput,
  ComponentInstanceInput,
} from './types'
import type { TaskOutcome } from '../../types/analytics'
import type { PathwayLabelMaps } from './flow-labels'
import type { SessionPath } from './flow-paths'
// Cascading Event Deduplication
export function deduplicateCascadingStateEvents(
  stateEvents: ComponentStateEventInput[],
  instanceMap: Map<string, ComponentInstanceInput>
): ComponentStateEventInput[] {
  // Group events by session + approximate timestamp
  // Events within 300ms on the same session are from the same user interaction
  const CASCADE_WINDOW_MS = 300

  // Sort by session then timestamp
  // When timestamps are null, use raw sequence_number (1,2,3…) instead of
  // sequence_number * 1000 so consecutive cascading events fall within the
  // 300ms window.  Multiplying by 1000 created artificial 1-second gaps
  // that prevented grouping.
  const sorted = [...stateEvents].sort((a, b) => {
    if (a.session_id !== b.session_id) return a.session_id.localeCompare(b.session_id)
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : a.sequence_number
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : b.sequence_number
    return timeA - timeB
  })

  const result: ComponentStateEventInput[] = []
  let groupStart = 0

  while (groupStart < sorted.length) {
    const anchor = sorted[groupStart]
    const anchorTime = anchor.timestamp ? new Date(anchor.timestamp).getTime() : anchor.sequence_number
    const anchorSession = anchor.session_id

    // Find all events in this cascade group
    let groupEnd = groupStart + 1
    while (groupEnd < sorted.length) {
      const candidate = sorted[groupEnd]
      if (candidate.session_id !== anchorSession) break

      const candidateTime = candidate.timestamp
        ? new Date(candidate.timestamp).getTime()
        : candidate.sequence_number
      if (candidateTime - anchorTime > CASCADE_WINDOW_MS) break

      groupEnd++
    }

    // Pick the best representative from this group
    const group = sorted.slice(groupStart, groupEnd)
    const representative = pickRepresentativeEvent(group, instanceMap)
    result.push(representative)

    groupStart = groupEnd
  }

  return result
}
export function pickRepresentativeEvent(
  group: ComponentStateEventInput[],
  instanceMap: Map<string, ComponentInstanceInput>
): ComponentStateEventInput {
  if (group.length === 1) return group[0]

  // Score each event: higher = more likely the user's direct interaction
  let bestEvent = group[0]
  let bestScore = -1

  for (const event of group) {
    let score = 0

    // custom_label is the strongest signal (set by the study author)
    if (event.custom_label) score += 10

    // instance_name from Figma metadata is next best
    const instance = instanceMap.get(event.component_node_id)
    if (instance?.instance_name) score += 5

    // component_set_id means it's a well-defined component type
    if (instance?.component_set_id) score += 2

    if (score > bestScore) {
      bestScore = score
      bestEvent = event
    }
  }

  return bestEvent
}
// Frame Node Building
export function buildNodesFromPaths(
  sessionPaths: SessionPath[],
  frameMap: Map<string, FrameInput>,
  task: TaskInput,
): FlowNode[] {
  const frameVisits = new Map<
    string,
    {
      visitCount: number
      uniqueVisitors: Set<string>
      outcomes: { success: number; failure: number; abandoned: number; skipped: number }
    }
  >()

  for (const path of sessionPaths) {
    for (const frameId of path.frameIds) {
      const existing = frameVisits.get(frameId) || {
        visitCount: 0,
        uniqueVisitors: new Set<string>(),
        outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
      }

      existing.visitCount++
      existing.uniqueVisitors.add(path.participantId)

      const outcome = path.outcome
      if (outcome in existing.outcomes) {
        existing.outcomes[outcome]++
      }

      frameVisits.set(frameId, existing)
    }
  }

  // Determine success frame IDs
  const successFrameIds = new Set(task.success_frame_ids || [])

  const nodes: FlowNode[] = []

  for (const [frameId, data] of frameVisits) {
    const frame = frameMap.get(frameId)

    let role: FlowNodeRole = 'regular'
    if (frameId === task.start_frame_id) {
      role = 'start'
    } else if (successFrameIds.has(frameId)) {
      role = 'success'
    }

    nodes.push({
      id: frameId,
      name: frame?.name || `Screen ${frameId.slice(-6)}`,
      type: 'frame',
      role,
      sourceId: frameId,
      thumbnailUrl: frame?.thumbnail_url || null,
      visitCount: data.visitCount,
      uniqueVisitors: data.uniqueVisitors.size,
      avgTimeMs: 0,
      outcomeBreakdown: data.outcomes,
      abandonedCount: 0,
    })
  }

  return nodes
}
// Component State Node Building
export function buildComponentStateNodes(
  stateEvents: ComponentStateEventInput[],
  sessionToAttempt: Map<string, TaskAttemptInput>,
  instanceMap: Map<string, ComponentInstanceInput>,
  pathwayLabels: PathwayLabelMaps | null
): FlowNode[] {
  if (pathwayLabels) {
    return buildPathwayAlignedStateNodes(stateEvents, sessionToAttempt, pathwayLabels)
  }
  return buildFallbackStateNodes(stateEvents, sessionToAttempt, instanceMap)
}
function buildPathwayAlignedStateNodes(
  stateEvents: ComponentStateEventInput[],
  sessionToAttempt: Map<string, TaskAttemptInput>,
  pathwayLabels: PathwayLabelMaps
): FlowNode[] {
  // Group events by componentNodeId, filtering to pathway-defined components only
  const eventGroups = new Map<string, ComponentStateEventInput[]>()
  for (const event of stateEvents) {
    if (!sessionToAttempt.has(event.session_id)) continue
    // Only include events for pathway-defined components
    if (!pathwayLabels.componentIds.has(event.component_node_id) &&
        !pathwayLabels.variantIds.has(event.to_variant_id)) continue

    const groupKey = event.component_node_id
    const arr = eventGroups.get(groupKey) || []
    arr.push(event)
    eventGroups.set(groupKey, arr)
  }

  const nodes: FlowNode[] = []

  for (const [componentNodeId, events] of eventGroups) {
    // Get the pathway label — try exact variant match first, then component name
    let name: string | undefined
    let matchedVariantId: string | undefined
    for (const event of events) {
      name = pathwayLabels.labels.get(event.to_variant_id)
      if (name) {
        matchedVariantId = event.to_variant_id
        break
      }
    }
    if (!name) {
      name = pathwayLabels.componentNames.get(componentNodeId) || 'Interaction'
    }

    // Aggregate visit stats
    const uniqueVisitors = new Set<string>()
    const outcomes = { success: 0, failure: 0, abandoned: 0, skipped: 0 }
    let visitCount = 0

    for (const event of events) {
      const attempt = sessionToAttempt.get(event.session_id)
      if (!attempt) continue
      visitCount++
      uniqueVisitors.add(attempt.participant_id)
      const outcome = attempt.outcome as TaskOutcome
      if (outcome in outcomes) {
        outcomes[outcome]++
      }
    }

    nodes.push({
      id: `state:${componentNodeId}`,
      name,
      type: 'state',
      role: 'regular',
      sourceId: componentNodeId,
      parentFrameId: events[0]?.frame_id || undefined,
      variantId: matchedVariantId,
      visitCount,
      uniqueVisitors: uniqueVisitors.size,
      avgTimeMs: 0,
      outcomeBreakdown: outcomes,
      abandonedCount: 0,
    })
  }

  return nodes
}
function buildFallbackStateNodes(
  stateEvents: ComponentStateEventInput[],
  sessionToAttempt: Map<string, TaskAttemptInput>,
  instanceMap: Map<string, ComponentInstanceInput>
): FlowNode[] {
  const eventGroups = new Map<string, ComponentStateEventInput[]>()
  for (const event of stateEvents) {
    if (!sessionToAttempt.has(event.session_id)) continue
    const instance = instanceMap.get(event.component_node_id)
    const groupKey = event.frame_id || instance?.component_set_id || event.component_node_id
    const arr = eventGroups.get(groupKey) || []
    arr.push(event)
    eventGroups.set(groupKey, arr)
  }

  const nodes: FlowNode[] = []

  for (const [groupKey, events] of eventGroups) {
    const rep = pickRepresentativeEvent(events, instanceMap)
    const repInstance = instanceMap.get(rep.component_node_id)
    const resolvedName = rep.custom_label
      || repInstance?.instance_name
      || `Component ${groupKey.slice(-6)}`

    const uniqueVisitors = new Set<string>()
    const outcomes = { success: 0, failure: 0, abandoned: 0, skipped: 0 }
    let visitCount = 0

    for (const event of events) {
      const attempt = sessionToAttempt.get(event.session_id)
      if (!attempt) continue
      visitCount++
      uniqueVisitors.add(attempt.participant_id)
      const outcome = attempt.outcome as TaskOutcome
      if (outcome in outcomes) {
        outcomes[outcome]++
      }
    }

    nodes.push({
      id: `state:${groupKey}`,
      name: resolvedName,
      type: 'state',
      role: 'regular',
      sourceId: rep.component_node_id,
      parentFrameId: rep.frame_id || undefined,
      variantId: rep.to_variant_id,
      visitCount,
      uniqueVisitors: uniqueVisitors.size,
      avgTimeMs: 0,
      outcomeBreakdown: outcomes,
      abandonedCount: 0,
    })
  }

  return nodes
}
// Legacy Node Building (used as fallback only)
export function buildNodes(
  navEvents: NavigationEventInput[],
  stateEvents: ComponentStateEventInput[],
  frameMap: Map<string, FrameInput>,
  task: TaskInput,
  sessionToAttempt: Map<string, TaskAttemptInput>,
  showComponentStates: boolean,
  instanceMap: Map<string, ComponentInstanceInput>
): FlowNode[] {
  const nodes: FlowNode[] = []

  // Aggregate frame visit data
  const frameVisits = new Map<
    string,
    {
      visitCount: number
      uniqueVisitors: Set<string>
      totalTime: number
      timeCount: number
      outcomes: { success: number; failure: number; abandoned: number; skipped: number }
      abandonedCount: number
    }
  >()

  // Process navigation events to build frame nodes
  for (const event of navEvents) {
    const attempt = sessionToAttempt.get(event.session_id)
    if (!attempt) continue

    const frameId = event.to_frame_id
    const existing = frameVisits.get(frameId) || {
      visitCount: 0,
      uniqueVisitors: new Set<string>(),
      totalTime: 0,
      timeCount: 0,
      outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
      abandonedCount: 0,
    }

    existing.visitCount++
    existing.uniqueVisitors.add(attempt.participant_id)

    if (event.time_on_from_frame_ms && event.time_on_from_frame_ms > 0) {
      existing.totalTime += event.time_on_from_frame_ms
      existing.timeCount++
    }

    const outcome = attempt.outcome as TaskOutcome
    if (outcome in existing.outcomes) {
      existing.outcomes[outcome]++
    }

    frameVisits.set(frameId, existing)
  }

  // Also track the from_frame for the first event of each session (start frame)
  const sessionFirstEvent = new Map<string, NavigationEventInput>()
  for (const event of navEvents) {
    if (!sessionFirstEvent.has(event.session_id) && event.from_frame_id) {
      sessionFirstEvent.set(event.session_id, event)
    }
  }

  for (const event of sessionFirstEvent.values()) {
    if (!event.from_frame_id) continue
    const attempt = sessionToAttempt.get(event.session_id)
    if (!attempt) continue

    const frameId = event.from_frame_id
    const existing = frameVisits.get(frameId) || {
      visitCount: 0,
      uniqueVisitors: new Set<string>(),
      totalTime: 0,
      timeCount: 0,
      outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
      abandonedCount: 0,
    }

    existing.visitCount++
    existing.uniqueVisitors.add(attempt.participant_id)

    const outcome = attempt.outcome as TaskOutcome
    if (outcome in existing.outcomes) {
      existing.outcomes[outcome]++
    }

    frameVisits.set(frameId, existing)
  }

  // Determine success frame IDs
  const successFrameIds = new Set(task.success_frame_ids || [])

  // Create frame nodes for ALL visited frames (including those not in the frame definition list)
  for (const [frameId, data] of frameVisits) {
    const frame = frameMap.get(frameId)

    // Determine node role
    let role: FlowNodeRole = 'regular'
    if (frameId === task.start_frame_id) {
      role = 'start'
    } else if (successFrameIds.has(frameId)) {
      role = 'success'
    }

    nodes.push({
      id: frameId,
      name: frame?.name || `Screen ${frameId.slice(-6)}`,
      type: 'frame',
      role,
      sourceId: frameId,
      thumbnailUrl: frame?.thumbnail_url || null,
      visitCount: data.visitCount,
      uniqueVisitors: data.uniqueVisitors.size,
      avgTimeMs: data.timeCount > 0 ? data.totalTime / data.timeCount : 0,
      outcomeBreakdown: data.outcomes,
      abandonedCount: data.abandonedCount,
    })
  }

  // Optionally add component state nodes
  if (showComponentStates && stateEvents.length > 0) {
    const stateNodes = buildComponentStateNodes(stateEvents, sessionToAttempt, instanceMap, null)
    nodes.push(...stateNodes)
  }

  return nodes
}
