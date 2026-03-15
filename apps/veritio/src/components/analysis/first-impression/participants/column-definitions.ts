/**
 * First Impression Participants Column Definitions
 *
 * Defines all available columns for the participants table with tier grouping,
 * visibility defaults, and render functions.
 */

import type { Participant } from '@veritio/study-types'
import type { FirstImpressionFlag } from '@/lib/algorithms/first-impression-flagging'

/**
 * Column tier classification for grouping in dropdown
 */
export type ColumnTier = 'essential' | 'quality' | 'advanced'

/**
 * Column identifiers for First Impression participants
 */
export type FirstImpressionColumnId =
  // Tier 1: Essential (default visible)
  | 'participant'
  | 'status'
  | 'designShown'
  | 'exposureTime'
  | 'responseRate'
  | 'totalTime'
  // Tier 2: Quality/Segmentation
  | 'device'
  | 'qualityFlag'
  | 'identifier'
  | 'source'
  // Tier 3: Advanced
  | 'viewport'
  | 'startedAt'
  | 'completedAt'
  | 'questionTime'

/**
 * Participant row data with all computed fields
 */
export interface ParticipantRowData {
  // Core data
  participant: Participant
  index: number

  // Tier 1: Essential
  status: string
  designNames: string[]
  exposureTimeMs: number
  responsesAnswered: number
  totalQuestions: number
  responseRate: number
  totalTimeMs: number

  // Tier 2: Quality/Segmentation
  deviceType: 'desktop' | 'tablet' | 'mobile' | null
  qualityFlags: FirstImpressionFlag[]
  identifier: string | null
  urlTags: Record<string, string> | null

  // Tier 3: Advanced
  viewportWidth: number | null
  viewportHeight: number | null
  startedAt: string | null
  completedAt: string | null
  questionTimeMs: number

  // State
  isExcluded: boolean
  designsViewed: number
}

/**
 * Column definition with tier metadata and render function
 */
export interface FirstImpressionColumn {
  /** Unique column identifier */
  id: FirstImpressionColumnId
  /** Display header text */
  header: string
  /** Column tier for grouping */
  tier: ColumnTier
  /** Whether visible by default */
  defaultVisible: boolean
  /** Column width percentage */
  width: string
  /** Text alignment */
  align: 'left' | 'center' | 'right'
  /** Short description for dropdown tooltip */
  description?: string
}

/**
 * Tier labels for dropdown section headers
 */
export const COLUMN_TIER_LABELS: Record<ColumnTier, string> = {
  essential: 'Essential',
  quality: 'Quality & Segmentation',
  advanced: 'Advanced',
}

/**
 * Default visible columns (Tier 1)
 */
export const DEFAULT_VISIBLE_COLUMNS: FirstImpressionColumnId[] = [
  'participant',
  'status',
  'designShown',
  'exposureTime',
  'responseRate',
  'totalTime',
]

/**
 * All available columns in tier order
 */
export const ALL_COLUMNS: FirstImpressionColumnId[] = [
  // Tier 1: Essential
  'participant',
  'status',
  'designShown',
  'exposureTime',
  'responseRate',
  'totalTime',
  // Tier 2: Quality
  'device',
  'qualityFlag',
  'identifier',
  'source',
  // Tier 3: Advanced
  'viewport',
  'startedAt',
  'completedAt',
  'questionTime',
]

/**
 * Column definitions with metadata
 * Render functions are defined in the component to access React components
 */
