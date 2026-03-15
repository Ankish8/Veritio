import type { LiveWebsiteResponse } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

// ─── Result Type Classification ─────────────────────────────────────────────

/**
 * Result type for live website navigation paths.
 * Combines completion status with completion method (direct/indirect/self-reported).
 */
export type LiveWebsiteResultType =
  | 'direct_completed'
  | 'indirect_completed'
  | 'self_reported'
  | 'abandoned'
  | 'timed_out'
  | 'skipped'

export const RESULT_TYPE_CONFIG: Record<
  LiveWebsiteResultType,
  { label: string; color: string; dotColor: string }
> = {
  direct_completed: {
    label: 'Direct success',
    color: 'text-green-700',
    dotColor: '#22c55e', // green-500
  },
  indirect_completed: {
    label: 'Indirect success',
    color: 'text-green-500',
    dotColor: '#4ade80', // green-400
  },
  self_reported: {
    label: 'Self-reported',
    color: 'text-green-400',
    dotColor: '#86efac', // green-300
  },
  abandoned: {
    label: 'Abandoned',
    color: 'text-red-600',
    dotColor: '#ef4444', // red-500
  },
  timed_out: {
    label: 'Timed out',
    color: 'text-amber-600',
    dotColor: '#f59e0b', // amber-500
  },
  skipped: {
    label: 'Skipped',
    color: 'text-slate-500',
    dotColor: '#94a3b8', // slate-400
  },
}

export const ALL_RESULT_TYPES: LiveWebsiteResultType[] = [
  'direct_completed',
  'indirect_completed',
  'self_reported',
  'abandoned',
  'timed_out',
  'skipped',
]

// Direct = followed exact defined path OR navigated straight to target URL
const DIRECT_METHODS = new Set(['auto_path_direct', 'auto_url_direct'])
// Indirect = reached goal via different route
const INDIRECT_METHODS = new Set(['auto_url', 'auto_url_indirect', 'auto_path', 'auto_path_indirect'])

/**
 * Classify a response into one of the result types.
 */
export function getResultType(response: Pick<LiveWebsiteResponse, 'status' | 'completion_method'>): LiveWebsiteResultType {
  const { status, completion_method } = response

  if (status === 'completed') {
    if (completion_method && DIRECT_METHODS.has(completion_method)) return 'direct_completed'
    if (completion_method && INDIRECT_METHODS.has(completion_method)) return 'indirect_completed'
    return 'self_reported'
  }

  if (status === 'abandoned') return 'abandoned'
  if (status === 'timed_out') return 'timed_out'
  return 'skipped'
}

// ─── Sort Types ─────────────────────────────────────────────────────────────

export interface SortConfig {
  field: 'result' | 'participants' | 'time' | 'steps' | 'path'
  direction: 'asc' | 'desc'
}

// ─── Path Data Types ────────────────────────────────────────────────────────

export interface ParticipantPath {
  participantId: string
  participantIndex: number
  displayLabel: string
  displaySecondary: string | null
  urls: string[]
  timestamps: string[]
  resultType: LiveWebsiteResultType
  durationMs: number
  startedAt: string | null
}

export interface AggregatedPathData {
  pathKey: string
  urlSequence: string[]
  resultType: LiveWebsiteResultType
  participantCount: number
  percentage: number
  avgDurationMs: number
  participantPaths: ParticipantPath[]
}

export interface IndividualPathData {
  participantId: string
  participantIndex: number
  displayLabel: string
  displaySecondary: string | null
  urls: string[]
  timestamps: string[]
  resultType: LiveWebsiteResultType
  durationMs: number
  startedAt: string | null
}

// ─── Sort Order ─────────────────────────────────────────────────────────────

const RESULT_TYPE_ORDER: Record<LiveWebsiteResultType, number> = {
  direct_completed: 1,
  indirect_completed: 2,
  self_reported: 3,
  abandoned: 4,
  timed_out: 5,
  skipped: 6,
}

function sortPathData<T extends { resultType: LiveWebsiteResultType }>(
  data: T[],
  sortConfig: SortConfig,
  getParticipantValue: (item: T) => number,
  getTimeValue: (item: T) => number,
  getStepsValue: (item: T) => number,
  getPathString: (item: T) => string,
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
      case 'time':
        comparison = getTimeValue(a) - getTimeValue(b)
        break
      case 'steps':
        comparison = getStepsValue(a) - getStepsValue(b)
        break
      case 'path':
        comparison = getPathString(a).localeCompare(getPathString(b))
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
  return sortPathData(
    data,
    sortConfig,
    (item) => item.participantCount,
    (item) => item.avgDurationMs,
    (item) => item.urlSequence.length,
    (item) => item.urlSequence.map(shortenUrl).join(' > '),
  )
}

export function sortIndividualPaths(
  data: IndividualPathData[],
  sortConfig: SortConfig
): IndividualPathData[] {
  return sortPathData(
    data,
    sortConfig,
    (item) => item.participantIndex,
    (item) => item.durationMs,
    (item) => item.urls.length,
    (item) => item.urls.map(shortenUrl).join(' > '),
  )
}

// ─── URL Helpers ────────────────────────────────────────────────────────────

export function shortenUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.pathname === '/' ? parsed.hostname : parsed.pathname
  } catch {
    return url
  }
}

export function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url)
    const pathname = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.hostname}${pathname}`.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

export function formatTime(ms: number): string {
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}

export function formatTimeDelta(fromMs: number, toMs: number): string {
  const delta = toMs - fromMs
  if (delta <= 0) return ''
  return `+${formatTime(delta)}`
}
