import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { getShareByCode, listCommentsByRecording } from '../../../../services/recording/index'

const commentSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  timestamp_ms: z.number().nullable(),
  content: z.string(),
  created_by: z.string(),
  author_name: z.string().nullable(),
  author_image: z.string().nullable(),
  created_at: z.string(),
})

const responseSchema = z.object({
  comments: z.array(commentSchema),
})

export const config = {
  name: 'GetCommentsViaShare',
  description: 'Get comments for a recording via share link (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/share/recording/:shareCode/comments',
    middleware: [errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string(), requires_password: z.boolean().optional() }) as any,
    403: z.object({ error: z.string() }) as any,
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

  if (share.access_level !== 'comment') {
    return {
      status: 403,
      body: { error: 'This share link does not allow viewing comments' },
    }
  }

  const { data: comments, error: commentsError } = await listCommentsByRecording(
    supabase,
    share.recording_id
  )

  if (commentsError) {
    logger.error('Failed to get comments', { error: commentsError, recordingId: share.recording_id })
    return {
      status: 500,
      body: { error: 'Failed to get comments' },
    }
  }

  return {
    status: 200,
    body: {
      comments: (comments || []).map(c => ({
        id: c.id,
        recording_id: c.recording_id,
        timestamp_ms: c.timestamp_ms,
        content: c.content,
        created_by: c.created_by,
        author_name: c.author_name ?? null,
        author_image: c.author_image ?? null,
        created_at: c.created_at,
      })),
    },
  }
}
