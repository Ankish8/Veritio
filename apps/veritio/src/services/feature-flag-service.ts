import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'

interface CachedFlag {
  enabled: boolean
  expiresAt: number
}

const FLAG_CACHE_TTL_MS = 60_000 // 60 seconds
const flagCache = new Map<string, CachedFlag>()

export interface FeatureFlag {
  id: string
  key: string
  name: string
  description: string | null
  enabled: boolean
  scope: string
  scope_ids: string[] | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Get a feature flag by key from the database.
 */
export async function getFeatureFlag(key: string, logger?: { error: (msg: string, meta?: Record<string, unknown>) => void }): Promise<FeatureFlag | null> {
  const supabase = getMotiaSupabaseClient()

  const { data, error } = await (supabase as any)
    .from('feature_flags')
    .select('*')
    .eq('key', key)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      logger?.error('Failed to get feature flag', { key, error: error.message })
    }
    return null
  }

  return data as FeatureFlag
}

/**
 * Check if a feature flag is enabled.
 * Uses an in-memory TTL cache (60s) to avoid hitting the database on every check.
 */
export async function isFeatureEnabled(key: string, logger?: { error: (msg: string, meta?: Record<string, unknown>) => void }): Promise<boolean> {
  const cached = flagCache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.enabled
  }

  const flag = await getFeatureFlag(key, logger)
  const enabled = flag?.enabled ?? false

  flagCache.set(key, {
    enabled,
    expiresAt: Date.now() + FLAG_CACHE_TTL_MS,
  })

  return enabled
}
