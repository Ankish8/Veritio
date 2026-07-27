import { describe, expect, it } from 'vitest'
import type { ResultsPageState } from './use-persisted-results-state'
import {
  buildResultsSearchParams,
  mergeResultsStateSources,
  readResultsStateFromSearchParams,
} from './results-url-state'

const defaults: ResultsPageState = {
  stateVersion: 2,
  activeMainTab: 'overview',
  participantsSubTab: 'list',
  statusFilter: 'included',
  analysisSubTab: 'tasks',
  selectedTaskId: null,
  activeSegmentId: null,
}

describe('results URL state', () => {
  it('lets valid URL values override stored values', () => {
    const params = new URLSearchParams(
      'tab=analysis&subtab=segments&status=completed&analysis=paths'
    )
    const url = readResultsStateFromSearchParams(params, [
      'overview',
      'participants',
      'analysis',
    ])

    expect(
      mergeResultsStateSources(
        defaults,
        { activeMainTab: 'participants', statusFilter: 'all' },
        url
      )
    ).toMatchObject({
      activeMainTab: 'analysis',
      participantsSubTab: 'segments',
      statusFilter: 'completed',
      analysisSubTab: 'paths',
    })
  })

  it('ignores invalid or unavailable URL values', () => {
    const params = new URLSearchParams(
      'tab=recordings&subtab=invalid&status=hacked&analysis=../admin&task=nope'
    )

    expect(
      readResultsStateFromSearchParams(params, ['overview', 'analysis'])
    ).toEqual({})
  })

  it('preserves unrelated query values and removes empty selections', () => {
    const params = buildResultsSearchParams(
      new URLSearchParams('source=email&task=old&segment=old'),
      { ...defaults, activeMainTab: 'participants' }
    )

    expect(params.get('source')).toBe('email')
    expect(params.get('tab')).toBe('participants')
    expect(params.has('task')).toBe(false)
    expect(params.has('segment')).toBe(false)
  })
})
