import type { SupabaseClient } from '@supabase/supabase-js'

const DEFAULT_BUCKET = 'reports'
const DEFAULT_EXPIRES_IN_SECONDS = 3600

interface SignedReportUrlResult {
  url: string | null
  error: string | null
}

/**
 * Generate a signed download URL for a report file in Supabase Storage.
 *
 * @param supabase  - Supabase client (service-role)
 * @param filePath  - Path within the storage bucket
 * @param bucket    - Storage bucket name (default: "reports")
 * @param expiresIn - URL lifetime in seconds (default: 3600 = 1 hour)
 */
export async function generateSignedReportUrl(
  supabase: SupabaseClient,
  filePath: string,
  bucket: string = DEFAULT_BUCKET,
  expiresIn: number = DEFAULT_EXPIRES_IN_SECONDS,
): Promise<SignedReportUrlResult> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn)

  if (error || !data) {
    return { url: null, error: error?.message ?? 'Failed to generate signed URL' }
  }

  return { url: data.signedUrl, error: null }
}
