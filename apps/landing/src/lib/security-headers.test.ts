import { describe, expect, it } from 'vitest'
import config from '../../next.config.mjs'

describe('landing deployment security headers', () => {
  it('applies the complete shared policy to the direct deployment', async () => {
    expect(config.poweredByHeader).toBe(false)
    const rules = await config.headers?.()
    const allRoutes = rules?.find((rule) => rule.source === '/(.*)')
    const headers = new Map(allRoutes?.headers.map((header) => [header.key.toLowerCase(), header.value]))

    expect(headers.get('content-security-policy')).toContain("default-src 'self'")
    expect(headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('permissions-policy')).toContain('camera=()')
    expect(headers.get('strict-transport-security')).toContain('max-age=63072000')
  })
})
