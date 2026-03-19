import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonHeaderActions } from './primitives'
import { HeaderSkeleton } from './page-skeletons'

export function BuilderHeaderSkeleton() {
  return (
    <SkeletonHeaderActions
      buttons={[{ width: 'w-24' }, { width: 'w-28' }]}
    />
  )
}

export function BuilderNavSkeleton() {
  return (
    <div className="animate-fade-in-delayed border-b px-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-24 rounded-t-md" />
        <Skeleton className="h-10 w-32 rounded-t-md" />
        <Skeleton className="h-10 w-28 rounded-t-md" />
        <Skeleton className="h-10 w-24 rounded-t-md" />
      </div>
    </div>
  )
}

export function BuilderContentSkeleton() {
  return (
    <div className="animate-fade-in-delayed flex flex-1 flex-col">
      {/* Header skeleton -- matches BuilderShell's h-14 header */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7 rounded-md" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>

      {/* Tabs + content area -- matches BuilderShell's p-6 wrapper */}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex gap-4 mb-6 border-b pb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>

        <div className="flex-1 space-y-6 min-h-[200px]">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/**
 * Route-level alias for BuilderContentSkeleton.
 * Used by loading.tsx files that import it by name.
 */
export const BuilderSkeleton = BuilderContentSkeleton

export function PreviewSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex-1 flex items-center justify-center bg-muted p-6">
        <div className="w-full max-w-4xl bg-card rounded-2xl shadow-lg p-8 space-y-6">
          <div className="flex justify-center">
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="text-center space-y-3">
            <Skeleton className="h-7 w-2/3 mx-auto" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5 mx-auto" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
