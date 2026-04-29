import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLiveWebsiteProxyResponse } from '../proxy-service'

describe('createLiveWebsiteProxyResponse', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets no-store and proxy CSP headers on successful HTML responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html><head></head><body>ok</body></html>', {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })))

    const response = await createLiveWebsiteProxyResponse('http://93.184.216.34/')

    expect(response.status).toBe(200)
    expect(response.headers['Cache-Control']).toBe('no-store')
    expect(response.headers['Content-Security-Policy']).toContain('sandbox allow-scripts')
    expect(response.headers['Content-Security-Policy']).not.toContain('allow-same-origin')
  })

  it('blocks redirects to internal targets before fetching them', async () => {
    const fetchMock = vi.fn(async () => new Response('', {
      status: 302,
      headers: { location: 'http://127.0.0.1/admin' },
    }))
    vi.stubGlobal('fetch', fetchMock)

    const response = await createLiveWebsiteProxyResponse('http://93.184.216.34/')

    expect(response.status).toBe(400)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(response.body).toContain('Redirect target is not allowed')
  })
})
