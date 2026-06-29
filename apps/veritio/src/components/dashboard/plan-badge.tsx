'use client'

import { Badge } from '@/components/ui/badge'
import { useCurrentPlan } from '@/hooks/use-current-plan'

/**
 * Compact, always-visible badge showing the current org's plan. Rendered next to
 * the workspace name in the sidebar org switcher.
 */
export function PlanBadge() {
  const { isTrialing, isLapsed, isLegacy, isActivePaid, daysLeft, label, isLoading } = useCurrentPlan()

  if (isLoading) return null

  if (isLapsed) {
    return (
      <Badge variant="destructive" className="h-5 shrink-0 px-1.5 text-[10px] font-medium">
        Expired
      </Badge>
    )
  }
  if (isTrialing) {
    return (
      <Badge className="h-5 shrink-0 border-amber-200 bg-amber-100 px-1.5 text-[10px] font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
        Trial · {daysLeft}d
      </Badge>
    )
  }
  if (isLegacy) {
    return (
      <Badge variant="outline" className="h-5 shrink-0 px-1.5 text-[10px] font-medium text-muted-foreground">
        Unlimited
      </Badge>
    )
  }
  if (isActivePaid) {
    return (
      <Badge variant="secondary" className="h-5 shrink-0 px-1.5 text-[10px] font-medium">
        {label}
      </Badge>
    )
  }
  return null
}
