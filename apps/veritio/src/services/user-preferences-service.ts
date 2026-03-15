import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import {
  UserPreferencesRow,
  UserPreferences,
  UserPreferencesUpdate,
  StudyDefaults,
  rowToPreferences,
  preferencesToRow,
  DEFAULT_USER_PREFERENCES,
  DEFAULT_STUDY_DEFAULTS,
} from '../lib/supabase/user-preferences-types'

type SupabaseClientType = SupabaseClient<Database>

export async function getUserPreferences(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ data: UserPreferences | null; error: Error | null }> {
  const { data, error } = await (supabase as any)
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  if (!data) {
    return { data: DEFAULT_USER_PREFERENCES, error: null }
  }

  return { data: rowToPreferences(data as UserPreferencesRow), error: null }
}

export async function updateUserPreferences(
  supabase: SupabaseClientType,
  userId: string,
  updates: UserPreferencesUpdate
): Promise<{ data: UserPreferences | null; error: Error | null }> {
  const rowUpdates = preferencesToRow(userId, updates)

  const { data: upsertData, error: upsertError } = await (supabase as any)
    .from('user_preferences')
    .upsert(rowUpdates, {
      onConflict: 'user_id',
      ignoreDuplicates: false, // Ensure update happens on conflict
    })
    .select('*')
    .single()

  if (upsertError) {
    return { data: null, error: new Error(upsertError.message) }
  }

  if (!upsertData) {
    return { data: null, error: new Error('Upsert returned no data') }
  }

  return { data: rowToPreferences(upsertData as UserPreferencesRow), error: null }
}

export async function getStudyDefaults(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ data: StudyDefaults | null; error: Error | null }> {
  const result = await getUserPreferences(supabase, userId)

  if (result.error) {
    return { data: null, error: result.error }
  }

  return {
    data: result.data?.studyDefaults || DEFAULT_STUDY_DEFAULTS,
    error: null,
  }
}

export async function deleteUserPreferences(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { error } = await (supabase as any)
    .from('user_preferences')
    .delete()
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: new Error(error.message) }
  }

  return { success: true, error: null }
}

export async function hasCustomPreferences(
  supabase: SupabaseClientType,
  userId: string
): Promise<{ hasCustom: boolean; error: Error | null }> {
  const { data, error } = await (supabase as any)
    .from('user_preferences')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { hasCustom: false, error: new Error(error.message) }
  }

  return { hasCustom: !!data, error: null }
}
