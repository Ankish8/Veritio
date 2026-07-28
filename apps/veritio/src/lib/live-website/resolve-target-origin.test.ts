import { describe, expect, it } from 'vitest'
import { applyResolvedOrigin } from './resolve-target-origin'
import { isBlockedProxyOrigin } from './origin-safety'

describe('applyResolvedOrigin', () => {
  it('adopts a canonical apex -> www redirect', () => {
    const r = applyResolvedOrigin('https://bbc.com/', 'https://www.bbc.com/')
    expect(r).toEqual({
      url: 'https://www.bbc.com/',
      changed: true,
      reason: 'www-variant',
    })
  })

  it('keeps the researcher path when swapping origin', () => {
    const r = applyResolvedOrigin(
      'https://bbc.com/news?a=1#top',
      'https://www.bbc.com/',
    )
    expect(r.url).toBe('https://www.bbc.com/news?a=1#top')
    expect(r.changed).toBe(true)
  })

  it('labels a genuine domain change as cross-origin', () => {
    const r = applyResolvedOrigin('https://twitter.com/foo', 'https://x.com/foo')
    expect(r).toEqual({
      url: 'https://x.com/foo',
      changed: true,
      reason: 'cross-origin',
    })
  })

  // The geo-redirect trap: Stripe served /in for an Indian IP during testing.
  // Adopting that path would pin every participant to one region's page.
  it('ignores a path-only geo redirect', () => {
    const r = applyResolvedOrigin('https://stripe.com/', 'https://stripe.com/in')
    expect(r).toEqual({
      url: 'https://stripe.com/',
      changed: false,
      reason: 'unchanged',
    })
  })

  it('ignores a redirect back to the same origin with a different path', () => {
    const r = applyResolvedOrigin(
      'https://shop.com/a',
      'https://shop.com/b/c?x=1',
    )
    expect(r.changed).toBe(false)
    expect(r.url).toBe('https://shop.com/a')
  })

  it('adopts an http -> https upgrade', () => {
    const r = applyResolvedOrigin('http://bbc.com/x', 'https://www.bbc.com/')
    expect(r.url).toBe('https://www.bbc.com/x')
    expect(r.changed).toBe(true)
  })

  it('never adopts an https -> http downgrade', () => {
    const r = applyResolvedOrigin('https://bbc.com/x', 'http://www.bbc.com/')
    expect(r.changed).toBe(false)
    expect(r.url).toBe('https://bbc.com/x')
  })

  it('preserves a non-default port from the resolved origin', () => {
    const r = applyResolvedOrigin('https://a.com/x', 'https://b.com:8443/')
    expect(r.url).toBe('https://b.com:8443/x')
  })

  it('leaves malformed or non-http input alone', () => {
    expect(applyResolvedOrigin('not a url', 'https://a.com').changed).toBe(false)
    expect(applyResolvedOrigin('https://a.com', 'not a url').changed).toBe(false)
    expect(
      applyResolvedOrigin('https://a.com', 'ftp://a.com').changed,
    ).toBe(false)
    expect(
      applyResolvedOrigin('https://a.com', 'javascript:alert(1)').changed,
    ).toBe(false)
  })
})

describe('isBlockedProxyOrigin', () => {
  it('allows ordinary public origins', () => {
    for (const o of [
      'https://bbc.com',
      'http://example.org',
      'https://www.shopify.com',
      'https://a.b.c.example.com:8443',
    ]) {
      expect(isBlockedProxyOrigin(o)).toBe(false)
    }
  })

  it('blocks loopback and unspecified addresses', () => {
    for (const o of [
      'http://localhost',
      'http://localhost:3000',
      'http://foo.localhost',
      'http://127.0.0.1',
      'http://127.1.2.3',
      'http://0.0.0.0',
      'http://[::1]',
      'http://[::]',
    ]) {
      expect(isBlockedProxyOrigin(o)).toBe(true)
    }
  })

  it('blocks private, CGNAT, and link-local ranges', () => {
    for (const o of [
      'http://10.0.0.1',
      'http://172.16.0.1',
      'http://172.31.255.255',
      'http://192.168.1.1',
      'http://100.64.0.1',
      'http://169.254.169.254', // cloud metadata
    ]) {
      expect(isBlockedProxyOrigin(o)).toBe(true)
    }
  })

  it('does not over-block public addresses adjacent to private ranges', () => {
    for (const o of [
      'http://172.15.0.1',
      'http://172.32.0.1',
      'http://192.167.1.1',
      'http://100.63.0.1',
      'http://100.128.0.1',
      'http://169.253.0.1',
    ]) {
      expect(isBlockedProxyOrigin(o)).toBe(false)
    }
  })

  it('blocks internal-only suffixes', () => {
    expect(isBlockedProxyOrigin('http://db.internal')).toBe(true)
    expect(isBlockedProxyOrigin('http://printer.local')).toBe(true)
  })

  it('blocks IPv6 ULA and link-local', () => {
    expect(isBlockedProxyOrigin('http://[fc00::1]')).toBe(true)
    expect(isBlockedProxyOrigin('http://[fd12::1]')).toBe(true)
    expect(isBlockedProxyOrigin('http://[fe80::1]')).toBe(true)
  })

  it('blocks embedded credentials, odd schemes, and malformed input', () => {
    expect(isBlockedProxyOrigin('https://user:pass@example.com')).toBe(true)
    expect(isBlockedProxyOrigin('file:///etc/passwd')).toBe(true)
    expect(isBlockedProxyOrigin('gopher://example.com')).toBe(true)
    expect(isBlockedProxyOrigin('not a url')).toBe(true)
    expect(isBlockedProxyOrigin('')).toBe(true)
  })
})
