import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonCard, SkeletonRepeater } from './primitives'

export function StatsCardSkeleton() {
  return (
    <SkeletonCard spacing={2}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </SkeletonCard>
  )
}

export function StatsRowSkeleton() {
  return (
    <SkeletonRepeater count={4} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {() => <StatsCardSkeleton />}
    </SkeletonRepeater>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-background overflow-y-auto">
      <div className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6">
        {/* Welcome Banner */}
        <Skeleton className="h-16 w-full rounded-lg" />

        <StatsRowSkeleton />

        {/* Two-column layout: Insights + Recent Studies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <SkeletonRepeater count={4} className="grid grid-cols-2 gap-4">
              {() => <StatsCardSkeleton />}
            </SkeletonRepeater>
            <Skeleton className="h-64 rounded-lg" />
          </div>

          <SkeletonCard>
            <Skeleton className="h-5 w-32" />
            <SkeletonRepeater count={5}>
              {() => <Skeleton className="h-12 w-full rounded-md" />}
            </SkeletonRepeater>
          </SkeletonCard>
        </div>

        {/* Study Types */}
        <SkeletonRepeater count={6} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {() => <Skeleton className="h-24 rounded-lg" />}
        </SkeletonRepeater>
      </div>
    </div>
  )
}
