'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function TeamSettingsSkeleton() {
  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header skeleton */}
      <div className="sticky top-0 z-10 bg-background">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Tab skeleton */}
        <div className="px-6 border-b py-3">
          <div className="flex gap-6">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="p-6 max-w-3xl">
        <div className="space-y-6">
          {/* Section header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>

          <Skeleton className="h-px w-full" />

          {/* Member list skeleton */}
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
