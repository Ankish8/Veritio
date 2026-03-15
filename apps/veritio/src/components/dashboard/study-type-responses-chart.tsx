"use client"

import { memo } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { StudyTypeResponses } from "@/hooks/use-dashboard-stats"

interface StudyTypeResponsesChartProps {
  data?: StudyTypeResponses[]
  isLoading?: boolean
}

export const StudyTypeResponsesChart = memo(function StudyTypeResponsesChart({
  data,
  isLoading = false,
}: StudyTypeResponsesChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl bg-muted/50 border border-border p-4">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 flex-1" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return null
  }

  // Calculate max for scaling and total for percentage
  const maxCount = Math.max(...data.map(d => d.count), 1)
  const totalResponses = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="rounded-xl bg-muted/50 border border-border p-4 mt-3 sm:mt-4">
      <h4 className="text-sm font-semibold text-foreground mb-4">
        Responses by Study Type
      </h4>

      <div className="space-y-3">
        {data.map((item, index) => {
          const barPercentage = (item.count / maxCount) * 100
          const sharePercentage = totalResponses > 0 ? ((item.count / totalResponses) * 100).toFixed(1) : '0'

          // Color intensity based on value: higher = darker
          const colors = [
            'rgb(109, 40, 217)',  // violet-700 (darkest for highest)
            'rgb(124, 58, 237)',  // violet-600
            'rgb(139, 92, 246)',  // violet-500
            'rgb(167, 139, 250)', // violet-400
            'rgb(196, 181, 253)', // violet-300
            'rgb(221, 214, 254)', // violet-200 (lightest for lowest)
          ]
          const barColor = colors[Math.min(index, colors.length - 1)]

          return (
            <Tooltip key={item.type}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-3 cursor-pointer group">
                  {/* Label */}
                  <div className="w-24 sm:w-32 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {item.label}
                  </div>

                  {/* Bar */}
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 group-hover:opacity-80"
                        style={{
                          width: `${Math.max(barPercentage, 5)}%`,
                          backgroundColor: barColor
                        }}
                      >
                        {barPercentage > 15 && (
                          <span className="text-[12px] font-semibold text-white">
                            {item.count}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Count (outside bar if bar is too small) */}
                    {barPercentage <= 15 && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 w-10 text-right">
                        {item.count}
                      </span>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-center">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs opacity-80">{item.count} responses ({sharePercentage}%)</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
})
