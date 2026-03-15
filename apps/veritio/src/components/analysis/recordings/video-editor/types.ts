export type TranscriptStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'no_speech_detected' | 'retrying'

export interface TranscriptSegment {
  start: number
  end: number
  text: string
  speaker?: string
}

export interface TranscriptData {
  segments: TranscriptSegment[]
  status?: TranscriptStatus
  language?: string
  wordCount?: number
}

export interface Clip {
  id: string
  recording_id: string
  start_ms: number
  end_ms: number
  title: string
  description: string | null
  thumbnail_url: string | null
  created_by: string
  created_at: string
}

export interface Comment {
  id: string
  recording_id: string
  clip_id: string | null
  timestamp_ms: number | null
  content: string
  author_id: string
  author_name: string | null
  author_email: string | null
  author_image: string | null
  created_at: string
  updated_at: string
}
