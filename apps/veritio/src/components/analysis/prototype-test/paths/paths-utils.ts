import type { PrototypeTestTaskAttempt, PrototypeTestFrame, SuccessPathway } from '@veritio/study-types'
import { castJsonArray } from '@/lib/supabase/json-utils'
import { getPathsV3FromPathway } from '@veritio/prototype-test/lib/utils/pathway-migration'
import type { NavigationEventRow, ComponentStateEventRow } from '@/hooks/use-prototype-test-attempt-events'

/**
 * Result type classification for prototype test paths.
 * Combines outcome (success/failure/abandoned/skipped) with directness (direct/indirect).
 */
export type ResultType =
  | 'direct_success'
  | 'indirect_success'
  | 'direct_failure'
  | 'indirect_failure'
  | 'direct_abandoned'
  | 'indirect_abandoned'
  | 'direct_skipped'
  | 'indirect_skipped'

/**
 * Display configuration for each result type
 */
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

/**
 * All result types for filter dropdown
 */
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

/**
 * A single step in a rich path — either a frame navigation or a component state change.
 */
export interface RichPathStep {
  type: 'frame' | 'state'
  label: string
  frameId: string | null
  isGoal: boolean
  variantId?: string
  componentNodeId?: string
}

export interface AggregatedPathData {
  pathKey: string // Unique key for the path (joined frame IDs)
  pathTaken: string[] // Array of frame IDs
  frameLabels: string[] // Array of frame names
  breadcrumbString: string // "Frame1 > Frame2 > ..." format
  resultType: ResultType
  participantCount: number
  percentage: number
  participantIds: string[]
  richSteps?: RichPathStep[]
}

/**
 * Individual path row data (when showing all participants)
 */
export interface IndividualPathData {
  attemptId: string
  participantId: string
  participantIndex: number // 1-based display index
  pathTaken: string[]
  frameLabels: string[]
  breadcrumbString: string
  resultType: ResultType
  richSteps?: RichPathStep[]
}

/**
 * Sort configuration
 */
export interface SortConfig {
  field: 'result' | 'participants' | 'path'
  direction: 'asc' | 'desc'
}

/**
 * Classify an attempt into one of the 8 result types.
 */
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

/**
 * Filter attempts by selected result types.
 */
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

/**
 * Build frame labels from frame IDs using a frame map.
 */
export function buildFrameLabels(
  pathTaken: string[],
  frameMap: Map<string, PrototypeTestFrame>
): string[] {
  return pathTaken.map((frameId) => frameMap.get(frameId)?.name || 'Unknown')
}

/**
 * Parse path_taken from task attempt (handles JSONB)
 */
export function parsePathTaken(attempt: PrototypeTestTaskAttempt): string[] {
  return castJsonArray<string>(attempt.path_taken)
}

/**
 * Compute aggregated path data - groups attempts by unique (path + resultType) combinations.
 * Returns one row per unique path/result combo with participant count.
 */
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

/**
 * Compute individual path data - one row per participant attempt.
 */
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

/**
 * Result type sort order (for consistent sorting)
 */
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

function sortPathData<T extends { resultType: ResultType; breadcrumbString: string }>(
  data: T[],
  sortConfig: SortConfig,
  getParticipantValue: (item: T) => number
): T[] {
  const sorted = [...data]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortConfig.field) {
      case 'result':
        comparison = RESULT_TYPE_ORDER[a.resultType] - RESULT_TYPE_ORDER[b.resultType]
        break
      case 'participants':
        comparison = getParticipantValue(a) - getParticipantValue(b)
        break
      case 'path':
        comparison = a.breadcrumbString.localeCompare(b.breadcrumbString)
        break
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison
  })

  return sorted
}

export function sortAggregatedPaths(
  data: AggregatedPathData[],
  sortConfig: SortConfig
): AggregatedPathData[] {
  return sortPathData(data, sortConfig, (item) => item.participantCount)
}

export function sortIndividualPaths(
  data: IndividualPathData[],
  sortConfig: SortConfig
): IndividualPathData[] {
  return sortPathData(data, sortConfig, (item) => item.participantIndex)
}

// ---------------------------------------------------------------------------
// Rich path building — interleave frame navigations with component state events
// ---------------------------------------------------------------------------

/**
 * Parse the value part from a Figma variant name string.
 * Figma uses "PropertyName=Value" format, e.g. "Property 1=Contact" → "Contact".
 */
function parseVariantValue(variantName: string): string {
  const eqIndex = variantName.lastIndexOf('=')
  return eqIndex >= 0 ? variantName.slice(eqIndex + 1).trim() : variantName
}

export function buildVariantLabelMap(
  pathway: SuccessPathway,
): { labels: Map<string, string>; componentNames: Map<string, string> } {
  const labels = new Map<string, string>()
  const componentNames = new Map<string, string>()

  const paths = getPathsV3FromPathway(pathway)
  for (const path of paths) {
    for (const step of path.steps) {
      if (step.type !== 'state') continue

      // Build a concise label: customLabel > "Component: Value" > componentName > "Interaction"
      // Parse variant value from "Property 1=Contact" → "Contact" (strip Figma property prefix)
      let label: string
      if (step.customLabel) {
        label = step.customLabel
      } else if (step.componentName && step.variantName) {
        const value = parseVariantValue(step.variantName)
        label = `${step.componentName}: ${value}`
      } else {
        label = step.componentName || 'Interaction'
      }

      labels.set(step.variantId, label)
      if (step.componentName) {
        componentNames.set(step.componentNodeId, step.componentName)
      }
    }
  }

  return { labels, componentNames }
}

