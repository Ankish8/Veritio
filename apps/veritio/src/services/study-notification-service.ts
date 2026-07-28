/**
 * Per-study email notification settings.
 *
 * The blob lives on studies.email_notification_settings and is written by the
 * builder Settings tab (Email Notifications card). Every background sender
 * reads it through here so the toggles in the UI actually gate what goes out,
 * and so a partially-populated blob resolves to the same defaults the builder
 * shows.
 */
import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'
import { buildStudyResultsUrl } from '../lib/email/study-links'
import { getUserEmail } from './user-service'
import { sendEmail, generateStudyClosedEmail } from './email-service'

type MotiaSupabaseClient = ReturnType<typeof getMotiaSupabaseClient>

interface NotificationLogger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
}

export interface StudyNotificationSettings {
  enabled: boolean
  everyResponse: boolean
  milestonesEnabled: boolean
  milestoneValues: number[]
  dailyDigest: boolean
  onClose: boolean
  milestonesReached: number[]
}

/** Mirrors DEFAULT_NOTIFICATION_TRIGGERS in components/builders/shared/types.ts */
const DEFAULT_MILESTONE_VALUES = [10, 50, 100, 500, 1000]

const ALL_DISABLED: StudyNotificationSettings = {
  enabled: false,
  everyResponse: false,
  milestonesEnabled: false,
  milestoneValues: [],
  dailyDigest: false,
  onClose: false,
  milestonesReached: [],
}

function toNumberArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback
  const numbers = value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
  return numbers
}

/**
 * Resolve a raw settings blob into a fully-populated shape. A missing trigger
 * key falls back to the builder default (milestones and on-close default on,
 * every-response and digest default off), and a null blob means "no
 * notifications configured", which is off across the board.
 */
export function normalizeNotificationSettings(raw: unknown): StudyNotificationSettings {
  if (!raw || typeof raw !== 'object') return ALL_DISABLED

  const settings = raw as {
    enabled?: unknown
    milestonesReached?: unknown
    triggers?: {
      everyResponse?: unknown
      dailyDigest?: unknown
      onClose?: unknown
      milestones?: { enabled?: unknown; values?: unknown }
    }
  }

  const triggers = settings.triggers ?? {}
  const milestones = triggers.milestones ?? {}

  return {
    enabled: settings.enabled === true,
    everyResponse: triggers.everyResponse === true,
    milestonesEnabled: milestones.enabled !== false,
    milestoneValues: toNumberArray(milestones.values, DEFAULT_MILESTONE_VALUES),
    dailyDigest: triggers.dailyDigest === true,
    onClose: triggers.onClose !== false,
    milestonesReached: toNumberArray(settings.milestonesReached, []),
  }
}

/**
 * Milestones the study has newly crossed, ascending.
 *
 * Crossing is >=, never ==: two responses completing at the same moment can
 * take the completed count straight past the exact value, and an equality
 * check then misses that milestone forever. Callers email only the highest
 * entry and record the rest, so turning milestones on for an established study
 * doesn't fire a burst of back-dated emails.
 */
export function selectCrossedMilestones(
  settings: StudyNotificationSettings,
  totalResponses: number
): number[] {
  if (!settings.enabled || !settings.milestonesEnabled) return []

  return settings.milestoneValues
    .filter(
      (milestone) => totalResponses >= milestone && !settings.milestonesReached.includes(milestone)
    )
    .sort((a, b) => a - b)
}

export type StudyCloseReason = 'manual' | 'date' | 'participant_limit' | 'both'

/**
 * Closure reasons reach us in three dialects: enum-ish values from the
 * scheduler ('date', 'participant_count'), free text from the closing-rule
 * checker ('Reached 50 participants and reached closing date'), and 'manual'
 * from the dashboard. Map all of them onto the email copy variants.
 */
export function mapStudyCloseReason(reason: string | null | undefined): StudyCloseReason {
  const value = (reason || '').toLowerCase()
  const byDate = value.includes('date')
  const byLimit = value.includes('participant') || value.includes('limit')

  if (byDate && byLimit) return 'both'
  if (byDate) return 'date'
  if (byLimit) return 'participant_limit'
  return 'manual'
}

export type StudyClosedEmailOutcome = 'sent' | 'skipped' | 'failed'

/**
 * Send the "study closed" email, gated on the study's own notification
 * settings. Every closure path (manual close, scheduled auto-close, closing
 * rule hit) funnels through here so the "Study Closes" toggle is honoured
 * exactly once and in one place.
 */
export async function sendStudyClosedEmail(params: {
  studyId: string
  reason?: string | null
  logger: NotificationLogger
  supabase?: MotiaSupabaseClient
}): Promise<StudyClosedEmailOutcome> {
  const { studyId, reason, logger } = params
  const supabase = params.supabase ?? getMotiaSupabaseClient()

  const { data: study, error } = await supabase
    .from('studies')
    .select('id, title, user_id, project_id, email_notification_settings')
    .eq('id', studyId)
    .single()

  if (error || !study) {
    logger.warn('Study not found for close notification', { studyId, error: error?.message })
    return 'skipped'
  }

  const settings = normalizeNotificationSettings(study.email_notification_settings)
  if (!settings.enabled || !settings.onClose) {
    logger.info('Study close email skipped, notification disabled', {
      studyId,
      enabled: settings.enabled,
      onClose: settings.onClose,
    })
    return 'skipped'
  }

  if (!study.user_id) {
    logger.warn('Study has no owner, cannot send close notification', { studyId })
    return 'skipped'
  }

  const userEmail = await getUserEmail(study.user_id)
  if (!userEmail) {
    logger.warn('Could not resolve email for close notification', { studyId, userId: study.user_id })
    return 'skipped'
  }

  const { count } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true })
    .eq('study_id', studyId)
    .eq('status', 'completed')

  const html = generateStudyClosedEmail(
    study.title,
    mapStudyCloseReason(reason),
    count || 0,
    buildStudyResultsUrl(study.project_id, studyId)
  )

  // Deliberately no studyId: closure happens once per study, and the final
  // summary must not be dropped because per-response emails already spent the
  // study's hourly email budget.
  const result = await sendEmail({
    to: userEmail,
    subject: `Study Closed - ${study.title}`,
    html,
  })

  if (!result.success) {
    logger.warn('Failed to send study closed email', { studyId, error: result.error })
    return 'failed'
  }

  logger.info('Study closed email sent', { studyId, emailId: result.id })
  return 'sent'
}
