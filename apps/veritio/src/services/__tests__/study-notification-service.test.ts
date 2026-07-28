import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  mapStudyCloseReason,
  normalizeNotificationSettings,
  selectCrossedMilestones,
} from '../study-notification-service'
import { buildStudyResultsUrl } from '../../lib/email/study-links'

describe('normalizeNotificationSettings', () => {
  it('treats a missing blob as fully disabled', () => {
    expect(normalizeNotificationSettings(null).enabled).toBe(false)
    expect(normalizeNotificationSettings(null).onClose).toBe(false)
    expect(normalizeNotificationSettings(undefined).dailyDigest).toBe(false)
  })

  it('applies builder defaults to absent trigger keys', () => {
    const settings = normalizeNotificationSettings({ enabled: true, triggers: {} })

    expect(settings.enabled).toBe(true)
    // Defaults mirror DEFAULT_NOTIFICATION_TRIGGERS in the builder.
    expect(settings.onClose).toBe(true)
    expect(settings.milestonesEnabled).toBe(true)
    expect(settings.milestoneValues).toEqual([10, 50, 100, 500, 1000])
    expect(settings.everyResponse).toBe(false)
    expect(settings.dailyDigest).toBe(false)
  })

  it('honours explicit false over the defaults', () => {
    const settings = normalizeNotificationSettings({
      enabled: true,
      triggers: { onClose: false, milestones: { enabled: false, values: [5] }, dailyDigest: true },
      milestonesReached: [5],
    })

    expect(settings.onClose).toBe(false)
    expect(settings.milestonesEnabled).toBe(false)
    expect(settings.dailyDigest).toBe(true)
    expect(settings.milestonesReached).toEqual([5])
  })

  it('discards non-numeric milestone entries', () => {
    const settings = normalizeNotificationSettings({
      enabled: true,
      triggers: { milestones: { enabled: true, values: [10, 'twenty', null] } },
    })

    expect(settings.milestoneValues).toEqual([10])
  })
})

describe('selectCrossedMilestones', () => {
  const base = normalizeNotificationSettings({
    enabled: true,
    triggers: { milestones: { enabled: true, values: [10, 50, 100] } },
  })

  it('fires when the count jumps past the exact milestone', () => {
    // The old == check missed this entirely.
    expect(selectCrossedMilestones(base, 11)).toEqual([10])
  })

  it('returns nothing below the first milestone', () => {
    expect(selectCrossedMilestones(base, 9)).toEqual([])
  })

  it('reports every unreached milestone so the caller can record them at once', () => {
    expect(selectCrossedMilestones(base, 120)).toEqual([10, 50, 100])
  })

  it('skips milestones already recorded', () => {
    const settings = { ...base, milestonesReached: [10, 50] }
    expect(selectCrossedMilestones(settings, 120)).toEqual([100])
  })

  it('stays silent when milestones or notifications are off', () => {
    expect(selectCrossedMilestones({ ...base, milestonesEnabled: false }, 120)).toEqual([])
    expect(selectCrossedMilestones({ ...base, enabled: false }, 120)).toEqual([])
  })
})

describe('mapStudyCloseReason', () => {
  it('maps scheduler enums', () => {
    expect(mapStudyCloseReason('date')).toBe('date')
    expect(mapStudyCloseReason('participant_count')).toBe('participant_limit')
  })

  it('maps the closing-rule checker free text', () => {
    expect(mapStudyCloseReason('Reached 50 participants')).toBe('participant_limit')
    expect(mapStudyCloseReason('Reached closing date')).toBe('date')
    expect(mapStudyCloseReason('Reached 50 participants and reached closing date')).toBe('both')
  })

  it('falls back to manual', () => {
    expect(mapStudyCloseReason('manual')).toBe('manual')
    expect(mapStudyCloseReason(null)).toBe('manual')
  })
})

describe('buildStudyResultsUrl', () => {
  const previousBaseUrl = process.env.NEXT_PUBLIC_APP_URL

  beforeAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://veritio.io'
  })

  afterAll(() => {
    if (previousBaseUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = previousBaseUrl
  })

  it('builds the project-scoped results path', () => {
    expect(buildStudyResultsUrl('proj-1', 'study-1')).toBe(
      'https://veritio.io/projects/proj-1/studies/study-1/results'
    )
  })

  it('falls back to the studies list when the study has no project', () => {
    expect(buildStudyResultsUrl(null, 'study-1')).toBe('https://veritio.io/studies')
  })
})
