'use client'

import { useState, useCallback, useRef } from 'react'
import { createAuthFetch } from '@veritio/auth/fetch'
import type { UploadOptions, UploadResult } from '../../components/builders/shared/types'

// ============================================================================
// Constants
// ============================================================================

export const STORAGE_BUCKETS = {
  studyAssets: 'study-assets',
} as const

export const MAX_FILE_SIZES = {
  logo: 5 * 1024 * 1024, // 5MB (for high-res logos up to 720x200px)
  socialImage: 10 * 1024 * 1024, // 10MB (for 1200x630px social thumbnails)
  attachment: 10 * 1024 * 1024, // 10MB
  cardImage: 2 * 1024 * 1024, // 2MB (for card sort image cards - smaller for performance)
  avatar: 5 * 1024 * 1024, // 5MB (for user profile avatars - allows high-res photos)
  firstClickImage: 5 * 1024 * 1024, // 5MB (for first-click test images)
  firstImpressionImage: 5 * 1024 * 1024, // 5MB (for first-impression test images)
} as const

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const

export const ALLOWED_ATTACHMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const

// ============================================================================
// API Types
// ============================================================================

type AssetType = 'logo' | 'social' | 'attachment' | 'card-image' | 'question-image' | 'first-click-image' | 'first-impression-image' | 'avatar'

interface CreateUploadUrlRequest {
  studyId?: string
  assetType: AssetType
  filename: string
  contentType: string
  entityId?: string
  userId?: string
}

interface CreateUploadUrlResponse {
  signedUrl: string
  path: string
  token: string
  expiresAt: string
}

// ============================================================================
// Server-Side Upload Functions
// ============================================================================

const authFetch = createAuthFetch()

/**
 * Get a signed upload URL from the server after ownership validation
 */
async function getSignedUploadUrl(request: CreateUploadUrlRequest): Promise<CreateUploadUrlResponse> {
  const response = await authFetch('/api/storage/upload-url', {
    method: 'POST',
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to get upload URL' }))
    throw new Error(error.error || 'Failed to get upload URL')
  }

  return response.json()
}

/**
 * Delete a file via the server (validates ownership)
 */
async function deleteFileViaServer(path: string): Promise<void> {
  const response = await authFetch('/api/storage/delete', {
    method: 'DELETE',
    body: JSON.stringify({ path }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to delete file' }))
    throw new Error(error.error || 'Failed to delete file')
  }
}

/**
 * Upload a file using a signed URL
 */
async function uploadWithSignedUrl(signedUrl: string, file: File): Promise<void> {
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })

  if (!response.ok) {
    let detail = ''
    try {
      const errorBody = await response.json()
      detail = errorBody.message || errorBody.error || JSON.stringify(errorBody)
    } catch {
      detail = response.statusText || `HTTP ${response.status}`
    }
    throw new Error(`Upload failed: ${detail}`)
  }
}

/**
 * Get public URL for a storage path
 */
function getPublicUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKETS.studyAssets}/${path}`
}

// ============================================================================
// Upload Functions
// ============================================================================

/**
 * Upload a file to Supabase Storage via server-validated signed URL
 */
export async function uploadFile(
  file: File,
  options: UploadOptions & {
    assetType: AssetType
    studyId?: string
    entityId?: string
    userId?: string
  }
): Promise<UploadResult> {
  // Validate file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = (options.maxSize / 1024 / 1024).toFixed(1)
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }

  // Validate file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`)
  }

  // Get signed upload URL from server (validates ownership)
  const { signedUrl, path } = await getSignedUploadUrl({
    studyId: options.studyId,
    assetType: options.assetType,
    filename: file.name,
    contentType: file.type,
    entityId: options.entityId,
    userId: options.userId,
  })

  // Upload directly to Supabase using signed URL
  await uploadWithSignedUrl(signedUrl, file)

  // Return result with public URL
  return {
    url: getPublicUrl(path),
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  }
}

/**
 * Delete a file from Supabase Storage by its storage path.
 */
export async function deleteFile(path: string): Promise<void> {
  await deleteFileViaServer(path)
}

/**
 * Extract the path from a Supabase Storage URL
 */
