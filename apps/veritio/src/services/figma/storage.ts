import type { SupabaseClient } from '@supabase/supabase-js'
import type { FigmaLogger } from './types'

/**
 * Parse PNG dimensions from the IHDR chunk header.
 * Returns null if the buffer is not a valid PNG.
 */
export function parsePngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length > 24 && buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    }
  }
  return null
}

/**
 * Replace non-alphanumeric characters (except dot and dash) with underscore.
 */
export function sanitizeStorageFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, '_')
}

/**
 * Download an image from a Figma CDN URL and upload it to Supabase storage.
 * Returns the public URL, sanitized filename, and PNG dimensions (if parseable).
 */
export async function downloadAndUploadFigmaImage(
  supabase: SupabaseClient,
  figmaImageUrl: string,
  storagePath: string,
  displayName: string,
  logger?: FigmaLogger,
  /**
   * Overwrite an existing object at `storagePath`. Off by default because the
   * one-shot importers write to a fresh random path every time; prototype frame
   * sync writes to a deterministic per-node path and must be able to re-run.
   */
  upsert = false
): Promise<{ publicUrl: string; filename: string; width: number | null; height: number | null }> {
  // Validate URL to prevent SSRF
  const parsedUrl = new URL(figmaImageUrl)
  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Invalid Figma image URL: must use HTTPS')
  }
  const allowedHosts = [
    'figma-alpha-api.s3.us-west-2.amazonaws.com',
    's3-alpha.figma.com',
    'figma-img-prod-us-east-1.s3.amazonaws.com',
    's3-alpha-sig.figma.com',
  ]
  if (
    !allowedHosts.some(
      (host) =>
        parsedUrl.hostname === host ||
        parsedUrl.hostname.endsWith('.figma.com') ||
        parsedUrl.hostname.endsWith('.amazonaws.com')
    )
  ) {
    throw new Error('Invalid Figma image URL: unexpected host')
  }

  // Download image from Figma CDN
  const imageResponse = await fetch(figmaImageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image from Figma: ${imageResponse.status}`)
  }

  const imageBlob = await imageResponse.blob()
  const imageBuffer = Buffer.from(await imageBlob.arrayBuffer())

  const filename = sanitizeStorageFilename(`${displayName}.png`)

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('study-assets')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert,
    })

  if (uploadError) {
    logger?.error('Failed to upload image to storage', { error: uploadError.message, storagePath })
    throw uploadError
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('study-assets')
    .getPublicUrl(storagePath)

  // Parse PNG dimensions
  const dimensions = parsePngDimensions(imageBuffer)

  return {
    publicUrl: urlData.publicUrl,
    filename,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  }
}

/**
 * Persist Figma frame thumbnails into Supabase Storage and return a map of
 * figma node id -> durable public URL.
 *
 * Figma's `/images` endpoint hands back presigned S3 links that expire, so
 * writing them straight into `prototype_test_frames.thumbnail_url` (as sync
 * used to) leaves every older study with broken frame images across results,
 * path views, and click maps. The one-shot first-click / first-impression
 * importers already download-and-store; this does the same for the frame set,
 * with bounded concurrency so a 100-frame file does not open 100 sockets.
 *
 * A frame whose thumbnail fails to persist falls back to the raw Figma URL:
 * short-lived is still better than blank, and it keeps a storage hiccup from
 * failing the whole sync.
 */
export async function persistFrameThumbnails(
  supabase: SupabaseClient,
  studyId: string,
  prototypeId: string,
  figmaImageUrls: Record<string, string | null | undefined>,
  logger?: FigmaLogger,
  concurrency = 6
): Promise<Record<string, string>> {
  const entries = Object.entries(figmaImageUrls).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0
  )

  const persisted: Record<string, string> = {}
  let cursor = 0
  let failures = 0

  async function worker() {
    while (cursor < entries.length) {
      const index = cursor++
      const [nodeId, figmaUrl] = entries[index]
      const storagePath = `${studyId}/prototype-frames/${prototypeId}/${sanitizeStorageFilename(nodeId)}.png`

      try {
        const { publicUrl } = await downloadAndUploadFigmaImage(
          supabase,
          figmaUrl,
          storagePath,
          nodeId,
          logger,
          true
        )
        persisted[nodeId] = publicUrl
      } catch (err) {
        failures++
        persisted[nodeId] = figmaUrl
        logger?.warn('[Figma] Failed to persist frame thumbnail, falling back to the expiring Figma URL', {
          nodeId,
          storagePath,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, entries.length) }, () => worker())
  )

  logger?.info('[Figma] Persisted frame thumbnails', {
    total: entries.length,
    persisted: entries.length - failures,
    failed: failures,
  })

  return persisted
}
