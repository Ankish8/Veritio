import { describe, it, expect } from 'vitest'
import { computeLiveWebsiteMetrics } from './live-website-overview'

const participant = (id: string) => ({
  id,
  status: 'completed',
  started_at: '2026-08-12T10:00:00.000Z',
  completed_at: '2026-08-12T10:05:00.000Z',
})

const response = (overrides: Record<string, unknown>) => ({
  participant_id: 'p1',
  task_id: 't1',
  status: 'completed',
  duration_ms: 60000,
  completion_method: 'self_reported',
  ...overrides,
})

describe('computeLiveWebsiteMetrics — usability score', () => {
  it('gives self-reported completions full credit when the task only asked for self-report', () => {
    const tasks = [{ id: 't1', title: 'Task 1', success_criteria_type: 'self_reported' }]
    const responses = [
      response({ participant_id: 'p1', duration_ms: 60000 }),
      response({ participant_id: 'p2', duration_ms: 60000 }),
    ]

    const metrics = computeLiveWebsiteMetrics(tasks, responses, [], [participant('p1'), participant('p2')])

    // 100% completed, all self-reported on a self-report-only task
    expect(metrics.overallSuccessRate).toBe(1)
    expect(metrics.usabilityScoreBreakdown.success).toBe(100)
    expect(metrics.usabilityScoreBreakdown.error).toBe(100)
    // 60s against the default 120s budget sits at half the budget: full time credit
    expect(metrics.usabilityScoreBreakdown.time).toBe(100)
    expect(metrics.usabilityScore).toBe(100)
  })

  it('discounts self-reported completions on tasks whose criteria were watching', () => {
    const tasks = [{ id: 't1', title: 'Task 1', success_criteria_type: 'url_match' }]
    const responses = [response({ participant_id: 'p1' }), response({ participant_id: 'p2' })]

    const metrics = computeLiveWebsiteMetrics(tasks, responses, [], [participant('p1'), participant('p2')])

    expect(metrics.usabilityScoreBreakdown.success).toBe(60)
    expect(metrics.usabilityScore).toBe(Math.round(0.4 * 60 + 0.3 * 100 + 0.3 * 100))
  })

  it('ranks direct above indirect above discounted self-report', () => {
    const tasks = [{ id: 't1', title: 'Task 1', success_criteria_type: 'url_match' }]
    const score = (completionMethod: string) =>
      computeLiveWebsiteMetrics(
        tasks,
        [response({ completion_method: completionMethod })],
        [],
        [participant('p1')]
      ).usabilityScoreBreakdown.success

    expect(score('auto_url_direct')).toBe(100)
    expect(score('auto_url_indirect')).toBe(85)
    expect(score('self_reported')).toBe(60)
  })

  it('counts timed-out tasks against the error component, not just abandons', () => {
    const tasks = [{ id: 't1', title: 'Task 1', success_criteria_type: 'self_reported' }]
    const responses = [
      response({ participant_id: 'p1' }),
      response({ participant_id: 'p2', status: 'timed_out', completion_method: 'timeout' }),
    ]

    const metrics = computeLiveWebsiteMetrics(tasks, responses, [], [participant('p1'), participant('p2')])

    expect(metrics.usabilityScoreBreakdown.error).toBe(50)
    expect(metrics.usabilityScoreBreakdown.success).toBe(50)
  })

  it('scores time against the task time limit when one is set', () => {
    const tasks = [
      { id: 't1', title: 'Task 1', success_criteria_type: 'self_reported', time_limit_seconds: 30 },
    ]
    // 45s against a 30s limit = 1.5x the budget, the point where time credit runs out
    const metrics = computeLiveWebsiteMetrics(
      tasks,
      [response({ duration_ms: 45000 })],
      [],
      [participant('p1')]
    )

    expect(metrics.usabilityScoreBreakdown.time).toBe(0)
  })

  it('falls back to the study-level time limit when the task sets none', () => {
    const tasks = [{ id: 't1', title: 'Task 1', success_criteria_type: 'self_reported' }]
    const metrics = computeLiveWebsiteMetrics(
      tasks,
      [response({ duration_ms: 60000 })],
      [],
      [participant('p1')],
      { defaultTimeLimitSeconds: 40 }
    )

    // 60s against a 40s budget = 1.5x, so no time credit
    expect(metrics.usabilityScoreBreakdown.time).toBe(0)
  })

  it('reports a zero score with no responses so the UI can show "not enough data"', () => {
    const metrics = computeLiveWebsiteMetrics([], [], [], [])

    expect(metrics.usabilityScore).toBe(0)
    expect(metrics.usabilityScoreBreakdown).toEqual({ success: 0, time: 0, error: 0 })
  })
})
