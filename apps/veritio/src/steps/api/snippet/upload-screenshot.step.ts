import type { StepConfig } from 'motia'
import { z } from 'zod'
import { createHash } from 'crypto'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../middlewares/rate-limit'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

// PNG magic bytes: 89 50 4E 47
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47])
// JPEG magic bytes: FF D8 FF
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff])

const MAX_SCREENSHOTS_PER_STUDY = 50

const BodySchema = z.object({
  pageUrl: z.string().min(1).max(2048),
  imageBase64: z.string().min(1),
  viewportWidth: z.number().int().positive().optional(),
  viewportHeight: z.number().int().positive().optional(),
})

export const config = {
  name: 'UploadLiveWebsiteScreenshot',
  description: 'Upload a page screenshot from live website snippet (public)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/snippet/:snippetId/screenshot',
    middleware: [rateLimitMiddleware({ tier: 'public-mutation' }), errorHandlerMiddleware],
    bodySchema: BodySchema as any,
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

  // Check if screenshot already exists for this study + page_url (dedup)
  const { data: existing } = await (supabase
    .from('live_website_page_screenshots' as any) as any)
    .select('id')
    .eq('study_id', studyId)
    .eq('page_url', body.pageUrl)
    .limit(1)

  if (existing && existing.length > 0) {
    return {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { success: true, skipped: true, reason: 'already_exists' },
    }
  }

  // Rate limit: max screenshots per study
  const { count } = await (supabase
    .from('live_website_page_screenshots' as any) as any)
    .select('id', { count: 'exact', head: true })
    .eq('study_id', studyId)

  if (count != null && count >= MAX_SCREENSHOTS_PER_STUDY) {
    return {
      status: 429,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Screenshot limit reached', limit: MAX_SCREENSHOTS_PER_STUDY },
    }
  }

  // Decode base64 image
  let imageBuffer: Buffer
  try {
    // Strip data URL prefix if present (e.g., "data:image/png;base64,...")
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '')
    imageBuffer = Buffer.from(base64Data, 'base64')
  } catch {
    return {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Invalid base64 image data' },
    }
  }

  // Validate image magic bytes (PNG or JPEG only)
  const isPng = imageBuffer.length >= 4 && imageBuffer.subarray(0, 4).equals(PNG_MAGIC)
  const isJpeg = imageBuffer.length >= 3 && imageBuffer.subarray(0, 3).equals(JPEG_MAGIC)
  if (!isPng && !isJpeg) {
    return {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Invalid image format. Only PNG and JPEG are accepted.' },
    }
  }

  // Max 2MB after decode
  if (imageBuffer.length > 2 * 1024 * 1024) {
    return {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Screenshot too large (max 2MB)' },
    }
  }

  // Generate storage path: live-website-screenshots/{studyId}/{urlHash}.png
  const urlHash = createHash('sha256').update(body.pageUrl).digest('hex').slice(0, 16)
  const storagePath = `${studyId}/${urlHash}.png`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('live-website-screenshots')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    logger.error('Failed to upload screenshot', { error: uploadError.message, studyId, pageUrl: body.pageUrl })
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Failed to upload screenshot' },
    }
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('live-website-screenshots')
    .getPublicUrl(storagePath)

  // Insert row into screenshots table
  const { error: insertError } = await (supabase
    .from('live_website_page_screenshots' as any) as any)
    .insert({
      study_id: studyId,
      page_url: body.pageUrl,
      screenshot_path: urlData.publicUrl,
      viewport_width: body.viewportWidth || null,
      viewport_height: body.viewportHeight || null,
    })

  if (insertError) {
    // Handle race condition: another request may have inserted while we were uploading
    if (insertError.code === '23505') {
      return {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: { success: true, skipped: true, reason: 'already_exists' },
      }
    }

    logger.error('Failed to insert screenshot record', { error: insertError.message, studyId })
    return {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: { error: 'Failed to save screenshot record' },
    }
  }

  logger.info('Screenshot captured', { studyId, pageUrl: body.pageUrl, storagePath })

  return {
    status: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { success: true },
  }
}
