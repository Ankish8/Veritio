import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { getShareByCode } from '../../../../services/recording/index'
import { getPlaybackUrl } from '../../../../services/storage/r2-client'

const clipSchema = z.object({
  id: z.string().uuid(),
  start_ms: z.number(),
  end_ms: z.number(),
  title: z.string(),
  description: z.string().nullable(),
})

const responseSchema = z.object({
  recording: z.object({
    id: z.string().uuid(),
    capture_mode: z.string(),
    duration_ms: z.number().nullable(),
    playback_url: z.string(),
  }),
  transcript: z.object({
    segments: z.array(z.any()),
    full_text: z.string().nullable(),
  }).nullable(),
  clips: z.array(clipSchema),
  access_level: z.enum(['view', 'comment']),
})

export const config = {
  name: 'GetSharedRecording',
  description: 'Get recording data via share link (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/share/recording/:shareCode',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string(), requires_password: z.boolean().optional() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { shareCode } = req.pathParams
  // Password can be passed as header for authenticated share access
  const password = req.headers['x-share-password'] as string | undefined

  const supabase = getMotiaSupabaseClient()

  const { data: share, error: shareError } = await getShareByCode(supabase, shareCode)

  if (shareError || !share) {
    logger.warn('Share not found', { shareCode })
    return {
      status: 404,
      body: { error: 'Share link not found or expired' },
    }
  }

  if (share.password_hash) {
    if (!password) {
      return {
        status: 401,
        body: { error: 'Password required', requires_password: true },
      }
    }

    const bcrypt = await import('bcryptjs')
    const isValid = await bcrypt.compare(password, share.password_hash)
    if (!isValid) {
      return {
        status: 401,
        body: { error: 'Invalid password', requires_password: true },
      }
    }
  }

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, capture_mode, duration_ms, storage_path')
    .eq('id', share.recording_id)
    .is('deleted_at', null)
    .single() as any

  if (recordingError || !recording) {
    logger.error('Recording not found', { recordingId: share.recording_id })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  let playbackUrl: string
  try {
    playbackUrl = await getPlaybackUrl(recording.storage_path, 3600)
  } catch (error) {
    logger.error('Failed to get playback URL', { error, recordingId: share.recording_id })
    return {
      status: 500,
      body: { error: 'Failed to get playback URL' },
    }
  }

  const { data: transcript } = await supabase
    .from('transcripts')
    .select('segments, full_text, status')
    .eq('recording_id', share.recording_id)
    .eq('status', 'completed')
    .single() as any

  const { data: clips } = await supabase
    .from('recording_clips')
    .select('id, start_ms, end_ms, title, description')
    .eq('recording_id', share.recording_id)
    .order('start_ms', { ascending: true }) as any

  return {
    status: 200,
    body: {
      recording: {
        id: recording.id,
        capture_mode: recording.capture_mode,
        duration_ms: recording.duration_ms,
        playback_url: playbackUrl,
      },
      transcript: transcript ? {
        segments: transcript.segments || [],
        full_text: transcript.full_text,
      } : null,
      clips: clips || [],
      access_level: share.access_level,
    },
  }
}
