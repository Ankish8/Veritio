'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCurrentPlan } from '@/hooks/use-current-plan'
import { UpgradeDialog } from '@/components/billing/upgrade-dialog'

/**
 * Always-visible plan card in the sidebar footer: textured gradient with plan
 * status, a value blurb, and a CTA that opens the upgrade modal. Hidden when
 * the sidebar is collapsed to icons.
 */
export function SidebarPlanCard() {
  const { orgId, plan, label, isTrialing, isLapsed, isLegacy, isActivePaid, daysLeft, isLoading } = useCurrentPlan()
  const [open, setOpen] = useState(false)

  if (isLoading || !orgId) return null

  // Per-state visual config.
  let wrap = 'border-sidebar-border bg-sidebar-accent/40'
  let blob = 'bg-foreground/10'
  let title = `${label} plan`
  let subtitle = 'Active'
  let blurb: string | null = null
  let cta: string | null = null
  let ctaVariant: 'default' | 'destructive' | 'secondary' = 'default'
  // Which plan card the modal should highlight — matches the CTA's target tier.
  let highlight: 'starter' | 'pro' | 'team' = 'pro'

  if (isLapsed) {
    wrap = 'border-red-200 bg-gradient-to-br from-red-50 to-rose-100/70 dark:border-red-900/50 dark:from-red-950/40 dark:to-rose-950/30'
    blob = 'bg-red-400/30'
    title = 'Trial ended'
    subtitle = 'Your studies are paused'
    blurb = 'Subscribe to keep collecting responses.'
    cta = 'Subscribe'
    ctaVariant = 'destructive'
  } else if (isTrialing) {
    wrap = 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-amber-50 to-orange-100/70 dark:border-amber-900/50 dark:from-amber-950/40 dark:to-orange-950/30'
    blob = 'bg-amber-300/40'
    title = `${label} trial`
    subtitle = `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`
    blurb = 'Unlock recordings, AI & unlimited studies.'
    cta = 'Upgrade'
  } else if (isLegacy) {
    wrap = 'border-sidebar-border bg-gradient-to-br from-sidebar-accent/60 to-sidebar-accent/20'
    blob = 'bg-primary/15'
    title = 'Unlimited'
    subtitle = 'Legacy plan'
    blurb = 'Thanks for being an early supporter.'
  } else if (isActivePaid) {
    wrap = 'border-sidebar-border bg-gradient-to-br from-primary/[0.07] to-primary/[0.02]'
    blob = 'bg-primary/20'
    title = `${label} plan`
    subtitle = 'Active subscription'
    // Upsell to the NEXT tier up, not straight to the top plan.
    if (plan === 'starter') {
      blurb = 'Unlock recordings, AI & unlimited studies.'
      cta = 'Upgrade to Pro'
    } else if (plan === 'pro') {
      blurb = 'Need more seats and real-time collaboration?'
      cta = 'Upgrade to Team'
    } else {
      blurb = 'You’re on our top plan.'
      cta = null
    }
    // Soft upsell for paying customers — not a prominent primary CTA.
    ctaVariant = 'secondary'
  }

  return (
    <div className="px-1 pb-1 group-data-[collapsible=icon]:hidden">
      <div className={cn('relative overflow-hidden rounded-xl border p-3', wrap)}>
        {/* Texture: soft color blob */}
        <div className={cn('pointer-events-none absolute -right-5 -top-6 h-20 w-20 rounded-full blur-2xl', blob)} />

        <div className="relative">
          <p className="text-sm font-semibold leading-tight text-sidebar-foreground">{title}</p>
          <p className="text-xs text-sidebar-foreground/70">{subtitle}</p>

          {blurb && <p className="mt-2 text-[11px] leading-snug text-sidebar-foreground/70">{blurb}</p>}

          {cta && (
            <Button size="sm" variant={ctaVariant} className="mt-2.5 w-full" onClick={() => setOpen(true)}>
              {cta}
            </Button>
          )}

          <Link
            href="/settings?tab=plan-usage"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground"
          >
            Billing &amp; invoices
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
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
