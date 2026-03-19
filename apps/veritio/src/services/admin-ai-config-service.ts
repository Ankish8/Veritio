import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { maskApiKey } from '../lib/supabase/user-preferences-types'

type SupabaseClientType = SupabaseClient<Database>

const fromAdminAiConfig = (supabase: SupabaseClientType) => (supabase as any).from('admin_ai_config')

/** Raw admin AI config row from the database */
export interface AdminAiConfigRow {
  id: string
  openai_api_key: string | null
  openai_base_url: string | null
  openai_model: string | null
  openai_daily_limit: number
  mercury_api_key: string | null
  mercury_base_url: string | null
  mercury_model: string | null
  mercury_daily_limit: number
  updated_at: string
  updated_by: string | null
}

/** Public shape for admin UI — keys are masked */
export interface AdminAiConfigPublic {
  openai: {
    apiKeyMasked: string | null
    hasApiKey: boolean
    baseUrl: string | null
    model: string | null
    dailyLimit: number
  }
  mercury: {
    apiKeyMasked: string | null
    hasApiKey: boolean
    baseUrl: string | null
    model: string | null
    dailyLimit: number
  }
  updatedAt: string | null
}

/** Update shape from admin UI */
export interface AdminAiConfigUpdate {
  openai?: {
    apiKey?: string | null
    baseUrl?: string | null
    model?: string | null
    dailyLimit?: number
  }
  mercury?: {
    apiKey?: string | null
    baseUrl?: string | null
    model?: string | null
    dailyLimit?: number
  }
}

function rowToPublic(row: AdminAiConfigRow): AdminAiConfigPublic {
  return {
    openai: {
      apiKeyMasked: maskApiKey(row.openai_api_key),
      hasApiKey: !!row.openai_api_key,
      baseUrl: row.openai_base_url,
      model: row.openai_model,
      dailyLimit: row.openai_daily_limit,
    },
    mercury: {
      apiKeyMasked: maskApiKey(row.mercury_api_key),
      hasApiKey: !!row.mercury_api_key,
      baseUrl: row.mercury_base_url,
      model: row.mercury_model,
      dailyLimit: row.mercury_daily_limit,
    },
    updatedAt: row.updated_at,
  }
}

const DEFAULT_PUBLIC: AdminAiConfigPublic = {
  openai: { apiKeyMasked: null, hasApiKey: false, baseUrl: null, model: null, dailyLimit: 5 },
  mercury: { apiKeyMasked: null, hasApiKey: false, baseUrl: null, model: null, dailyLimit: 10 },
  updatedAt: null,
}

/** Get admin AI config (masked keys) for the admin UI */
export async function getAdminAiConfig(
  supabase: SupabaseClientType,
): Promise<AdminAiConfigPublic> {
  const { data, error } = await fromAdminAiConfig(supabase)
    .select('*')
    .limit(1)
    .single()

  if (error || !data) return DEFAULT_PUBLIC
  return rowToPublic(data as AdminAiConfigRow)
}

/** Get raw admin AI config for server-side use (unmasked keys) */
export async function getAdminAiConfigRaw(
  supabase: SupabaseClientType,
): Promise<AdminAiConfigRow | null> {
  const { data, error } = await fromAdminAiConfig(supabase)
    .select('*')
    .limit(1)
    .single()

  if (error || !data) return null
  return data as AdminAiConfigRow
}

/** Update admin AI config (upserts the singleton row) */
export async function updateAdminAiConfig(
  supabase: SupabaseClientType,
  updates: AdminAiConfigUpdate,
  userId: string,
): Promise<AdminAiConfigPublic> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: userId,
  }

  if (updates.openai) {
    if (updates.openai.apiKey !== undefined) patch.openai_api_key = updates.openai.apiKey
    if (updates.openai.baseUrl !== undefined) patch.openai_base_url = updates.openai.baseUrl
    if (updates.openai.model !== undefined) patch.openai_model = updates.openai.model
    if (updates.openai.dailyLimit !== undefined) patch.openai_daily_limit = updates.openai.dailyLimit
  }
  if (updates.mercury) {
    if (updates.mercury.apiKey !== undefined) patch.mercury_api_key = updates.mercury.apiKey
    if (updates.mercury.baseUrl !== undefined) patch.mercury_base_url = updates.mercury.baseUrl
    if (updates.mercury.model !== undefined) patch.mercury_model = updates.mercury.model
    if (updates.mercury.dailyLimit !== undefined) patch.mercury_daily_limit = updates.mercury.dailyLimit
  }

  // Get the singleton row ID
  const { data: existing } = await fromAdminAiConfig(supabase).select('id').limit(1).single()

  if (existing?.id) {
    const { data, error } = await fromAdminAiConfig(supabase)
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) return DEFAULT_PUBLIC
    return rowToPublic(data as AdminAiConfigRow)
  }

  // No row yet — insert
  const { data, error } = await fromAdminAiConfig(supabase)
    .insert(patch)
    .select('*')
    .single()

  if (error || !data) return DEFAULT_PUBLIC
  return rowToPublic(data as AdminAiConfigRow)
}
