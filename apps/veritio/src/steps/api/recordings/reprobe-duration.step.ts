import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getPlaybackUrl } from '../../../services/storage/r2-client'
import { getMediaDurationMs } from '../../../services/media/probe-service'

const bodySchema = z.object({
  recording_id: z.string().uuid().optional(),
  study_id: z.string().uuid().optional(),
  dry_run: z.boolean().optional().default(false),
})

const responseSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  updated: z.number(),
  errors: z.number(),
  results: z.array(z.object({
    recording_id: z.string(),
    old_duration_ms: z.number().nullable(),
    new_duration_ms: z.number().nullable(),
    status: z.enum(['updated', 'unchanged', 'error']),
    error: z.string().optional(),
  })),
})

export const config = {
  name: 'ReprobeDuration',
  description: 'Re-probe recordings to fix incorrect duration values',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/admin/recordings/reprobe-duration',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const body = bodySchema.parse(req.body || {})
  const { recording_id, study_id, dry_run } = body

  logger.info('Starting recording duration re-probe', { recording_id, study_id, dry_run })

  const supabase = getMotiaSupabaseClient()

  let query = supabase
    .from('recordings')
    .select('id, storage_path, duration_ms, status')
    .eq('status', 'ready')
    .not('storage_path', 'is', null)

  if (recording_id) {
    query = query.eq('id', recording_id)
  } else if (study_id) {
    query = query.eq('study_id', study_id)
  }

  // Limit to 100 recordings at a time to avoid timeout
  query = query.limit(100)

  const { data: recordings, error: fetchError } = await query

  if (fetchError) {
    logger.error('Failed to fetch recordings', { error: fetchError })
    return {
      status: 500,
      body: { error: 'Failed to fetch recordings' },
    }
  }

  if (!recordings || recordings.length === 0) {
    return {
      status: 200,
      body: {
        success: true,
        processed: 0,
        updated: 0,
        errors: 0,
        results: [],
      },
    }
  }

  logger.info(`Found ${recordings.length} recordings to process`)

  const results: Array<{
    recording_id: string
    old_duration_ms: number | null
    new_duration_ms: number | null
    status: 'updated' | 'unchanged' | 'error'
    error?: string
  }> = []

  let updated = 0
  let errors = 0

  for (const recording of recordings) {
    try {
      const playbackUrl = await getPlaybackUrl(recording.storage_path, 300)
      const newDurationMs = await getMediaDurationMs(playbackUrl)
      const oldDurationMs = recording.duration_ms
      const durationChanged = !oldDurationMs ||
        Math.abs(newDurationMs - oldDurationMs) > 500

      if (durationChanged && !dry_run) {
        const { error: updateError } = await supabase
          .from('recordings')
          .update({
            duration_ms: newDurationMs,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recording.id)

        if (updateError) {
          throw new Error(`Update failed: ${updateError.message}`)
        }

        logger.info('Updated recording duration', {
          recording_id: recording.id,
          old_duration_ms: oldDurationMs,
          new_duration_ms: newDurationMs,
        })

        results.push({
          recording_id: recording.id,
          old_duration_ms: oldDurationMs,
          new_duration_ms: newDurationMs,
          status: 'updated',
        })
        updated++
      } else {
        results.push({
          recording_id: recording.id,
          old_duration_ms: oldDurationMs,
          new_duration_ms: newDurationMs,
          status: durationChanged ? 'updated' : 'unchanged',
        })
        if (durationChanged) updated++ // Count as would-be-updated for dry_run
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.warn('Failed to reprobe recording', {
        recording_id: recording.id,
        error: errorMessage,
      })
      results.push({
        recording_id: recording.id,
        old_duration_ms: recording.duration_ms,
        new_duration_ms: null,
        status: 'error',
        error: errorMessage,
      })
      errors++
    }
  }

  logger.info('Recording duration re-probe complete', {
    processed: recordings.length,
    updated,
    errors,
    dry_run,
  })

  return {
    status: 200,
    body: {
      success: true,
      processed: recordings.length,
      updated,
      errors,
      results,
    },
  }
}
