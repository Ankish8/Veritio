import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

/** Raw (unmasked) AI configuration for server-side LLM client construction. */
export interface UserAiOverrides {
  openai: { apiKey: string | null; baseUrl: string | null; model: string | null }
  mercury: { apiKey: string | null; baseUrl: string | null; model: string | null }
  useSameProvider: boolean
}

/**
 * Fetch the user's raw AI configuration from the database.
 * SECURITY: Returns unmasked API keys — only call this server-side for LLM client construction.
 * Never pass the return value to an API response.
 */
export async function getUserAiOverrides(
  supabase: SupabaseClientType,
  userId: string
): Promise<UserAiOverrides | null> {
  const { data, error } = await (supabase as any)
    .from('user_preferences')
    .select('ai_openai_api_key, ai_openai_base_url, ai_openai_model, ai_mercury_api_key, ai_mercury_base_url, ai_mercury_model, ai_use_same_provider')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  // Only return overrides if at least one AI field is configured
  const hasAnyConfig = data.ai_openai_api_key || data.ai_mercury_api_key ||
    data.ai_openai_model || data.ai_mercury_model ||
    data.ai_openai_base_url || data.ai_mercury_base_url

  if (!hasAnyConfig) return null

  return {
    openai: {
      apiKey: data.ai_openai_api_key,
      baseUrl: data.ai_openai_base_url,
      model: data.ai_openai_model,
    },
    mercury: {
      apiKey: data.ai_mercury_api_key,
      baseUrl: data.ai_mercury_base_url,
      model: data.ai_mercury_model,
    },
    useSameProvider: data.ai_use_same_provider ?? false,
  }
}
