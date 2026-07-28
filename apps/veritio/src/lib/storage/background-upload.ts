export const BACKGROUND_UPLOAD_MAX_BYTES = 5 * 1024 * 1024

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/webp': ['webp'],
}

export interface BackgroundUploadMetadata {
  filename: string
  contentType: string
  fileSize: number
}

export function validateBackgroundUploadMetadata(
  metadata: BackgroundUploadMetadata,
): string | null {
  if (
    !Number.isInteger(metadata.fileSize) ||
    metadata.fileSize <= 0 ||
    metadata.fileSize > BACKGROUND_UPLOAD_MAX_BYTES
  ) {
    return 'Background images must be 5 MB or smaller'
  }

  const extension = metadata.filename.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS[metadata.contentType]?.includes(extension || '')) {
    return 'Background images must be PNG, JPEG, or WebP with a matching file extension'
  }

  return null
}

export function isSafeStudyBackgroundPath(
  path: string,
  studyId: string,
): boolean {
  const escapedStudyId = studyId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `^${escapedStudyId}/backgrounds/[0-9a-f-]{36}\\.(?:png|jpe?g|webp)$`,
    'i',
  ).test(path)
}