export const COLUMN_DEFINITIONS: FirstImpressionColumn[] = [
  // ═══════════════════════════════════════════════════════════════════
  // TIER 1: ESSENTIAL (Default Visible)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'participant',
    header: 'Participant',
    tier: 'essential',
    defaultVisible: true,
    width: '14%',
    align: 'left',
    description: 'Participant number and identifier',
  },
  {
    id: 'status',
    header: 'Status',
    tier: 'essential',
    defaultVisible: true,
    width: '10%',
    align: 'left',
    description: 'Completion status',
  },
  {
    id: 'designShown',
    header: 'Design(s)',
    tier: 'essential',
    defaultVisible: true,
    width: '14%',
    align: 'left',
    description: 'Which design(s) were shown',
  },
  {
    id: 'exposureTime',
    header: 'Exposure',
    tier: 'essential',
    defaultVisible: true,
    width: '10%',
    align: 'right',
    description: 'Time design was displayed',
  },
  {
    id: 'responseRate',
    header: 'Responses',
    tier: 'essential',
    defaultVisible: true,
    width: '12%',
    align: 'right',
    description: 'Questions answered',
  },
  {
    id: 'totalTime',
    header: 'Total Time',
    tier: 'essential',
    defaultVisible: true,
    width: '10%',
    align: 'right',
    description: 'Total session duration',
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIER 2: QUALITY & SEGMENTATION
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'device',
    header: 'Device',
    tier: 'quality',
    defaultVisible: false,
    width: '8%',
    align: 'center',
    description: 'Device type used',
  },
  {
    id: 'qualityFlag',
    header: 'Flags',
    tier: 'quality',
    defaultVisible: false,
    width: '10%',
    align: 'left',
    description: 'Quality indicators',
  },
  {
    id: 'identifier',
    header: 'Identifier',
    tier: 'quality',
    defaultVisible: false,
    width: '12%',
    align: 'left',
    description: 'Custom tracking ID',
  },
  {
    id: 'source',
    header: 'Source',
    tier: 'quality',
    defaultVisible: false,
    width: '12%',
    align: 'left',
    description: 'URL tracking tags',
  },

  // ═══════════════════════════════════════════════════════════════════
  // TIER 3: ADVANCED
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'viewport',
    header: 'Viewport',
    tier: 'advanced',
    defaultVisible: false,
    width: '10%',
    align: 'right',
    description: 'Screen dimensions',
  },
  {
    id: 'startedAt',
    header: 'Started',
    tier: 'advanced',
    defaultVisible: false,
    width: '12%',
    align: 'left',
    description: 'Session start time',
  },
  {
    id: 'completedAt',
    header: 'Completed',
    tier: 'advanced',
    defaultVisible: false,
    width: '12%',
    align: 'left',
    description: 'Session end time',
  },
  {
    id: 'questionTime',
    header: 'Q. Time',
    tier: 'advanced',
    defaultVisible: false,
    width: '10%',
    align: 'right',
    description: 'Time spent on questions',
  },
]

/**
 * Get column definition by ID
 */
export function getColumnById(id: FirstImpressionColumnId): FirstImpressionColumn | undefined {
  return COLUMN_DEFINITIONS.find(col => col.id === id)
}

/**
 * Get columns grouped by tier
 */
export function getColumnsByTier(): Record<ColumnTier, FirstImpressionColumn[]> {
  return {
    essential: COLUMN_DEFINITIONS.filter(c => c.tier === 'essential'),
    quality: COLUMN_DEFINITIONS.filter(c => c.tier === 'quality'),
    advanced: COLUMN_DEFINITIONS.filter(c => c.tier === 'advanced'),
  }
}

/**
 * Calculate proportional widths for visible columns
 * Ensures total width is 100% minus reserved space for checkbox and actions
 */
export function calculateColumnWidths(
  visibleColumnIds: Set<FirstImpressionColumnId>,
  reservedWidth = 12 // 5% checkbox + 7% actions
): Map<FirstImpressionColumnId, string> {
  const visibleColumns = COLUMN_DEFINITIONS.filter(c => visibleColumnIds.has(c.id))
  const totalBaseWidth = visibleColumns.reduce((sum, c) => sum + parseFloat(c.width), 0)
  const availableWidth = 100 - reservedWidth

  const widthMap = new Map<FirstImpressionColumnId, string>()
  visibleColumns.forEach(col => {
    const proportion = parseFloat(col.width) / totalBaseWidth
    widthMap.set(col.id, `${(proportion * availableWidth).toFixed(1)}%`)
  })

  return widthMap
}
