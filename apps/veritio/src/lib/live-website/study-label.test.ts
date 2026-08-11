import { describe, it, expect } from 'vitest'
import { getLiveWebsiteStudyLabel, getStudyDisplayLabel } from './study-label'

describe('getLiveWebsiteStudyLabel', () => {
  it('labels by current mode', () => {
    expect(getLiveWebsiteStudyLabel({ mode: 'reverse_proxy' })).toBe('Website Prototype Test')
    expect(getLiveWebsiteStudyLabel({ mode: 'snippet' })).toBe('Web App Test')
  })

  it('prefers mode over the creation use case when the researcher has switched', () => {
    expect(
      getLiveWebsiteStudyLabel({ mode: 'reverse_proxy', createdFromUseCase: 'web_app_test' })
    ).toBe('Website Prototype Test')
    expect(
      getLiveWebsiteStudyLabel({ mode: 'snippet', createdFromUseCase: 'website_prototype_test' })
    ).toBe('Web App Test')
  })

  it('falls back to the creation use case when mode carries no product signal', () => {
    expect(
      getLiveWebsiteStudyLabel({ mode: 'url_only', createdFromUseCase: 'website_prototype_test' })
    ).toBe('Website Prototype Test')
    expect(getLiveWebsiteStudyLabel({ createdFromUseCase: 'website_prototype_test' })).toBe(
      'Website Prototype Test'
    )
  })

  it('defaults to Web App Test for unusable settings', () => {
    expect(getLiveWebsiteStudyLabel(null)).toBe('Web App Test')
    expect(getLiveWebsiteStudyLabel(undefined)).toBe('Web App Test')
    expect(getLiveWebsiteStudyLabel({})).toBe('Web App Test')
    expect(getLiveWebsiteStudyLabel('nonsense')).toBe('Web App Test')
  })
})

describe('getStudyDisplayLabel', () => {
  it('leaves other study types alone', () => {
    expect(getStudyDisplayLabel('card_sort', 'Card Sort', { mode: 'reverse_proxy' })).toBe(
      'Card Sort'
    )
  })

  it('overrides the label for live website studies', () => {
    expect(
      getStudyDisplayLabel('live_website_test', 'Web App Test', { mode: 'reverse_proxy' })
    ).toBe('Website Prototype Test')
  })
})
