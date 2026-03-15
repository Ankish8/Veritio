'use client'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { useStudyMetaStore } from '../stores/study-meta-store'

interface StudyNavigationHeaderProps {
  projectId: string
  projectName?: string
  studyId: string
  studyTitle: string
  studyStatus: 'draft' | 'active' | 'paused' | 'completed'
}

type StepId = 'setup' | 'recruit' | 'results'

interface NavigationStep {
  id: StepId
  label: string
  href: string
  enabled: boolean
}

export function StudyNavigationHeader({
  projectId,
  projectName,
  studyId,
  studyTitle,
  studyStatus,
}: StudyNavigationHeaderProps) {
  const pathname = usePathname()

  // Read status from store for real-time updates, but only if it's for the current study
  // This prevents stale data from affecting navigation after study launches or switches
  const storeStudyId = useStudyMetaStore((state) => state.studyId)
  const storeStatus = useStudyMetaStore((state) => state.meta.status)
  const isStoreForCurrentStudy = storeStudyId === studyId
  const effectiveStatus = isStoreForCurrentStudy && storeStatus ? storeStatus : studyStatus

  // Determine current step based on pathname
  const currentStep: StepId = pathname.includes('/builder')
    ? 'setup'
    : pathname.includes('/recruit')
      ? 'recruit'
      : pathname.includes('/results')
        ? 'results'
        : 'setup' // Default to setup

  // Study is launched if status is not draft
  const isLaunched = effectiveStatus !== 'draft'

  // Define navigation steps
  const steps: NavigationStep[] = [
    {
      id: 'setup',
      label: 'Setup',
      href: `/projects/${projectId}/studies/${studyId}/builder`,
      enabled: true, // Always accessible
    },
    {
      id: 'recruit',
      label: 'Recruit',
      href: `/projects/${projectId}/studies/${studyId}/recruit`, // TODO: Create recruit page
      enabled: isLaunched, // Only accessible after launch
    },
    {
      id: 'results',
      label: 'Results',
      href: `/projects/${projectId}/studies/${studyId}/results`,
      enabled: isLaunched, // Only accessible after launch
    },
  ]

  return (
    <div className="flex items-center w-full gap-4">
      {/* Left: Back button + Study name + Status */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="flex-shrink-0"
        >
          <Link href={`/projects/${projectId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="font-medium text-foreground truncate max-w-[15ch] sm:max-w-[20ch] lg:max-w-[30ch]">
          {studyTitle}
        </span>
        <StatusIndicator status={effectiveStatus} />
      </div>

      {/* Center: Step navigation - hidden on mobile, shown on md+ */}
      <nav
        className="hidden md:flex items-center gap-2 mx-auto"
        aria-label="Study workflow steps"
      >
        {steps.map((step, index) => {
          const isActive = step.id === currentStep
          const isClickable = step.enabled && !isActive

          return (
            <div key={step.id} className="flex items-center gap-2">
              {/* Step link/label */}
              {isClickable ? (
                <Link
                  href={step.href}
                  className={cn(
                    'text-sm font-medium transition-colors',
                    'hover:text-foreground',
                    'text-muted-foreground'
                  )}
                >
                  {step.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive && 'text-foreground',
                    !isActive && !step.enabled && 'text-muted-foreground/40 cursor-not-allowed',
                    !isActive && step.enabled && 'text-muted-foreground'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                  title={!step.enabled ? `Available after launching the study` : undefined}
                >
                  {step.label}
                </span>
              )}

              {/* Chevron separator (not after last step) */}
              {index < steps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}
function StatusIndicator({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 font-medium flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
        <span className="hidden sm:inline">Live</span>
      </span>
    )
  }

  if (status === 'paused') {
    return (
      <span className="ml-2 inline-flex items-center gap-1 text-xs text-yellow-600 font-medium flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
        <span className="hidden sm:inline">Paused</span>
      </span>
    )
  }

  return null
}
