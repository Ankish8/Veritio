import { describe, it, expect } from 'vitest'
import { detectHostingPlatform } from './hosting-platform'

describe('detectHostingPlatform', () => {
  it('detects AI builders from their preview hosts', () => {
    expect(detectHostingPlatform('https://my-app.lovable.app/pricing')).toMatchObject({
      id: 'lovable',
      aiBuilder: true,
    })
    expect(detectHostingPlatform('https://abc123.vusercontent.net')).toMatchObject({ id: 'v0' })
    expect(detectHostingPlatform('https://demo.bolt.host')).toMatchObject({ id: 'bolt' })
    expect(detectHostingPlatform('https://x-y-z.replit.app')).toMatchObject({ id: 'replit' })
  })

  it('detects general preview hosts without flagging them as AI builders', () => {
    const vercel = detectHostingPlatform('https://myo-call-logs.vercel.app/outbound-dialer')
    expect(vercel).toMatchObject({ id: 'vercel', name: 'Vercel', aiBuilder: false })
    expect(detectHostingPlatform('https://site.netlify.app')).toMatchObject({ id: 'netlify' })
    expect(detectHostingPlatform('https://docs.pages.dev')).toMatchObject({ id: 'cloudflare_pages' })
    expect(detectHostingPlatform('https://user.github.io/project')).toMatchObject({
      id: 'github_pages',
    })
  })

  it('matches the apex host as well as subdomains', () => {
    expect(detectHostingPlatform('https://vercel.app')).toMatchObject({ id: 'vercel' })
    expect(detectHostingPlatform('https://a.b.c.vercel.app')).toMatchObject({ id: 'vercel' })
  })

  it('accepts URLs without a scheme', () => {
    expect(detectHostingPlatform('my-app.lovable.app')).toMatchObject({ id: 'lovable' })
  })

  it('returns null for custom domains and unusable input', () => {
    expect(detectHostingPlatform('https://app.acme.com')).toBeNull()
    expect(detectHostingPlatform('https://veritio.io')).toBeNull()
    expect(detectHostingPlatform('')).toBeNull()
    expect(detectHostingPlatform(null)).toBeNull()
    expect(detectHostingPlatform('not a url')).toBeNull()
  })

  it('does not match a host that merely contains a platform suffix', () => {
    expect(detectHostingPlatform('https://notvercel.app.example.com')).toBeNull()
    expect(detectHostingPlatform('https://myvercel.app')).toBeNull()
  })
})
