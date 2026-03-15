"use client"

import { memo } from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { DashboardInsights } from "@/hooks/use-dashboard-stats"

interface DashboardInsightsGridProps {
  insights?: DashboardInsights
  isLoading?: boolean
}

export const DashboardInsightsGrid = memo(function DashboardInsightsGrid({
  insights,
  isLoading = false,
}: DashboardInsightsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="rounded-xl bg-muted/50 border border-border p-4"
          >
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    )
  }

  if (!insights) {
    return null
  }

  // Calculate weekly change percentage
  const weeklyChange =
    insights.responsesLastWeek > 0
      ? ((insights.responsesThisWeek - insights.responsesLastWeek) / insights.responsesLastWeek) * 100
      : insights.responsesThisWeek > 0
      ? 100
      : 0

  const isPositive = weeklyChange >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* Card 1: Avg Responses per Study */}
      <div className="rounded-xl bg-muted/50 border border-border p-4 flex flex-col">
        {/* Header with title left and number right */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">
              Avg Responses
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">per study</p>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {insights.avgResponsesPerStudy}
          </div>
        </div>

        {/* Vertical bar chart - top 5 studies by responses */}
        <div className="flex-1 flex items-end justify-center gap-1.5 min-h-[90px]">
          {(() => {
            // Use top studies by response count from insights
            const topStudies = insights.topStudiesByResponses || []
            const maxCount = Math.max(...topStudies.map(s => s.participant_count), 1)

            // If no studies with responses, show placeholder bars
            if (topStudies.length === 0) {
              return [20, 40, 60, 40, 30].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-muted rounded-t relative overflow-hidden"
                  style={{ height: '100%', maxWidth: '20%' }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 rounded-t bg-muted-foreground/30"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))
            }

            const colors = [
              'rgb(109, 40, 217)',  // violet-700 (darkest for highest)
              'rgb(124, 58, 237)',  // violet-600
              'rgb(139, 92, 246)',  // violet-500
              'rgb(167, 139, 250)', // violet-400
              'rgb(196, 181, 253)', // violet-300
            ]

            return topStudies.map((study, i) => {
              const heightPercent = (study.participant_count / maxCount) * 100
              // Color by rank (highest = darkest)
              const barColor = colors[Math.min(i, colors.length - 1)]

              return (
                <Tooltip key={study.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="flex-1 bg-muted rounded-t relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ height: '100%', maxWidth: '20%' }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 transition-all duration-500 rounded-t"
                        style={{ height: `${Math.max(heightPercent, 5)}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-center">
                    <p className="font-medium truncate max-w-[150px]">{study.title}</p>
                    <p className="text-xs opacity-80">{study.participant_count} responses</p>
                  </TooltipContent>
                </Tooltip>
              )
            })
          })()}
        </div>
      </div>

      {/* Card 2: This Week's Responses */}
      <div className="rounded-xl bg-muted/50 border border-border p-4 flex flex-col">
        {/* Header with title left and number right */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-xs font-medium text-muted-foreground">
              This Week
            </h4>
            <div className="flex items-center gap-1 mt-0.5">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  isPositive
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {isPositive ? '+' : ''}
                {weeklyChange.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {insights.responsesThisWeek}
          </div>
        </div>

        {/* Comparison bars */}
        <div className="space-y-2 flex-1 flex flex-col justify-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="text-[12px] text-muted-foreground w-10">Last</div>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-400 dark:bg-slate-600 rounded-full transition-all duration-300 hover:opacity-80"
                    style={{ width: `${insights.responsesLastWeek > 0 ? (insights.responsesLastWeek / Math.max(insights.responsesThisWeek, insights.responsesLastWeek, 1)) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Last week: <span className="font-semibold">{insights.responsesLastWeek}</span> responses</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="text-[12px] text-muted-foreground w-10">This</div>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-300 hover:opacity-80"
                    style={{ width: `${insights.responsesThisWeek > 0 ? (insights.responsesThisWeek / Math.max(insights.responsesThisWeek, insights.responsesLastWeek, 1)) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>This week: <span className="font-semibold">{insights.responsesThisWeek}</span> responses</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
})
