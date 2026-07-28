import {
  ALREADY_SUBMITTED_ERROR,
  RESPONSE_LIMIT_ERROR,
  COMPLETION_FAILED_ERROR,
} from '@/services/participant/submissions'

export interface ParticipantErrorResponse {
  status: number
  body: { error: string }
}

/**
 * Status codes for the submission errors every participant endpoint can hit.
 *
 * Each endpoint used to string-match its own subset, so an outcome that only
 * some of them knew about — a study hitting its response cap, say — fell through
 * to a 500 and reached the participant as "Internal Server Error". Mapping them
 * in one place means a new outcome is handled everywhere at once.
 *
 * Returns null for errors specific to one study type; the endpoint handles those.
 */
export function participantSubmissionErrorResponse(
  error: Error
): ParticipantErrorResponse | null {
  switch (error.message) {
    case 'Study not found':
      return { status: 404, body: { error: error.message } }

    case 'Invalid session':
      return { status: 401, body: { error: error.message } }

    case ALREADY_SUBMITTED_ERROR:
    case RESPONSE_LIMIT_ERROR:
      return { status: 409, body: { error: error.message } }

    // Transient: the participant's answers were not recorded, so retrying is
    // the right move rather than telling them the study is closed.
    case COMPLETION_FAILED_ERROR:
      return { status: 503, body: { error: error.message } }

    default:
      return null
  }
}
