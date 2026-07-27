import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { strToU8, zipSync } from 'fflate'
import { Readable } from 'node:stream'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { getR2Bucket, getR2Client } from '../storage/r2-client'
import type { TranscriptSegment } from '../recording/recording-export-service'

type SupabaseClientType = SupabaseClient<Database>

export type TranscriptArchiveFormat = 'txt' | 'json'

export interface TranscriptZipOptions {
  formats: TranscriptArchiveFormat[]
  includeTimestamps: boolean
  includeSpeakers: boolean
  recordingIds?: string[]
}

interface RecordingForArchive {
  id: string
  participant_id: string
  created_at: string | null
  capture_mode: string | null
  duration_ms: number | null
}

interface TranscriptForArchive {
  id: string
  recording_id: string
  status: string
  full_text: string | null
  segments: TranscriptSegment[]
  language: string | null
  provider: string | null
  model: string | null
  confidence_avg: number | null
  word_count: number | null
  processing_time_ms: number | null
  error_message: string | null
  created_at: string | null
}

export interface TranscriptZipManifest {
  version: '1.0'
  generatedAt: string
  studyId: string
  formats: TranscriptArchiveFormat[]
  options: {
    includeTimestamps: boolean
    includeSpeakers: boolean
  }
  exported: Array<{
    recordingId: string
    participantId: string
    files: string[]
  }>
  skipped: Array<{
    recordingId: string
    reason: string
  }>
  failed: Array<{
    recordingId: string
    error: string
  }>
}

interface BuildTranscriptArchiveInput {
  studyId: string
  recordings: RecordingForArchive[]
  transcripts: TranscriptForArchive[]
  requestedRecordingIds?: string[]
  options: TranscriptZipOptions
  generatedAt?: string
}

export interface BuiltTranscriptArchive {
  bytes: Uint8Array
  manifest: TranscriptZipManifest
}

