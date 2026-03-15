'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'

interface MisclicksBarProps {
  misclickRate: number // 0-100 percentage
  averageMisclicks: number
  className?: string
}
export function MisclicksBar({
  misclickRate,
  averageMisclicks,
  className,
}: MisclicksBarProps) {
  // Clamp value to 0-100
  const normalizedValue = Math.min(100, Math.max(0, misclickRate))

  const tooltipContent = (
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
  )

  // Scale markers - every 10 units
  const scaleMarkers = Array.from({ length: 11 }, (_, i) => i * 10)

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`space-y-1 cursor-help ${className || ''}`}>
            {/* Label and value */}
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">Misclicks</span>
              <span className="font-medium">{misclickRate.toFixed(0)}%</span>
            </div>

            {/* Bar */}
            <div className="h-10 bg-stone-200 rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${normalizedValue}%` }}
              />
            </div>

            {/* Scale */}
            <div className="flex justify-between text-[12px] text-muted-foreground px-0.5">
              {scaleMarkers.map((val) => (
                <span key={val}>{val}</span>
              ))}
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="p-3 max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
