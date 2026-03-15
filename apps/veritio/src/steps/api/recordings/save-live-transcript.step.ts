import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const segmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  speaker: z.string().optional(),
  confidence: z.number().optional(),
})

const bodySchema = z.object({
  recording_id: z.string().uuid(),
  participant_id: z.string().uuid(),
  segments: z.array(segmentSchema),
  language: z.string().optional(),
  word_count: z.number().optional(),
})

const responseSchema = z.object({
  transcript_id: z.string().uuid(),
  status: z.string(),
})

export const config = {
  name: 'SaveLiveTranscript',
  description: 'Save live transcript segments when recording stops',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/save-live-transcript',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['live-transcript-saved'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string
  const body = bodySchema.parse(req.body)

  logger.info('Saving live transcript', {
    recordingId: body.recording_id,
    participantId: body.participant_id,
    segmentCount: body.segments.length,
    wordCount: body.word_count,
  })

  const supabase = getMotiaSupabaseClient()

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, session_token, study_id')
    .eq('id', body.participant_id)
    .single()

  if (participantError || !participant) {
    logger.warn('Participant not found', { participantId: body.participant_id })
    return {
      status: 404,
      body: { error: 'Participant not found' },
    }
  }

  if (participant.session_token !== sessionToken) {
    logger.warn('Invalid session token for saving transcript', { participantId: body.participant_id })
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, participant_id, study_id')
    .eq('id', body.recording_id)
    .eq('participant_id', body.participant_id)
    .single()

  if (recordingError || !recording) {
    logger.warn('Recording not found', { recordingId: body.recording_id })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  const fullText = body.segments.map(s => s.text).join(' ').trim()

  const confidences = body.segments
    .map(s => s.confidence)
    .filter((c): c is number => c !== undefined && c > 0)
  const confidenceAvg = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : null

  const wordCount = body.word_count ?? fullText.split(/\s+/).filter(w => w.length > 0).length

  const { data: existingTranscript } = await supabase
    .from('transcripts')
    .select('id')
    .eq('recording_id', body.recording_id)
    .single() as any

  let transcriptId: string

  if (existingTranscript) {
    const { error: updateError } = await supabase
      .from('transcripts')
      .update({
        full_text: fullText,
        segments: body.segments as any,
        language: body.language || 'multi',
        model: 'nova-3-live',
        confidence_avg: confidenceAvg,
        word_count: wordCount,
        status: wordCount === 0 ? 'no_speech_detected' : 'completed',
        provider: 'deepgram-live',
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', existingTranscript.id)

    if (updateError) {
      logger.error('Failed to update transcript', { error: updateError })
      return {
        status: 500,
        body: { error: 'Failed to update transcript' },
      }
    }

    transcriptId = existingTranscript.id
  } else {
    const { data: newTranscript, error: insertError } = await supabase
      .from('transcripts')
      .insert({
        recording_id: body.recording_id,
        full_text: fullText,
        segments: body.segments as any,
        language: body.language || 'multi',
        model: 'nova-3-live',
        confidence_avg: confidenceAvg,
        word_count: wordCount,
        status: wordCount === 0 ? 'no_speech_detected' : 'completed',
        provider: 'deepgram-live',
        estimated_cost_usd: 0, // Live transcription cost is already incurred
        retry_count: 0,
      } as any)
      .select('id')
      .single() as any

    if (insertError || !newTranscript) {
      logger.error('Failed to create transcript', { error: insertError })
      return {
        status: 500,
        body: { error: 'Failed to create transcript' },
      }
    }

    transcriptId = newTranscript.id
  }

  enqueue({
    topic: 'live-transcript-saved',
    data: {
      resourceType: 'transcript',
      resourceId: transcriptId,
      action: 'save',
      recordingId: body.recording_id,
      studyId: recording.study_id,
      participantId: body.participant_id,
      wordCount,
      segmentCount: body.segments.length,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      transcript_id: transcriptId,
      status: wordCount === 0 ? 'no_speech_detected' : 'completed',
    },
  }
}
