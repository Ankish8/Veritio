"use client";

import { memo } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@veritio/ui";

export interface StatItem {
  key: string;
  label: string;
  icon: LucideIcon;
  value: number;
}

interface StatsRowProps {
  stats: StatItem[];
  isLoading: boolean;
  actionButton?: React.ReactNode;
}

export const StatsRow = memo(function StatsRow({
  stats,
  isLoading,
  actionButton,
}: StatsRowProps) {
  return (
    <div className="grid gap-3 md:flex md:items-center md:justify-between md:gap-4">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-6 lg:gap-8">
        {stats.map((item, index) => (
          <div
            key={item.key}
            className="flex min-w-0 items-center gap-2 rounded-xl border border-border/60 bg-muted/35 p-3 md:gap-3 md:rounded-none md:border-0 md:bg-transparent md:p-0"
          >
            <item.icon className="h-4 w-4 text-muted-foreground md:h-5 md:w-5" />
            <div className="flex min-w-0 items-baseline gap-1.5 md:gap-2">
              {isLoading ? (
                <Skeleton className="h-5 w-8 md:h-6" />
              ) : (
                <span className="text-xl font-bold tabular-nums text-foreground md:text-2xl">
                  {item.value}
                </span>
              )}
              <span className="text-xs text-muted-foreground md:text-sm">
                {item.label}
              </span>
            </div>
            {index < stats.length - 1 && (
              <div className="ml-3 hidden h-6 w-px bg-border md:block md:ml-5" />
            )}
          </div>
        ))}
      </div>

      {actionButton && (
        <div className="w-full md:w-auto [&_button]:w-full md:[&_button]:w-auto">
          {actionButton}
        </div>
      )}
    </div>
  );
});
