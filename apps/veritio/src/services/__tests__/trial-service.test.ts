/**
 * Trial warning scheduling.
 *
 * The sweep that owns expiry runs hourly, so the rules that decide "is a
 * warning due" are the difference between one useful notice and 72 identical
 * ones. These pin that, plus the extension case, which is the subtle one:
 * moving a trial's end date must revive its warnings rather than permanently
 * silencing them.
 */
import { describe, it, expect } from 'vitest'
import {
  dueTrialWarningFor,
  stageForCurrentTrial,
  trialDaysLeft,
  TRIAL_WARNING_STAGES,
  type TrialRow,
} from '../trial-service'

const NOW = new Date('2026-08-12T12:00:00Z').getTime()

function daysFromNow(days: number): string {
  return new Date(NOW + days * 86400_000).toISOString()
}

function org(overrides: Partial<TrialRow> = {}): TrialRow {
  return {
    id: 'org-1',
    name: 'Acme',
    plan: 'starter',
    plan_status: 'trialing',
    trial_ends_at: daysFromNow(5),
    trial_warned_for: null,
    trial_warning_stage: 0,
    ...overrides,
  }
}

describe('trialDaysLeft', () => {
  it('rounds part-days up, so "ends in 12 hours" reads as 1 day', () => {
    expect(trialDaysLeft(daysFromNow(0.5), NOW)).toBe(1)
  })

  it('returns whole days ahead', () => {
    expect(trialDaysLeft(daysFromNow(3), NOW)).toBe(3)
  })

  it('returns 0 once the trial has passed', () => {
    expect(trialDaysLeft(daysFromNow(-1), NOW)).toBe(0)
  })
})

describe('dueTrialWarningFor', () => {
  it('is silent while the trial is comfortably ahead', () => {
    expect(dueTrialWarningFor(org({ trial_ends_at: daysFromNow(5) }), NOW)).toBeNull()
  })

  it('raises the 3-day notice inside the window', () => {
    const due = dueTrialWarningFor(org({ trial_ends_at: daysFromNow(3) }), NOW)
    expect(due).toMatchObject({ stage: 1, daysLeft: 3 })
  })

  it('escalates to the final notice on the last day', () => {
    const due = dueTrialWarningFor(
      org({ trial_ends_at: daysFromNow(1), trial_warned_for: daysFromNow(1), trial_warning_stage: 1 }),
      NOW
    )
    expect(due).toMatchObject({ stage: 2, daysLeft: 1 })
  })

  it('does not repeat a stage already sent — the sweep runs hourly', () => {
    const endsAt = daysFromNow(3)
    const sent = org({ trial_ends_at: endsAt, trial_warned_for: endsAt, trial_warning_stage: 1 })
    expect(dueTrialWarningFor(sent, NOW)).toBeNull()
  })

  it('stays silent once both notices are sent', () => {
    const endsAt = daysFromNow(1)
    const sent = org({ trial_ends_at: endsAt, trial_warned_for: endsAt, trial_warning_stage: 2 })
    expect(dueTrialWarningFor(sent, NOW)).toBeNull()
  })

  it('revives warnings when the trial is extended', () => {
    // Warned for the old date, then the trial moved out — the recorded stage no
    // longer applies, so the customer is warned again for the new date.
    const extended = org({
      trial_ends_at: daysFromNow(3),
      trial_warned_for: daysFromNow(-4),
      trial_warning_stage: 2,
    })
    expect(dueTrialWarningFor(extended, NOW)).toMatchObject({ stage: 1 })
  })

  it('leaves an already-expired trial to the expiry sweep', () => {
    expect(dueTrialWarningFor(org({ trial_ends_at: daysFromNow(-1) }), NOW)).toBeNull()
  })

  it('ignores organizations that are not trialing', () => {
    expect(
      dueTrialWarningFor(org({ plan_status: 'active', trial_ends_at: daysFromNow(1) }), NOW)
    ).toBeNull()
  })

  it('ignores organizations with no trial end date', () => {
    expect(dueTrialWarningFor(org({ trial_ends_at: null }), NOW)).toBeNull()
  })
})

describe('stageForCurrentTrial', () => {
  it('reports the recorded stage when it matches the current end date', () => {
    const endsAt = daysFromNow(2)
    expect(
      stageForCurrentTrial(org({ trial_ends_at: endsAt, trial_warned_for: endsAt, trial_warning_stage: 2 }))
    ).toBe(2)
  })

  it('reports none when the recorded stage belongs to a different end date', () => {
    expect(
      stageForCurrentTrial(
        org({ trial_ends_at: daysFromNow(2), trial_warned_for: daysFromNow(9), trial_warning_stage: 2 })
      )
    ).toBe(0)
  })
})

describe('TRIAL_WARNING_STAGES', () => {
  it('is ordered widest-window first, so the earlier notice wins', () => {
    const windows = TRIAL_WARNING_STAGES.map((s) => s.withinDays)
    expect(windows).toEqual([...windows].sort((a, b) => b - a))
  })

  it('keeps the count to two — more than that is nagging', () => {
    expect(TRIAL_WARNING_STAGES).toHaveLength(2)
  })
})
