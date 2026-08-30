import { describe, it, expect } from 'vitest'
import { submitPrototypeTestSchema } from '../types'

const TASK_ID = '11111111-1111-1111-1111-111111111111'
const ATTEMPT_ID = '22222222-2222-2222-2222-222222222222'
const FRAME_ID = '33333333-3333-3333-3333-333333333333'

function baseBody(overrides: Record<string, unknown> = {}) {
  return {
    sessionToken: 'token',
    taskAttempts: [
      {
        taskId: TASK_ID,
        taskAttemptId: ATTEMPT_ID,
        outcome: 'success',
        pathTaken: [FRAME_ID],
      },
    ],
    ...overrides,
  }
}

describe('submitPrototypeTestSchema', () => {
  it('keeps taskAttemptId, which links a task attempt to its session recording', () => {
    // Regression: the field was absent from the schema, and z.object() strips
    // unknown keys — so the client's id was silently dropped and
    // task_attempt_id was written as null on every row, permanently breaking
    // the join between per-task recordings and their attempt.
    const parsed = submitPrototypeTestSchema.parse(baseBody())
    expect(parsed.taskAttempts[0].taskAttemptId).toBe(ATTEMPT_ID)
  })

  it('allows taskAttemptId to be absent or null', () => {
    expect(
      submitPrototypeTestSchema.parse(
        baseBody({ taskAttempts: [{ taskId: TASK_ID, outcome: 'skipped', pathTaken: [] }] })
      ).taskAttempts[0].taskAttemptId
    ).toBeUndefined()

    expect(
      submitPrototypeTestSchema.parse(
        baseBody({
          taskAttempts: [
            { taskId: TASK_ID, taskAttemptId: null, outcome: 'skipped', pathTaken: [] },
          ],
        })
      ).taskAttempts[0].taskAttemptId
    ).toBeNull()
  })

  it('accepts every outcome the DB CHECK constraint allows', () => {
    for (const outcome of ['success', 'failure', 'abandoned', 'skipped']) {
      const parsed = submitPrototypeTestSchema.parse(
        baseBody({ taskAttempts: [{ taskId: TASK_ID, outcome, pathTaken: [] }] })
      )
      expect(parsed.taskAttempts[0].outcome).toBe(outcome)
    }
  })

  it('rejects an outcome the DB would refuse', () => {
    expect(() =>
      submitPrototypeTestSchema.parse(
        baseBody({ taskAttempts: [{ taskId: TASK_ID, outcome: 'nonsense', pathTaken: [] }] })
      )
    ).toThrow()
  })

  it('caps event arrays so an unbounded payload cannot reach the bulk insert', () => {
    const oneEvent = {
      taskId: TASK_ID,
      frameId: FRAME_ID,
      timestamp: new Date(0).toISOString(),
      x: 1,
      y: 1,
    }

    expect(() =>
      submitPrototypeTestSchema.parse(
        baseBody({ clickEvents: Array.from({ length: 20_001 }, () => oneEvent) })
      )
    ).toThrow()

    expect(() =>
      submitPrototypeTestSchema.parse(
        baseBody({ clickEvents: Array.from({ length: 10 }, () => oneEvent) })
      )
    ).not.toThrow()
  })

  it('caps the number of task attempts', () => {
    const attempt = { taskId: TASK_ID, outcome: 'success', pathTaken: [] }
    expect(() =>
      submitPrototypeTestSchema.parse(
        baseBody({ taskAttempts: Array.from({ length: 201 }, () => attempt) })
      )
    ).toThrow()
  })
})
