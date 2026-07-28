import { describe, expect, it } from 'vitest'
import { buildCookieScope, rewriteCookiePath } from './proxy-cookies'

const SCOPE = buildCookieScope('study-1', 'snip-1')

describe('buildCookieScope', () => {
  it('scopes to study and snippet', () => {
    expect(SCOPE).toBe('/p/study-1/snip-1')
  })

  // The origin segment is excluded on purpose: the proxy re-encodes it when it
  // follows an apex/www redirect, which is precisely when session cookies are
  // set, so including it would break them at the worst moment.
  it('excludes the base64 origin segment', () => {
    expect(SCOPE).not.toContain('aHR0')
    expect(SCOPE.split('/').filter(Boolean)).toEqual(['p', 'study-1', 'snip-1'])
  })
})

describe('rewriteCookiePath', () => {
  it('scopes a root-path cookie to the study', () => {
    expect(rewriteCookiePath('a=1; Path=/; HttpOnly', SCOPE)).toBe(
      'a=1; Path=/p/study-1/snip-1/; HttpOnly',
    )
  })

  it('preserves a narrower path underneath the scope', () => {
    expect(rewriteCookiePath('s=x; Path=/account; Secure', SCOPE)).toBe(
      's=x; Path=/p/study-1/snip-1/account; Secure',
    )
  })

  it('adds an explicit Path when the cookie has none', () => {
    expect(rewriteCookiePath('a=1; HttpOnly', SCOPE)).toBe(
      'a=1; HttpOnly; Path=/p/study-1/snip-1/',
    )
    expect(rewriteCookiePath('a=1', SCOPE)).toBe(
      'a=1; Path=/p/study-1/snip-1/',
    )
  })

  it('matches Path case-insensitively and tolerates spacing', () => {
    expect(rewriteCookiePath('a=1; path = /x', SCOPE)).toBe(
      'a=1; Path=/p/study-1/snip-1/x',
    )
    expect(rewriteCookiePath('a=1; PATH=/x', SCOPE)).toBe(
      'a=1; Path=/p/study-1/snip-1/x',
    )
  })

  it('handles a path without a leading slash', () => {
    expect(rewriteCookiePath('a=1; Path=account', SCOPE)).toBe(
      'a=1; Path=/p/study-1/snip-1/account',
    )
  })

  it('does not produce double slashes', () => {
    expect(rewriteCookiePath('a=1; Path=/', '/p/s/n/')).toBe(
      'a=1; Path=/p/s/n/',
    )
    expect(rewriteCookiePath('a=1; Path=//x', SCOPE)).not.toMatch(/\/\//)
  })

  it('leaves other attributes untouched', () => {
    const out = rewriteCookiePath(
      'sid=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; HttpOnly; Secure; SameSite=Lax',
      SCOPE,
    )
    expect(out).toContain('Expires=Wed, 21 Oct 2026 07:28:00 GMT')
    expect(out).toContain('HttpOnly')
    expect(out).toContain('Secure')
    expect(out).toContain('SameSite=Lax')
    expect(out).toContain('Path=/p/study-1/snip-1/')
  })

  // Expires contains a comma, which is why cookies must be handled one at a
  // time via getSetCookie() rather than through a joined header value.
  it('does not confuse a comma in Expires for a delimiter', () => {
    const out = rewriteCookiePath(
      'a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT',
      SCOPE,
    )
    expect(out).toBe(
      'a=1; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Path=/p/study-1/snip-1/',
    )
  })

  it('returns empty input unchanged', () => {
    expect(rewriteCookiePath('', SCOPE)).toBe('')
  })
})
