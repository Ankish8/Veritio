import type { TaskOutcome } from '../../types/analytics'

export type FlowNodeType = 'frame' | 'state'

export type FlowNodeRole = 'start' | 'success' | 'dead_end' | 'regular'

export interface FlowNode {
  id: string
  name: string
  type: FlowNodeType
  role: FlowNodeRole
  sourceId: string
  parentFrameId?: string
  variantId?: string
  thumbnailUrl?: string | null
  visitCount: number
  uniqueVisitors: number
  avgTimeMs: number
  outcomeBreakdown: {
    success: number
    failure: number
    abandoned: number
    skipped: number
  }
  abandonedCount: number
  x0?: number
  y0?: number
  x1?: number
  y1?: number
  depth?: number
}

export interface FlowLink {
  source: string
  target: string
  value: number
  uniqueParticipants: number
  outcomeBreakdown: {
    success: number
    failure: number
    abandoned: number
    skipped: number
  }
  isBacktrack: boolean
  participantIds: string[]
  dominantOutcome: TaskOutcome
  percentage: number
  width?: number
  y0?: number
  y1?: number
}

export type OptimalPathType = 'criteria' | 'shortest' | 'common'

export interface OptimalPath {
  type: OptimalPathType
  nodeIds: string[]
  description: string
  participantCount?: number
}

export interface FlowDiagramFilters {
  outcomes: Set<TaskOutcome>
  directness: 'all' | 'direct' | 'indirect'
  minParticipants: number
  showComponentStates: boolean
  showBacktracks: boolean
  highlightPath: OptimalPathType | null
}

export const DEFAULT_FLOW_FILTERS: FlowDiagramFilters = {
  outcomes: new Set(['success', 'failure', 'abandoned', 'skipped']),
  directness: 'all',
  minParticipants: 1,
  showComponentStates: false,
  showBacktracks: false,
  highlightPath: null,
}

export interface ComponentInstancePositionInput {
  instance_id: string
  instance_name: string | null
  component_set_id: string | null
  frame_node_id: string
  component_id: string
  relative_x: number
  relative_y: number
  width: number
  height: number
  frame_width: number | null
  frame_height: number | null
}

export interface ComponentVariantInput {
  variant_id: string
  component_set_id: string
  component_set_name: string
  variant_name: string
  image_url: string
  image_width: number | null
  image_height: number | null
}

export interface FlowDiagramData {
  nodes: FlowNode[]
  links: FlowLink[]
  optimalPaths: {
    criteria: OptimalPath | null
    shortest: OptimalPath | null
    common: OptimalPath | null
  }
  deadEndNodeIds: Set<string>
  stats: {
    totalParticipants: number
    totalTransitions: number
    uniquePaths: number
    avgPathLength: number
    maxPathLength: number
    backtrackRate: number
  }
  supplementary?: {
    frames: FrameInput[]
    componentInstancePositions: ComponentInstancePositionInput[]
    componentVariants: ComponentVariantInput[]
  }
}

export interface NavigationEventInput {
  id: string
  session_id: string
  task_id: string
  study_id: string
  from_frame_id: string | null
  to_frame_id: string
  sequence_number: number
  time_on_from_frame_ms: number | null
  triggered_by: string
  timestamp: string | null
}

export interface ComponentStateEventInput {
  id: string
  session_id: string
  task_id: string
  study_id: string
  frame_id: string | null
  component_node_id: string
  from_variant_id: string | null
  to_variant_id: string
  sequence_number: number
  is_timed_change: boolean | null
  timestamp: string | null
  custom_label: string | null
}

export interface TaskAttemptInput {
  id: string
  session_id: string
  task_id: string
  participant_id: string
  outcome: string
  is_direct: boolean | null
  path_taken: string[] | null
}

export interface FrameInput {
  id: string
  name: string
  figma_node_id: string
  thumbnail_url: string | null
  width?: number | null
  height?: number | null
}

export interface ComponentInstanceInput {
  instance_id: string
  instance_name: string | null
  component_set_id: string | null
}

export interface TaskInput {
  id: string
  title: string
  start_frame_id: string | null
  success_frame_ids: string[] | null
  success_criteria_type: 'destination' | 'pathway' | 'component_state' | null
  success_pathway: { frames: string[]; strict: boolean } | null
  raw_pathway?: unknown
}

export interface FlowDiagramConfig {
  nodeWidth: number
  nodePadding: number
  nodeMinHeight: number
  thumbnailWidth: number
  thumbnailHeight: number
  linkOpacity: number
  linkOpacityHover: number
  outcomeColors: {
    success: string
    failure: string
    abandoned: string
    skipped: string
    mixed: string
  }
  pathColors: {
    criteria: string
    shortest: string
    common: string
  }
  roleColors: {
    start: string
    success: string
    dead_end: string
    regular: string
  }
}

export const DEFAULT_FLOW_CONFIG: FlowDiagramConfig = {
  nodeWidth: 24,
  nodePadding: 20,
  nodeMinHeight: 20,
  thumbnailWidth: 60,
  thumbnailHeight: 45,
  linkOpacity: 0.3,
  linkOpacityHover: 0.7,
  outcomeColors: {
    success: '#22c55e',
    failure: '#ef4444',
    abandoned: '#f97316',
    skipped: '#9ca3af',
    mixed: '#6b7280',
  },
  pathColors: {
    criteria: '#22c55e',
    shortest: '#3b82f6',
    common: '#a855f7',
  },
  roleColors: {
    start: '#3b82f6',
    success: '#22c55e',
    dead_end: '#ef4444',
    regular: '#6b7280',
  },
}
