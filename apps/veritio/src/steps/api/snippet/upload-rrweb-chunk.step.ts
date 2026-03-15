import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../middlewares/rate-limit'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const MAX_CHUNKS_PER_SESSION = 500

const BodySchema = z.object({
  session_id: z.string().min(1).max(128),
  chunk_index: z.number().int().min(0).max(MAX_CHUNKS_PER_SESSION - 1),
  events: z.array(z.record(z.unknown())).min(1),
  is_final: z.boolean().optional().default(false),
  viewport: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }).optional(),
  user_agent: z.string().max(512).optional(),
  participant_id: z.string().uuid().optional(),
})

export const config = {
  name: 'UploadRrwebChunk',
  description: 'Upload a chunk of rrweb recording events from live website snippet (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/rrweb',
    middleware: [rateLimitMiddleware({ tier: 'public-mutation' }), errorHandlerMiddleware],
    // No bodySchema — companion may send without Content-Type in edge cases.
    // We parse and validate manually in the handler.
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

/** Extract unique page URLs from rrweb Meta events (type 4) */
function extractPageUrls(events: Record<string, unknown>[]): string[] {
  const urls = new Set<string>()
  for (const event of events) {
    if (event.type === 4) {
      const data = event.data as Record<string, unknown> | undefined
      if (data?.href && typeof data.href === 'string') {
        urls.add(data.href)
      }
    }
  }
  return Array.from(urls)
}

/** Get the min and max timestamps from rrweb events */
function getEventTimestampRange(events: Record<string, unknown>[]): { minTs: number | null; maxTs: number | null } {
  let minTs: number | null = null
  let maxTs: number | null = null
  for (const event of events) {
    const ts = event.timestamp
    if (typeof ts === 'number') {
      if (minTs === null || ts < minTs) minTs = ts
      if (maxTs === null || ts > maxTs) maxTs = ts
    }
  }
  return { minTs, maxTs }
}

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { snippetId } = paramsSchema.parse(req.pathParams)
  const rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const body = BodySchema.parse(rawBody)
  const supabase = getMotiaSupabaseClient()

  // Look up study by snippetId
  const { data: studies } = await supabase
    .from('studies')
    .select('id')
    .filter('settings->snippetId', 'eq', `"${snippetId}"`)
    .limit(1)

  if (!studies || studies.length === 0) {
    return {
      status: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Snippet not found' },
    }
  }

  const studyId = studies[0].id

  // Serialize events to JSON
  const chunkJson = JSON.stringify(body.events)
  const chunkBuffer = Buffer.from(chunkJson, 'utf-8')

  // Max 2MB per chunk
  if (chunkBuffer.length > 2 * 1024 * 1024) {
    return {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Chunk too large (max 2MB)' },
    }
  }

  // Store chunk in Supabase Storage
  const storagePath = `${studyId}/${body.session_id}/chunk_${body.chunk_index}.json`

  const { error: uploadError } = await supabase.storage
    .from('live-website-rrweb')
    .upload(storagePath, chunkBuffer, {
      contentType: 'application/json',
      upsert: true,
    })

  if (uploadError) {
    logger.error('Failed to upload rrweb chunk', { error: uploadError.message, studyId, sessionId: body.session_id, chunkIndex: body.chunk_index })
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Failed to upload chunk' },
    }
  }

  // Get public URL for the chunk
  const { data: urlData } = supabase.storage
    .from('live-website-rrweb')
    .getPublicUrl(storagePath)

  const chunkUrl = urlData.publicUrl

  // Extract metadata from rrweb events in this chunk
  const chunkPageUrls = extractPageUrls(body.events)
  const { minTs, maxTs } = getEventTimestampRange(body.events)

  // Use first event timestamp as session start (more accurate than server time)
  const startedAtFromEvents = minTs ? new Date(minTs).toISOString() : new Date().toISOString()

  // Upsert session row
  if (body.chunk_index === 0) {
    // First chunk — create new session
    const { error: insertError } = await (supabase
      .from('live_website_rrweb_sessions' as any) as any)
      .insert({
        study_id: studyId,
        session_id: body.session_id,
        participant_id: body.participant_id || null,
        started_at: startedAtFromEvents,
        status: 'recording',
        event_count: body.events.length,
        total_size_bytes: chunkBuffer.length,
        chunks_uploaded: 1,
        chunk_paths: [chunkUrl],
        viewport_width: body.viewport?.width || null,
        viewport_height: body.viewport?.height || null,
        user_agent: body.user_agent || null,
        page_count: chunkPageUrls.length || 1,
        duration_ms: minTs && maxTs && maxTs > minTs ? maxTs - minTs : null,
      })

    if (insertError) {
      // Handle race condition — session may already exist from a parallel first chunk
      if (insertError.code === '23505') {
        // Duplicate — fall through to update path
        logger.info('Session already exists, updating', { studyId, sessionId: body.session_id })
      } else {
        logger.error('Failed to create rrweb session', { error: insertError.message, studyId, sessionId: body.session_id })
        return {
          status: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: { error: 'Failed to create session' },
        }
      }
    } else {
      // Successfully created — return early
      if (body.is_final) {
        await finalizeSession(supabase, studyId, body.session_id, maxTs, logger)
      }

      return {
        status: 201,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { success: true, chunk_index: body.chunk_index },
      }
    }
  }

  // Update existing session (non-first chunk, or first chunk race condition fallback)
  const { data: existingSession } = await (supabase
    .from('live_website_rrweb_sessions' as any) as any)
    .select('chunks_uploaded, chunk_paths, event_count, total_size_bytes, started_at, user_agent, page_count')
    .eq('study_id', studyId)
    .eq('session_id', body.session_id)
    .single()

  if (!existingSession) {
    // Session doesn't exist yet — create it (late first chunk)
    const { error: lateInsertError } = await (supabase
      .from('live_website_rrweb_sessions' as any) as any)
      .insert({
        study_id: studyId,
        session_id: body.session_id,
        participant_id: body.participant_id || null,
        started_at: startedAtFromEvents,
        status: 'recording',
        event_count: body.events.length,
        total_size_bytes: chunkBuffer.length,
        chunks_uploaded: 1,
        chunk_paths: [chunkUrl],
        viewport_width: body.viewport?.width || null,
        viewport_height: body.viewport?.height || null,
        user_agent: body.user_agent || null,
        page_count: chunkPageUrls.length || 1,
        duration_ms: minTs && maxTs && maxTs > minTs ? maxTs - minTs : null,
      })

    if (lateInsertError && lateInsertError.code !== '23505') {
      logger.error('Failed to create rrweb session (late)', { error: lateInsertError.message, studyId, sessionId: body.session_id })
      return {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { error: 'Failed to create session' },
      }
    }
  } else {
    // Check chunk limit
    if (existingSession.chunks_uploaded >= MAX_CHUNKS_PER_SESSION) {
      return {
        status: 429,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { error: 'Chunk limit reached', limit: MAX_CHUNKS_PER_SESSION },
      }
    }

    const existingPaths = (existingSession.chunk_paths || []) as string[]
    // Deduplicate: if this chunk URL already exists (re-upload), don't add it again
    const updatedPaths = existingPaths.includes(chunkUrl) ? existingPaths : [...existingPaths, chunkUrl]

    // Compute updated duration: from session started_at to this chunk's latest event
    const sessionStartMs = new Date(existingSession.started_at).getTime()
    const durationMs = maxTs ? maxTs - sessionStartMs : null

    // Merge page count: existing + new unique pages from this chunk
    const updatedPageCount = Math.max(existingSession.page_count || 1, (existingSession.page_count || 0) + chunkPageUrls.length)

    const updatePayload: Record<string, unknown> = {
      chunks_uploaded: existingSession.chunks_uploaded + 1,
      chunk_paths: updatedPaths,
      event_count: existingSession.event_count + body.events.length,
      total_size_bytes: existingSession.total_size_bytes + chunkBuffer.length,
      updated_at: new Date().toISOString(),
    }

    // Update duration if we have a valid value
    if (durationMs && durationMs > 0) {
      updatePayload.duration_ms = durationMs
    }

    // Update page count if new pages found
    if (chunkPageUrls.length > 0) {
      updatePayload.page_count = updatedPageCount
    }

    // Backfill user_agent if it was missing
    if (!existingSession.user_agent && body.user_agent) {
      updatePayload.user_agent = body.user_agent
    }

    const { error: updateError } = await (supabase
      .from('live_website_rrweb_sessions' as any) as any)
      .update(updatePayload)
      .eq('study_id', studyId)
      .eq('session_id', body.session_id)

    if (updateError) {
      logger.error('Failed to update rrweb session', { error: updateError.message, studyId, sessionId: body.session_id })
      return {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { error: 'Failed to update session' },
      }
    }
  }

  // Finalize if this is the last chunk
  if (body.is_final) {
    await finalizeSession(supabase, studyId, body.session_id, maxTs, logger)
  }

  return {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { success: true, chunk_index: body.chunk_index },
  }
}

async function finalizeSession(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  sessionId: string,
  lastEventTs: number | null,
  logger: ApiHandlerContext['logger']
) {
  const { data: session } = await (supabase
    .from('live_website_rrweb_sessions' as any) as any)
    .select('started_at')
    .eq('study_id', studyId)
    .eq('session_id', sessionId)
    .single()

  if (!session) return

  const startedAt = new Date(session.started_at)
  const endedAt = lastEventTs ? new Date(lastEventTs) : new Date()
  const durationMs = endedAt.getTime() - startedAt.getTime()

  const { error } = await (supabase
    .from('live_website_rrweb_sessions' as any) as any)
    .update({
      status: 'completed',
      ended_at: endedAt.toISOString(),
      duration_ms: durationMs > 0 ? durationMs : null,
      updated_at: endedAt.toISOString(),
    })
    .eq('study_id', studyId)
    .eq('session_id', sessionId)

  if (error) {
    logger.error('Failed to finalize rrweb session', { error: error.message, studyId, sessionId })
  }
}
