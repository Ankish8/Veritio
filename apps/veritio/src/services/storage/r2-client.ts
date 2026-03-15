/**
 * Cloudflare R2 Storage Client
 *
 * S3-compatible client for storing session recordings.
 * Features:
 * - Multipart uploads for large video files
 * - Signed URLs for playback
 * - GDPR-compliant deletion
 */

import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import type { Readable } from 'stream'

// ============================================================================
// Configuration
// ============================================================================

let r2Client: S3Client | null = null

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error(
      'R2 configuration missing. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME'
    )
  }

  return {
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    accessKeyId,
    secretAccessKey,
    bucketName,
  }
}

/**
 * Get or create the R2 client singleton
 */
export function getR2Client(): S3Client {
  if (!r2Client) {
    const config = getR2Config()

    r2Client = new S3Client({
      region: 'auto', // R2 uses 'auto' for region
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // R2 doesn't support checksum headers — they break presigned URLs
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }
  return r2Client
}

/**
 * Get the R2 bucket name from environment
 */
export function getR2Bucket(): string {
  return process.env.R2_BUCKET_NAME || 'veritio-recordings'
}

// ============================================================================
// Path Generation
// ============================================================================

/**
 * Generate a storage path for a recording
 * Format: {studyId}/recordings/{participantId}/{recordingId}/recording.webm
 */
export function generateRecordingPath(
  studyId: string,
  participantId: string,
  recordingId: string
): string {
  return `${studyId}/recordings/${participantId}/${recordingId}`
}

/**
 * Get the full object key for a recording file
 */
export function getRecordingKey(storagePath: string): string {
  return `${storagePath}/recording.webm`
}

// ============================================================================
// Multipart Upload Operations
// ============================================================================

export interface MultipartUploadConfig {
  storagePath: string
  contentType: string
  totalChunks: number
}

/**
 * Initialize a multipart upload for a recording
 * Returns the uploadId needed for subsequent chunk uploads
 */
export async function initiateMultipartUpload(
  config: MultipartUploadConfig
): Promise<string> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new CreateMultipartUploadCommand({
    Bucket: bucket,
    Key: getRecordingKey(config.storagePath),
    ContentType: config.contentType,
    // Cache for 1 year (immutable content)
    CacheControl: 'public, max-age=31536000, immutable',
  })

  const response = await client.send(command)

  if (!response.UploadId) {
    throw new Error('Failed to initiate multipart upload - no UploadId returned')
  }

  return response.UploadId
}

/**
 * Generate a presigned URL for uploading a chunk
 * The client will PUT the chunk data directly to this URL
 */
export async function getChunkUploadUrl(
  storagePath: string,
  uploadId: string,
  partNumber: number,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
    UploadId: uploadId,
    PartNumber: partNumber,
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

export interface CompletedPart {
  PartNumber: number
  ETag: string
}

/**
 * Complete a multipart upload after all chunks are uploaded
 */
export async function completeMultipartUpload(
  storagePath: string,
  uploadId: string,
  parts: CompletedPart[],
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  // Parts must be sorted by PartNumber
  const sortedParts = [...parts].sort((a, b) => a.PartNumber - b.PartNumber)

  const command = new CompleteMultipartUploadCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
    UploadId: uploadId,
    MultipartUpload: {
      Parts: sortedParts,
    },
  })

  try {
    await client.send(command)
  } catch (error: any) {
    // Enhanced error logging for R2 failures
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      attempts: error.$metadata?.attempts,
      storagePath,
      uploadId,
      partCount: sortedParts.length,
    }
    logger?.error('[R2] CompleteMultipartUpload failed', errorDetails)
    throw error
  }
}

/**
 * List parts that have been uploaded for a multipart upload.
 * Used by the cleanup cron to recover recordings where ETags weren't tracked in the DB.
 */
export async function listUploadedParts(
  storagePath: string,
  uploadId: string
): Promise<CompletedPart[]> {
  const client = getR2Client()
  const bucket = getR2Bucket()
  const parts: CompletedPart[] = []
  let partNumberMarker: string | undefined

  // Paginate through all parts (R2/S3 returns max 1000 per request)
  while (true) {
    const command = new ListPartsCommand({
      Bucket: bucket,
      Key: getRecordingKey(storagePath),
      UploadId: uploadId,
      ...(partNumberMarker ? { PartNumberMarker: partNumberMarker } : {}),
    })

    const response = await client.send(command)

    for (const part of response.Parts || []) {
      if (part.PartNumber && part.ETag) {
        parts.push({ PartNumber: part.PartNumber, ETag: part.ETag })
      }
    }

    if (!response.IsTruncated) break
    partNumberMarker = response.NextPartNumberMarker
  }

  return parts
}

/**
 * Abort a multipart upload (cleanup on failure or cancellation)
 */
export async function abortMultipartUpload(
  storagePath: string,
  uploadId: string
): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new AbortMultipartUploadCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
    UploadId: uploadId,
  })

  await client.send(command)
}

// ============================================================================
// Playback Operations
// ============================================================================

/**
 * Generate a presigned URL for video playback
 * Supports range requests for seeking
 */
export async function getPlaybackUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
  })

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds })
}

/**
 * Check if a recording exists and get its metadata
 */
export async function getRecordingMetadata(
  storagePath: string
): Promise<{ size: number; contentType: string } | null> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: getRecordingKey(storagePath),
    })

    const response = await client.send(command)

    return {
      size: response.ContentLength || 0,
      contentType: response.ContentType || 'video/webm',
    }
  } catch (error) {
    // Object doesn't exist
    if ((error as any)?.name === 'NotFound') {
      return null
    }
    throw error
  }
}

// ============================================================================
// Download/Upload Operations
// ============================================================================

/**
 * Download a recording to a local file path.
 */
export async function downloadRecordingToFile(
  storagePath: string,
  destinationPath: string
): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
  })

  const response = await client.send(command)

  if (!response.Body) {
    throw new Error('Recording download failed: empty body')
  }

  await pipeline(response.Body as Readable, createWriteStream(destinationPath))
}

/**
 * Upload a local recording file to R2 (replacing existing object).
 */
export async function uploadRecordingFromFile(
  storagePath: string,
  filePath: string,
  contentType: string = 'video/webm'
): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
    Body: createReadStream(filePath),
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  })

  await client.send(command)
}

// ============================================================================
// Deletion Operations (GDPR)
// ============================================================================

/**
 * Delete a recording permanently
 * Use for GDPR compliance / data deletion requests
 */
export async function deleteRecording(storagePath: string): Promise<void> {
  const client = getR2Client()
  const bucket = getR2Bucket()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: getRecordingKey(storagePath),
  })

  await client.send(command)
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if R2 is properly configured
 */
export function isR2Configured(): boolean {
  try {
    getR2Config()
    return true
  } catch {
    return false
  }
}

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
 * Format duration in milliseconds for display
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
