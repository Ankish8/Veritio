import { describe, expect, it } from 'vitest'

import {
  DEPLOYED_LANDING_ORIGIN,
  LOCAL_LANDING_ORIGIN,
  resolveLandingOrigin,
} from './landing-origin'

describe('resolveLandingOrigin', () => {
  it('uses the local landing server outside production', () => {
    expect(
      resolveLandingOrigin({ configuredOrigin: '', nodeEnv: 'development' })
    ).toBe(LOCAL_LANDING_ORIGIN)
  })

  it('uses the deployed landing site in production', () => {
    expect(
      resolveLandingOrigin({ configuredOrigin: '', nodeEnv: 'production' })
    ).toBe(DEPLOYED_LANDING_ORIGIN)
  })

  it('prefers and normalizes an explicit origin', () => {
    expect(
      resolveLandingOrigin({
        configuredOrigin: ' https://landing.example.com/// ',
        nodeEnv: 'development',
      })
    ).toBe('https://landing.example.com')
  })
})
