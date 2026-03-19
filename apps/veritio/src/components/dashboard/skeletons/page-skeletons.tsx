import { Skeleton } from '@/components/ui/skeleton'
import { SkeletonRepeater } from './primitives'

// ─── Shared header used across multiple page skeletons ───

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  )
}

// ─── Project skeletons ───

export function ProjectCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  )
}

export function ProjectGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <SkeletonRepeater count={count} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {() => <ProjectCardSkeleton />}
    </SkeletonRepeater>
  )
}

// ─── Study skeletons ───

export function StudyCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

export function StudyListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRepeater count={count} className="space-y-4">
      {() => <StudyCardSkeleton />}
    </SkeletonRepeater>
  )
}

export function StudiesTableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
      <div className="flex-1 space-y-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-md" />
    </div>
  )
}

export function StudiesTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      <SkeletonRepeater count={count}>
        {() => <StudiesTableRowSkeleton />}
      </SkeletonRepeater>
    </div>
  )
}

// ─── Full page skeletons ───

export function PageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <ProjectGridSkeleton />
      </div>
    </div>
  )
}

export function StudyDetailsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-14 w-full rounded-lg" />

        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>

        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  )
}

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <Skeleton className="h-5 w-2/3" />
        <StudiesTableSkeleton />
      </div>
    </div>
  )
}

export function PanelPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1 max-w-sm rounded-md" />
          <Skeleton className="h-10 w-[140px] rounded-md" />
          <Skeleton className="h-10 w-[140px] rounded-md" />
        </div>
        <div className="rounded-xl border">
          <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
          <SkeletonRepeater count={5}>
            {() => (
              <div className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-md ml-auto" />
              </div>
            )}
          </SkeletonRepeater>
        </div>
      </div>
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-md rounded-md" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full max-w-md rounded-md" />
          </div>
        </div>

        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}
