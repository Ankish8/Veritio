import { describe, it, expect } from 'vitest'
import { getEventPipelineCode } from './event-pipeline'

/**
 * The companion is emitted as a JavaScript source string, so these tests pull the
 * shipped function bodies back out and run them against a controlled closure.
 * That keeps the assertions on the code participants actually execute rather
 * than on a reimplementation of it.
 */
function extractFunction(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`)
  if (start === -1) throw new Error(`${name} not found in generated pipeline`)
  let depth = 0
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  throw new Error(`Unbalanced braces extracting ${name}`)
}

const PIPELINE = getEventPipelineCode({
  apiBaseExpr: "API_BASE + path",
  pageUrlExpr: 'location.href',
  pathnameExpr: 'location.pathname',
  selectorFnName: 'getSelector',
  clickUrlExpr: 'location.href',
  urlMatchPathExpr: 'location.pathname',
  urlMatchUrlExpr: 'location.href',
})

/** Runs the real stampPendingTaskIds against a queue we control. */
function runStamp(queue: Array<Record<string, unknown>>, tasks: Array<{ id: string }>, currentTaskIndex: number) {
  const body = extractFunction(PIPELINE, 'stampPendingTaskIds')
  const fn = new Function(
    'eventQueue',
    'tasks',
    'currentTaskIndex',
    `var tasksLoadedForEvents = false; ${body} stampPendingTaskIds(); return tasksLoadedForEvents;`
  )
  return fn(queue, tasks, currentTaskIndex) as boolean
}

describe('event pipeline task stamping', () => {
  it('stamps the initial page_view that was queued before tasks loaded', () => {
    // Exactly the real sequence: the companion queues a page_view on load, and
    // task data only arrives afterwards.
    const queue = [
      { event_type: 'page_view', task_id: null },
      { event_type: 'click', task_id: null },
    ]

    runStamp(queue, [{ id: 'task-1' }, { id: 'task-2' }], 0)

    expect(queue[0].task_id).toBe('task-1')
    expect(queue[1].task_id).toBe('task-1')
  })

  it('leaves events that already carry a task alone', () => {
    const queue = [{ event_type: 'click', task_id: 'task-2' }]

    runStamp(queue, [{ id: 'task-1' }, { id: 'task-2' }], 0)

    expect(queue[0].task_id).toBe('task-2')
  })

  it('releases the flush gate even when there is no current task to stamp', () => {
    // A session resumed past the last task must not sit out the grace period.
    const queue = [{ event_type: 'page_view', task_id: null }]

    const released = runStamp(queue, [{ id: 'task-1' }], 5)

    expect(released).toBe(true)
    expect(queue[0].task_id).toBeNull()
  })

  it('holds the first flush until tasks load, then ships', () => {
    const body = extractFunction(PIPELINE, 'flushEvents')
    const build = (tasksLoaded: boolean, deadlineOffset: number) => {
      const sent: unknown[][] = []
      const fn = new Function(
        'eventQueue',
        'tasksLoadedForEvents',
        'eventStampDeadline',
        'fetch',
        'API_BASE',
        'SNIPPET_ID',
        `${body} flushEvents();`
      )
      fn(
        [{ event_type: 'page_view', task_id: null }],
        tasksLoaded,
        Date.now() + deadlineOffset,
        (_url: string, init: { body: string }) => {
          sent.push(JSON.parse(init.body).events)
          return { catch: () => undefined }
        },
        'https://example.com',
        'snip_test'
      )
      return sent
    }

    // Tasks still loading and inside the grace period: nothing leaves.
    expect(build(false, 5000)).toHaveLength(0)
    // Tasks loaded: ships immediately.
    expect(build(true, 5000)).toHaveLength(1)
    // Grace period elapsed without tasks: ships anyway rather than losing events.
    expect(build(false, -1)).toHaveLength(1)
  })
})
