export const EDUCATION_REQUEST_HONEYPOT_FIELD = '_vreq_guard_7c91'

export const EDUCATION_REQUEST_HONEYPOT_PROPS = {
  name: EDUCATION_REQUEST_HONEYPOT_FIELD,
  autoComplete: 'off',
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
} as const

type EducationRequestResponse = {
  ok?: unknown
  delivered?: unknown
  stored?: unknown
  error?: unknown
}

function asEducationRequestResponse(value: unknown): EducationRequestResponse | null {
  return value !== null && typeof value === 'object' ? (value as EducationRequestResponse) : null
}

/**
 * A successful HTTP status is not delivery proof: bot-shaped submissions are
 * intentionally absorbed with a 200 response. Only the explicit receipt sent
 * after Resend accepts the message or the restricted durable lead store accepts
 * the record may transition the form to its success UI.
 */
export async function requireEducationDelivery(response: Response): Promise<void> {
  const body = asEducationRequestResponse(await response.json().catch(() => null))

  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `Request failed: ${response.status}`
    throw new Error(message)
  }

  if (body?.ok !== true || (body.delivered !== true && body.stored !== true)) {
    throw new Error('We could not confirm delivery.')
  }
}
