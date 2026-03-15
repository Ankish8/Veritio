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
  logger?: FigmaLogger
): Promise<{ publicUrl: string; filename: string; width: number | null; height: number | null }> {
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
      upsert: false,
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
