'use client'

import { memo } from 'react'
import { Layers, ToggleLeft, ToggleRight, MousePointerClick } from 'lucide-react'
import { cn } from '@veritio/ui'
import { Badge } from '@veritio/ui/components/badge'
import { Button } from '@veritio/ui/components/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import type { StateMatchingMode } from './hooks/use-interactive-heatmap-state'

interface StateIndicatorProps {
  frameName: string | null
  currentStates: Record<string, string>
  clickCount: number
  matchingMode: StateMatchingMode
  onToggleMatchingMode: () => void
  className?: string
}
export const StateIndicator = memo(function StateIndicator({
  frameName,
  currentStates,
  clickCount,
  matchingMode,
  onToggleMatchingMode,
  className,
}: StateIndicatorProps) {
  const stateEntries = Object.entries(currentStates)
  const hasStates = stateEntries.length > 0

  return (
    <div
      className={cn(
        'absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[280px]',
        className
      )}
    >
      {/* Main indicator card */}
      <div className="bg-background/95 backdrop-blur-sm rounded-lg border shadow-md p-3">
        {/* Frame name */}
        {frameName && (
          <p className="text-sm font-medium truncate mb-2" title={frameName}>
            {frameName}
          </p>
        )}

        {/* Component states */}
        {hasStates ? (
          <div className="space-y-1.5 mb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="w-3 h-3" />
              <span>Component States</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {stateEntries.slice(0, 4).map(([nodeId, variantId]) => (
                <Badge
                  key={nodeId}
                  variant="secondary"
                  className="text-[12px] px-1.5 py-0"
                >
                  {variantId || nodeId.slice(-6)}
                </Badge>
              ))}
              {stateEntries.length > 4 && (
                <Badge variant="outline" className="text-[12px] px-1.5 py-0">
                  +{stateEntries.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground mb-2">
            Default state (no interactions)
          </p>
        )}

        {/* Click count */}
        <div className="flex items-center gap-1.5 text-xs">
          <MousePointerClick className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">{clickCount}</span>
          <span className="text-muted-foreground">
            click{clickCount !== 1 ? 's' : ''} in this state
          </span>
        </div>
      </div>

      {/* Matching mode toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 bg-background/95 backdrop-blur-sm shadow-sm"
            onClick={onToggleMatchingMode}
          >
            {matchingMode === 'exact' ? (
              <>
                <ToggleLeft className="w-4 h-4" />
                <span className="text-xs">Exact Match</span>
              </>
            ) : (
              <>
                <ToggleRight className="w-4 h-4" />
                <span className="text-xs">Partial Match</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[200px]">
          <p className="text-xs">
            {matchingMode === 'exact'
              ? 'Showing clicks with all states matching exactly'
              : 'Showing clicks with at least one state matching'}
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  )
})

export default StateIndicator
