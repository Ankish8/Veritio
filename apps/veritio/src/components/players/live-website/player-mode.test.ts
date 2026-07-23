import { describe, expect, it } from 'vitest'
import {
  getLiveWebsiteConfigurationError,
  shouldUseCompanionController,
} from './player-mode'
import type { LiveWebsiteSettings } from './types'

function settings(overrides: Partial<LiveWebsiteSettings>): LiveWebsiteSettings {
  return {
    mode: 'url_only',
    websiteUrl: 'https://example.com',
    snippetId: null,
    recordScreen: false,
    recordWebcam: false,
    recordMicrophone: false,
    allowMobile: true,
    allowSkipTasks: true,
    showTaskProgress: true,
    defaultTimeLimitSeconds: null,
    authInstructions: null,
    widgetPosition: 'bottom-right',
    blockBeforeStart: true,
    ...overrides,
  }
}

describe('shouldUseCompanionController', () => {
  it('uses the injected companion for reverse-proxy studies', () => {
    expect(
      shouldUseCompanionController(
        settings({ mode: 'reverse_proxy', snippetId: 'snippet-id' })
      )
    ).toBe(true)
  })

  it('does not enter companion mode with an invalid configuration', () => {
    const invalid = settings({ mode: 'reverse_proxy', snippetId: null })

    expect(shouldUseCompanionController(invalid)).toBe(false)
    expect(getLiveWebsiteConfigurationError(invalid)).toContain(
      'not configured correctly'
    )
  })

  it('uses the companion only after a snippet connection is verified', () => {
    expect(
      shouldUseCompanionController(
        settings({
          mode: 'snippet',
          snippetId: 'snippet-id',
          snippetVerified: true,
        })
      )
    ).toBe(true)
    expect(
      shouldUseCompanionController(
        settings({
          mode: 'snippet',
          snippetId: 'snippet-id',
          snippetVerified: false,
        })
      )
    ).toBe(false)
  })

  it('uses the floating task panel for observer mode', () => {
    expect(shouldUseCompanionController(settings({ mode: 'url_only' }))).toBe(false)
    expect(getLiveWebsiteConfigurationError(settings({ mode: 'url_only' }))).toBeNull()
  })
})
