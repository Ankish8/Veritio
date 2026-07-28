'use client'

import { AppProgressBar as ProgressBar } from 'next-nprogress-bar'

/**
 * Top-of-page route progress bar.
 *
 * Mounted per route group rather than in the root layout: the participant
 * player performs no route navigation (no router.push, no <Link>), so mounting
 * it globally only added next-nprogress-bar + nprogress-v2 to every
 * participant's initial bundle.
 *
 * Renders only the bar, so mount it as a sibling of the group's content.
 */
export function RouteProgressBar() {
  return (
    <ProgressBar
      height="2px"
      color="hsl(20 5.9% 30%)"
      options={{ showSpinner: false }}
      shallowRouting
    />
  )
}