/**
 * Merge navigation events and component state events chronologically to produce
 * a rich path that shows both frame transitions and state changes.
 *
 * Filtering strategy:
 * - Only show state events for components defined in the pathway (reduces noise from
 *   nested Figma instances and unrelated component interactions).
 * - Skip automatic/timed transitions (is_timed_change).
 * - Deduplicate consecutive state changes on the same component (keep last).
 * - Skip duplicate consecutive frame navigations (e.g., initial frame load).
 *
 * Returns null if no meaningful state steps survive filtering (caller uses frame-only path).
 */
export function buildRichPath(
  sessionId: string,
  taskId: string,
  pathTaken: string[],
  navEvents: NavigationEventRow[],
  stateEvents: ComponentStateEventRow[],
  frameMap: Map<string, PrototypeTestFrame>,
  goalFrameIds: Set<string>,
  labelMap: { labels: Map<string, string>; componentNames: Map<string, string> }
): RichPathStep[] | null {
  // Filter events for this specific attempt
  const myNavs = navEvents.filter(e => e.session_id === sessionId && e.task_id === taskId)
  const myStates = stateEvents.filter(e => e.session_id === sessionId && e.task_id === taskId)

  // No events at all → fall back to frame-only display
  if (myNavs.length === 0 && myStates.length === 0) return null

  // Sets of pathway-defined components/variants for filtering
  const pathwayComponentIds = new Set(labelMap.componentNames.keys())
  const pathwayVariantIds = new Set(labelMap.labels.keys())

  // Build a unified chronological list
  type UnifiedEvent =
    | { kind: 'nav'; timestamp: string; seqNum: number; toFrameId: string }
    | { kind: 'state'; timestamp: string; seqNum: number; toVariantId: string; componentNodeId: string; frameId: string | null }

  const unified: UnifiedEvent[] = []

  for (const nav of myNavs) {
    unified.push({
      kind: 'nav',
      timestamp: nav.timestamp || '',
      seqNum: nav.sequence_number,
      toFrameId: nav.to_frame_id,
    })
  }

  for (const st of myStates) {
    // Skip automatic/timed transitions — not user actions
    if (st.is_timed_change) continue

    // Only show state changes for pathway-defined components (filters out
    // nested Figma instances and unrelated component interactions)
    if (!pathwayComponentIds.has(st.component_node_id) && !pathwayVariantIds.has(st.to_variant_id)) continue

    unified.push({
      kind: 'state',
      timestamp: st.timestamp || '',
      seqNum: st.sequence_number,
      toVariantId: st.to_variant_id,
      componentNodeId: st.component_node_id,
      frameId: st.frame_id,
    })
  }

  // Sort by timestamp, then by sequence_number as tiebreaker
  unified.sort((a, b) => {
    const tsCmp = a.timestamp.localeCompare(b.timestamp)
    if (tsCmp !== 0) return tsCmp
    return a.seqNum - b.seqNum
  })

  const steps: RichPathStep[] = []

  // Track last frame to skip duplicate consecutive navigations
  let lastFrameId: string | null = pathTaken[0] || null

  // Add the initial frame from path_taken
  if (pathTaken.length > 0) {
    steps.push({
      type: 'frame',
      label: frameMap.get(pathTaken[0])?.name || 'Unknown',
      frameId: pathTaken[0],
      isGoal: goalFrameIds.has(pathTaken[0]),
    })
  }

  // Track whether any state steps were added
  let hasStateSteps = false

  // Process events chronologically
  for (const event of unified) {
    if (event.kind === 'nav') {
      // Skip duplicate consecutive frame navigations (e.g., initial frame load event)
      if (event.toFrameId === lastFrameId) continue
      lastFrameId = event.toFrameId

      steps.push({
        type: 'frame',
        label: frameMap.get(event.toFrameId)?.name || 'Unknown',
        frameId: event.toFrameId,
        isGoal: goalFrameIds.has(event.toFrameId),
      })
    } else {
      // Look up label: exact variant match first, then component name fallback
      const label = labelMap.labels.get(event.toVariantId)
        || labelMap.componentNames.get(event.componentNodeId)
        || 'Interaction'

      // Deduplicate consecutive state changes on the same component (keep latest)
      const lastStep = steps[steps.length - 1]
      if (lastStep?.type === 'state' && lastStep.componentNodeId === event.componentNodeId) {
        lastStep.label = label
        lastStep.variantId = event.toVariantId
        continue
      }

      steps.push({
        type: 'state',
        label,
        frameId: event.frameId,
        isGoal: false,
        variantId: event.toVariantId,
        componentNodeId: event.componentNodeId,
      })
      hasStateSteps = true
    }
  }

  // If no state steps survived filtering, return null → use frame-only display
  if (!hasStateSteps) return null

  return steps
}

/**
 * Generate a grouping key from rich path steps for aggregation.
 * Format: "frame:inbox|state:Assigned|frame:NewChat"
 */
export function richPathKey(steps: RichPathStep[]): string {
  return steps.map(s => `${s.type}:${s.label}`).join('|')
}
