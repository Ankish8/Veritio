'use client'

import { ChevronRight, ImageIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { PrototypeTestFrame } from '@veritio/study-types'
import type { RichPathStep } from './paths-utils'

interface PathBreadcrumbProps {
  pathFrameIds: string[]
  frameLabels: string[]
  showThumbnails: boolean
  frameMap: Map<string, PrototypeTestFrame>
  goalFrameIds: Set<string>
  richSteps?: RichPathStep[]
}

/**
 * Path breadcrumb component with text or thumbnails.
 * Supports rich path mode (interleaved frame + state steps) and
 * plain frame-only mode with optional thumbnail rendering.
 */
export function PathBreadcrumb({
  pathFrameIds,
  frameLabels,
  showThumbnails,
  frameMap,
  goalFrameIds,
  richSteps,
}: PathBreadcrumbProps) {
  // Rich path mode — interleaved frame + state steps
  if (richSteps && richSteps.length > 0) {
    return (
      <div className="flex items-center gap-0.5 text-sm overflow-hidden whitespace-nowrap">
        {richSteps.map((step, index) => {
          const prevStep = index > 0 ? richSteps[index - 1] : null

          // Determine separator: state→state on same frame = dot, everything else = chevron
          let separator = null
          if (index > 0) {
            const isConsecutiveState = prevStep?.type === 'state' && step.type === 'state'
            separator = isConsecutiveState ? (
              <span className="text-muted-foreground mx-1">·</span>
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
            )
          }

          if (step.type === 'state') {
            return (
              <span key={`rich-${index}`} className="flex items-center">
                {separator}
                <span className="text-indigo-500 italic">
                  {step.label}
                </span>
              </span>
            )
          }

          // Frame step
          return (
            <span key={`rich-${index}`} className="flex items-center">
              {separator}
              <span
                className={cn(
                  'text-muted-foreground',
                  step.isGoal && 'text-green-600 font-medium'
                )}
              >
                {step.label}
              </span>
            </span>
          )
        })}
      </div>
    )
  }

  if (showThumbnails) {
    return (
      <div className="flex items-center flex-wrap gap-1">
        {pathFrameIds.map((frameId, index) => {
          const frame = frameMap.get(frameId)
          const isGoal = goalFrameIds.has(frameId)

          return (
            <div key={`${frameId}-${index}`} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'w-12 h-9 rounded border overflow-hidden bg-muted flex items-center justify-center shrink-0',
                      isGoal && 'ring-2 ring-green-500 ring-offset-1'
                    )}
                  >
                    {frame?.thumbnail_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={frame.thumbnail_url}
                        alt={frame.name || 'Frame'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-sm">{frame?.name || 'Unknown frame'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )
        })}
      </div>
    )
  }

  // Text mode
  return (
    <div className="flex items-center flex-wrap gap-0.5 text-sm">
      {frameLabels.map((label, index) => {
        const frameId = pathFrameIds[index]
        const isGoal = goalFrameIds.has(frameId)

        return (
          <span key={`${frameId}-${index}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
            )}
            <span
              className={cn(
                'text-muted-foreground',
                isGoal && 'text-green-600 font-medium'
              )}
            >
              {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
