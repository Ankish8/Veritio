'use client'

import { memo } from 'react'
import { Compass, Clock, Info } from 'lucide-react'
import { Label, Input, Switch, cn } from '@veritio/ui'

interface FreeFlowConfigProps {
  hasTimeLimit: boolean
  timeLimitSeconds: number | null
  onTimeLimitEnabledChange: (enabled: boolean) => void
  onTimeLimitChange: (seconds: number | null) => void
  className?: string
}
export const FreeFlowConfig = memo(function FreeFlowConfig({
  hasTimeLimit,
  timeLimitSeconds,
  onTimeLimitEnabledChange,
  onTimeLimitChange,
  className,
}: FreeFlowConfigProps) {
  // Convert seconds to minutes for the input (user-friendly)
  const timeLimitMinutes = timeLimitSeconds ? Math.round(timeLimitSeconds / 60) : 2

  const handleTimeLimitMinutesChange = (minutes: number) => {
    // Convert back to seconds for storage
    onTimeLimitChange(minutes > 0 ? minutes * 60 : null)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Free Flow explanation card */}
      <div className="rounded-lg border-2 border-dashed border-teal-200 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-950/20 p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <Compass className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-teal-900 dark:text-teal-100">
              Free Exploration Mode
            </h4>
            <p className="text-xs text-teal-700 dark:text-teal-300/80 leading-relaxed">
              Participants can freely navigate your prototype without a specific goal.
              Their navigation path, clicks, and time on each screen will be recorded.
              Use post-task questions to gather qualitative feedback.
            </p>
          </div>
        </div>
      </div>

      {/* What's tracked info */}
      <div className="rounded-md bg-muted/50 px-3 py-2.5 border border-border/50">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">What's tracked in Free Flow:</p>
            <ul className="list-disc list-inside space-y-0.5 pl-1">
              <li>Navigation path through screens</li>
              <li>Click positions and timing</li>
              <li>Time spent on each screen</li>
              <li>Component state interactions (if enabled)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Time limit option */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              Time Limit
            </Label>
            <p className="text-xs text-muted-foreground">
              Optionally limit exploration time
            </p>
          </div>
          <Switch
            checked={hasTimeLimit}
            onCheckedChange={onTimeLimitEnabledChange}
          />
        </div>

        {/* Time limit input - only visible when enabled */}
        {hasTimeLimit && (
          <div className="flex items-center gap-2 pl-6">
            <Input
              type="number"
              min={1}
              max={30}
              value={timeLimitMinutes}
              onChange={(e) => handleTimeLimitMinutesChange(parseInt(e.target.value) || 2)}
              className="w-20 h-8 text-sm"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
            <span className="text-xs text-muted-foreground ml-2">
              (1-30 min)
            </span>
          </div>
        )}
      </div>

      {/* Best practices tip */}
      <div className="text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2 mt-2">
        <span className="font-medium">Tip:</span> Free Flow works best for early-stage
        prototypes where you want to observe natural navigation patterns without
        leading participants toward specific goals.
      </div>
    </div>
  )
})
export const FreeFlowBadge = memo(function FreeFlowBadge({
  hasTimeLimit,
  timeLimitMinutes,
}: {
  hasTimeLimit?: boolean
  timeLimitMinutes?: number
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400">
      <Compass className="h-3 w-3" />
      <span>Free Exploration</span>
      {hasTimeLimit && timeLimitMinutes && (
        <span className="text-teal-500 dark:text-teal-500">
          ({timeLimitMinutes}min)
        </span>
      )}
    </div>
  )
})
