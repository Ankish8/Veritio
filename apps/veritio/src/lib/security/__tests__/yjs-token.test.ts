// @vitest-environment node

import { afterEach, describe, expect, it } from 'vitest'
import { signYjsToken, verifyYjsToken } from '../yjs-token'

describe('Yjs scoped tokens', () => {
  afterEach(() => {
    delete process.env.YJS_JWT_SECRET
  })

  it('signs study, document, role, and write claims', async () => {
    process.env.YJS_JWT_SECRET = 'unit-test-secret'

    const token = await signYjsToken({
      userId: 'user-1',
      email: 'viewer@example.com',
      name: 'Viewer',
      studyId: 'study-1',
      docName: 'study:study-1',
      role: 'viewer',
      canWrite: false,
    })

    expect(token).toBeTruthy()
    await expect(verifyYjsToken(token!)).resolves.toMatchObject({
      userId: 'user-1',
      email: 'viewer@example.com',
      studyId: 'study-1',
      docName: 'study:study-1',
      role: 'viewer',
      canWrite: false,
    })
  })

  it('preserves editor write capability', async () => {
    process.env.YJS_JWT_SECRET = 'unit-test-secret'

    const token = await signYjsToken({
      userId: 'user-2',
      studyId: 'study-2',
      docName: 'study:study-2',
      role: 'editor',
      canWrite: true,
    })

    await expect(verifyYjsToken(token!)).resolves.toMatchObject({
      role: 'editor',
      canWrite: true,
    })
  })

  it('fails closed when no token secret is configured', async () => {
    await expect(signYjsToken({
      userId: 'user-1',
      studyId: 'study-1',
      docName: 'study:study-1',
      role: 'viewer',
      canWrite: false,
    })).resolves.toBeNull()

    await expect(verifyYjsToken('not-a-token')).resolves.toBeNull()
  })
})
