import type { StepConfig } from 'motia'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { transcribeFromUrl, estimateTranscriptionCost } from '../../services/transcription/deepgram-client'
import { getPlaybackUrl } from '../../services/storage/r2-client'
import { scheduleEvent } from '../../services/scheduler-service'

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [30_000, 120_000, 300_000] // 30s, 2m, 5m (exponential backoff)

function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase()

  const nonRetryablePatterns = [
    'invalid audio format',
    'unsupported format',
    'no speech detected',
    'audio too short',
    'authentication failed',
    'invalid api key',
    'file not found',
    'access denied',
  ]

  if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
    return false
  }

  const retryablePatterns = [
    'timeout',
    'network',
    'rate limit',
    'too many requests',
    'server error',
    'service unavailable',
    'connection',
    'econnrefused',
    'enotfound',
  ]

  return retryablePatterns.some(pattern => message.includes(pattern))
}

interface RecordingFinalizedEvent {
  resourceType: 'recording'
  resourceId: string
  action: 'finalize'
  studyId: string
  participantId: string
  storagePath: string
}

export const config = {
  name: 'ProcessTranscription',
  description: 'Process transcription for finalized recordings using Deepgram',
  triggers: [{
    type: 'queue',
    topic: 'recording-finalized',
    infrastructure: {
      handler: { timeout: 300 },
      queue: { maxRetries: 4 },
    },
  }],
  enqueues: ['transcription-completed', 'transcription-failed'],
  virtualEnqueues: [{ topic: 'Deepgram API', label: 'transcribe audio' }],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (event: RecordingFinalizedEvent, { logger, enqueue }: EventHandlerContext) => {
  const { resourceId: recordingId, studyId, participantId } = event

  logger.info('Processing transcription', { recordingId, studyId, participantId })

  const supabase = getMotiaSupabaseClient()

  try {
    const { data: recording, error: recordingError } = await supabase
      .from('recordings')
      .select('id, capture_mode, duration_ms, storage_path, transcription_language, recording_type')
      .eq('id', recordingId)
      .single() as any

    if (recordingError || !recording) {
      throw new Error('Recording not found')
    }

    if (recording.recording_type === 'webcam') {
      logger.info('Skipping transcription for webcam-only recording (no audio)', { recordingId })
      await supabase
        .from('recordings')
        .update({ status: 'completed' })
        .eq('id', recordingId)
      return
    }

    const languageCode = recording.transcription_language || 'auto'
    const useAutoDetect = languageCode === 'auto'

    const estimatedCost = estimateTranscriptionCost(recording.duration_ms || 0, 'nova-3')
    logger.info('Transcription cost estimate', {
      recordingId,
      durationMs: recording.duration_ms,
      estimatedCostUsd: estimatedCost.toFixed(4),
    })

    if (recording.capture_mode === 'audio' ||
        recording.capture_mode === 'screen_audio' ||
        recording.capture_mode === 'screen_audio_webcam') {

      // Live transcripts are saved during recording via /api/recordings/save-live-transcript
      const { data: existingLiveTranscript } = await supabase
        .from('transcripts')
        .select('id, status, word_count, provider')
        .eq('recording_id', recordingId)
        .single() as any

      // If live transcript completed with actual words, skip batch transcription
      if (existingLiveTranscript &&
          existingLiveTranscript.provider === 'deepgram-live' &&
          existingLiveTranscript.status === 'completed' &&
          existingLiveTranscript.word_count > 0) {
        logger.info('Live transcript already exists with speech, skipping post-recording transcription', {
          recordingId,
          transcriptId: existingLiveTranscript.id,
          wordCount: existingLiveTranscript.word_count,
        })

        await supabase
          .from('recordings')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', recordingId)

        enqueue({
          topic: 'transcription-completed',
          data: {
            resourceType: 'transcript',
            resourceId: existingLiveTranscript.id,
            action: 'complete',
            recordingId,
            studyId,
            participantId,
            wordCount: existingLiveTranscript.word_count || 0,
            source: 'live',
          },
        }).catch(() => {})

        return
      }

      // If live transcript had no_speech_detected, fall through to batch transcription
      // The batch API with the full audio file often detects speech that the streaming API missed
      if (existingLiveTranscript && existingLiveTranscript.status === 'no_speech_detected') {
        logger.info('Live transcript had no speech detected, attempting batch transcription as fallback', {
          recordingId,
          transcriptId: existingLiveTranscript.id,
          provider: existingLiveTranscript.provider,
        })
      }

      logger.info('No live transcript found, processing post-recording transcription', { recordingId })

      await supabase
        .from('recordings')
        .update({
          status: 'transcribing',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', recordingId)

      // getPlaybackUrl internally calls getRecordingKey() which adds /recording.webm
      // Extended from 1h to 2h to prevent expiry before Deepgram can fetch (fixes REMOTE_CONTENT_ERROR)
      const playbackUrl = await getPlaybackUrl(recording.storage_path, 7200)

      let transcript: any
      const { data: existingTranscript } = await supabase
        .from('transcripts')
        .select('*')
        .eq('recording_id', recordingId)
        .single() as any

      if (existingTranscript) {
        transcript = existingTranscript
        const currentRetryCount = transcript.retry_count || 0

        logger.info('Retrying transcription', {
          recordingId,
          transcriptId: transcript.id,
          retryAttempt: currentRetryCount + 1,
        })

        await supabase
          .from('transcripts')
          .update({
            status: 'processing',
            retry_count: currentRetryCount + 1,
            last_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', transcript.id)
      } else {
        const { data: newTranscript, error: transcriptError } = await supabase
          .from('transcripts')
          .insert({
            recording_id: recordingId,
            status: 'processing',
            estimated_cost_usd: estimatedCost,
            retry_count: 0,
          } as any)
          .select()
          .single() as any

        if (transcriptError || !newTranscript) {
          throw new Error('Failed to create transcript record')
        }

        transcript = newTranscript
      }

      const startTime = Date.now()
      logger.info('Starting transcription', {
        recordingId,
        language: useAutoDetect ? 'auto-detect' : languageCode,
        model: 'nova-3',
      })

      const transcriptionResult = await transcribeFromUrl(playbackUrl, {
        // Don't pass language param if auto-detect (Deepgram auto-detects)
        language: useAutoDetect ? undefined : languageCode,
        diarize: true,
        model: 'nova-3',
      })
      const processingTime = Date.now() - startTime

      const actualDurationMs = transcriptionResult.segments.length > 0
        ? transcriptionResult.segments[transcriptionResult.segments.length - 1].end
        : recording.duration_ms

      logger.info('Transcription completed', {
        recordingId,
        detectedLanguage: transcriptionResult.language,
        requestedLanguage: languageCode,
        wordCount: transcriptionResult.wordCount,
        actualDurationMs,
        storedDurationMs: recording.duration_ms,
      })

      const noSpeechDetected = transcriptionResult.wordCount === 0
      const finalStatus = noSpeechDetected ? 'no_speech_detected' : 'completed'

      if (noSpeechDetected) {
        logger.warn('No speech detected in recording', {
          recordingId,
          transcriptId: transcript.id,
          durationMs: recording.duration_ms,
          captureMode: recording.capture_mode,
        })
      }

      await supabase
        .from('transcripts')
        .update({
          full_text: transcriptionResult.fullText,
          segments: transcriptionResult.segments as any,
          language: transcriptionResult.language,
          model: transcriptionResult.model,
          confidence_avg: transcriptionResult.confidenceAvg,
          word_count: transcriptionResult.wordCount,
          status: finalStatus,
          processing_time_ms: processingTime,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', transcript.id)

      await supabase
        .from('recordings')
        .update({
          status: 'completed',
          duration_ms: actualDurationMs,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', recordingId)

      logger.info('Transcription completed successfully', {
        recordingId,
        transcriptId: transcript.id,
        wordCount: transcriptionResult.wordCount,
        processingTimeMs: processingTime,
      })

      enqueue({
        topic: 'transcription-completed',
        data: {
          resourceType: 'transcript',
          resourceId: transcript.id,
          action: 'complete',
          recordingId,
          studyId,
          participantId,
          wordCount: transcriptionResult.wordCount,
        },
      }).catch(() => {})
    } else {
      await supabase
        .from('recordings')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', recordingId)

      logger.info('Recording completed without transcription (no audio)', { recordingId })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    logger.error('Transcription failed', {
      error: errorMessage,
      recordingId,
    })

    const { data: currentTranscript } = await supabase
      .from('transcripts')
      .select('id, retry_count')
      .eq('recording_id', recordingId)
      .single() as any

    const retryCount = currentTranscript?.retry_count || 0
    const canRetry = error instanceof Error &&
                     isRetryableError(error) &&
                     retryCount < MAX_RETRIES

    if (canRetry) {
      const delayMs = RETRY_DELAYS_MS[retryCount] || RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
      const nextRetryAt = new Date(Date.now() + delayMs)

      logger.warn('Transcription failed with retryable error, scheduling retry', {
        recordingId,
        retryAttempt: retryCount + 1,
        maxRetries: MAX_RETRIES,
        nextRetryAt: nextRetryAt.toISOString(),
        delayMs,
        error: errorMessage,
      })

      await supabase
        .from('transcripts')
        .update({
          status: 'retrying',
          error_message: errorMessage,
          next_retry_at: nextRetryAt.toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
        .eq('recording_id', recordingId)

      await supabase
        .from('recordings')
        .update({
          status: 'transcribing',
          status_message: `Retrying transcription (attempt ${retryCount + 1}/${MAX_RETRIES})`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', recordingId)

      // Schedule retry using BullMQ scheduler (persisted in Redis, survives restarts)
      // This replaces setTimeout which was causing memory leaks from orphaned callbacks
      try {
        await scheduleEvent({
          topic: 'recording-finalized',
          data: event as unknown as Record<string, unknown>,
          scheduledFor: new Date(Date.now() + delayMs),
          jobId: `transcription-retry-${recordingId}-attempt-${retryCount + 1}`,
        })
        logger.info('Scheduled transcription retry', {
          recordingId,
          delayMs,
          retryAttempt: retryCount + 1,
          scheduledFor: nextRetryAt.toISOString(),
        })
      } catch (scheduleError) {
        logger.error('Failed to schedule retry event', {
          recordingId,
          error: scheduleError instanceof Error ? scheduleError.message : 'Unknown error',
        })
      }
    } else {
      const failureReason = !isRetryableError(error instanceof Error ? error : new Error(errorMessage))
        ? 'Non-retryable error'
        : `Max retries exceeded (${MAX_RETRIES})`

      logger.error('Transcription permanently failed', {
        recordingId,
        reason: failureReason,
        retryCount,
        error: errorMessage,
      })

      await supabase
        .from('recordings')
        .update({
          status: 'failed',
          status_message: `${failureReason}: ${errorMessage}`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', recordingId)

      await supabase
        .from('transcripts')
        .update({
          status: 'failed',
          error_message: `${failureReason}: ${errorMessage}`,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('recording_id', recordingId)

      enqueue({
        topic: 'transcription-failed',
        data: {
          resourceType: 'transcript',
          action: 'fail',
          recordingId,
          studyId,
          participantId,
          error: errorMessage,
          failureReason,
          retryCount,
        },
      }).catch(() => {})
    }
  }
}
