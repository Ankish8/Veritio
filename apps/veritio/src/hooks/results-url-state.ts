import type { ResultsPageState } from './use-persisted-results-state'

export const RESULTS_QUERY_KEYS = {
  activeMainTab: 'tab',
  participantsSubTab: 'subtab',
  statusFilter: 'status',
  analysisSubTab: 'analysis',
  selectedTaskId: 'task',
  activeSegmentId: 'segment',
} as const

const MAIN_TABS = new Set([
  'overview',
  'participants',
  'questionnaire',
  'analysis',
  'recordings',
  'report',
])
const PARTICIPANT_SUB_TABS = new Set(['list', 'segments'])
const STATUS_FILTERS = new Set([
  'included',
  'all',
  'completed',
  'abandoned',
  'in_progress',
  'with_responses',
  'no_responses',
  'excluded',
])
const SAFE_SLUG = /^[a-z0-9][a-z0-9_-]{0,99}$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface SearchParamsReader {
  get(name: string): string | null
  toString(): string
}

export function mergeResultsStateSources(
  defaults: ResultsPageState,
  stored: Partial<ResultsPageState>,
  url: Partial<ResultsPageState>
): ResultsPageState {
  return {
    ...defaults,
    ...stored,
    ...url,
    stateVersion: defaults.stateVersion,
  }
}

export function readResultsStateFromSearchParams(
  searchParams: SearchParamsReader,
  availableMainTabs: readonly string[]
): Partial<ResultsPageState> {
  const next: Partial<ResultsPageState> = {}
  const allowedMainTabs = new Set(
    availableMainTabs.filter((tab) => MAIN_TABS.has(tab))
  )

  const mainTab = searchParams.get(RESULTS_QUERY_KEYS.activeMainTab)
  if (mainTab && allowedMainTabs.has(mainTab)) next.activeMainTab = mainTab

  const participantsSubTab = searchParams.get(RESULTS_QUERY_KEYS.participantsSubTab)
  if (participantsSubTab && PARTICIPANT_SUB_TABS.has(participantsSubTab)) {
    next.participantsSubTab = participantsSubTab as ResultsPageState['participantsSubTab']
  }

  const statusFilter = searchParams.get(RESULTS_QUERY_KEYS.statusFilter)
  if (statusFilter && STATUS_FILTERS.has(statusFilter)) next.statusFilter = statusFilter

  const analysisSubTab = searchParams.get(RESULTS_QUERY_KEYS.analysisSubTab)
  if (analysisSubTab && SAFE_SLUG.test(analysisSubTab)) next.analysisSubTab = analysisSubTab

  const selectedTaskId = searchParams.get(RESULTS_QUERY_KEYS.selectedTaskId)
  if (selectedTaskId && UUID.test(selectedTaskId)) next.selectedTaskId = selectedTaskId

  const activeSegmentId = searchParams.get(RESULTS_QUERY_KEYS.activeSegmentId)
  if (activeSegmentId && UUID.test(activeSegmentId)) next.activeSegmentId = activeSegmentId

  return next
}

export function buildResultsSearchParams(
  currentSearchParams: SearchParamsReader,
  state: ResultsPageState
): URLSearchParams {
  const params = new URLSearchParams(currentSearchParams.toString())
  params.set(RESULTS_QUERY_KEYS.activeMainTab, state.activeMainTab)
  params.set(RESULTS_QUERY_KEYS.participantsSubTab, state.participantsSubTab)
  params.set(RESULTS_QUERY_KEYS.statusFilter, state.statusFilter)
  params.set(RESULTS_QUERY_KEYS.analysisSubTab, state.analysisSubTab)

  if (state.selectedTaskId) {
    params.set(RESULTS_QUERY_KEYS.selectedTaskId, state.selectedTaskId)
  } else {
    params.delete(RESULTS_QUERY_KEYS.selectedTaskId)
  }

  if (state.activeSegmentId) {
    params.set(RESULTS_QUERY_KEYS.activeSegmentId, state.activeSegmentId)
  } else {
    params.delete(RESULTS_QUERY_KEYS.activeSegmentId)
  }

  return params
}
