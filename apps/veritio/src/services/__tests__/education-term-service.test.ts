/**
 * Unit tests for the term-expiry warning decision logic.
 *
 * The DB-backed helpers are thin queries; the rules worth pinning are which
 * notice is due, that a notice is never repeated, and that renewing a term
 * starts the sequence over without anything having to reset a flag.
 */

import { describe, it, expect } from 'vitest'
import { dueWarningFor, stageForCurrentTerm, type TermRow } from '../education-term-service'

const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()

function org(over: Partial<TermRow> = {}): TermRow {
  return {
    id: 'org-1',
    name: 'National Institute of Design',
    plan: 'edu_classroom',
    access_ends_at: daysFromNow(20),
    term_warned_for: null,
    term_warning_stage: 0,
    ...over,
  }
}

describe('stageForCurrentTerm', () => {
  it('ignores a stage recorded against a different end date', () => {
    // The term was renewed; the old stage must not suppress the new sequence.
    const renewed = org({
      access_ends_at: daysFromNow(25),
      term_warned_for: daysFromNow(-100),
      term_warning_stage: 2,
    })
    expect(stageForCurrentTerm(renewed)).toBe(0)
  })

  it('honours a stage recorded against the current end date', () => {
    const ends = daysFromNow(20)
    expect(stageForCurrentTerm(org({ access_ends_at: ends, term_warned_for: ends, term_warning_stage: 1 }))).toBe(1)
  })
})

describe('dueWarningFor', () => {
  it('ignores organizations that are not on an education plan', () => {
    expect(dueWarningFor(org({ plan: 'team', access_ends_at: daysFromNow(3) }))).toBeNull()
  })

  it('ignores education organizations with no term', () => {
    expect(dueWarningFor(org({ access_ends_at: null }))).toBeNull()
  })

  it('stays quiet while the term is still far off', () => {
    expect(dueWarningFor(org({ access_ends_at: daysFromNow(60) }))).toBeNull()
  })

  it('sends the first notice with procurement lead time', () => {
    const w = dueWarningFor(org({ access_ends_at: daysFromNow(30) }))
    expect(w?.stage).toBe(1)
    expect(w?.daysLeft).toBe(30)
  })

  it('does not repeat the first notice once sent for this term', () => {
    const ends = daysFromNow(20)
    expect(
      dueWarningFor(org({ access_ends_at: ends, term_warned_for: ends, term_warning_stage: 1 })),
    ).toBeNull()
  })

  it('escalates to the final notice inside the last week', () => {
    const ends = daysFromNow(5)
    const w = dueWarningFor(org({ access_ends_at: ends, term_warned_for: ends, term_warning_stage: 1 }))
    expect(w?.stage).toBe(2)
  })

  it('does not repeat the final notice', () => {
    const ends = daysFromNow(3)
    expect(
      dueWarningFor(org({ access_ends_at: ends, term_warned_for: ends, term_warning_stage: 2 })),
    ).toBeNull()
  })

  it('skips straight to the final notice rather than sending a stale first one', () => {
    // A license provisioned with only days left should not receive a
    // "30 days remaining" email that is already wrong when it arrives.
    const w = dueWarningFor(org({ access_ends_at: daysFromNow(4), term_warning_stage: 0 }))
    expect(w?.stage).toBe(2)
  })

  it('says nothing once the term has already ended', () => {
    // The lock is the message; "renew soon" after the fact reads as broken.
    expect(dueWarningFor(org({ access_ends_at: daysFromNow(-1) }))).toBeNull()
  })

  it('starts the sequence again when a term is renewed', () => {
    const previousTerm = daysFromNow(-2)
    const renewed = org({
      access_ends_at: daysFromNow(25),
      term_warned_for: previousTerm,
      term_warning_stage: 2,
    })
    expect(dueWarningFor(renewed)?.stage).toBe(1)
  })

  it('covers every education tier', () => {
    for (const plan of ['edu_classroom', 'edu_department', 'edu_campus'] as const) {
      expect(dueWarningFor(org({ plan, access_ends_at: daysFromNow(10) }))?.stage).toBe(1)
    }
  })
})
