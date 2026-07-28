import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_UPLOAD_MAX_BYTES,
  isSafeStudyBackgroundPath,
  validateBackgroundUploadMetadata,
} from './background-upload'

describe('background upload validation', () => {
  it.each([
    ['photo.png', 'image/png'],
    ['photo.jpg', 'image/jpeg'],
    ['photo.jpeg', 'image/jpeg'],
    ['photo.webp', 'image/webp'],
  ])('accepts %s with matching %s metadata', (filename, contentType) => {
    expect(validateBackgroundUploadMetadata({
      filename,
      contentType,
      fileSize: BACKGROUND_UPLOAD_MAX_BYTES,
    })).toBeNull()
  })

  it('rejects oversized, unsupported, and mismatched declarations', () => {
    expect(validateBackgroundUploadMetadata({
      filename: 'photo.png',
      contentType: 'image/png',
      fileSize: BACKGROUND_UPLOAD_MAX_BYTES + 1,
    })).toContain('5 MB')
    expect(validateBackgroundUploadMetadata({
      filename: 'photo.gif',
      contentType: 'image/gif',
      fileSize: 100,
    })).toContain('PNG, JPEG, or WebP')
    expect(validateBackgroundUploadMetadata({
      filename: 'photo.svg',
      contentType: 'image/png',
      fileSize: 100,
    })).toContain('matching file extension')
  })

  it('only accepts generated paths inside the target study backgrounds folder', () => {
    const studyId = '11111111-1111-4111-8111-111111111111'
    expect(isSafeStudyBackgroundPath(
      `${studyId}/backgrounds/22222222-2222-4222-8222-222222222222.webp`,
      studyId,
    )).toBe(true)
    expect(isSafeStudyBackgroundPath(
      `${studyId}/../other/file.webp`,
      studyId,
    )).toBe(false)
    expect(isSafeStudyBackgroundPath(
      `33333333-3333-4333-8333-333333333333/backgrounds/22222222-2222-4222-8222-222222222222.webp`,
      studyId,
    )).toBe(false)
  })
})
