import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'
import { unwrapMotiaJavaScriptResponse } from './motia-javascript-response'

const originalFetch = globalThis.fetch
const originalBackendUrl = process.env.MOTIA_BACKEND_URL

describe('unwrapMotiaJavaScriptResponse', () => {
  it('unwraps JavaScript serialized as a JSON string by Motia', () => {
    expect(
      unwrapMotiaJavaScriptResponse(JSON.stringify('window.veritio = true;'), 'application/json')
    ).toBe('window.veritio = true;')
  })

  it('leaves an already-raw JavaScript response unchanged', () => {
    expect(
      unwrapMotiaJavaScriptResponse('window.veritio = true;', 'application/javascript')
    ).toBe('window.veritio = true;')
  })
})

describe('GET /api/snippet/[snippetFile]', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalBackendUrl === undefined) {
      delete process.env.MOTIA_BACKEND_URL
    } else {
      process.env.MOTIA_BACKEND_URL = originalBackendUrl
    }
  })

  it('returns executable JavaScript with the correct content type', async () => {
    process.env.MOTIA_BACKEND_URL = 'https://backend.example.com/'
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify('window.veritio = true;'),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ))
    globalThis.fetch = fetchMock as typeof fetch

    const response = await GET(
      new Request('https://veritio.io/api/snippet/example.js'),
      { params: Promise.resolve({ snippetFile: 'example.js' }) }
    )

    expect(fetchMock).toHaveBeenCalledWith(
      'https://backend.example.com/api/snippet/example.js',
      { cache: 'no-store' }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/javascript; charset=utf-8')
    expect(await response.text()).toBe('window.veritio = true;')
  })

  it('rejects invalid snippet filenames before contacting Motia', async () => {
    const fetchMock = vi.fn()
    globalThis.fetch = fetchMock as typeof fetch

    const response = await GET(
      new Request('https://veritio.io/api/snippet/bad.file.js'),
      { params: Promise.resolve({ snippetFile: 'bad.file.js' }) }
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(response.status).toBe(400)
    expect(response.headers.get('content-type')).toBe('application/javascript; charset=utf-8')
  })
})
