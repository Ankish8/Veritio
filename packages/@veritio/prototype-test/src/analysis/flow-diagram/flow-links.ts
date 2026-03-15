/**
 * Flow Links
 *
 * Link/transition building from navigation events and unified timelines.
 * Handles backtrack detection, minimum participant filtering, and
 * positional ID assignment for V3 pathway-aligned diagrams.
 */

import type {
  FlowLink,
  NavigationEventInput,
  ComponentStateEventInput,
  TaskAttemptInput,
  ComponentInstanceInput,
} from './types'
import type { TaskOutcome } from '../../types/analytics'
import type { PathwayLabelMaps } from './flow-labels'
import type { SessionPath } from './flow-paths'
// Helpers
export function getDominantOutcome(outcomes: {
  success: number
  failure: number
  abandoned: number
  skipped: number
}): TaskOutcome {
  const entries: [TaskOutcome, number][] = [
    ['success', outcomes.success],
    ['failure', outcomes.failure],
    ['abandoned', outcomes.abandoned],
    ['skipped', outcomes.skipped],
  ]

  entries.sort((a, b) => b[1] - a[1])
  return entries[0][1] > 0 ? entries[0][0] : 'skipped'
}
// Path-based Link Building
export function buildLinksFromPaths(
  sessionPaths: SessionPath[],
  showBacktracks: boolean,
  minParticipants: number
): FlowLink[] {
  const transitions = new Map<
    string,
    {
      source: string
      target: string
      count: number
      participants: Set<string>
      outcomes: { success: number; failure: number; abandoned: number; skipped: number }
      isBacktrack: boolean
    }
  >()

  for (const path of sessionPaths) {
    const visited = new Set<string>()

    for (let i = 0; i < path.frameIds.length - 1; i++) {
      const source = path.frameIds[i]
      const target = path.frameIds[i + 1]
      if (source === target) continue

      visited.add(source)
      const isBacktrack = visited.has(target)

      // Skip backtrack links when not showing them
      if (isBacktrack && !showBacktracks) continue

      const linkKey = `${source}→${target}${isBacktrack ? ':bt' : ''}`
      const existing = transitions.get(linkKey) || {
        source,
        target,
        count: 0,
        participants: new Set<string>(),
        outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
        isBacktrack,
      }

      existing.count++
      existing.participants.add(path.participantId)

      const outcome = path.outcome
      if (outcome in existing.outcomes) {
        existing.outcomes[outcome]++
      }

      transitions.set(linkKey, existing)
    }
  }

  const totalTransitions = Array.from(transitions.values()).reduce(
    (sum, t) => sum + t.count,
    0
  )
  const links: FlowLink[] = []

  for (const data of transitions.values()) {
    if (data.participants.size < minParticipants) continue

    const dominantOutcome = getDominantOutcome(data.outcomes)

    links.push({
      source: data.source,
      target: data.target,
      value: data.count,
      uniqueParticipants: data.participants.size,
      outcomeBreakdown: data.outcomes,
      isBacktrack: false,
      participantIds: Array.from(data.participants),
      dominantOutcome,
      percentage: totalTransitions > 0 ? (data.count / totalTransitions) * 100 : 0,
    })
  }

  return links
}
// Event-based Link Building (legacy)
export function buildLinks(
  navEvents: NavigationEventInput[],
  sessionToAttempt: Map<string, TaskAttemptInput>,
  showBacktracks: boolean,
  minParticipants: number
): FlowLink[] {
  // Track visited frames per session for backtrack detection
  const sessionVisited = new Map<string, Set<string>>()

  // Aggregate transitions
  const transitions = new Map<
    string,
    {
      source: string
      target: string
      count: number
      participants: Set<string>
      outcomes: { success: number; failure: number; abandoned: number; skipped: number }
      isBacktrack: boolean
    }
  >()

  // Sort events by session and sequence
  const sortedEvents = [...navEvents].sort((a, b) => {
    if (a.session_id !== b.session_id) {
      return a.session_id.localeCompare(b.session_id)
    }
    return a.sequence_number - b.sequence_number
  })

  for (const event of sortedEvents) {
    const attempt = sessionToAttempt.get(event.session_id)
    if (!attempt || !event.from_frame_id) continue

    const source = event.from_frame_id
    const target = event.to_frame_id

    // Track visited frames for backtrack detection
    const visited = sessionVisited.get(event.session_id) || new Set<string>()
    const isBacktrack = visited.has(target)
    visited.add(source)
    visited.add(target)
    sessionVisited.set(event.session_id, visited)

    // Skip backtrack links if not showing them
    if (isBacktrack && !showBacktracks) continue

    const linkKey = `${source}→${target}${isBacktrack ? ':bt' : ''}`
    const existing = transitions.get(linkKey) || {
      source,
      target,
      count: 0,
      participants: new Set<string>(),
      outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
      isBacktrack,
    }

    existing.count++
    existing.participants.add(attempt.participant_id)

    const outcome = attempt.outcome as TaskOutcome
    if (outcome in existing.outcomes) {
      existing.outcomes[outcome]++
    }

    transitions.set(linkKey, existing)
  }

  // Convert to links, filtering by min participants
  const totalTransitions = navEvents.length
  const links: FlowLink[] = []

  for (const data of transitions.values()) {
    if (data.participants.size < minParticipants) continue

    // Determine dominant outcome
    const dominantOutcome = getDominantOutcome(data.outcomes)

    links.push({
      source: data.source,
      target: data.target,
      value: data.count,
      uniqueParticipants: data.participants.size,
      outcomeBreakdown: data.outcomes,
      isBacktrack: data.isBacktrack,
      participantIds: Array.from(data.participants),
      dominantOutcome,
      percentage: totalTransitions > 0 ? (data.count / totalTransitions) * 100 : 0,
    })
  }

  return links
}
// Unified Timeline Link Building
export function buildUnifiedLinks(
  navEvents: NavigationEventInput[],
  stateEvents: ComponentStateEventInput[],
  sessionToAttempt: Map<string, TaskAttemptInput>,
  showBacktracks: boolean,
  minParticipants: number,
  instanceMap: Map<string, ComponentInstanceInput>,
  pathwayLabels: PathwayLabelMaps | null
): FlowLink[] {
  type TimelineEntry = {
    sortKey: number
    nodeId: string
  }

  // Build sort key from timestamp (preferred) or sequence_number (fallback).
  // typeOffset separates same-moment events: 0 for state changes (happen first),
  // 500 for navigations (happen after the state change that triggered them).
  function getSortKey(
    timestamp: string | null,
    sequenceNumber: number,
    typeOffset: number
  ): number {
    if (timestamp) {
      return new Date(timestamp).getTime() + typeOffset * 0.001
    }
    return sequenceNumber * 1000 + typeOffset
  }

  const sessionTimelines = new Map<string, TimelineEntry[]>()

  // Find the first navigation event per session to extract the start frame
  const sessionFirstNav = new Map<string, NavigationEventInput>()
  for (const event of navEvents) {
    if (!sessionToAttempt.has(event.session_id)) continue
    const existing = sessionFirstNav.get(event.session_id)
    if (!existing || event.sequence_number < existing.sequence_number) {
      sessionFirstNav.set(event.session_id, event)
    }
  }

  // Seed each session's timeline with the start frame (before all other events)
  for (const [sessionId, firstNav] of sessionFirstNav) {
    if (!firstNav.from_frame_id) continue
    sessionTimelines.set(sessionId, [
      { sortKey: -1, nodeId: firstNav.from_frame_id },
    ])
  }

  // Also seed sessions that have component state events but no navigation events.
  // These are single-frame sessions where participants interacted with components
  // (e.g., changed a tab state to complete the task) without navigating away.
  // Without this seed, their timelines would have only state entries and produce
  // no links — making them invisible in the Sankey.
  for (const event of stateEvents) {
    if (!sessionToAttempt.has(event.session_id)) continue
    if (sessionTimelines.has(event.session_id)) continue
    const attempt = sessionToAttempt.get(event.session_id)
    const startFrame = (attempt?.path_taken && attempt.path_taken.length > 0)
      ? attempt.path_taken[0]
      : event.frame_id
    if (startFrame) {
      sessionTimelines.set(event.session_id, [
        { sortKey: -1, nodeId: startFrame },
      ])
    }
  }

  // Add navigation events — each represents arriving at to_frame_id
  for (const event of navEvents) {
    if (!sessionToAttempt.has(event.session_id)) continue
    const timeline = sessionTimelines.get(event.session_id) || []
    timeline.push({
      sortKey: getSortKey(event.timestamp, event.sequence_number, 500),
      nodeId: event.to_frame_id,
    })
    sessionTimelines.set(event.session_id, timeline)
  }

  // Add component state events — use pathway-aligned node IDs when available
  for (const event of stateEvents) {
    if (!sessionToAttempt.has(event.session_id)) continue

    let stateKey: string

    if (pathwayLabels) {
      // V3 pathway: filter to pathway-defined components only, use componentNodeId
      if (!pathwayLabels.componentIds.has(event.component_node_id) &&
          !pathwayLabels.variantIds.has(event.to_variant_id)) {
        continue // Skip non-pathway events (eliminates cascading noise)
      }
      stateKey = event.component_node_id
    } else {
      // Fallback: group by frame_id (same as buildFallbackStateNodes)
      const instance = instanceMap.get(event.component_node_id)
      stateKey = event.frame_id || instance?.component_set_id || event.component_node_id
    }

    const timeline = sessionTimelines.get(event.session_id) || []
    timeline.push({
      sortKey: getSortKey(event.timestamp, event.sequence_number, 0),
      nodeId: `state:${stateKey}`,
    })
    sessionTimelines.set(event.session_id, timeline)
  }

  // Sort, deduplicate consecutive identical nodes, detect backtracks
  for (const [_sessionId, timeline] of sessionTimelines) {
    timeline.sort((a, b) => a.sortKey - b.sortKey)

    // Dedup consecutive identical nodeIds (collapses cascading state events
    // on the same component and repeated frame navigations)
    const deduped: TimelineEntry[] = []
    for (const entry of timeline) {
      if (deduped.length === 0 || deduped[deduped.length - 1].nodeId !== entry.nodeId) {
        deduped.push(entry)
      }
    }

    if (pathwayLabels) {
      // V3 pathway: assign positional IDs so nodes at different journey depths
      // get separate Sankey columns. This makes the graph acyclic AND preserves
      // divergent paths (e.g., direct vs indirect) that share the same endpoints.
      //
      // Without positional IDs, "inbox → info-menu" (direct, 2 participants) and
      // "inbox → tabs → chat → inbox → info-menu" (indirect, 1 participant)
      // would merge at "info-menu", pushing it to the last column and hiding the
      // branching structure. With positional IDs, the direct path gets
      // "info-menu:p1" while the indirect gets "info-menu:p4", keeping both paths
      // visually distinct in the Sankey.
      //
      // Position 0 (start node) keeps its original ID so all sessions merge there.
      // Nodes at the same position with the same base ID merge across sessions.
      const positional: TimelineEntry[] = []
      for (let i = 0; i < deduped.length; i++) {
        const baseId = deduped[i].nodeId
        const nodeId = i === 0 ? baseId : `${baseId}:p${i}`
        positional.push({ ...deduped[i], nodeId })
      }
      timeline.length = 0
      timeline.push(...positional)
    } else {
      // No pathway: use deduped timeline as-is (backtrack detection handles cycles)
      timeline.length = 0
      timeline.push(...deduped)
    }
  }

  // Build transitions from consecutive timeline entries
  const transitions = new Map<
    string,
    {
      source: string
      target: string
      count: number
      participants: Set<string>
      outcomes: { success: number; failure: number; abandoned: number; skipped: number }
      isBacktrack: boolean
    }
  >()

  for (const [sessionId, timeline] of sessionTimelines) {
    const attempt = sessionToAttempt.get(sessionId)
    if (!attempt || timeline.length < 2) continue

    if (pathwayLabels) {
      // V3 pathway: no backtrack detection needed — return-visit IDs make
      // every link unique and forward. All links are included.
      for (let i = 0; i < timeline.length - 1; i++) {
        const source = timeline[i].nodeId
        const target = timeline[i + 1].nodeId
        if (source === target) continue

        const linkKey = `${source}→${target}`
        const existing = transitions.get(linkKey) || {
          source,
          target,
          count: 0,
          participants: new Set<string>(),
          outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
          isBacktrack: false,
        }

        existing.count++
        existing.participants.add(attempt.participant_id)
        const outcome = attempt.outcome as TaskOutcome
        if (outcome in existing.outcomes) {
          existing.outcomes[outcome]++
        }
        transitions.set(linkKey, existing)
      }
    } else {
      // No pathway: detect backtracks and conditionally skip them
      const visited = new Set<string>()

      for (let i = 0; i < timeline.length - 1; i++) {
        const source = timeline[i].nodeId
        const target = timeline[i + 1].nodeId
        if (source === target) continue

        visited.add(source)
        const isBacktrack = visited.has(target)
        if (isBacktrack && !showBacktracks) continue

        const linkKey = `${source}→${target}${isBacktrack ? ':bt' : ''}`
        const existing = transitions.get(linkKey) || {
          source,
          target,
          count: 0,
          participants: new Set<string>(),
          outcomes: { success: 0, failure: 0, abandoned: 0, skipped: 0 },
          isBacktrack,
        }

        existing.count++
        existing.participants.add(attempt.participant_id)

        const outcome = attempt.outcome as TaskOutcome
        if (outcome in existing.outcomes) {
          existing.outcomes[outcome]++
        }

        transitions.set(linkKey, existing)
      }
    }
  }

  // Convert to FlowLink array
  const totalTransitions = Array.from(transitions.values()).reduce(
    (sum, t) => sum + t.count,
    0
  )
  const links: FlowLink[] = []

  for (const data of transitions.values()) {
    if (data.participants.size < minParticipants) continue

    const dominantOutcome = getDominantOutcome(data.outcomes)

    links.push({
      source: data.source,
      target: data.target,
      value: data.count,
      uniqueParticipants: data.participants.size,
      outcomeBreakdown: data.outcomes,
      isBacktrack: data.isBacktrack,
      participantIds: Array.from(data.participants),
      dominantOutcome,
      percentage: totalTransitions > 0 ? (data.count / totalTransitions) * 100 : 0,
    })
  }

  return links
}
