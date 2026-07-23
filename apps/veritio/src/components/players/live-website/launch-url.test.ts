import { describe, expect, it } from 'vitest'
import { buildLiveWebsiteLaunchUrl } from './launch-url'

const baseInput = {
  targetUrl: 'https://example.com/pricing?plan=team',
  studyId: 'study-id',
  sessionId: 'session-id',
  proxyWorkerUrl: 'https://proxy.example.com',
  frontendOrigin: 'https://veritio.example.com',
  encodeOrigin: () => 'encoded-origin',
}

describe('buildLiveWebsiteLaunchUrl', () => {
  it('builds an instrumented proxy URL for Auto Mode', () => {
    const result = buildLiveWebsiteLaunchUrl({
      ...baseInput,
      mode: 'reverse_proxy',
      snippetId: 'snippet-id',
    })

    expect(result).toEqual({
      ok: true,
      url: 'https://proxy.example.com/p/study-id/snippet-id/encoded-origin/pricing?plan=team&__sess=session-id&__veritio_frontend=https%3A%2F%2Fveritio.example.com',
    })
  })

  it('never falls back to the direct website when Auto Mode lacks an ID', () => {
    expect(
      buildLiveWebsiteLaunchUrl({
        ...baseInput,
        mode: 'reverse_proxy',
        snippetId: null,
      })
    ).toEqual({ ok: false, reason: 'missing-snippet-id' })
  })

  it('rejects missing IDs in Snippet Mode', () => {
    expect(
      buildLiveWebsiteLaunchUrl({
        ...baseInput,
        mode: 'snippet',
        snippetId: null,
      })
    ).toEqual({ ok: false, reason: 'missing-snippet-id' })
  })

  it('keeps valid Snippet and Observer Mode launches on the target URL', () => {
    expect(
      buildLiveWebsiteLaunchUrl({
        ...baseInput,
        mode: 'snippet',
        snippetId: 'snippet-id',
      })
    ).toEqual({ ok: true, url: baseInput.targetUrl })

    expect(
      buildLiveWebsiteLaunchUrl({
        ...baseInput,
        mode: 'url_only',
        snippetId: null,
      })
    ).toEqual({ ok: true, url: baseInput.targetUrl })
  })
})
