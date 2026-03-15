import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { config, handler } from '../prewarm-yjs-document.step'

const baseInput = {
  studyId: '11111111-1111-1111-1111-111111111111',
  studyType: 'survey' as const,
  projectId: '22222222-2222-2222-2222-222222222222',
  userId: 'test-user-id',
}

const createLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
})

const originalEnv = { ...process.env }

beforeEach(() => {
  process.env = { ...originalEnv }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('prewarm-yjs-document.step', () => {
  it('subscribes to study-created', () => {
    const topics = config.triggers.map((t: any) => t.topic).filter(Boolean)
    expect(topics).toContain('study-created')
  })

  it('calls /prewarm with correct docName and headers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    process.env.YJS_SERVER_INTERNAL_URL = 'http://yjs.internal'
    process.env.YJS_INTERNAL_API_KEY = 'secret-key'

    const logger = createLogger()
    await expect(handler(baseInput, { logger } as any)).resolves.toBeUndefined()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]

    expect(url).toBe('http://yjs.internal/prewarm')
    expect(options?.method).toBe('POST')

    const body = JSON.parse(options?.body as string)
    expect(body).toEqual({ docName: `study:${baseInput.studyId}` })

    const headers = options?.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
    expect(headers['x-internal-api-key']).toBe('secret-key')
  })

  it('handles network errors gracefully', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Network down'))
    vi.stubGlobal('fetch', fetchMock)

    process.env.YJS_SERVER_INTERNAL_URL = 'http://yjs.internal'

    const logger = createLogger()
    await expect(handler(baseInput, { logger } as any)).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
