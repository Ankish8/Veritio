import { describe, it, expect } from 'vitest'
import {
  normalizeParticipantRedirect,
  isValidParticipantRedirect,
} from '@veritio/core/participant-redirect'

describe('normalizeParticipantRedirect', () => {
  it('treats empty values as no redirect', () => {
    expect(normalizeParticipantRedirect(undefined)).toBeNull()
    expect(normalizeParticipantRedirect(null)).toBeNull()
    expect(normalizeParticipantRedirect('')).toBeNull()
    expect(normalizeParticipantRedirect('   ')).toBeNull()
  })

  it('passes through absolute http(s) URLs', () => {
    expect(normalizeParticipantRedirect('https://example.com/thanks')).toBe(
      'https://example.com/thanks'
    )
    expect(normalizeParticipantRedirect('http://example.com')).toBe('http://example.com/')
    expect(normalizeParticipantRedirect('  https://example.com/a?b=1  ')).toBe(
      'https://example.com/a?b=1'
    )
  })

  it('makes schemeless hosts absolute so they never resolve against the study path', () => {
    expect(normalizeParticipantRedirect('example.com')).toBe('https://example.com/')
    expect(normalizeParticipantRedirect('example.com/thanks')).toBe('https://example.com/thanks')
    expect(normalizeParticipantRedirect('www.example.com/a')).toBe('https://www.example.com/a')
    expect(normalizeParticipantRedirect('//example.com/a')).toBe('https://example.com/a')
    expect(normalizeParticipantRedirect('example.com:8080/a')).toBe('https://example.com:8080/a')
  })

  // The bug this guards: a bare email saved into the thank-you Redirect URL field
  // sent participants to /s/<email> and a "Study not found" screen.
  it('rejects email addresses rather than reinterpreting them as a host', () => {
    expect(normalizeParticipantRedirect('chahatagrawal004@gmail.com')).toBeNull()
    expect(normalizeParticipantRedirect('mailto:someone@example.com')).toBeNull()
  })

  it('rejects embedded credentials', () => {
    expect(normalizeParticipantRedirect('https://veritio.io@evil.com')).toBeNull()
    expect(normalizeParticipantRedirect('https://user:pass@example.com')).toBeNull()
  })

  it('rejects non-http(s) schemes', () => {
    expect(normalizeParticipantRedirect('javascript:alert(1)')).toBeNull()
    expect(normalizeParticipantRedirect('data:text/html,<b>x</b>')).toBeNull()
    expect(normalizeParticipantRedirect('ftp://example.com')).toBeNull()
  })

  it('rejects free text that is not a host', () => {
    expect(normalizeParticipantRedirect('thank you')).toBeNull()
    expect(normalizeParticipantRedirect('Continue')).toBeNull()
    expect(normalizeParticipantRedirect('/s/ABC123')).toBeNull()
  })

  it('allows localhost for local testing', () => {
    expect(normalizeParticipantRedirect('http://localhost:4001/done')).toBe(
      'http://localhost:4001/done'
    )
  })
})

describe('isValidParticipantRedirect', () => {
  it('treats an unset field as valid, since the redirect is optional', () => {
    expect(isValidParticipantRedirect(undefined)).toBe(true)
    expect(isValidParticipantRedirect('')).toBe(true)
  })

  it('flags values that would not redirect', () => {
    expect(isValidParticipantRedirect('chahatagrawal004@gmail.com')).toBe(false)
    expect(isValidParticipantRedirect('https://example.com')).toBe(true)
    expect(isValidParticipantRedirect('example.com')).toBe(true)
  })
})