export function getPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`)
    return pathParts[1] || null
  } catch {
    return null
  }
}

/**
 * Delete a storage asset by its public URL.
 * Extracts the storage path and deletes via the server.
 */
export async function deleteAssetByUrl(url: string): Promise<void> {
  const path = getPathFromUrl(url, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(path)
  }
}

// ============================================================================
// Study-Specific Upload Functions
// ============================================================================

/**
 * Upload a study logo
 */
export async function uploadStudyLogo(
  studyId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '', // Path is generated server-side
    assetType: 'logo',
    studyId,
    maxSize: MAX_FILE_SIZES.logo,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Upload a social media image for a study
 */
export async function uploadStudySocialImage(
  studyId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'social',
    studyId,
    maxSize: MAX_FILE_SIZES.socialImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Upload a file attachment for a study
 */
export async function uploadStudyAttachment(
  studyId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'attachment',
    studyId,
    maxSize: MAX_FILE_SIZES.attachment,
    allowedTypes: [...ALLOWED_ATTACHMENT_TYPES],
  })
}

/**
 * Upload a first-click test image
 */
export async function uploadFirstClickImage(
  studyId: string,
  taskId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'first-click-image',
    studyId,
    entityId: taskId,
    maxSize: MAX_FILE_SIZES.firstClickImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Upload a first-impression test image
 */
export async function uploadFirstImpressionImage(
  studyId: string,
  designId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'first-impression-image',
    studyId,
    entityId: designId,
    maxSize: MAX_FILE_SIZES.firstImpressionImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Delete a study's logo
 */
export async function deleteStudyLogo(
  _studyId: string,
  logoUrl: string
): Promise<void> {
  await deleteAssetByUrl(logoUrl)
}

/**
 * Delete a study's social image
 */
export async function deleteStudySocialImage(
  _studyId: string,
  imageUrl: string
): Promise<void> {
  await deleteAssetByUrl(imageUrl)
}

/**
 * Delete a study attachment
 */
export async function deleteStudyAttachment(
  _studyId: string,
  attachmentUrl: string
): Promise<void> {
  await deleteAssetByUrl(attachmentUrl)
}

/**
 * Upload an image for a survey question
 * Images are stored at: {studyId}/question-images/{questionId}/{uuid}.{ext}
 */
export async function uploadQuestionImage(
  studyId: string,
  questionId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'question-image',
    studyId,
    entityId: questionId,
    maxSize: MAX_FILE_SIZES.logo, // 5MB - same as logos
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Delete a question image
 */
export async function deleteQuestionImage(imageUrl: string): Promise<void> {
  await deleteAssetByUrl(imageUrl)
}

/**
 * Upload an image for a card sort card
 * Images are stored at: {studyId}/card-images/{cardId}/{uuid}.{ext}
 */
export async function uploadCardImage(
  studyId: string,
  cardId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'card-image',
    studyId,
    entityId: cardId,
    maxSize: MAX_FILE_SIZES.cardImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Delete a card image
 */
export async function deleteCardImage(imageUrl: string): Promise<void> {
  await deleteAssetByUrl(imageUrl)
}

// ============================================================================
// User Avatar Upload Functions
// ============================================================================

/**
 * Upload a user avatar
 * Avatars are stored at: avatars/{userId}/{uuid}.{ext}
 */
export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: '',
    assetType: 'avatar',
    userId,
    maxSize: MAX_FILE_SIZES.avatar,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

/**
 * Delete a user's avatar
 */
export async function deleteUserAvatar(avatarUrl: string): Promise<void> {
  await deleteAssetByUrl(avatarUrl)
}

// ============================================================================
// React Hook for File Uploads
// ============================================================================

interface UseFileUploadOptions {
  onSuccess?: (result: UploadResult) => void
  onError?: (error: Error) => void
}

interface UseFileUploadReturn {
  upload: (
    file: File,
    options: UploadOptions & {
      assetType: AssetType
      studyId?: string
      entityId?: string
      userId?: string
    }
  ) => Promise<UploadResult | null>
  isUploading: boolean
  progress: number
  error: string | null
  reset: () => void
}

export function useFileUpload(
  hookOptions?: UseFileUploadOptions
): UseFileUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Stabilize callbacks with ref to avoid unnecessary re-renders
  const hookOptionsRef = useRef(hookOptions)
  hookOptionsRef.current = hookOptions

  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  const upload = useCallback(
    async (
      file: File,
      options: UploadOptions & {
        assetType: AssetType
        studyId?: string
        entityId?: string
        userId?: string
      }
    ): Promise<UploadResult | null> => {
      setIsUploading(true)
      setError(null)
      setProgress(0)

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90))
      }, 100)

      try {
        const result = await uploadFile(file, options)

        clearInterval(progressInterval)
        setProgress(100)
        setIsUploading(false)

        hookOptionsRef.current?.onSuccess?.(result)
        return result
      } catch (err) {
        clearInterval(progressInterval)
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed'
        setError(errorMessage)
        setIsUploading(false)
        setProgress(0)

        hookOptionsRef.current?.onError?.(
          err instanceof Error ? err : new Error(errorMessage)
        )
        return null
      }
    },
    []
  )

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Check if a file type is an image
 */
export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}
