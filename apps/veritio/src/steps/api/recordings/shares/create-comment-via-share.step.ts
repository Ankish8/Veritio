import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createCommentViaShare, getShareByCode } from '../../../../services/recording/index'

const bodySchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000, 'Comment too long'),
  guestName: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  timestampMs: z.number().int().min(0).optional(),
})

const responseSchema = z.object({
  comment: z.object({
    id: z.string().uuid(),
    recording_id: z.string().uuid(),
    timestamp_ms: z.number().nullable(),
    content: z.string(),
    created_by: z.string(),
    author_name: z.string().nullable(),
    created_at: z.string(),
  }),
})

export const config = {
  name: 'CreateCommentViaShare',
  description: 'Create a comment on a recording via share link (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/share/recording/:shareCode/comments',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: responseSchema as any,
    400: z.object({ error: z.string() }) as any,
    401: z.object({ error: z.string(), requires_password: z.boolean().optional() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-comment-created-via-share'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const { shareCode } = req.pathParams
  // Password can be passed as header for authenticated share access
  const password = req.headers['x-share-password'] as string | undefined

  const supabase = getMotiaSupabaseClient()

  const parseResult = bodySchema.safeParse(req.body)
  if (!parseResult.success) {
    return {
      status: 400,
      body: { error: parseResult.error.issues[0]?.message || 'Invalid request body' },
    }
  }

  const { content, guestName, timestampMs } = parseResult.data

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

  const { data: comment, error: createError } = await createCommentViaShare(supabase, {
    shareCode,
    content,
    guestName,
    timestampMs,
  })

  if (createError) {
    if (createError.message.includes('does not allow comments')) {
      return {
        status: 403,
        body: { error: createError.message },
      }
    }
    logger.error('Failed to create comment', { error: createError })
    return {
      status: 500,
      body: { error: 'Failed to create comment' },
    }
  }

  enqueue({
    topic: 'recording-comment-created-via-share',
    data: {
      commentId: comment!.id,
      recordingId: comment!.recording_id,
      shareCode,
      guestName,
    },
  }).catch(() => {})

  return {
    status: 201,
    body: {
      comment: {
        id: comment!.id,
        recording_id: comment!.recording_id,
        timestamp_ms: comment!.timestamp_ms,
        content: comment!.content,
        created_by: comment!.created_by,
        author_name: guestName,
        created_at: comment!.created_at,
      },
    },
  }
}
