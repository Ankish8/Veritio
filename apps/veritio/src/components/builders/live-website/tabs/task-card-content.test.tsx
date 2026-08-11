import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskCardContent, type TaskCardContentProps } from './task-card-content'
import type { LiveWebsiteTask } from '@/stores/study-builder'

/**
 * Regression guard: the Starting Page field split the study's website URL at its
 * origin, so a website URL like https://example.test/outbound-dialer rendered a
 * prefix of https://example.test with an empty input placeholdered "Leave empty
 * for homepage". That misreported the real starting page, which the player
 * resolves as the full website URL (path included) whenever target_url is blank.
 */

vi.mock('@/components/study-flow/builder/rich-text-editor', () => ({
  RichTextEditor: () => null,
}))
vi.mock('@/components/ai-refine', () => ({ AiRefineMenuButton: () => null }))
vi.mock('../url-path-recorder', () => ({ UrlPathRecorder: () => null }))
vi.mock('../url-path-preview', () => ({ UrlPathPreview: () => null }))
vi.mock('@/components/builders/shared/post-task-questions-modal', () => ({
  GenericPostTaskQuestionsModal: () => null,
}))
vi.mock('./per-variant-config-panel', () => ({ PerVariantConfigPanel: () => null }))

const WEBSITE_URL = 'https://myo-call-logs.vercel.app/outbound-dialer'

const task: LiveWebsiteTask = {
  id: 'task-1',
  title: 'Configure Agent Dialer',
  instructions: '',
  target_url: '',
  success_url: null,
  success_criteria_type: 'self_reported',
  success_path: null,
  time_limit_seconds: null,
  order_position: 0,
  post_task_questions: [],
}

function buildProps(overrides: Partial<TaskCardContentProps> = {}): TaskCardContentProps {
  return {
    task,
    tasks: [task],
    taskNumber: 1,
    studyId: 'study-1',
    websiteUrl: WEBSITE_URL,
    baseUrl: 'https://myo-call-logs.vercel.app',
    supportsUrlPath: true,
    trackingMode: 'reverse_proxy',
    snippetId: 'snip-1',
    abTestingEnabled: false,
    variants: [],
    taskVariants: [],
    activeVariantTab: null,
    onTabChange: vi.fn(),
    postTaskQuestions: [],
    recorderOpen: false,
    setRecorderOpen: vi.fn(),
    variantRecorderVariantId: null,
    setVariantRecorderVariantId: vi.fn(),
    postTaskQuestionsOpen: false,
    setPostTaskQuestionsOpen: vi.fn(),
    onUpdate: vi.fn(),
    onDelete: vi.fn(),
    onSetTaskVariantCriteria: vi.fn(),
    handleCriteriaChange: vi.fn(),
    handleSavePath: vi.fn(),
    getPathFromTargetUrl: (url: string) =>
      url.startsWith('https://myo-call-logs.vercel.app')
        ? url.slice('https://myo-call-logs.vercel.app'.length)
        : url,
    postTaskActions: {
      addPostTaskQuestion: vi.fn(),
      updatePostTaskQuestion: vi.fn(),
      removePostTaskQuestion: vi.fn(),
      reorderPostTaskQuestions: vi.fn(),
    },
    ...overrides,
  }
}

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

function render(props: TaskCardContentProps) {
  act(() => {
    root.render(<TaskCardContent {...props} />)
  })
}

function startingPageInput() {
  return container.querySelector<HTMLInputElement>('#task-url-task-1')
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.clearAllMocks()
})

describe('TaskCardContent starting page', () => {
  it('placeholders the inherited website path instead of claiming the homepage', () => {
    render(buildProps())

    const input = startingPageInput()
    expect(input?.value).toBe('')
    expect(input?.placeholder).toBe('/outbound-dialer')
    expect(container.textContent).not.toContain('Leave empty for homepage')
  })

  it('spells out the URL the task actually starts at when left empty', () => {
    render(buildProps())

    expect(container.textContent).toContain('Empty means this task starts at your website URL')
    expect(container.textContent).toContain(WEBSITE_URL)
  })

  it('opens the inherited website URL from the external link button', () => {
    render(buildProps())

    const link = container.querySelector<HTMLAnchorElement>('a[aria-label="Open starting page"]')
    expect(link?.getAttribute('href')).toBe(WEBSITE_URL)
  })

  it('shows the task override and drops the inherited hint once a path is set', () => {
    render(
      buildProps({
        task: { ...task, target_url: 'https://myo-call-logs.vercel.app/campaigns' },
      }),
    )

    expect(startingPageInput()?.value).toBe('/campaigns')
    expect(container.textContent).not.toContain('Empty means this task starts at')
    const link = container.querySelector<HTMLAnchorElement>('a[aria-label="Open starting page"]')
    expect(link?.getAttribute('href')).toBe('https://myo-call-logs.vercel.app/campaigns')
  })

  it('falls back to the homepage placeholder when the website URL is a bare origin', () => {
    render(buildProps({ websiteUrl: 'https://myo-call-logs.vercel.app' }))

    expect(startingPageInput()?.placeholder).toBe('/')
  })
})
