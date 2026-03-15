'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Users, X, Filter } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { cn } from '@/lib/utils'

interface GlobalSegmentIndicatorProps {
  className?: string
  showClearButton?: boolean
  compact?: boolean
}

export function GlobalSegmentIndicator({
  className,
  showClearButton = true,
  compact = false,
}: GlobalSegmentIndicatorProps) {
  const {
    savedSegments,
    activeSegmentId,
    filteredCount,
    totalParticipants,
    clearSegment,
    isComparing,
    comparisonSegmentId,
  } = useSegment()

  // Get active and comparison segment names
  const activeSegment = savedSegments.find((s) => s.id === activeSegmentId)
  const comparisonSegment = savedSegments.find((s) => s.id === comparisonSegmentId)

  // No active segment - don't show indicator
  if (!activeSegmentId || !activeSegment) {
    return null
  }

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={cn('gap-1.5', className)}>
              <Filter className="h-3 w-3" />
              {activeSegment.name}
              <span className="text-muted-foreground">
                ({filteredCount})
              </span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Filtering to segment: {activeSegment.name}</p>
            <p className="text-muted-foreground">
              {filteredCount} of {totalParticipants} participants
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded">
          <Filter className="h-4 w-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-medium">
            {activeSegment.name}
            {isComparing && comparisonSegment && (
              <span className="text-muted-foreground font-normal">
                {' '}vs {comparisonSegment.name}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />
            {filteredCount} of {totalParticipants} participants
          </div>
        </div>
      </div>

      {showClearButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSegment}
                className="ml-auto h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear segment filter</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}
