'use client'

import { createClient } from './client'
import type { UploadOptions, UploadResult } from '../../builder/shared/types'

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
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  const supabase = createClient()

  // Validate file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = (options.maxSize / 1024 / 1024).toFixed(1)
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }

  // Validate file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`)
  }

  // Generate unique filename to prevent collisions
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  const uniqueName = `${crypto.randomUUID()}.${extension}`
  const fullPath = `${options.path}/${uniqueName}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from(options.bucket)
    .upload(fullPath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(error.message || 'Failed to upload file')
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(options.bucket).getPublicUrl(data.path)

  return {
    url: publicUrl,
    filename: file.name,
    size: file.size,
    mimeType: file.type,
  }
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(error.message || 'Failed to delete file')
  }
}
export function getPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`)
    return pathParts[1] || null
  } catch {
    return null
  }
}
export async function uploadStudyLogo(
  studyId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `${studyId}/logo`,
    maxSize: MAX_FILE_SIZES.logo,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}
export async function uploadStudySocialImage(
  studyId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `${studyId}/social`,
    maxSize: MAX_FILE_SIZES.socialImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}
export async function uploadStudyAttachment(
  studyId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `${studyId}/attachments`,
    maxSize: MAX_FILE_SIZES.attachment,
    allowedTypes: [...ALLOWED_ATTACHMENT_TYPES],
  })
}
export async function uploadFirstClickImage(
  studyId: string,
  taskId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `${studyId}/first-click-images/${taskId}`,
    maxSize: MAX_FILE_SIZES.firstClickImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

export async function deleteStudyLogo(
  studyId: string,
  logoUrl: string
): Promise<void> {
  const path = getPathFromUrl(logoUrl, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(STORAGE_BUCKETS.studyAssets, path)
  }
}

export async function deleteStudySocialImage(
  studyId: string,
  imageUrl: string
): Promise<void> {
  const path = getPathFromUrl(imageUrl, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(STORAGE_BUCKETS.studyAssets, path)
  }
}

export async function deleteStudyAttachment(
  studyId: string,
  attachmentUrl: string
): Promise<void> {
  const path = getPathFromUrl(attachmentUrl, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(STORAGE_BUCKETS.studyAssets, path)
  }
}
export async function uploadQuestionImage(
  studyId: string,
  questionId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `${studyId}/question-images/${questionId}`,
    maxSize: MAX_FILE_SIZES.logo, // 5MB - same as logos
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

export async function deleteQuestionImage(imageUrl: string): Promise<void> {
  const path = getPathFromUrl(imageUrl, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(STORAGE_BUCKETS.studyAssets, path)
  }
}
export async function uploadCardImage(
  studyId: string,
  cardId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `${studyId}/card-images/${cardId}`,
    maxSize: MAX_FILE_SIZES.cardImage,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

export async function deleteCardImage(imageUrl: string): Promise<void> {
  const path = getPathFromUrl(imageUrl, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(STORAGE_BUCKETS.studyAssets, path)
  }
}
export async function uploadUserAvatar(
  userId: string,
  file: File
): Promise<UploadResult> {
  return uploadFile(file, {
    bucket: STORAGE_BUCKETS.studyAssets,
    path: `avatars/${userId}`,
    maxSize: MAX_FILE_SIZES.avatar,
    allowedTypes: [...ALLOWED_IMAGE_TYPES],
  })
}

export async function deleteUserAvatar(avatarUrl: string): Promise<void> {
  const path = getPathFromUrl(avatarUrl, STORAGE_BUCKETS.studyAssets)
  if (path) {
    await deleteFile(STORAGE_BUCKETS.studyAssets, path)
  }
}

import { useState, useCallback } from 'react'

interface UseFileUploadOptions {
  onSuccess?: (result: UploadResult) => void
  onError?: (error: Error) => void
}

interface UseFileUploadReturn {
  upload: (file: File, options: UploadOptions) => Promise<UploadResult | null>
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

  const reset = useCallback(() => {
    setIsUploading(false)
    setProgress(0)
    setError(null)
  }, [])

  const upload = useCallback(
    async (file: File, options: UploadOptions): Promise<UploadResult | null> => {
      setIsUploading(true)
      setError(null)
      setProgress(0)

      try {
        // Simulate progress (Supabase doesn't provide upload progress)
        const progressInterval = setInterval(() => {
          setProgress((prev) => Math.min(prev + 10, 90))
        }, 100)

        const result = await uploadFile(file, options)

        clearInterval(progressInterval)
        setProgress(100)
        setIsUploading(false)

        hookOptions?.onSuccess?.(result)
        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Upload failed'
        setError(errorMessage)
        setIsUploading(false)
        setProgress(0)

        hookOptions?.onError?.(
          err instanceof Error ? err : new Error(errorMessage)
        )
        return null
      }
    },
    [hookOptions]
  )

  return {
    upload,
    isUploading,
    progress,
    error,
    reset,
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}
