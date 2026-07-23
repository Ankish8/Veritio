import { describe, expect, it } from 'vitest'
import type { LiveWebsiteSettings, LiveWebsiteTask } from '../../../stores/study-builder/live-website-builder'
import { validateLiveWebsiteContent } from './live-website-validator'

const task: LiveWebsiteTask = {
  id: 'task-id',
  title: 'Find pricing',
  instructions: '<p>Find the pricing page.</p>',
  target_url: 'https://example.com',
  success_url: null,
  success_criteria_type: 'self_reported',
  success_path: null,
  time_limit_seconds: null,
  order_position: 0,
  post_task_questions: [],
}

function settings(overrides: Partial<LiveWebsiteSettings> = {}): LiveWebsiteSettings {
  return {
    websiteUrl: 'https://example.com',
    mode: 'reverse_proxy',
    snippetId: 'snippet-id',
    snippetVerified: false,
    recordScreen: true,
    recordWebcam: false,
    recordMicrophone: true,
    trackClickEvents: true,
    trackScrollDepth: true,
    allowMobile: false,
    allowSkipTasks: true,
    showTaskProgress: true,
    defaultTimeLimitSeconds: null,
    authInstructions: '',
    widgetPosition: 'bottom-right',
    blockBeforeStart: true,
    ...overrides,
  }
}

describe('validateLiveWebsiteContent', () => {
  it.each(['reverse_proxy', 'snippet'] as const)('blocks %s mode when the snippet ID invariant is broken', (mode) => {
    const issues = validateLiveWebsiteContent([task], settings({ mode, snippetId: null }))

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringContaining('missing-live-website-snippet-id'),
        }),
      ])
    )
  })

  it('allows valid companion modes and Observer Mode', () => {
    expect(validateLiveWebsiteContent([task], settings())).toEqual([])
    expect(validateLiveWebsiteContent([task], settings({ mode: 'url_only', snippetId: null }))).toEqual([])
  })
})
