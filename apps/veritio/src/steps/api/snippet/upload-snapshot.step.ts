import type { StepConfig } from 'motia'
import { z } from 'zod'
import { createHash } from 'crypto'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const MAX_SNAPSHOTS_PER_STUDY = 50

const BodySchema = z.object({
  pageUrl: z.string().min(1).max(2048),
  snapshot: z.record(z.unknown()),
  viewportWidth: z.number().int().positive().optional(),
  viewportHeight: z.number().int().positive().optional(),
  pageWidth: z.number().int().positive().optional(),
  pageHeight: z.number().int().positive().optional(),
})

export const config = {
  name: 'UploadLiveWebsiteDomSnapshot',
  description: 'Upload a DOM snapshot from live website snippet (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/snapshot',
    middleware: [errorHandlerMiddleware],
    // No bodySchema — companion may send without Content-Type in edge cases.
    // We parse and validate manually in the handler.
  }],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const paramsSchema = z.object({
  snippetId: z.string().min(1),
})

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

  // Check if snapshot already exists for this study + page_url (dedup)
  // Modal pages (#modal suffix) are allowed to overwrite — the first capture may
  // have been empty if the portal hadn't rendered yet.
  const isModalPage = body.pageUrl.endsWith('#modal')

  if (!isModalPage) {
    const { data: existing } = await (supabase
      .from('live_website_page_screenshots' as any) as any)
      .select('id')
      .eq('study_id', studyId)
      .eq('page_url', body.pageUrl)
      .not('snapshot_path', 'is', null)
      .limit(1)

    if (existing && existing.length > 0) {
      return {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { success: true, skipped: true, reason: 'already_exists' },
      }
    }
  }

  // Rate limit: max snapshots per study
  const { count } = await (supabase
    .from('live_website_page_screenshots' as any) as any)
    .select('id', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .not('snapshot_path', 'is', null)

  if (count != null && count >= MAX_SNAPSHOTS_PER_STUDY) {
    return {
      status: 429,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Snapshot limit reached', limit: MAX_SNAPSHOTS_PER_STUDY },
    }
  }

  // Store snapshot as plain JSON (Supabase CDN handles gzip for transit)
  const snapshotJson = JSON.stringify(body.snapshot)
  const snapshotBuffer = Buffer.from(snapshotJson, 'utf-8')

  // Max 15MB (inlined images increase snapshot size significantly)
  if (snapshotBuffer.length > 15 * 1024 * 1024) {
    return {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Snapshot too large (max 15MB)' },
    }
  }

  // Generate storage path: live-website-snapshots/{studyId}/{urlHash}.json
  const urlHash = createHash('sha256').update(body.pageUrl).digest('hex').slice(0, 16)
  const storagePath = `${studyId}/${urlHash}.json`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('live-website-snapshots')
    .upload(storagePath, snapshotBuffer, {
      contentType: 'application/json',
      upsert: true,
    })

  if (uploadError) {
    logger.error('Failed to upload snapshot', { error: uploadError.message, studyId, pageUrl: body.pageUrl })
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Failed to upload snapshot' },
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('live-website-snapshots')
    .getPublicUrl(storagePath)

  // Upsert row into screenshots table — may already have a screenshot_path from upload-screenshot
  const { data: existingRow } = await (supabase
    .from('live_website_page_screenshots' as any) as any)
    .select('id')
    .eq('study_id', studyId)
    .eq('page_url', body.pageUrl)
    .limit(1)

  let insertError: any

  if (existingRow && existingRow.length > 0) {
    // Update existing row with snapshot_path
    const { error } = await (supabase
      .from('live_website_page_screenshots' as any) as any)
      .update({
        snapshot_path: urlData.publicUrl,
        viewport_width: body.viewportWidth || null,
        viewport_height: body.viewportHeight || null,
        page_width: body.pageWidth || null,
        page_height: body.pageHeight || null,
      })
      .eq('id', existingRow[0].id)

    insertError = error
  } else {
    // Insert new row
    const { error } = await (supabase
      .from('live_website_page_screenshots' as any) as any)
      .insert({
        study_id: studyId,
        page_url: body.pageUrl,
        snapshot_path: urlData.publicUrl,
        viewport_width: body.viewportWidth || null,
        viewport_height: body.viewportHeight || null,
        page_width: body.pageWidth || null,
        page_height: body.pageHeight || null,
      })

    insertError = error
  }

  if (insertError) {
    // Handle race condition: another request may have inserted while we were uploading
    if (insertError.code === '23505') {
      return {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { success: true, skipped: true, reason: 'already_exists' },
      }
    }

    logger.error('Failed to save snapshot record', { error: insertError.message, studyId })
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Failed to save snapshot record' },
    }
  }

  logger.info('DOM snapshot captured', { studyId, pageUrl: body.pageUrl, storagePath, size: snapshotBuffer.length })

  return {
    status: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { success: true },
  }
}
