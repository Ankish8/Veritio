'use client'

import { AlertTriangle } from 'lucide-react'
import { isValidParticipantRedirect } from '@veritio/core/participant-redirect'

/**
 * Inline warning for the free-text "Redirect URL" fields.
 *
 * Values that are not web addresses (an email address being the common one) used
 * to save silently, then resolve against the study path at runtime and drop the
 * participant on "Study not found". Surface it here, next to the field, instead
 * of letting the researcher find out from a participant.
 */
export function RedirectUrlWarning({ value }: { value?: string }) {
  if (isValidParticipantRedirect(value)) return null

  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700">
      <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-600" />
      <span>
        This is not a valid web address, so participants will not be redirected. Use a full URL like
        https://example.com/thanks
      </span>
    </p>
  )
}
