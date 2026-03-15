/**
 * Retention Policy Constants
 *
 * Centralized configuration for study closing rules and recording retention.
 * These constants are used by:
 * - Frontend: ClosingRuleCard component
 * - Backend: cleanup-inactive-recordings.step.ts cron
 * - Validation: API endpoints that create/update studies
 *
 * CLOSING RULES (Mandatory):
 * All studies MUST have both a close date and participant limit.
 * This prevents abandoned studies from consuming storage indefinitely.
 *
 * RETENTION POLICY:
 * Session recordings are automatically deleted after a study becomes inactive.
 * A study is "inactive" when:
 * - No new responses for INACTIVE_NO_RESPONSE_DAYS (30 days)
 * - Not viewed by researcher for INACTIVE_NOT_VIEWED_DAYS (15 days)
 *
 * After becoming inactive, recordings are deleted after RECORDING_RETENTION_DAYS (90 days).
 * Study data (responses, analytics) are preserved indefinitely.
 */

// ============================================================================
// Closing Rule Limits
// ============================================================================

/**
 * Maximum allowed participants per study.
 * User can choose 1 to this value. Default is this value.
 */
export const MAX_PARTICIPANTS_LIMIT = 100

/**
 * Default number of participants for new studies.
 */
export const MAX_PARTICIPANTS_DEFAULT = 100

/**
 * Maximum days from launch/now that a close date can be set.
 * User can choose today to this many days from now. Default is this value.
 */
export const MAX_CLOSE_DATE_DAYS = 30

// ============================================================================
// Inactivity Detection
// ============================================================================

/**
 * Days without new participant responses to consider a study inactive.
 * Tracked via `last_response_at` column.
 */
export const INACTIVE_NO_RESPONSE_DAYS = 30

/**
 * Days without researcher viewing the study to consider it inactive.
 * Tracked via `last_opened_at` column.
 */
export const INACTIVE_NOT_VIEWED_DAYS = 15

// ============================================================================
// Recording Retention
// ============================================================================

/**
 * Days after becoming inactive before recordings are deleted.
 * Total time from last activity = INACTIVE_* days + this value.
 */
export const RECORDING_RETENTION_DAYS = 90

/**
 * Days before deletion to send warning email.
 * Warning is sent when days until deletion <= this value.
 */
export const WARNING_DAYS_BEFORE_DELETE = 7

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the maximum allowed close date (MAX_CLOSE_DATE_DAYS from now).
 */
export function getMaxCloseDate(): Date {
  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + MAX_CLOSE_DATE_DAYS)
  return maxDate
}

/**
 * Get the default close date for new studies (MAX_CLOSE_DATE_DAYS from now).
 */
export function getDefaultCloseDate(): string {
  return getMaxCloseDate().toISOString()
}

/**
 * Get the default closing rule for new studies.
 * Close date is set dynamically to MAX_CLOSE_DATE_DAYS from now.
 */
export function getDefaultClosingRule() {
  return {
    type: 'both' as const,
    maxParticipants: MAX_PARTICIPANTS_DEFAULT,
    closeDate: getDefaultCloseDate(),
  }
}

/**
 * Validate and clamp a participant count to the allowed range.
 */
export function clampParticipantCount(count: number): number {
  if (isNaN(count) || count < 1) return 1
  if (count > MAX_PARTICIPANTS_LIMIT) return MAX_PARTICIPANTS_LIMIT
  return Math.floor(count)
}

/**
 * Validate and clamp a close date to the allowed range.
 * Returns ISO string.
 */
export function clampCloseDate(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const maxDate = getMaxCloseDate()

  if (date < today) {
    return new Date().toISOString()
  }
  if (date > maxDate) {
    return maxDate.toISOString()
  }
  return date.toISOString()
}

/**
 * Calculate days since a given date.
 * Returns Infinity if date is null/undefined.
 */
export function daysSince(date: string | null | undefined): number {
  if (!date) return Infinity
  const then = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - then.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if a study is considered inactive based on activity dates.
 */
export function isStudyInactive(
  lastResponseAt: string | null,
  lastOpenedAt: string | null
): boolean {
  const daysSinceResponse = daysSince(lastResponseAt)
  const daysSinceViewed = daysSince(lastOpenedAt)

  return (
    daysSinceResponse >= INACTIVE_NO_RESPONSE_DAYS &&
    daysSinceViewed >= INACTIVE_NOT_VIEWED_DAYS
  )
}

/**
 * Calculate days until recordings will be deleted.
 * Returns negative if already past retention period.
 */
export function getDaysUntilRecordingDeletion(
  lastResponseAt: string | null,
  lastOpenedAt: string | null
): number {
  // Inactivity starts from the later of last_response_at and last_opened_at
  const responseDate = lastResponseAt ? new Date(lastResponseAt) : new Date(0)
  const viewedDate = lastOpenedAt ? new Date(lastOpenedAt) : new Date(0)
  const inactivityStart = responseDate > viewedDate ? responseDate : viewedDate

  const deletionDate = new Date(inactivityStart)
  deletionDate.setDate(deletionDate.getDate() + RECORDING_RETENTION_DAYS)

  const now = new Date()
  const diffMs = deletionDate.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
