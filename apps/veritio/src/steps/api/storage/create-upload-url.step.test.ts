import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = {
  checkStudyPermission: vi.fn(),
  createSignedUploadUrl: vi.fn(),
}

vi.mock('../../../services/permission-service', () => ({
  checkStudyPermission: mocks.checkStudyPermission,
}))

vi.mock('../../../lib/supabase/motia-client', () => ({
  getMotiaSupabaseClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: mocks.createSignedUploadUrl,
      }),
    },
  }),
}))

const studyId = '11111111-1111-4111-8111-111111111111'
const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function request(overrides: Record<string, unknown> = {}) {
  return {
    headers: { 'x-user-id': 'user-1' },
    body: {
      studyId,
      assetType: 'background',
      filename: 'background.webp',
      contentType: 'image/webp',
      fileSize: 1024,
      ...overrides,
    },
  }
}

describe('background signed upload endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkStudyPermission.mockResolvedValue({ allowed: true, error: null })
    mocks.createSignedUploadUrl.mockImplementation(async (path: string) => ({
      data: {
        signedUrl: 'https://project.supabase.co/signed-upload',
        path,
        token: 'token',
      },
      error: null,
    }))
  })

  it('requires editor permission before issuing a URL', async () => {
    const { handler } = await import('./create-upload-url.step')
    mocks.checkStudyPermission.mockResolvedValue({ allowed: false, error: null })

    const result = await handler(request() as never, { logger } as never)

    expect(result.status).toBe(403)
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled()
    expect(mocks.checkStudyPermission).toHaveBeenCalledWith(
      expect.anything(),
      studyId,
      'user-1',
      'editor',
    )
  })

  it('generates a safe study-owned backgrounds path for valid files', async () => {
    const { handler } = await import('./create-upload-url.step')
    const result = await handler(request() as never, { logger } as never)

    expect(result.status).toBe(200)
    if (!('path' in result.body) || !result.body.path) {
      throw new Error('Expected a signed upload response')
    }
    const path = result.body.path
    expect(path).toMatch(
      new RegExp(`^${studyId}/backgrounds/[0-9a-f-]{36}\\.webp$`),
    )
    expect(mocks.createSignedUploadUrl).toHaveBeenCalledWith(
      path,
      { upsert: false },
    )
  })

  it('rejects oversized and mismatched background declarations', async () => {
    const { handler } = await import('./create-upload-url.step')
    const oversized = await handler(
      request({ fileSize: 5 * 1024 * 1024 + 1 }) as never,
      { logger } as never,
    )
    const mismatched = await handler(
      request({ filename: 'background.svg', contentType: 'image/png' }) as never,
      { logger } as never,
    )

    expect(oversized.status).toBe(400)
    expect(oversized.body.error).toContain('5 MB')
    expect(mismatched.status).toBe(400)
    expect(mismatched.body.error).toContain('matching file extension')
    expect(mocks.createSignedUploadUrl).not.toHaveBeenCalled()
  })
})
