import { describe, expect, it } from 'vitest'
import { contentSettingsWithDefaults } from './content-settings'

const CARD_SORT_DEFAULTS = {
  mode: 'open',
  randomizeCards: true,
  allowSkip: false,
  showProgress: true,
}

describe('contentSettingsWithDefaults', () => {
  // The bug this guards: the builder listed four keys and dropped the rest, so
  // these toggles rendered as off and the next save deleted them from the study.
  it('keeps settings that are not part of the defaults', () => {
    const settings = contentSettingsWithDefaults(
      {
        mode: 'hybrid',
        showCardDescriptions: true,
        includeUnclearCategory: true,
        showCategoryDescriptions: true,
        showCardImages: false,
        randomizeCategories: false,
        cardLimit: 20,
      },
      CARD_SORT_DEFAULTS
    )

    expect(settings).toMatchObject({
      mode: 'hybrid',
      showCardDescriptions: true,
      includeUnclearCategory: true,
      showCategoryDescriptions: true,
      showCardImages: false,
      randomizeCategories: false,
      cardLimit: 20,
    })
  })

  it('fills in only the missing defaults', () => {
    const settings = contentSettingsWithDefaults({ mode: 'closed' }, CARD_SORT_DEFAULTS)

    expect(settings).toEqual({
      mode: 'closed',
      randomizeCards: true,
      allowSkip: false,
      showProgress: true,
    })
  })

  it('does not let a default override a saved false', () => {
    const settings = contentSettingsWithDefaults(
      { randomizeCards: false, showProgress: false },
      CARD_SORT_DEFAULTS
    )

    expect(settings.randomizeCards).toBe(false)
    expect(settings.showProgress).toBe(false)
  })

  it('treats null like a missing value', () => {
    const settings = contentSettingsWithDefaults({ showProgress: null }, CARD_SORT_DEFAULTS)

    expect(settings.showProgress).toBe(true)
  })

  // studyFlow shares the settings column but belongs to the flow store.
  it('strips studyFlow', () => {
    const settings = contentSettingsWithDefaults(
      { mode: 'open', studyFlow: { welcome: { enabled: true } } },
      CARD_SORT_DEFAULTS
    )

    expect(settings).not.toHaveProperty('studyFlow')
  })

  it('falls back to the defaults for a missing or malformed settings column', () => {
    expect(contentSettingsWithDefaults(null, CARD_SORT_DEFAULTS)).toEqual(CARD_SORT_DEFAULTS)
    expect(contentSettingsWithDefaults(undefined, CARD_SORT_DEFAULTS)).toEqual(CARD_SORT_DEFAULTS)
    expect(contentSettingsWithDefaults([1, 2], CARD_SORT_DEFAULTS)).toEqual(CARD_SORT_DEFAULTS)
    expect(contentSettingsWithDefaults('nope', CARD_SORT_DEFAULTS)).toEqual(CARD_SORT_DEFAULTS)
  })
})
