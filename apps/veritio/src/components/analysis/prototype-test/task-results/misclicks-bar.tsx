'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface MisclicksBarProps {
  misclickRate: number
  averageMisclicks: number
  className?: string
}

const SCALE_MARKERS = Array.from({ length: 11 }, (_, i) => i * 10)

export function MisclicksBar({
  misclickRate,
  averageMisclicks,
  className,
}: MisclicksBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, misclickRate))

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('space-y-1 cursor-help', className)}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Misclicks</span>
              <span className="font-medium">{misclickRate.toFixed(0)}%</span>
            </div>

            <div className="h-10 bg-muted rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${normalizedValue}%` }}
              />
            </div>

            <div className="flex justify-between text-[12px] text-muted-foreground px-0.5">
              {SCALE_MARKERS.map((val) => (
                <span key={val}>{val}</span>
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs">
          <div className="space-y-1 text-sm">
            <div className="font-medium">Misclicks</div>
            <div className="text-muted-foreground">
              The misclick rate measures how many clicks of the total
              were on areas that did not lead anywhere.
            </div>
            <div className="mt-2 text-muted-foreground">
              Average misclicks per participant: {averageMisclicks.toFixed(1)}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
