import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { usePrototypeTaskTracking } from '../use-prototype-task-tracking'

type Tracking = ReturnType<typeof usePrototypeTaskTracking>

/**
 * The hook holds everything in refs and useCallback — no state, no effects — so
 * a single server render hands back a fully working API without needing a DOM
 * test renderer.
 */
function renderTracking(): Tracking {
  const box: { value: Tracking | null } = { value: null }
  function Probe() {
    // Test probe: capturing the hook's return is the whole point here.
    // eslint-disable-next-line react-hooks/immutability
    box.value = usePrototypeTaskTracking()
    return null
  }
  renderToStaticMarkup(<Probe />)
  if (!box.value) throw new Error('hook did not run')
  return box.value
}

const FRAME_A = 'frame-a'
const FRAME_B = 'frame-b'
const FRAME_C = 'frame-c'

let now = 1_000_000
beforeEach(() => {
  now = 1_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => now)
})
afterEach(() => {
  vi.restoreAllMocks()
})

const task = { id: 'task-1' } as never

describe('recordClick', () => {
  it('records a click once a frame is known', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    t.recordClick(FRAME_A, 10, 20, true, true)

    expect(t.clickEventsRef.current).toHaveLength(1)
    expect(t.clickEventsRef.current[0]).toMatchObject({
      taskId: 'task-1',
      frameId: FRAME_A,
      x: 10,
      y: 20,
      wasHotspot: true,
    })
  })

  it('drops the event when the current frame is unknown', () => {
    // This is the mechanism behind the start-screen data loss: until the player
    // seeds a current frame, every click arrives with frameId null and is
    // discarded here — while still counting toward the click totals.
    const t = renderTracking()
    t.setCurrentTask('task-1')

    t.recordClick(null, 10, 20, false, false)

    expect(t.clickEventsRef.current).toHaveLength(0)
    expect(t.buildTaskResult(task, 'success').clickCount).toBe(1)
  })

  it('counts a non-hotspot click as a misclick', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    t.recordClick(FRAME_A, 1, 1, true, true)
    t.recordClick(FRAME_A, 2, 2, false, false)

    const result = t.buildTaskResult(task, 'success')
    expect(result.clickCount).toBe(2)
    expect(result.misclickCount).toBe(1)
  })

  it('measures time to first click from the start of the task', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.startTaskTiming()

    now += 750
    t.recordClick(FRAME_A, 1, 1, true, true)
    now += 500
    t.recordClick(FRAME_A, 2, 2, true, true)

    expect(t.buildTaskResult(task, 'success').timeToFirstClickMs).toBe(750)
  })
})

describe('recordNavigation', () => {
  it('appends to the path and reports no backtrack going forward', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    expect(t.recordNavigation(FRAME_A, FRAME_B)).toBe(false)
    expect(t.recordNavigation(FRAME_B, FRAME_C)).toBe(false)
    expect(t.getPathTaken()).toEqual([FRAME_A, FRAME_B, FRAME_C])
  })

  it('reports a backtrack when returning to an earlier frame', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)
    t.recordNavigation(FRAME_A, FRAME_B)

    expect(t.recordNavigation(FRAME_B, FRAME_A)).toBe(true)
    expect(t.buildTaskResult(task, 'success').backtrackCount).toBe(1)
  })

  it('ignores a repeat of the frame already presented', () => {
    // Figma re-fires PRESENTED_NODE_CHANGED for component state changes without
    // actually changing frame; counting those would inflate every path.
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    expect(t.recordNavigation(FRAME_A, FRAME_A)).toBe(false)
    expect(t.getPathTaken()).toEqual([FRAME_A])
    expect(t.navigationEventsRef.current).toHaveLength(0)
  })

  it('numbers navigation events in order', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    t.recordNavigation(FRAME_A, FRAME_B)
    t.recordNavigation(FRAME_B, FRAME_C)

    expect(t.navigationEventsRef.current.map((e) => e.sequenceNumber)).toEqual([0, 1])
  })
})

describe('resetTaskState', () => {
  it('clears the path and current frame but keeps events from earlier tasks', () => {
    // Events accumulate across the whole session and are tagged by task; only
    // the per-task counters reset.
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)
    t.recordClick(FRAME_A, 1, 1, false, false)
    t.recordNavigation(FRAME_A, FRAME_B)

    t.resetTaskState()

    expect(t.currentFrameIdRef.current).toBeNull()
    expect(t.getPathTaken()).toEqual([])
    expect(t.clickEventsRef.current).toHaveLength(1)
    expect(t.navigationEventsRef.current).toHaveLength(1)
    expect(t.buildTaskResult(task, 'success').clickCount).toBe(0)
  })

  it('leaves the player unable to attribute clicks until a frame is seeded again', () => {
    // Precisely the regression the player guards against: after a task
    // boundary nothing is attributable until setCurrentFrame runs.
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)
    t.resetTaskState()

    t.recordClick(t.currentFrameIdRef.current, 5, 5, true, true)
    expect(t.clickEventsRef.current).toHaveLength(0)

    t.setCurrentFrame(FRAME_B, true)
    t.recordClick(t.currentFrameIdRef.current, 5, 5, true, true)
    expect(t.clickEventsRef.current).toHaveLength(1)
    expect(t.getPathTaken()).toEqual([FRAME_B])
  })
})

describe('recordStateChange', () => {
  it('tracks the running component-state snapshot and stamps clicks with it', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    t.recordStateChange(FRAME_A, {
      nodeId: '1:2',
      fromVariantId: 'v1',
      toVariantId: 'v2',
      isTimedChange: false,
      timestamp: now,
    } as never)

    expect(t.currentComponentStatesRef.current).toEqual({ '1:2': 'v2' })

    t.recordClick(FRAME_A, 1, 1, true, true)
    expect(t.clickEventsRef.current[0].componentStates).toEqual({ '1:2': 'v2' })
  })
})

describe('buildTaskResult', () => {
  it('snapshots the path so later navigation cannot mutate a recorded result', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.setCurrentFrame(FRAME_A, true)

    const result = t.buildTaskResult(task, 'success', true)
    t.recordNavigation(FRAME_A, FRAME_B)

    expect(result.pathTaken).toEqual([FRAME_A])
    expect(result.followedCorrectPath).toBe(true)
  })

  it('reports total time from the start of the task', () => {
    const t = renderTracking()
    t.setCurrentTask('task-1')
    t.startTaskTiming()
    now += 4_200

    expect(t.buildTaskResult(task, 'skipped').totalTimeMs).toBe(4_200)
  })
})
