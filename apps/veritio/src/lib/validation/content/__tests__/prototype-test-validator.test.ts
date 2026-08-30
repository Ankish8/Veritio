import { describe, it, expect } from 'vitest'
import { validatePrototypeTestContent } from '../prototype-test-validator'

const PROTOTYPE = { id: 'p1' } as never
const FRAME_A = { id: 'frame-a' } as never
const FRAME_B = { id: 'frame-b' } as never

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    title: 'Find the settings page',
    flow_type: 'guided',
    start_frame_id: 'frame-a',
    success_criteria_type: 'destination',
    success_frame_ids: ['frame-b'],
    ...overrides,
  } as never
}

// createIssue folds the rule name into the generated id:
// `${section}-${itemId ?? 'section'}-${rule}-${counter}`. Rule names contain
// hyphens, so match the bounded `-<rule>-<counter>` suffix.
const hasRule = (issues: { id: string }[], rule: string) =>
  issues.some((i) => new RegExp(`-${rule}-\\d+$`).test(i.id))

describe('validatePrototypeTestContent', () => {
  it('accepts a well-formed destination task', () => {
    const issues = validatePrototypeTestContent(PROTOTYPE, [task()], [FRAME_A, FRAME_B])
    expect(issues).toHaveLength(0)
  })

  describe('component_state success criteria', () => {
    it('accepts a task with component states configured', () => {
      // Regression: component_state fell through to the catch-all branch and
      // always reported "needs success criteria configured", so a study using
      // it could never be launched — even though the player supports it and
      // the DB's valid_success_criteria constraint allows it.
      const issues = validatePrototypeTestContent(
        PROTOTYPE,
        [
          task({
            success_criteria_type: 'component_state',
            success_frame_ids: [],
            state_success_criteria: {
              states: [{ componentNodeId: '1:2', variantId: '3:4' }],
              logic: 'AND',
            },
          }),
        ],
        [FRAME_A, FRAME_B]
      )
      expect(issues).toHaveLength(0)
    })

    it('flags a component_state task with no states chosen', () => {
      const issues = validatePrototypeTestContent(
        PROTOTYPE,
        [
          task({
            success_criteria_type: 'component_state',
            success_frame_ids: [],
            state_success_criteria: { states: [], logic: 'AND' },
          }),
        ],
        [FRAME_A, FRAME_B]
      )
      expect(issues).toHaveLength(1)
      expect(hasRule(issues, 'no-success-component-states')).toBe(true)
    })
  })

  describe('frames removed by a Figma re-sync', () => {
    it('flags a goal screen that no longer exists', () => {
      // success_frame_ids is JSONB with no FK, so a re-sync that deletes the
      // frame leaves a dangling id and a task that can never be completed.
      const issues = validatePrototypeTestContent(
        PROTOTYPE,
        [task({ success_frame_ids: ['frame-gone'] })],
        [FRAME_A]
      )
      expect(hasRule(issues, 'stale-success-frames')).toBe(true)
    })

    it('flags a starting screen that no longer exists', () => {
      const issues = validatePrototypeTestContent(
        PROTOTYPE,
        [task({ start_frame_id: 'frame-gone' })],
        [FRAME_A, FRAME_B]
      )
      expect(hasRule(issues, 'stale-start-frame')).toBe(true)
    })

    it('stays quiet while the frame list is still loading', () => {
      // An empty frame list means "not loaded yet", not "every frame deleted";
      // reporting then would light up the builder on every cold render.
      const issues = validatePrototypeTestContent(PROTOTYPE, [task()], [])
      expect(issues).toHaveLength(0)
    })

    it('accepts a goal set where at least one frame survives', () => {
      const issues = validatePrototypeTestContent(
        PROTOTYPE,
        [task({ success_frame_ids: ['frame-gone', 'frame-b'] })],
        [FRAME_A, FRAME_B]
      )
      expect(issues).toHaveLength(0)
    })
  })

  it('still reports a missing prototype and an unknown criteria type', () => {
    const issues = validatePrototypeTestContent(
      null,
      [task({ success_criteria_type: 'something-else' })],
      [FRAME_A, FRAME_B]
    )
    expect(issues).toHaveLength(2)
    expect(hasRule(issues, 'prototype-required')).toBe(true)
    expect(hasRule(issues, 'no-success-criteria-type')).toBe(true)
  })

  it('skips criteria checks for free-flow tasks', () => {
    const issues = validatePrototypeTestContent(
      PROTOTYPE,
      [task({ flow_type: 'free_flow', start_frame_id: null, success_frame_ids: [] })],
      [FRAME_A]
    )
    expect(issues).toHaveLength(0)
  })
})
