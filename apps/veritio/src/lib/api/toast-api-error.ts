import { toast } from '@/components/ui/sonner'
import { FetchError } from '@/lib/swr/config'

/** Best-effort human message from any thrown API error. */
export function getApiErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/** The plan a 403 UPGRADE_REQUIRED error says the user needs, if any. */
function extractRequiredPlan(err: unknown): string | undefined {
  if (err instanceof FetchError) return err.requiredPlan
  if (err && typeof err === 'object' && 'requiredPlan' in err) {
    const rp = (err as { requiredPlan?: unknown }).requiredPlan
    if (typeof rp === 'string') return rp
  }
  return undefined
}

/**
 * Show an API error as a toast. When the error is a plan/entitlement (UPGRADE_REQUIRED)
 * failure, the toast gets a "View plan" action that deep-links to the Plan & usage tab.
 */
export function toastApiError(err: unknown, fallback = 'Something went wrong'): void {
  const message = getApiErrorMessage(err, fallback)
  const requiredPlan = extractRequiredPlan(err)

  if (requiredPlan) {
    toast.error(message, {
      action: {
        label: 'View plan',
        onClick: () => {
          if (typeof window !== 'undefined') window.location.assign('/settings?tab=plan-usage')
        },
      },
    })
    return
  }

  toast.error(message)
}
