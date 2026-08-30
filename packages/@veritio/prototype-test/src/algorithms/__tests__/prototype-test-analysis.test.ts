import { describe, it, expect } from 'vitest'
import {
  parseTaskAttempt,
  computePrototypeTestMetrics,
  computeTaskMetrics,
  computePrototypeStatusBreakdown,
} from '../prototype-test-analysis'

type AnyAttempt = Parameters<typeof parseTaskAttempt>[0]

let seq = 0
function attempt(overrides: Record<string, unknown> = {}): AnyAttempt {
  seq++
  return {
    id: `a${seq}`,
    participant_id: `p${seq}`,
    task_id: 'task-1',
    session_id: `s${seq}`,
    outcome: 'success',
    total_time_ms: 1000,
    time_to_first_click_ms: 100,
    click_count: 4,
    misclick_count: 1,
    backtrack_count: 0,
    is_direct: true,
    path_taken: ['f1', 'f2'],
    post_task_responses: null,
    ...overrides,
  } as AnyAttempt
}

const TASK = { id: 'task-1', title: 'Task 1', instruction: null } as never
const PARTICIPANTS = [{ status: 'completed' }, { status: 'completed' }] as never

describe('parseTaskAttempt', () => {
  it('preserves unknown directness as null rather than coercing it to false', () => {
    // Free-flow tasks never report directness. Collapsing null to false made
    // them count as "not direct" and dragged down every directness rate.
    expect(parseTaskAttempt(attempt({ is_direct: null })).is_direct).toBeNull()
    expect(parseTaskAttempt(attempt({ is_direct: false })).is_direct).toBe(false)
    expect(parseTaskAttempt(attempt({ is_direct: true })).is_direct).toBe(true)
  })
})

describe('computePrototypeTestMetrics denominators', () => {
  it('excludes unknown-directness attempts from the directness denominator', () => {
    const metrics = computePrototypeTestMetrics(
      [TASK],
      [
        attempt({ is_direct: true }),
        attempt({ is_direct: false }),
        // free-flow: directness not reported
        attempt({ is_direct: null }),
        attempt({ is_direct: null }),
      ],
      PARTICIPANTS
    )

    // 1 of the 2 attempts that reported directness — not 1 of 4.
    expect(metrics.overallDirectRate).toBe(50)
  })

  it('measures outcome rates over every attempt, including skips', () => {
    const metrics = computePrototypeTestMetrics(
      [TASK],
      [attempt({ outcome: 'success' }), attempt({ outcome: 'skipped' })],
      PARTICIPANTS
    )
    expect(metrics.overallSuccessRate).toBe(50)
  })

  it('measures click averages over engaged attempts only, matching per-task metrics', () => {
    // The overall figures used a "not skipped" denominator while the per-task
    // card beside them used "success or failure", so the two disagreed.
    const attempts = [
      attempt({ outcome: 'success', click_count: 10, misclick_count: 2 }),
      attempt({ outcome: 'failure', click_count: 20, misclick_count: 4 }),
      attempt({ outcome: 'skipped', click_count: 0, misclick_count: 0 }),
    ]

    const overall = computePrototypeTestMetrics([TASK], attempts, PARTICIPANTS)
    const perTask = computeTaskMetrics(TASK, attempts.map(parseTaskAttempt))

    expect(overall.averageClickCount).toBe(15)
    expect(overall.averageClickCount).toBe(perTask.averageClickCount)
    expect(overall.averageMisclickCount).toBe(perTask.averageMisclickCount)
  })

  it('reports zero rates rather than NaN when there are no attempts', () => {
    const metrics = computePrototypeTestMetrics([TASK], [], PARTICIPANTS)
    expect(metrics.overallSuccessRate).toBe(0)
    expect(metrics.overallDirectRate).toBe(0)
    expect(metrics.averageClickCount).toBe(0)
  })
})

describe('computeTaskMetrics', () => {
  it('excludes unknown directness from directRate and its confidence interval', () => {
    const metrics = computeTaskMetrics(
      TASK,
      [
        attempt({ outcome: 'success', is_direct: true }),
        attempt({ outcome: 'failure', is_direct: false }),
        attempt({ outcome: 'success', is_direct: null }),
      ].map(parseTaskAttempt)
    )
    expect(metrics.directRate).toBe(50)
  })
})

describe('computePrototypeStatusBreakdown', () => {
  it('groups unknown directness with indirect so totals still reconcile', () => {
    const breakdown = computePrototypeStatusBreakdown(
      [
        attempt({ outcome: 'success', is_direct: true }),
        attempt({ outcome: 'success', is_direct: null }),
      ].map(parseTaskAttempt)
    )
    expect(breakdown.success.direct).toBe(1)
    expect(breakdown.success.indirect).toBe(1)
    expect(breakdown.success.total).toBe(2)
  })
})
