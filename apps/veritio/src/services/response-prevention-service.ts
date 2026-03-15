import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import type { Database, Json } from '@veritio/study-types'
import { castJson } from '../lib/supabase/json-utils'
import type {
  ResponsePreventionLevel,
  ResponsePreventionSettings,
} from '../components/builders/shared/types'

type SupabaseClientType = SupabaseClient<Database>

export interface DuplicateCheckInput {
  studyId: string
  cookieId?: string | null
  ipAddress?: string | null
  fingerprintHash?: string | null
  fingerprintConfidence?: number | null
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  reason?: 'cookie' | 'ip' | 'fingerprint' | 'cookie_and_ip'
  existingParticipantId?: string
  completedAt?: string
}

export interface StoreFingerprintInput {
  cookieId?: string | null
  ipAddress?: string | null
  fingerprintHash?: string | null
  fingerprintConfidence?: number | null
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function getPreventionSettings(studySettings: Json | null): ResponsePreventionSettings {
  if (!studySettings || typeof studySettings !== 'object') {
    return { level: 'none', allowRetakeAfterDays: 0 }
  }

  const settings = studySettings as Record<string, unknown>
  const prevention = settings.responsePrevention as ResponsePreventionSettings | undefined

  return {
    level: (prevention?.level as ResponsePreventionLevel) || 'none',
    allowRetakeAfterDays: prevention?.allowRetakeAfterDays ?? 0,
  }
}

export function getPreventionSettingsFromColumn(
  responsePreventionSettings: Json | null
): ResponsePreventionSettings {
  const defaultSettings = { level: 'none' as ResponsePreventionLevel, allowRetakeAfterDays: 0 }
  const prevention = castJson<ResponsePreventionSettings>(responsePreventionSettings, defaultSettings)

  return {
    level: (prevention.level as ResponsePreventionLevel) || 'none',
    allowRetakeAfterDays: prevention.allowRetakeAfterDays ?? 0,
  }
}

// Prevention levels:
// - none: No checking, always allow
// - relaxed: Cookie-only matching
// - moderate: Cookie OR IP matching (either indicates duplicate)
// - strict: Browser fingerprint matching
export async function checkForDuplicate(
  supabase: SupabaseClientType,
  studyId: string,
  settings: ResponsePreventionSettings,
  input: DuplicateCheckInput
): Promise<DuplicateCheckResult> {
  if (settings.level === 'none') {
    return { isDuplicate: false }
  }

  const { cookieId, ipAddress, fingerprintHash } = input

  const cookieHash = cookieId ? hashValue(cookieId) : null
  const ipHash = ipAddress ? hashValue(ipAddress) : null

  let conditions: string[] = []

  switch (settings.level) {
    case 'relaxed':
      // Cookie only - blocks same browser
      if (!cookieHash) return { isDuplicate: false }
      conditions = [`cookie_hash.eq.${cookieHash}`]
      break

    case 'moderate':
      // Cookie OR IP - blocks same browser OR same network
      if (!cookieHash && !ipHash) return { isDuplicate: false }
      if (cookieHash) conditions.push(`cookie_hash.eq.${cookieHash}`)
      if (ipHash) conditions.push(`ip_hash.eq.${ipHash}`)
      break

    case 'strict':
      // Cookie OR IP OR Fingerprint - maximum protection
      // Combines all methods: same browser (cookie), same network (IP), or same browser fingerprint
      if (!cookieHash && !ipHash && !fingerprintHash) return { isDuplicate: false }
      if (cookieHash) conditions.push(`cookie_hash.eq.${cookieHash}`)
      if (ipHash) conditions.push(`ip_hash.eq.${ipHash}`)
      if (fingerprintHash) conditions.push(`fingerprint_hash.eq.${fingerprintHash}`)
      break

    default:
      return { isDuplicate: false }
  }

  let query = supabase
    .from('participant_fingerprints')
    .select('id, participant_id, created_at, cookie_hash, ip_hash, fingerprint_hash')
    .eq('study_id', studyId)
    .or(conditions.join(','))

  if (settings.allowRetakeAfterDays && settings.allowRetakeAfterDays > 0) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - settings.allowRetakeAfterDays)
    query = query.gte('created_at', cutoffDate.toISOString())
  }

  const { data: matches, error } = await query.limit(1)

  if (error || !matches || matches.length === 0) {
    return { isDuplicate: false }
  }

  const match = matches[0]

  let reason: DuplicateCheckResult['reason'] = 'cookie'
  const cookieMatch = cookieHash && match.cookie_hash === cookieHash
  const ipMatch = ipHash && match.ip_hash === ipHash
  const fingerprintMatch = fingerprintHash && match.fingerprint_hash === fingerprintHash

  if (settings.level === 'moderate' || settings.level === 'strict') {
    if (fingerprintMatch) {
      reason = 'fingerprint'
    } else if (cookieMatch && ipMatch) {
      reason = 'cookie_and_ip'
    } else if (ipMatch && !cookieMatch) {
      reason = 'ip'
    } else {
      reason = 'cookie'
    }
  }

  return {
    isDuplicate: true,
    reason,
    existingParticipantId: match.participant_id,
    completedAt: match.created_at ?? undefined,
  }
}

export async function storeFingerprint(
  supabase: SupabaseClientType,
  studyId: string,
  participantId: string,
  input: StoreFingerprintInput
): Promise<{ success: boolean; error?: Error }> {
  const { cookieId, ipAddress, fingerprintHash, fingerprintConfidence } = input

  if (!cookieId && !ipAddress && !fingerprintHash) {
    return { success: true }
  }

  try {
    const { error } = await supabase
      .from('participant_fingerprints')
      .upsert(
        {
          study_id: studyId,
          participant_id: participantId,
          cookie_hash: cookieId ? hashValue(cookieId) : null,
          ip_hash: ipAddress ? hashValue(ipAddress) : null,
          fingerprint_hash: fingerprintHash || null,
          fingerprint_confidence: fingerprintConfidence || null,
        },
        {
          onConflict: 'participant_id',
        }
      )

    if (error) {
      return { success: false, error: new Error(error.message) }
    }

    return { success: true }
  } catch (ex) {
    return { success: false, error: ex instanceof Error ? ex : new Error(String(ex)) }
  }
}

export function getBlockMessage(reason: DuplicateCheckResult['reason']): string {
  switch (reason) {
    case 'cookie':
      return 'Our records show you have already participated in this study.'
    case 'ip':
      return 'A response has already been submitted from your network. If you believe this is an error, please contact the study administrator.'
    case 'cookie_and_ip':
      return 'You have already participated in this study.'
    case 'fingerprint':
      return 'Our records indicate you have already completed this study.'
    default:
      return 'You have already participated in this study.'
  }
}
