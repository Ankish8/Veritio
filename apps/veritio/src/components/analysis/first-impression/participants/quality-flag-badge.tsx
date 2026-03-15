'use client'

/**
 * Quality Flag Badge Component
 *
 * Displays quality indicator badges for First Impression participants.
 * Shows icon + short label with tooltip explaining the flag reason.
 */

import { Zap, Snail, MessageSquareOff, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { FirstImpressionFlag, FirstImpressionFlagType } from '@/lib/algorithms/first-impression-flagging'
import { cn } from '@/lib/utils'

/**
 * Configuration for each flag type
 */
const FLAG_CONFIG: Record<
  FirstImpressionFlagType,
  {
    icon: typeof Zap
    label: string
    className: string
  }
> = {
  speeder: {
    icon: Zap,
    label: 'Speeder',
    className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50',
  },
  slow_responder: {
    icon: Snail,
    label: 'Slow',
    className: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50',
  },
  no_responses: {
    icon: MessageSquareOff,
    label: 'No answers',
    className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50',
  },
  partial_responses: {
    icon: AlertCircle,
    label: 'Partial',
    className: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50',
  },
}

interface QualityFlagBadgeProps {
  flag: FirstImpressionFlag
  /** Show only icon (no label) */
  compact?: boolean
}

/**
 * Single quality flag badge with tooltip
 */
export function QualityFlagBadge({ flag, compact = false }: QualityFlagBadgeProps) {
  const config = FLAG_CONFIG[flag.type]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1 cursor-help',
              config.className
            )}
          >
            <Icon className="h-3 w-3" />
            {!compact && <span className="text-xs">{config.label}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{flag.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface QualityFlagListProps {
  flags: FirstImpressionFlag[]
  /** Maximum flags to show before collapsing */
  maxVisible?: number
  /** Show only icons (no labels) */
  compact?: boolean
}

/**
 * List of quality flag badges for a participant
 */
export function QualityFlagList({
  flags,
  maxVisible = 2,
  compact = false,
}: QualityFlagListProps) {
  if (flags.length === 0) {
    return <span className="text-muted-foreground text-sm">—</span>
  }

  const visibleFlags = flags.slice(0, maxVisible)
  const remainingCount = flags.length - maxVisible

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visibleFlags.map((flag, i) => (
        <QualityFlagBadge key={`${flag.type}-${i}`} flag={flag} compact={compact} />
      ))}
      {remainingCount > 0 && (
        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="text-xs cursor-help">
                +{remainingCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              <ul className="text-xs space-y-1">
                {flags.slice(maxVisible).map((flag, i) => (
                  <li key={i}>• {FLAG_CONFIG[flag.type].label}: {flag.reason}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

/**
 * Inline flag indicator for participant column (compact icon only)
 */
export function InlineFlagIndicator({ flags }: { flags: FirstImpressionFlag[] }) {
  if (flags.length === 0) return null

  // Show most severe flag inline
  const primaryFlag = flags[0]
  const config = FLAG_CONFIG[primaryFlag.type]
  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={cn('inline-flex ml-1.5', config.className.split(' ')[1])}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <ul className="text-xs space-y-1">
            {flags.map((flag, i) => (
              <li key={i}>
                <strong>{FLAG_CONFIG[flag.type].label}:</strong> {flag.reason}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
