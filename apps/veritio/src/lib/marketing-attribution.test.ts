import { describe, expect, it } from 'vitest'
import {
  MARKETING_ATTRIBUTION_COOKIE,
  parseMarketingAttribution,
  readMarketingAttribution,
  readMarketingAttributionCookie,
  serializeMarketingAttribution,
} from './marketing-attribution'

describe('marketing attribution', () => {
  it('allowlists campaign fields and bounds their values', () => {
    const params = new URLSearchParams({
      utm_source: ` community\u0000${'x'.repeat(200)} `,
      utm_campaign: 'open-source-launch',
      email: 'must-not-be-captured@example.com',
    })

    const attribution = readMarketingAttribution(params, '2026-09-13T00:00:00.000Z')
    expect(attribution?.source).toHaveLength(120)
    expect(attribution?.source).not.toContain('\u0000')
    expect(attribution?.campaign).toBe('open-source-launch')
    expect(attribution).not.toHaveProperty('email')
  })

  it('round-trips through the first-party cookie format', () => {
    const attribution = readMarketingAttribution(
      new URLSearchParams({ utm_source: 'reddit', utm_medium: 'community' }),
      '2026-09-13T00:00:00.000Z',
    )
    expect(attribution).not.toBeNull()

    const serialized = serializeMarketingAttribution(attribution!)
    expect(parseMarketingAttribution(serialized)).toEqual(attribution)
    expect(
      readMarketingAttributionCookie(
        `session=abc; ${MARKETING_ATTRIBUTION_COOKIE}=${encodeURIComponent(serialized)}`,
      ),
    ).toEqual(attribution)
  })

  it('rejects empty, oversized, and invalid timestamp cookies', () => {
    expect(readMarketingAttribution(new URLSearchParams({ plan: 'pro' }))).toBeNull()
    expect(parseMarketingAttribution('x'.repeat(1025))).toBeNull()
    expect(parseMarketingAttribution('source=reddit&capturedAt=nope')).toBeNull()
  })
})
