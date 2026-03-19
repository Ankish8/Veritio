import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonRepeater } from './primitives'

export function ParticipantStudySkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-background p-4">
      <div className="max-w-lg w-full bg-card rounded-2xl shadow-lg p-8 space-y-6">
        <div className="flex justify-center">
          <Skeleton className="h-12 w-32" />
        </div>

        <div className="text-center space-y-3">
          <Skeleton className="h-7 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
        </div>

        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

export function CardSortPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col" style={{ backgroundColor: 'var(--style-page-bg, #f8fafc)' }}>
      {/* Header */}
      <div className="p-3 md:p-4 flex items-center justify-between border-b">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Mobile layout: category chips + card list */}
      <div className="md:hidden flex-1 overflow-hidden">
        <div className="px-4 pt-3 pb-1">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full shrink-0" />
            <Skeleton className="h-7 w-24 rounded-full shrink-0" />
            <Skeleton className="h-7 w-20 rounded-full shrink-0" />
          </div>
        </div>

        <div className="p-4 pt-3 space-y-2">
          <Skeleton className="h-5 w-24 mb-3" />
          <SkeletonRepeater count={6}>
            {() => (
              <div className="flex items-center gap-3 p-3 rounded-xl border">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <div className="flex-1 min-w-0 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            )}
          </SkeletonRepeater>
        </div>
      </div>

      {/* Desktop layout: side-by-side cards + categories */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden">
        <div className="w-80 lg:w-96 border-r p-4 space-y-3">
          <Skeleton className="h-5 w-28" />
          <SkeletonRepeater count={5} className="space-y-2">
            {() => <Skeleton className="h-14 w-full rounded-lg" />}
          </SkeletonRepeater>
        </div>

        <div className="flex-1 p-4 lg:p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <SkeletonRepeater count={4} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {() => (
              <div className="rounded-lg border-2 border-dashed p-4 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            )}
          </SkeletonRepeater>
        </div>
      </div>

      {/* Footer progress bar */}
      <div className="p-3 border-t flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-2 w-32 rounded-full" />
      </div>
    </div>
  )
}

export function TreeTestPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-8" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </div>

      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-24" />
      </div>

      <div className="flex-1 rounded-lg border p-4 space-y-2">
        <SkeletonRepeater count={8}>
          {() => (
            <div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-5 w-48" />
            </div>
          )}
        </SkeletonRepeater>
      </div>

      <div className="flex justify-between">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

export function PrototypeTestPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="px-4 pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-8" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <Skeleton className="h-6 w-2/3" />
      </div>

      <div className="flex-1 bg-muted/30 rounded-lg mx-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>

      <div className="px-4 pb-4 flex justify-between">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  )
}

export function FirstClickPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col space-y-4">
      <div className="px-4 pt-4 space-y-2 bg-card border-b">
        <div className="max-w-7xl mx-auto space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <div className="text-center space-y-3">
          <Skeleton className="h-96 w-full max-w-4xl rounded-lg mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}
