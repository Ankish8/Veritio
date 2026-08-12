import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getTaskWidgetCode } from '../shared/widget-rendering'
import { getPtqCss, getPtqLogic, getPtqRenderFunctions } from '../shared-ptq-widget'

/**
 * The post-task question panel used to sit still while participants answered:
 * every tap left them to find the next question themselves, and the list gave no
 * sign that anything continued below the fold. These cover the auto-advance that
 * replaced that, and the one rule it must never break — the widget is injected
 * into somebody else's page, so it may scroll its own list and nothing else.
 */

const QUESTIONS = [
  { id: 'q1', question_text: 'How easy was this?', is_required: true, question_type: 'opinion_scale', config: { scalePoints: 5 } },
  { id: 'q2', question_text: 'Did you find it?', is_required: true, question_type: 'yes_no', config: {} },
  { id: 'q3', question_text: 'Anything else?', is_required: false, question_type: 'multi_line_text', config: {} },
]

/**
 * Heights used to fake layout, since jsdom reports every rect as zero. The
 * viewport deliberately holds less than two questions, so "is the next one
 * already visible?" has a real answer either way.
 */
const BODY_TOP = 100
const BODY_HEIGHT = 120
const Q_HEIGHT = 90
const SCROLL_HEIGHT = 3 * Q_HEIGHT

interface Harness {
  root: ShadowRoot
  body: HTMLElement
  scrollCalls: Array<{ top: number; behavior?: string }>
  windowScrolls: number
}

function buildHarness(questions: unknown[] = QUESTIONS): Harness {
  document.body.innerHTML = ''
  // createWidget() installs a MutationObserver that re-attaches the widget if the
  // host page rips it out. Nothing here removes it, and left connected it fires
  // after jsdom tears the document down. Stub it out; it is not under test.
  globalThis.MutationObserver = class {
    observe() {}
    disconnect() {}
    takeRecords() { return [] }
  } as unknown as typeof MutationObserver

  const source = `
    var widgetHost = null;
    var tasks = ${JSON.stringify([{ id: 't1', title: 'T', instructions: '', post_task_questions: questions }])};
    var currentTaskIndex = 0;
    var studySettings = { showTaskProgress: false, allowSkipTasks: false };
    var studyBranding = { primaryColor: '#2563eb', logoUrl: null };
    var widgetState = 'post_task_questions';
    var taskMinimized = false;
    var confirmStep = 0;
    var ptqResponses = {};
    var taskResponses = [{}];
    function handleStartTask() {} function handleMarkComplete() {} function handleAbandonTask() {}
    function doAbandonTask() {} function showBlockingOverlay() {} function removeBlockingOverlay() {}
    function advanceToNextTask() {}
    ${getPtqCss()}
    ${getTaskWidgetCode()}
    ${getPtqRenderFunctions()}
    ${getPtqLogic()}
    createWidget();
    initPtq();
    return { root: widgetRoot, updateShadows: updatePtqScrollShadows };
  `
  const { root } = new Function(source)() as { root: ShadowRoot }

  const body = root.querySelector('[data-ptq-body]') as HTMLElement
  const scrollCalls: Array<{ top: number; behavior?: string }> = []
  const harness: Harness = { root, body, scrollCalls, windowScrolls: 0 }

  // jsdom has no layout: hand the widget a viewport where only the first
  // question fits, so "is the next one already visible?" is a real question.
  Object.defineProperty(body, 'clientHeight', { value: BODY_HEIGHT, configurable: true })
  Object.defineProperty(body, 'scrollHeight', { value: SCROLL_HEIGHT, configurable: true })
  let scrollTop = 0
  Object.defineProperty(body, 'scrollTop', {
    get: () => scrollTop,
    set: (v: number) => { scrollTop = v },
    configurable: true,
  })
  body.scrollTo = ((opts: { top: number; behavior?: string }) => {
    scrollCalls.push(opts)
    scrollTop = opts.top
  }) as typeof body.scrollTo
  body.getBoundingClientRect = () =>
    ({ top: BODY_TOP, bottom: BODY_TOP + BODY_HEIGHT, height: BODY_HEIGHT, left: 0, right: 320, width: 320 }) as DOMRect

  const qEls = Array.from(root.querySelectorAll('.__vt_ptq_q')) as HTMLElement[]
  qEls.forEach((el, i) => {
    el.getBoundingClientRect = () => {
      const top = BODY_TOP + i * Q_HEIGHT - scrollTop
      return { top, bottom: top + Q_HEIGHT, height: Q_HEIGHT, left: 0, right: 320, width: 320 } as DOMRect
    }
  })

  window.scrollTo = (() => { harness.windowScrolls++ }) as typeof window.scrollTo

  return harness
}

const click = (el: Element | null) => el?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }))

