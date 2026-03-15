import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { sessionAuthMiddleware } from '../../../middlewares/session-auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const bodySchema = z.object({
  study_id: z.string().uuid(),
  participant_id: z.string().uuid(),
})

const responseSchema = z.object({
  api_key: z.string(),
  model: z.string(),
})

export const config = {
  name: 'GetTranscriptionKey',
  description: 'Get Deepgram API key for live transcription (authenticated participants only)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/recordings/transcription-key',
    middleware: [sessionAuthMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const sessionToken = req.headers['x-session-token'] as string
  const body = bodySchema.parse(req.body)

  logger.info('Transcription key requested', {
    studyId: body.study_id,
    participantId: body.participant_id,
  })

  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    logger.error('DEEPGRAM_API_KEY not configured')
    return {
      status: 500,
      body: { error: 'Transcription service not configured' },
    }
  }

  const supabase = getMotiaSupabaseClient()

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, session_token, study_id')
    .eq('id', body.participant_id)
    .eq('study_id', body.study_id)
    .single()

  if (participantError || !participant) {
    logger.warn('Participant not found', { participantId: body.participant_id })
    return {
      status: 404,
      body: { error: 'Participant not found' },
    }
  }

  if (participant.session_token !== sessionToken) {
    logger.warn('Invalid session token for transcription key', { participantId: body.participant_id })
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, session_recording_settings')
    .eq('id', body.study_id)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found', { studyId: body.study_id })
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  // Generate a short-lived temporary key instead of returning the permanent key
  try {
    const tempKeyResponse = await fetch('https://api.deepgram.com/v1/auth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: 30 }),
    })

    if (!tempKeyResponse.ok) {
      logger.error('Failed to generate temporary Deepgram key', { status: tempKeyResponse.status })
      return {
        status: 500,
        body: { error: 'Failed to generate transcription credentials' },
      }
    }

    const data = await tempKeyResponse.json() as { token?: string }
    return {
      status: 200,
      body: {
        api_key: data.token || '',
        model: 'nova-3',
      },
    }
  } catch (err) {
    logger.error('Error generating temporary Deepgram key', { error: err })
    return {
      status: 500,
      body: { error: 'Failed to generate transcription credentials' },
    }
  }
}
