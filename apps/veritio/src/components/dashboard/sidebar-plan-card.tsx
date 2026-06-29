'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { UpgradeDialog } from '@/components/billing/upgrade-dialog'

/**
 * Always-visible plan card in the sidebar footer. Shows the current plan + trial
 * countdown / status, and an Upgrade button that opens the upgrade modal.
 * Hidden when the sidebar is collapsed to icons.
 */
export function SidebarPlanCard() {
  const { orgId, plan, label, isTrialing, isLapsed, isLegacy, isActivePaid, daysLeft, isLoading } = useCurrentPlan()
  const [open, setOpen] = useState(false)

  if (isLoading || !orgId) return null

  // Tone + copy per state.
  let tone = 'border-sidebar-border bg-sidebar-accent/40'
  let title = `${label} plan`
  let subtitle = 'Active'
  let cta: string | null = null

  if (isLapsed) {
    tone = 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30'
    title = 'Trial ended'
    subtitle = 'Subscribe to keep working'
    cta = 'Subscribe'
  } else if (isTrialing) {
    tone = 'border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30'
    title = `${label} trial`
    subtitle = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
    cta = 'Upgrade'
  } else if (isLegacy) {
    title = 'Unlimited'
    subtitle = 'Legacy plan'
  } else if (isActivePaid) {
    title = `${label} plan`
    subtitle = 'Active'
    cta = plan === 'team' ? null : 'Upgrade'
  }

  return (
    <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
      <div className={cn('rounded-xl border p-3', tone)}>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-sidebar-foreground">{title}</span>
          <span className="text-xs text-sidebar-foreground/70">{subtitle}</span>
        </div>
        {cta && (
          <Button
            size="sm"
            variant={isLapsed ? 'destructive' : 'default'}
            className="mt-2.5 w-full"
            onClick={() => setOpen(true)}
          >
            {cta}
          </Button>
        )}
      </div>

      {cta && (
        <UpgradeDialog
          open={open}
          onOpenChange={setOpen}
          orgId={orgId}
          currentPlan={plan}
          hasActiveSubscription={isActivePaid}
        />
      )}
    </div>
  )
}
