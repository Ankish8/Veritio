import { Skeleton } from '@veritio/ui'

export function DetailsTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-32 w-full" />
      </div>
    </div>
  )
}

export function PrototypeTabSkeleton() {
  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-4">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
      <div className="w-80 border-l p-4 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

export function StudyFlowTabSkeleton() {
  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: Flow Navigator - matches actual w-[280px] lg:w-[300px] xl:w-[320px] 2xl:w-[340px] */}
      <div className="w-[280px] lg:w-[300px] xl:w-[320px] 2xl:w-[340px] flex-shrink-0 border-r border-border flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex-shrink-0">
          <Skeleton className="h-4 w-20 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
        {/* Flow items - matching actual item heights */}
        <div className="p-4 space-y-2 flex-1">
          {/* Welcome - simple item */}
          <Skeleton className="h-[52px] w-full rounded-md" />
          {/* Agreement - collapsible */}
          <Skeleton className="h-[52px] w-full rounded-md" />
          {/* Screening - with toggle */}
          <Skeleton className="h-[52px] w-full rounded-md" />
          {/* Identifier - expandable */}
          <Skeleton className="h-[72px] w-full rounded-md" />
          {/* Pre-study */}
          <Skeleton className="h-[52px] w-full rounded-md" />
          {/* Activity */}
          <Skeleton className="h-[88px] w-full rounded-md" />
          {/* Post-study */}
          <Skeleton className="h-[52px] w-full rounded-md" />
          {/* Thank you */}
          <Skeleton className="h-[52px] w-full rounded-md" />
        </div>
      </div>

      {/* Middle: Editor Panel */}
      <main className="flex-1 p-6 space-y-4 min-w-0" id="flow-editor">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
        <div className="space-y-4 mt-6">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-4 w-16 mt-6" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>

      {/* Right: Preview Panel - hidden below 1200px, matches actual widths */}
      <aside className="hidden min-[1200px]:block min-[1200px]:w-[340px] min-[1440px]:w-[420px] 2xl:w-[480px] flex-shrink-0 border-l border-border">
        <div className="p-4 space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-[400px] w-full rounded-lg" />
        </div>
      </aside>
    </div>
  )
}

export function SettingsTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full max-w-md" />
        </div>
      ))}
    </div>
  )
}

export function ContentTabSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function TreeTabSkeleton() {
  return (
    <div className="flex-1 p-6">
      <Skeleton className="h-8 w-48 mb-6" />
      <div className="space-y-2 pl-4">
        <Skeleton className="h-8 w-64" />
        <div className="pl-6 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-8 w-48" />
          <div className="pl-6 space-y-2">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-44" />
          </div>
        </div>
        <Skeleton className="h-8 w-52" />
      </div>
    </div>
  )
}

export function TasksTabSkeleton() {
  return (
    <div className="flex-1 p-6">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function BrandingTabSkeleton() {
  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-24 w-32" />
      </div>
      <div className="w-96 border-l p-4">
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </div>
    </div>
  )
}