describe('post-task question auto-advance', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('brings the next question into view once the current one is answered', () => {
    const h = buildHarness()
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))
    vi.advanceTimersByTime(300)

    expect(h.scrollCalls).toHaveLength(1)
    // Question 2 starts 90px down the list; we leave a 12px gap above it.
    expect(h.scrollCalls[0].top).toBe(Q_HEIGHT - 12)
    expect(h.scrollCalls[0].behavior).toBe('smooth')
  })

  it('never scrolls the page the widget was injected into', () => {
    const h = buildHarness()
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))
    click(h.root.querySelector('[data-ptq-yn="q2"][data-val="true"]'))
    vi.advanceTimersByTime(600)

    expect(h.windowScrolls).toBe(0)
  })

  it('does not move again when an answer is changed', () => {
    const h = buildHarness()
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))
    vi.advanceTimersByTime(300)
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="2"]'))
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="5"]'))
    vi.advanceTimersByTime(300)

    expect(h.scrollCalls).toHaveLength(1)
  })

  it('stays put when the next question is already fully visible', () => {
    const h = buildHarness()
    // A viewport tall enough for the whole list: nothing is hidden, so moving
    // would be motion for its own sake.
    Object.defineProperty(h.body, 'clientHeight', { value: SCROLL_HEIGHT, configurable: true })
    h.body.getBoundingClientRect = () =>
      ({ top: BODY_TOP, bottom: BODY_TOP + SCROLL_HEIGHT, height: SCROLL_HEIGHT, left: 0, right: 320, width: 320 }) as DOMRect

    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))
    vi.advanceTimersByTime(300)

    expect(h.scrollCalls).toHaveLength(0)
  })

  it('reveals the tail of the list when the last question is answered', () => {
    // Ordered so the tap-answerable question really is last — there is no next
    // question to move to, only the end of the list.
    const h = buildHarness([QUESTIONS[2], QUESTIONS[0], QUESTIONS[1]])
    click(h.root.querySelector('[data-ptq-yn="q2"][data-val="true"]'))
    vi.advanceTimersByTime(300)

    expect(h.scrollCalls).toHaveLength(1)
    // Clamped to the bottom of the list rather than scrolling past it.
    expect(h.scrollCalls[0].top).toBe(SCROLL_HEIGHT - BODY_HEIGHT)
  })

  it('waits for the selection to paint before moving', () => {
    const h = buildHarness()
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))

    vi.advanceTimersByTime(100)
    expect(h.scrollCalls).toHaveLength(0)
    vi.advanceTimersByTime(200)
    expect(h.scrollCalls).toHaveLength(1)
  })

  it('leaves the cursor alone until a question that takes typing', () => {
    const h = buildHarness()
    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))
    vi.advanceTimersByTime(300)
    // Next up is yes/no — nothing to type into.
    expect(h.root.activeElement?.tagName).not.toBe('TEXTAREA')

    click(h.root.querySelector('[data-ptq-yn="q2"][data-val="true"]'))
    vi.advanceTimersByTime(300)
    expect(h.root.activeElement?.tagName).toBe('TEXTAREA')
  })

  it('does not advance off a multi-select, which is not finished on first tap', () => {
    const h = buildHarness([
      { id: 'm1', question_text: 'Pick some', is_required: true, question_type: 'multiple_choice', config: { mode: 'multi', options: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] } },
      ...QUESTIONS,
    ])
    const input = h.root.querySelector('[data-ptq-choice="m1"]') as HTMLInputElement
    input.checked = true
    input.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    vi.advanceTimersByTime(300)

    expect(h.scrollCalls).toHaveLength(0)
  })

  it('keeps the cursor on "Other" instead of advancing past an unfinished answer', () => {
    const h = buildHarness([
      { id: 'c1', question_text: 'Which?', is_required: true, question_type: 'single_choice', config: { allowOther: true, options: [{ id: 'a', label: 'A' }] } },
      ...QUESTIONS,
    ])
    const other = h.root.querySelector('[data-ptq-choice="c1"][value="__other"]') as HTMLInputElement
    other.checked = true
    other.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    vi.advanceTimersByTime(300)

    expect(h.scrollCalls).toHaveLength(0)
    expect(h.root.activeElement).toBe(h.root.querySelector('[data-ptq-other="c1"]'))
  })
})

describe('post-task question scroll affordance', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('flags that there is more below, then more above once scrolled', () => {
    const h = buildHarness()
    const shell = h.root.querySelector('.__vt_ptq_shell') as HTMLElement
    vi.advanceTimersByTime(10)
    expect(shell.classList.contains('__vt_more_below')).toBe(true)
    expect(shell.classList.contains('__vt_more_above')).toBe(false)

    h.body.scrollTop = SCROLL_HEIGHT - BODY_HEIGHT
    h.body.dispatchEvent(new Event('scroll'))
    expect(shell.classList.contains('__vt_more_above')).toBe(true)
    expect(shell.classList.contains('__vt_more_below')).toBe(false)
  })

  it('flags nothing when the whole list already fits', () => {
    const h = buildHarness()
    Object.defineProperty(h.body, 'clientHeight', { value: SCROLL_HEIGHT, configurable: true })
    h.body.dispatchEvent(new Event('scroll'))
    const shell = h.root.querySelector('.__vt_ptq_shell') as HTMLElement

    expect(shell.classList.contains('__vt_more_below')).toBe(false)
    expect(shell.classList.contains('__vt_more_above')).toBe(false)
  })
})

describe('Continue button cue', () => {
  beforeEach(() => { vi.useFakeTimers() })

  it('pulses once, on the edge where the form becomes submittable', () => {
    const h = buildHarness()
    const btn = h.root.querySelector('[data-action="ptq-submit"]') as HTMLButtonElement
    vi.advanceTimersByTime(10)
    expect(btn.disabled).toBe(true)
    expect(btn.classList.contains('__vt_pulse')).toBe(false)

    click(h.root.querySelector('[data-ptq-scale="q1"][data-val="4"]'))
    expect(btn.disabled).toBe(true) // q2 still unanswered
    expect(btn.classList.contains('__vt_pulse')).toBe(false)

    click(h.root.querySelector('[data-ptq-yn="q2"][data-val="true"]'))
    expect(btn.disabled).toBe(false)
    expect(btn.classList.contains('__vt_pulse')).toBe(true)

    // Changing an answer must not re-trigger it.
    btn.classList.remove('__vt_pulse')
    click(h.root.querySelector('[data-ptq-yn="q2"][data-val="false"]'))
    expect(btn.classList.contains('__vt_pulse')).toBe(false)
  })
})
