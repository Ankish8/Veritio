import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonCard, SkeletonHeaderActions, SkeletonRepeater } from './primitives'

export function ResultsHeaderSkeleton() {
  return (
    <SkeletonHeaderActions>
      <div className="flex gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </SkeletonHeaderActions>
  )
}

export function ResultsTabsSkeleton() {
  return (
    <div className="animate-fade-in-delayed flex flex-1 flex-col gap-6 p-6">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>

      <Skeleton className="h-64 rounded-lg" />
    </div>
  )
}

export function ResultsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <ResultsHeaderSkeleton />
      <ResultsTabsSkeleton />
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <SkeletonCard spacing={4}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-md" />
    </SkeletonCard>
  )
}

export function SimilarityMatrixSkeleton() {
  return (
    <SkeletonCard spacing={4}>
      <Skeleton className="h-6 w-40" />
      <SkeletonRepeater count={64} className="grid grid-cols-8 gap-1">
        {() => <Skeleton className="h-8 w-full" />}
      </SkeletonRepeater>
    </SkeletonCard>
  )
}

export function DendrogramSkeleton() {
  return (
    <SkeletonCard spacing={4}>
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-96 w-full rounded-md" />
    </SkeletonCard>
  )
}

export function AnalysisTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      <Skeleton className="h-80 rounded-lg" />
    </div>
  )
}

export function QuestionnaireResponseSkeleton() {
  return (
    <SkeletonRepeater count={4} className="space-y-4">
      {() => (
        <SkeletonCard>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </SkeletonCard>
      )}
    </SkeletonRepeater>
  )
}

export function DownloadsTabSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-5 sm:h-6 w-40 mb-1.5 sm:mb-2" />
        <Skeleton className="h-4 w-64 mb-3 sm:mb-4" />
      </div>

      <SkeletonRepeater count={3} className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {() => (
          <div className="rounded-lg border p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <Skeleton className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 sm:h-5 w-32" />
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 sm:h-4 w-3/4" />
                <div className="flex items-center gap-2 mt-2 sm:mt-3">
                  <Skeleton className="h-7 sm:h-8 w-20" />
                </div>
              </div>
            </div>
          </div>
        )}
      </SkeletonRepeater>
    </div>
  )
}

export function RecordingsTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-[180px] h-10" />
      </div>

      <Skeleton className="h-4 w-32" />

      <div className="rounded-lg border">
        <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
        <SkeletonRepeater count={5}>
          {() => (
            <div className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-1 ml-auto">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          )}
        </SkeletonRepeater>
      </div>
    </div>
  )
}
