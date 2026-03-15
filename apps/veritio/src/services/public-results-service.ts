import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import { nanoid } from 'nanoid'

export interface PublicResultsSettings {
  enabled: boolean
  password?: string
  passwordHash?: string
  expiresAt?: string
  viewCount?: number
  lastViewedAt?: string
  allowComments?: boolean
  sharedMetrics: {
    overview: boolean
    participants: boolean
    analysis: boolean
    questionnaire: boolean
    aiInsights?: boolean
  }
}

export interface PublicResultsAccess {
  valid: boolean
  error?: 'not_found' | 'disabled' | 'expired' | 'password_required' | 'invalid_password'
  studyId?: string
  settings?: PublicResultsSettings
  branding?: Record<string, unknown>
  studyTitle?: string
  studyType?: string
}

export async function generatePublicResultsToken(
  supabase: SupabaseClient<Database>,
  studyId: string,
  userId: string
): Promise<{ token: string | null; error?: string }> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    return { token: null, error: 'Study not found' }
  }

  if (study.user_id !== userId) {
    return { token: null, error: 'Access denied' }
  }

  const token = nanoid(24)

  const { error: updateError } = await (supabase as any)
    .from('studies')
    .update({ public_results_token: token })
    .eq('id', studyId)

  if (updateError) {
    return { token: null, error: 'Failed to generate token' }
  }

  return { token }
}

export async function validatePublicResultsAccess(
  supabase: SupabaseClient<Database>,
  token: string,
  providedPassword?: string
): Promise<PublicResultsAccess> {
  const { data: study, error } = await (supabase as any)
    .from('studies')
    .select('id, title, study_type, sharing_settings, branding, public_results_token')
    .eq('public_results_token', token)
    .single()

  if (error || !study) {
    return { valid: false, error: 'not_found' }
  }

  const sharingSettings = (study as any).sharing_settings as { publicResults?: PublicResultsSettings } | null
  const publicResults = sharingSettings?.publicResults

  if (!publicResults?.enabled) {
    return { valid: false, error: 'disabled' }
  }

  if (publicResults.expiresAt) {
    const expiryDate = new Date(publicResults.expiresAt)
    if (expiryDate < new Date()) {
      return { valid: false, error: 'expired' }
    }
  }

  const hasPassword = publicResults.password || publicResults.passwordHash
  if (hasPassword) {
    if (!providedPassword) {
      return { valid: false, error: 'password_required' }
    }

    let passwordValid: boolean
    if (publicResults.passwordHash) {
      const bcryptjs = await import('bcryptjs')
      passwordValid = await bcryptjs.default.compare(providedPassword, publicResults.passwordHash)
    } else {
      passwordValid = providedPassword === publicResults.password
    }

    if (!passwordValid) {
      return { valid: false, error: 'invalid_password' }
    }
  }

  return {
    valid: true,
    studyId: study.id,
    settings: publicResults,
    branding: (study.branding as Record<string, unknown>) || undefined,
    studyTitle: study.title,
    studyType: study.study_type,
  }
}

export async function trackPublicResultsView(supabase: SupabaseClient<Database>, token: string): Promise<void> {
  const { data: study } = await (supabase as any)
    .from('studies')
    .select('id, sharing_settings')
    .eq('public_results_token', token)
    .single()

  if (!study) return

  const sharingSettings = (study.sharing_settings || {}) as any
  const publicResults = sharingSettings?.publicResults || {}

  const newViewCount = (publicResults.viewCount || 0) + 1

  await (supabase as any)
    .from('studies')
    .update({
      sharing_settings: {
        ...sharingSettings,
        publicResults: {
          ...publicResults,
          viewCount: newViewCount,
          lastViewedAt: new Date().toISOString(),
        },
      },
    })
    .eq('id', study.id)
}

