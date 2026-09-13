import { describe, expect, it } from 'vitest'
import {
  createAppContentSecurityPolicy,
  createCspNonce,
  createLandingContentSecurityPolicy,
} from '../../../../packages/config/security-headers/index.mjs'
import config from '../../next.config.mjs'

function directive(policy: string, name: string) {
  return policy
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name} `))
}

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

  it('uses a fresh nonce instead of unsafe inline scripts on rendered pages', () => {
    const firstNonce = createCspNonce()
    const secondNonce = createCspNonce()
    const policy = createLandingContentSecurityPolicy({ nonce: firstNonce })
    const scriptSrc = directive(policy, 'script-src')

    expect(firstNonce).not.toBe(secondNonce)
    expect(scriptSrc).toContain(`'nonce-${firstNonce}'`)
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(directive(policy, 'style-src')).toContain("'unsafe-inline'")
  })

  it('allows cross-zone assets without weakening authenticated app pages', () => {
    const assetOrigin = 'https://landing.example.com'
    const policy = createLandingContentSecurityPolicy({ assetOrigin })
    const scriptSrc = directive(policy, 'script-src')

    expect(scriptSrc).toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'strict-dynamic'")
    expect(scriptSrc).toContain(assetOrigin)
    expect(directive(policy, 'style-src')).toContain(assetOrigin)
    expect(directive(policy, 'img-src')).toContain(assetOrigin)
    expect(directive(policy, 'font-src')).toContain(assetOrigin)
  })

  it('keeps the authenticated app policy nonce based in production', () => {
    const nonce = createCspNonce()
    const policy = createAppContentSecurityPolicy({
      landingOrigin: 'https://landing.example.com',
      development: false,
      nonce,
    })
    const scriptSrc = directive(policy, 'script-src')

    expect(scriptSrc).toContain(`'nonce-${nonce}'`)
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
    expect(policy).toContain("object-src 'none'")
  })

  it('rejects a nonce that could escape the CSP source expression', () => {
    expect(() => createLandingContentSecurityPolicy({ nonce: "bad' nonce" })).toThrow(
      'unsupported characters',
    )
  })
})
