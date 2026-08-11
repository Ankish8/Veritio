import { describe, expect, it } from 'vitest'
import { extractBaseUrl, extractPathFromUrl, getPathFromUrl } from './url-utils'

describe('extractPathFromUrl', () => {
  it('returns the path of a website URL that has one', () => {
    expect(extractPathFromUrl('https://myo-call-logs.vercel.app/outbound-dialer')).toBe('/outbound-dialer')
  })

  it('returns / for a bare origin', () => {
    expect(extractPathFromUrl('https://example.com')).toBe('/')
  })

  it('keeps query and hash', () => {
    expect(extractPathFromUrl('https://example.com/app?tab=calls#top')).toBe('/app?tab=calls#top')
  })

  it('assumes https when the protocol is missing', () => {
    expect(extractPathFromUrl('example.com/pricing')).toBe('/pricing')
  })

  it('returns empty for empty or unparseable input', () => {
    expect(extractPathFromUrl('')).toBe('')
    expect(extractPathFromUrl('http://')).toBe('')
  })
})

describe('getPathFromUrl', () => {
  it('strips the base origin', () => {
    expect(getPathFromUrl('https://example.com/checkout', 'https://example.com')).toBe('/checkout')
  })

  it('does not treat a lookalike host as the base', () => {
    expect(getPathFromUrl('https://example.com.other.test/x', 'https://example.com')).toBe('/x')
  })

  it('falls back to parsing when the base does not match', () => {
    expect(getPathFromUrl('https://other.test/a/b', 'https://example.com')).toBe('/a/b')
  })

  it('returns empty for an empty url', () => {
    expect(getPathFromUrl('', 'https://example.com')).toBe('')
  })
})

describe('extractBaseUrl', () => {
  it('drops the path so typed paths stay origin-relative', () => {
    expect(extractBaseUrl('https://myo-call-logs.vercel.app/outbound-dialer')).toBe('https://myo-call-logs.vercel.app')
  })
})