function formatTimestamp(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatTranscriptText(
  transcript: TranscriptForArchive,
  options: Pick<TranscriptZipOptions, 'includeTimestamps' | 'includeSpeakers'>,
): string {
  if (!transcript.segments.length) return transcript.full_text ?? ''
  return transcript.segments
    .map((segment) => {
      const timestamp = options.includeTimestamps ? `[${formatTimestamp(segment.start)}] ` : ''
      const speaker = options.includeSpeakers && segment.speaker ? `${segment.speaker}: ` : ''
      return `${timestamp}${speaker}${segment.text}`
    })
    .join('\n')
}

export function formatTranscriptJson(
  recording: RecordingForArchive,
  transcript: TranscriptForArchive,
  options: Pick<TranscriptZipOptions, 'includeTimestamps' | 'includeSpeakers'>,
  generatedAt: string,
): Record<string, unknown> {
  return {
    exportVersion: '1.0',
    exportedAt: generatedAt,
    recording: {
      id: recording.id,
      participantId: recording.participant_id,
      captureMode: recording.capture_mode,
      durationMs: recording.duration_ms,
      createdAt: recording.created_at,
    },
    transcript: {
      id: transcript.id,
      language: transcript.language,
      provider: transcript.provider,
      model: transcript.model,
      confidenceAvg: transcript.confidence_avg,
      wordCount: transcript.word_count,
      processingTimeMs: transcript.processing_time_ms,
      fullText: transcript.full_text,
      segments: transcript.segments.map((segment) => ({
        ...(options.includeTimestamps
          ? {
              startMs: segment.start,
              endMs: segment.end,
              startFormatted: formatTimestamp(segment.start),
              endFormatted: formatTimestamp(segment.end),
            }
          : {}),
        text: segment.text,
        ...(options.includeSpeakers ? { speaker: segment.speaker ?? null } : {}),
        confidence: segment.confidence ?? null,
      })),
    },
  }
}

export function buildTranscriptArchive({
  studyId,
  recordings,
  transcripts,
  requestedRecordingIds,
  options,
  generatedAt = new Date().toISOString(),
}: BuildTranscriptArchiveInput): BuiltTranscriptArchive {
  // The tuple form is stable across browser/Node realms where instanceof
  // checks on a bare Uint8Array can otherwise make fflate treat bytes as a folder.
  const files: Record<string, [Uint8Array, { level: 6 }]> = {}
  const addFile = (name: string, contents: Uint8Array) => {
    files[name] = [contents, { level: 6 }]
  }
  const transcriptByRecordingId = new Map(
    transcripts.map((transcript) => [transcript.recording_id, transcript]),
  )
  const recordingById = new Map(recordings.map((recording) => [recording.id, recording]))
  const manifest: TranscriptZipManifest = {
    version: '1.0',
    generatedAt,
    studyId,
    formats: options.formats,
    options: {
      includeTimestamps: options.includeTimestamps,
      includeSpeakers: options.includeSpeakers,
    },
    exported: [],
    skipped: [],
    failed: [],
  }

  if (requestedRecordingIds) {
    for (const requestedId of requestedRecordingIds) {
      if (!recordingById.has(requestedId)) {
        manifest.skipped.push({
          recordingId: requestedId,
          reason: 'Recording was not found in this study',
        })
      }
    }
  }

  for (const recording of recordings) {
    const transcript = transcriptByRecordingId.get(recording.id)
    if (!transcript) {
      manifest.skipped.push({
        recordingId: recording.id,
        reason: 'Transcript is missing',
      })
      continue
    }
    if (transcript.status === 'failed') {
      manifest.failed.push({
        recordingId: recording.id,
        error: transcript.error_message || 'Transcription failed',
      })
      continue
    }
    if (transcript.status !== 'completed') {
      manifest.skipped.push({
        recordingId: recording.id,
        reason: `Transcript is ${transcript.status}`,
      })
      continue
    }

    try {
      const baseName = `transcripts/recording-${recording.id}`
      const exportedFiles: string[] = []
      if (options.formats.includes('txt')) {
        const filename = `${baseName}.txt`
        addFile(filename, strToU8(formatTranscriptText(transcript, options)))
        exportedFiles.push(filename)
      }
      if (options.formats.includes('json')) {
        const filename = `${baseName}.json`
        addFile(
          filename,
          strToU8(
            JSON.stringify(
              formatTranscriptJson(recording, transcript, options, generatedAt),
              null,
              2,
            ),
          ),
        )
        exportedFiles.push(filename)
      }
      manifest.exported.push({
        recordingId: recording.id,
        participantId: recording.participant_id,
        files: exportedFiles,
      })
    } catch (error) {
      manifest.failed.push({
        recordingId: recording.id,
        error: error instanceof Error ? error.message : 'Failed to format transcript',
      })
    }
  }

  addFile('manifest.json', strToU8(JSON.stringify(manifest, null, 2)))
  return {
    bytes: zipSync(files),
    manifest,
  }
}

interface ExecuteTranscriptZipInput {
  jobId: string
  userId: string
  studyId: string
  options: TranscriptZipOptions
  onProgress?: (processed: number, total: number) => Promise<void>
}

export async function executeTranscriptZipExport(
  supabase: SupabaseClientType,
  { jobId, userId, studyId, options, onProgress }: ExecuteTranscriptZipInput,
): Promise<{
  resourceUrl: string
  storageKey: string
  processed: number
  total: number
  manifest: TranscriptZipManifest
}> {
  let recordingsQuery = supabase
    .from('recordings')
    .select('id, participant_id, created_at, capture_mode, duration_ms')
    .eq('study_id', studyId)
    .order('created_at', { ascending: true })

  if (options.recordingIds?.length) {
    recordingsQuery = recordingsQuery.in('id', options.recordingIds)
  }

  const { data: recordingRows, error: recordingsError } = await recordingsQuery
  if (recordingsError) {
    throw new Error(`Failed to fetch recordings: ${recordingsError.message}`)
  }

  const recordings = (recordingRows ?? []) as RecordingForArchive[]
  const recordingIds = recordings.map((recording) => recording.id)
  let transcripts: TranscriptForArchive[] = []
  if (recordingIds.length > 0) {
    const { data: transcriptRows, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('*')
      .in('recording_id', recordingIds)
    if (transcriptsError) {
      throw new Error(`Failed to fetch transcripts: ${transcriptsError.message}`)
    }
    transcripts = (transcriptRows ?? []).map((row) => ({
      ...(row as unknown as TranscriptForArchive),
      segments: Array.isArray((row as any).segments)
        ? ((row as any).segments as TranscriptSegment[])
        : [],
    }))
  }

  await onProgress?.(Math.floor(recordings.length * 0.5), recordings.length)
  const { bytes, manifest } = buildTranscriptArchive({
    studyId,
    recordings,
    transcripts,
    requestedRecordingIds: options.recordingIds,
    options,
  })
  await onProgress?.(recordings.length, recordings.length)

  const client = getR2Client()
  const bucket = getR2Bucket()
  const objectKey = `exports/${userId}/${studyId}/${Date.now()}-${jobId}-transcripts.zip`
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: Readable.from([bytes]),
      ContentLength: bytes.byteLength,
      ContentType: 'application/zip',
      ContentDisposition: `attachment; filename="transcripts-${studyId}.zip"`,
      CacheControl: 'private, max-age=3600',
    }),
  )

  const resourceUrl = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn: 24 * 60 * 60 },
  )

  return {
    resourceUrl,
    storageKey: objectKey,
    processed: recordings.length,
    total: recordings.length,
    manifest,
  }
}
