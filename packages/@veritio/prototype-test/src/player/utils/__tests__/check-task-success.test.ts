import { describe, it, expect } from 'vitest'
import { checkTaskSuccess } from '../check-task-success'

const noComponentState = {
  checkComponentStateSuccess: () => false,
  checkStateOnlySuccess: () => false,
}

function task(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    success_criteria_type: 'destination',
    success_frame_ids: ['goal'],
    success_pathway: null,
    enable_interactive_components: false,
    ...overrides,
  } as never
}

describe('checkTaskSuccess — destination criteria', () => {
  it('succeeds on a goal frame', () => {
    const result = checkTaskSuccess({
      task: task(),
      currentFrameId: 'goal',
      pathTaken: ['start', 'goal'],
      componentStateEvents: [],
      currentComponentStates: {},
      ...noComponentState,
    })
    expect(result.isSuccess).toBe(true)
  })

  it('fails elsewhere', () => {
    const result = checkTaskSuccess({
      task: task(),
      currentFrameId: 'somewhere-else',
      pathTaken: ['start', 'somewhere-else'],
      componentStateEvents: [],
      currentComponentStates: {},
      ...noComponentState,
    })
    expect(result.isSuccess).toBe(false)
  })

  it('fails when the current frame is unknown', () => {
    // Reachable whenever the player has not yet resolved a current frame.
    const result = checkTaskSuccess({
      task: task(),
      currentFrameId: null,
      pathTaken: [],
      componentStateEvents: [],
      currentComponentStates: {},
      ...noComponentState,
    })
    expect(result.isSuccess).toBe(false)
  })

  it('defaults to destination when no criteria type is set', () => {
    const result = checkTaskSuccess({
      task: task({ success_criteria_type: null }),
      currentFrameId: 'goal',
      pathTaken: ['goal'],
      componentStateEvents: [],
      currentComponentStates: {},
      ...noComponentState,
    })
    expect(result.isSuccess).toBe(true)
  })

  it('fails a task whose goal frames were all removed', () => {
    // What a Figma re-sync leaves behind when it deletes the goal frame; the
    // builder now flags this as a validation issue.
    const result = checkTaskSuccess({
      task: task({ success_frame_ids: [] }),
      currentFrameId: 'anything',
      pathTaken: ['anything'],
      componentStateEvents: [],
      currentComponentStates: {},
      ...noComponentState,
    })
    expect(result.isSuccess).toBe(false)
  })
})

describe('checkTaskSuccess — component_state criteria', () => {
  it('delegates to the state-only check', () => {
    const base = {
      task: task({ success_criteria_type: 'component_state', success_frame_ids: [] }),
      currentFrameId: 'anywhere',
      pathTaken: ['anywhere'],
      componentStateEvents: [],
      currentComponentStates: {},
      checkComponentStateSuccess: () => false,
    }

    expect(checkTaskSuccess({ ...base, checkStateOnlySuccess: () => true }).isSuccess).toBe(true)
    expect(checkTaskSuccess({ ...base, checkStateOnlySuccess: () => false }).isSuccess).toBe(false)
  })
})

describe('checkTaskSuccess — destination plus required component states', () => {
  it('requires the component states as well as the goal frame', () => {
    const base = {
      task: task({
        enable_interactive_components: true,
        success_component_states: [{ componentNodeId: '1:2', variantId: '3:4' }],
      }),
      currentFrameId: 'goal',
      pathTaken: ['start', 'goal'],
      componentStateEvents: [],
      currentComponentStates: {},
      checkStateOnlySuccess: () => false,
    }

    expect(
      checkTaskSuccess({ ...base, checkComponentStateSuccess: () => true }).isSuccess
    ).toBe(true)
    expect(
      checkTaskSuccess({ ...base, checkComponentStateSuccess: () => false }).isSuccess
    ).toBe(false)
  })
})
