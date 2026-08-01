import { describe, expect, it } from 'vitest'
import { validateSettingsFor, settingsKeysFor, SETTINGS_BY_TYPE } from './settings'
import { STUDY_TYPES } from './common'

describe('per-study-type settings validation', () => {
  it('covers every study type the product supports', () => {
    for (const type of STUDY_TYPES) {
      expect(Object.keys(SETTINGS_BY_TYPE)).toContain(type)
    }
  })

  it('accepts a valid partial patch', () => {
    const result = validateSettingsFor('card_sort', { mode: 'closed', randomizeCards: false })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ mode: 'closed', randomizeCards: false })
  })

  it('rejects an invented field instead of silently dropping it', () => {
    const result = validateSettingsFor('card_sort', { mode: 'open', randomiseCards: true })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/randomiseCards|unrecognized/i)
  })

  it('rejects a field that belongs to a different study type', () => {
    // showBreadcrumbs is a tree test setting; sending it to a card sort is a
    // real mistake an agent makes, and it used to be accepted and ignored.
    const result = validateSettingsFor('card_sort', { showBreadcrumbs: true })
    expect(result.ok).toBe(false)
  })

  it('rejects a wrong-typed value', () => {
    const result = validateSettingsFor('survey', { randomizeQuestions: 'yes' })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.join(' ')).toContain('randomizeQuestions')
  })

  it('enforces enum membership', () => {
    expect(validateSettingsFor('card_sort', { mode: 'partially_open' }).ok).toBe(false)
    expect(validateSettingsFor('card_sort', { mode: 'hybrid' }).ok).toBe(true)
  })

  it('enforces numeric bounds where the product has them', () => {
    expect(validateSettingsFor('first_impression', { exposureDurationMs: 5000 }).ok).toBe(true)
    expect(validateSettingsFor('first_impression', { exposureDurationMs: 999999 }).ok).toBe(false)
  })

  it('enforces the hex colour format', () => {
    expect(validateSettingsFor('first_impression', { backgroundColor: '#ffffff' }).ok).toBe(true)
    expect(validateSettingsFor('first_impression', { backgroundColor: 'white' }).ok).toBe(false)
  })

  it('accepts the union-typed showEachParticipantTasks in both forms', () => {
    expect(validateSettingsFor('prototype_test', { showEachParticipantTasks: 'all' }).ok).toBe(true)
    expect(validateSettingsFor('prototype_test', { showEachParticipantTasks: 3 }).ok).toBe(true)
    expect(validateSettingsFor('prototype_test', { showEachParticipantTasks: 'some' }).ok).toBe(false)
  })

  it('validates live website URLs', () => {
    expect(validateSettingsFor('live_website_test', { websiteUrl: 'https://example.com' }).ok).toBe(true)
    expect(validateSettingsFor('live_website_test', { websiteUrl: 'not a url' }).ok).toBe(false)
  })

  it('rejects an unknown study type rather than accepting anything', () => {
    const result = validateSettingsFor('telepathy_test', { anything: true })
    expect(result.ok).toBe(false)
  })

  it('accepts an empty patch', () => {
    expect(validateSettingsFor('tree_test', {}).ok).toBe(true)
  })

  it('exposes the valid keys per type, for error hints', () => {
    expect(settingsKeysFor('tree_test')).toContain('showBreadcrumbs')
    expect(settingsKeysFor('tree_test')).not.toContain('mode')
    expect(settingsKeysFor('nope')).toEqual([])
  })

  it('every per-type default from study-service is a valid patch', () => {
    // These are the objects createStudy() writes on study creation
    // (study-service.ts:343). If the schema cannot round-trip them, the schema
    // is wrong, not the defaults.
    const defaults: Record<string, Record<string, unknown>> = {
      card_sort: { mode: 'open', randomizeCards: true, allowSkip: false, showProgress: true },
      tree_test: { randomizeTasks: false, showBreadcrumbs: true, allowBack: true, showTaskProgress: true },
      survey: {
        showOneQuestionPerPage: true,
        randomizeQuestions: false,
        showProgressBar: true,
        allowSkipQuestions: false,
      },
      prototype_test: {
        randomizeTasks: true,
        allowSkipTasks: true,
        showTaskProgress: true,
        dontRandomizeFirstTask: true,
        clickableAreaFlashing: true,
        tasksEndAutomatically: true,
        showEachParticipantTasks: 'all',
      },
      first_click: {
        allowSkipTasks: true,
        startTasksImmediately: false,
        randomizeTasks: true,
        dontRandomizeFirstTask: true,
        showTaskProgress: true,
        showEachParticipantTasks: 'all',
        imageScaling: 'scale_on_small',
      },
      first_impression: {
        exposureDurationMs: 5000,
        countdownDurationMs: 3000,
        showTimerToParticipant: true,
        showProgressIndicator: true,
        questionDisplayMode: 'one_per_page',
        randomizeQuestions: false,
        designAssignmentMode: 'random_single',
        allowPracticeDesign: false,
      },
      live_website_test: {
        allowSkipTasks: true,
        showTaskProgress: true,
        defaultTimeLimitSeconds: null,
        recordScreen: true,
        recordWebcam: false,
        recordMicrophone: true,
        allowMobile: false,
        mode: 'url_only',
      },
    }

    for (const [type, patch] of Object.entries(defaults)) {
      const result = validateSettingsFor(type, patch)
      expect(result.ok, `${type} defaults rejected: ${result.ok ? '' : result.errors.join('; ')}`).toBe(true)
    }
  })
})
