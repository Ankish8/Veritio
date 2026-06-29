'use client'

import Link from 'next/link'
import { Clock, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCurrentPlan } from '@/hooks/use-current-plan'

/**
 * Persistent, non-dismissible bar shown on every dashboard page while an org is
 * on a trial or has lapsed. Active paid and legacy orgs see nothing here (their
 * plan shows via the sidebar PlanBadge). Links to the Plan & usage tab.
 */
export function PlanVisibilityBar() {
  const { isTrialing, isLapsed, daysLeft, label, isLoading } = useCurrentPlan()

  if (isLoading || (!isTrialing && !isLapsed)) return null

  if (isLapsed) {
    return (
      <div className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2 dark:border-red-900/50 dark:bg-red-950/30">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Your trial has ended. Subscribe to keep creating studies and collecting responses.</span>
        </div>
        <Button asChild size="sm" className="shrink-0 bg-red-600 text-white hover:bg-red-700">
          <Link href="/settings?tab=plan-usage">Subscribe</Link>
        </Button>
      </div>
    )
  }

  const urgent = daysLeft <= 3
  return (
    <div
      className={`mb-2 flex items-center justify-between gap-3 rounded-xl border px-4 py-2 ${
        urgent
          ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
      }`}
    >
      <div
        className={`flex items-center gap-2 text-sm font-medium ${
          urgent ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'
        }`}
      >
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {daysLeft} day{daysLeft === 1 ? '' : 's'} left in your {label} trial.
        </span>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link href="/settings?tab=plan-usage">Upgrade</Link>
      </Button>
    </div>
  )
}
