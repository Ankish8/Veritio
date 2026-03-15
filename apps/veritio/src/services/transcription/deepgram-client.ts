/**
 * Deepgram API client for audio transcription.
 *
 * Features:
 * - Pre-recorded audio transcription from URL
 * - Speaker diarization
 * - Word-level timestamps
 * - Confidence scores
 *
 * Docs: https://developers.deepgram.com/docs/pre-recorded-audio
 */

import { createClient, type PrerecordedSchema } from '@deepgram/sdk'

// Lazy initialization to avoid throwing at import time (breaks Motia compilation)
function getDeepgramApiKey(): string {
  const key = process.env.DEEPGRAM_API_KEY
  if (!key) {
    throw new Error('DEEPGRAM_API_KEY environment variable is required')
  }
  return key
}

export interface TranscriptSegment {
  /** Start time in milliseconds */
  start: number
  /** End time in milliseconds */
  end: number
  /** Transcript text for this segment */
  text: string
  /** Speaker label (e.g., "Speaker 0") if diarization enabled */
  speaker?: string
  /** Confidence score 0-1 */
  confidence?: number
}

export interface TranscriptionResult {
  /** Full transcript text */
  fullText: string
  /** Array of timestamped segments */
  segments: TranscriptSegment[]
  /** Detected language */
  language: string
  /** Average confidence score */
  confidenceAvg: number
  /** Total word count */
  wordCount: number
  /** Deepgram model used */
  model: string
}

/**
 * Transcribe audio from a URL using Deepgram.
 *
 * @param audioUrl - Public URL to the audio/video file (signed R2 URL)
 * @param options - Transcription options
 * @returns Transcription result with segments and metadata
 *
 * @example
 * ```ts
 * const result = await transcribeFromUrl('https://r2.example.com/recording.webm', {
 *   language: 'en',
 *   diarize: true,
 * })
 * console.log(result.fullText)
 * result.segments.forEach(seg => {
 *   console.log(`[${seg.start}ms] ${seg.speaker}: ${seg.text}`)
 * })
 * ```
 */
export async function transcribeFromUrl(
  audioUrl: string,
  options: {
    language?: string
    diarize?: boolean
    model?: 'nova-3' | 'nova-2' | 'nova' | 'enhanced' | 'base'
  } = {}
): Promise<TranscriptionResult> {
  const deepgram = createClient(getDeepgramApiKey())

  // Use Nova-3 with 'multi' language for code-switching support (Hindi-English, etc.)
  // See: https://developers.deepgram.com/docs/multilingual-code-switching
  const { language, diarize = true, model = 'nova-3' } = options

  // Configure transcription options
  // 'multi' enables code-switching between Hindi, English, Spanish, French, German, etc.
  // 'auto' (via detect_language) only detects ONE dominant language
  const effectiveLanguage = language || 'multi'
  const transcribeOptions: PrerecordedSchema = {
    model,
    language: effectiveLanguage,
    punctuate: true,
    diarize,
    utterances: true, // Get utterance-level segments
    smart_format: true,
  }

  // Transcribe from URL
  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
    transcribeOptions
  )

  if (error) {
    throw new Error(`Deepgram transcription failed: ${error.message}`)
  }

  if (!result || !result.results) {
    throw new Error('No transcription results returned')
  }

  const channel = result.results.channels?.[0]

  // Extract segments from utterances (speaker-aware segments)
  const utterances = result.results.utterances || []
  const segments: TranscriptSegment[] = utterances.map((utterance) => ({
    start: Math.round(utterance.start * 1000), // Convert to milliseconds
    end: Math.round(utterance.end * 1000),
    text: utterance.transcript,
    speaker: diarize ? `Speaker ${utterance.speaker}` : undefined,
    confidence: utterance.confidence,
  }))

  // Get full text from the primary channel
  const fullText = channel?.alternatives?.[0]?.transcript || ''

  // Calculate average confidence
  const confidences = segments.map(s => s.confidence || 0).filter(c => c > 0)
  const confidenceAvg = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0

  // Count words
  const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length

  return {
    fullText,
    segments,
    language: channel?.detected_language || language || 'auto',
    confidenceAvg,
    wordCount,
    model,
  }
}

/**
 * Get transcription cost estimate (for logging/analytics).
 * Deepgram charges per minute of audio.
 *
 * @param durationMs - Recording duration in milliseconds
 * @param model - Model used
 * @returns Estimated cost in USD
 */
export function estimateTranscriptionCost(
  durationMs: number,
  model: 'nova-3' | 'nova-2' | 'nova' | 'enhanced' | 'base' = 'nova-3'
): number {
  const durationMinutes = Math.ceil(durationMs / 60000)

  // Pricing as of 2025 (https://deepgram.com/pricing)
  const pricePerMinute: Record<string, number> = {
    'nova-3': 0.0043,
    'nova-2': 0.0043,
    'nova': 0.0043,
    'enhanced': 0.0145,
    'base': 0.0125,
  }

  return durationMinutes * (pricePerMinute[model] || 0.0043)
}
