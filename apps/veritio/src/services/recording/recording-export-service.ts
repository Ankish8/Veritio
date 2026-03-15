import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

export interface TranscriptSegment {
  start: number  // milliseconds
  end: number    // milliseconds
  text: string
  speaker?: string
  confidence?: number
}

export interface Transcript {
  id: string
  recording_id: string
  full_text: string | null
  segments: TranscriptSegment[]
  language: string
  provider: string
  model: string | null
  confidence_avg: number | null
  word_count: number | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  processing_time_ms: number | null
  created_at: string
  updated_at: string
}

export interface RecordingWithTranscript {
  id: string
  study_id: string
  participant_id: string
  capture_mode: string
  duration_ms: number | null
  status: string
  transcript: Transcript | null
}

export async function exportTranscriptAsText(
  supabase: SupabaseClientType,
  recordingId: string,
  options: {
    includeTimestamps?: boolean
    includeSpeakers?: boolean
  } = {}
): Promise<{ data: string | null; error: Error | null }> {
  const { data: transcript, error } = await supabase
    .from('transcripts')
    .select('*')
    .eq('recording_id', recordingId)
    .single()

  if (error) {
    return { data: null, error: new Error('Transcript not found') }
  }

  const transcriptData = transcript as any

  if (transcriptData.status !== 'completed') {
    return { data: null, error: new Error('Transcript is not ready') }
  }

  const segments = (transcriptData.segments || []) as TranscriptSegment[]
  const { includeTimestamps = true, includeSpeakers = true } = options

  const lines: string[] = []

  for (const segment of segments) {
    let line = ''

    if (includeTimestamps) {
      const timestamp = formatTimestamp(segment.start)
      line += `[${timestamp}] `
    }

    if (includeSpeakers && segment.speaker) {
      line += `${segment.speaker}: `
    }

    line += segment.text

    lines.push(line)
  }

  return { data: lines.join('\n'), error: null }
}

export async function exportTranscriptAsJson(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: object | null; error: Error | null }> {
  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, study_id, participant_id, capture_mode, duration_ms, status, created_at')
    .eq('id', recordingId)
    .single()

  if (recordingError) {
    return { data: null, error: new Error('Recording not found') }
  }

  const { data: transcript, error: transcriptError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('recording_id', recordingId)
    .single()

  if (transcriptError) {
    return { data: null, error: new Error('Transcript not found') }
  }

  const transcriptData = transcript as any

  if (transcriptData.status !== 'completed') {
    return { data: null, error: new Error('Transcript is not ready') }
  }

  const segments = (transcriptData.segments || []) as TranscriptSegment[]
  const recordingData = recording as any

  const exportData = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    recording: {
      id: recordingData.id,
      studyId: recordingData.study_id,
      participantId: recordingData.participant_id,
      captureMode: recordingData.capture_mode,
      durationMs: recordingData.duration_ms,
      createdAt: recordingData.created_at,
    },
    transcript: {
      id: transcriptData.id,
      language: transcriptData.language,
      provider: transcriptData.provider,
      model: transcriptData.model,
      confidenceAvg: transcriptData.confidence_avg,
      wordCount: transcriptData.word_count,
      processingTimeMs: transcriptData.processing_time_ms,
      fullText: transcriptData.full_text,
      segments: segments.map(seg => ({
        startMs: seg.start,
        endMs: seg.end,
        startFormatted: formatTimestamp(seg.start),
        endFormatted: formatTimestamp(seg.end),
        text: seg.text,
        speaker: seg.speaker || null,
        confidence: seg.confidence || null,
      })),
    },
  }

  return { data: exportData, error: null }
}

export async function exportClipsAsJson(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: object | null; error: Error | null }> {
  const { data: clips, error: clipsError } = await supabase
    .from('recording_clips')
    .select('*')
    .eq('recording_id', recordingId)
    .order('start_ms', { ascending: true })

  if (clipsError) {
    return { data: null, error: new Error('Failed to fetch clips') }
  }

  const { data: transcript, error: transcriptError } = await supabase
    .from('transcripts')
    .select('segments')
    .eq('recording_id', recordingId)
    .single()

  const segments = transcriptError ? [] : ((transcript as any).segments || []) as TranscriptSegment[]

  const clipsData = clips as any[]
  const exportData = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    recordingId,
    clips: clipsData.map(clip => {
      const clipSegments = segments.filter(seg =>
        seg.end > clip.start_ms && seg.start < clip.end_ms
      )

      return {
        id: clip.id,
        title: clip.title,
        description: clip.description,
        startMs: clip.start_ms,
        endMs: clip.end_ms,
        startFormatted: formatTimestamp(clip.start_ms),
        endFormatted: formatTimestamp(clip.end_ms),
        durationMs: clip.end_ms - clip.start_ms,
        createdBy: clip.created_by,
        createdAt: clip.created_at,
        segments: clipSegments.map(seg => ({
          startMs: seg.start,
          endMs: seg.end,
          text: seg.text,
          speaker: seg.speaker || null,
        })),
        transcriptText: clipSegments.map(seg => seg.text).join(' '),
      }
    }),
  }

  return { data: exportData, error: null }
}

export async function exportCommentsAsJson(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: object | null; error: Error | null }> {
  const { data: comments, error } = await supabase
    .from('recording_comments')
    .select('*')
    .eq('recording_id', recordingId)
    .is('deleted_at', null)
    .order('timestamp_ms', { ascending: true, nullsFirst: false })

  if (error) {
    return { data: null, error: new Error('Failed to fetch comments') }
  }

  const commentsData = comments as any[]

  const exportData = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    recordingId,
    comments: {
      timestamped: commentsData
        .filter(c => c.timestamp_ms !== null)
        .map(c => ({
          id: c.id,
          timestampMs: c.timestamp_ms,
          timestampFormatted: formatTimestamp(c.timestamp_ms),
          content: c.content,
          createdBy: c.created_by,
          createdAt: c.created_at,
        })),
      general: commentsData
        .filter(c => c.timestamp_ms === null)
        .map(c => ({
          id: c.id,
          content: c.content,
          createdBy: c.created_by,
          createdAt: c.created_at,
        })),
    },
  }

  return { data: exportData, error: null }
}

export async function exportFullBundle(
  supabase: SupabaseClientType,
  recordingId: string
): Promise<{ data: object | null; error: Error | null }> {
  const [transcriptResult, clipsResult, commentsResult] = await Promise.all([
    exportTranscriptAsJson(supabase, recordingId),
    exportClipsAsJson(supabase, recordingId),
    exportCommentsAsJson(supabase, recordingId),
  ])

  if (transcriptResult.error) {
    return { data: null, error: transcriptResult.error }
  }

  const bundle = {
    exportVersion: '1.0',
    exportedAt: new Date().toISOString(),
    recordingId,
    transcript: transcriptResult.data,
    clips: clipsResult.data ? (clipsResult.data as any).clips : [],
    comments: commentsResult.data ? (commentsResult.data as any).comments : { timestamped: [], general: [] },
  }

  return { data: bundle, error: null }
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
