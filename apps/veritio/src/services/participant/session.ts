import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'
import type { SessionResult, ServiceResult, StudyStatusForError } from './types'
import { getStudyStatusErrorMessage } from './types'

type SupabaseClientType = SupabaseClient<Database>

export interface BrowserData {
  browser: string
  operatingSystem: string
  deviceType: 'Desktop' | 'Mobile' | 'Tablet'
  language: string
  timeZone: string
  screenResolution: string
}

export interface CreateParticipantInput {
  identifierType?: 'anonymous' | 'email' | 'custom' | 'demographic_profile'
  identifierValue?: string | null
  country?: string | null
  region?: string | null
  city?: string | null
  urlTags?: Record<string, string> | null
  browserData?: BrowserData | null
}

export async function createParticipant(
  supabase: SupabaseClientType,
  shareCodeOrSlug: string,
  input?: CreateParticipantInput
): Promise<ServiceResult<SessionResult>> {
  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, status')
    .or(`share_code.eq.${shareCodeOrSlug},url_slug.eq.${shareCodeOrSlug}`)
    .single()

  if (studyError || !study) {
    return { data: null, error: new Error('Study not found') }
  }

  if (study.status !== 'active') {
    const errorMessage = getStudyStatusErrorMessage(study.status as StudyStatusForError)
    return { data: null, error: new Error(errorMessage) }
  }

  const metadata = input?.browserData ? { browserData: input.browserData } : null

  const { data: participant, error } = await supabase
    .from('participants')
    .insert({
      study_id: study.id,
      status: 'in_progress',
      identifier_type: input?.identifierType || 'anonymous',
      identifier_value: input?.identifierValue || null,
      country: input?.country || null,
      region: input?.region || null,
      city: input?.city || null,
      url_tags: input?.urlTags || null,
      metadata,
    } as any) // Type assertion needed until types are regenerated
    .select()
    .single()

  if (error) {
    return { data: null, error: new Error('Failed to start session') }
  }

  if (!participant.session_token) {
    return { data: null, error: new Error('Failed to generate session token') }
  }

  return {
    data: {
      sessionToken: participant.session_token,
      participantId: participant.id,
      studyId: study.id,
    },
    error: null,
  }
}
