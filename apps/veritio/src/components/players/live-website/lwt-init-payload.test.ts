import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Regression guard: the companion resolves a task with a blank target_url
 * against settings.websiteUrl. It gets that either from the tasks API or, when
 * the player opens the site, from this lwt-init postMessage. The payload builds
 * settings from an explicit whitelist, and websiteUrl was missing from it, so
 * every player-launched session fell back to the bare origin and dropped the
 * path. The API path worked, which is why opening the proxy URL by hand did not
 * reproduce it.
 */
const SOURCE = readFileSync(
  join(__dirname, 'recording-controller.tsx'),
  'utf-8',
)

function lwtInitSettingsBlock(): string {
  const start = SOURCE.indexOf("type: 'lwt-init'")
  expect(start, "lwt-init payload not found — did the message shape move?").toBeGreaterThan(-1)
  const settingsStart = SOURCE.indexOf('settings: {', start)
  const settingsEnd = SOURCE.indexOf('},', settingsStart)
  expect(settingsStart).toBeGreaterThan(-1)
  expect(settingsEnd).toBeGreaterThan(settingsStart)
  return SOURCE.slice(settingsStart, settingsEnd)
}

describe('lwt-init handoff to the companion', () => {
  it('carries websiteUrl so a blank starting page can inherit it', () => {
    expect(lwtInitSettingsBlock()).toContain('websiteUrl:')
  })

  it('uses the variant-aware URL rather than the raw study setting alone', () => {
    expect(lwtInitSettingsBlock()).toContain('effectiveWebsiteUrl')
  })

  it('resends when the effective URL changes', () => {
    const deps = SOURCE.slice(SOURCE.indexOf('}, [tasks, settings'))
    expect(deps.slice(0, 160)).toContain('effectiveWebsiteUrl')
  })
})
