"use client"

import { memo } from "react"
import type { LucideIcon } from "lucide-react"
import { Skeleton } from "@veritio/ui"

export interface StatItem {
  key: string
  label: string
  icon: LucideIcon
  value: number
}

interface StatsRowProps {
  stats: StatItem[]
  isLoading: boolean
  actionButton?: React.ReactNode
}

export const StatsRow = memo(function StatsRow({
  stats,
  isLoading,
  actionButton,
}: StatsRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
        {stats.map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 sm:gap-3">
            <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            <div className="flex items-baseline gap-1.5 sm:gap-2">
              {isLoading ? (
                <Skeleton className="h-5 w-8 sm:h-6" />
              ) : (
                <span className="text-xl sm:text-2xl font-bold text-foreground">
                  {item.value}
                </span>
              )}
              <span className="text-xs sm:text-sm text-muted-foreground">{item.label}</span>
            </div>
            {index < stats.length - 1 && (
              <div className="hidden sm:block h-6 w-px bg-border ml-3 sm:ml-5" />
            )}
          </div>
        ))}
      </div>

      {actionButton}
    </div>
  )
})
