import { Skeleton } from '@/components/ui/skeleton'

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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}

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
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <StudyCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between border-b px-6 py-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  )
}

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
        {/* Status Banner */}
        <Skeleton className="h-14 w-full rounded-lg" />

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>

        {/* Study Details */}
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  )
}

// Builder page granular skeletons for streaming
export function BuilderHeaderSkeleton() {
  return (
    <div className="animate-fade-in-delayed border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>
    </div>
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
      {/* Header skeleton — matches BuilderShell's h-14 header */}
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

      {/* Tabs + content area — matches BuilderShell's p-6 wrapper */}
      <div className="flex flex-1 flex-col p-6">
        {/* Tab list skeleton */}
        <div className="flex gap-4 mb-6 border-b pb-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Tab content area */}
        <div className="flex-1 space-y-6" style={{ minHeight: 200 }}>
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

// BuilderSkeleton is an alias for BuilderContentSkeleton wrapped in a flex container.
// Kept as a named export for route-level loading.tsx files that import it by name.
export const BuilderSkeleton = BuilderContentSkeleton

// Results page granular skeletons for streaming
export function ResultsHeaderSkeleton() {
  return (
    <div className="animate-fade-in-delayed border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-3">
          {/* Quick stats */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ResultsTabsSkeleton() {
  return (
    <div className="animate-fade-in-delayed flex flex-1 flex-col gap-6 p-6">
      {/* Tabs */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>

      {/* Table */}
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

// Project Detail Page Skeleton - shows header + description + studies table
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

// Single table row skeleton
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

// Full studies table skeleton
export function StudiesTableSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border">
      {/* Table Header */}
      <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      {/* Table Rows */}
      {Array.from({ length: count }).map((_, i) => (
        <StudiesTableRowSkeleton key={i} />
      ))}
    </div>
  )
}

// Dashboard page skeleton - matches analytics dashboard layout
export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-background overflow-y-auto">
      <div className="w-full max-w-[1400px] flex flex-col gap-4 sm:gap-6">
        {/* Welcome Banner */}
        <Skeleton className="h-16 w-full rounded-lg" />

        {/* Stats Row */}
        <StatsRowSkeleton />

        {/* Two-column layout: Insights + Recent Studies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
            <Skeleton className="h-64 rounded-lg" />
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </div>

        {/* Study Types */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Panel page skeleton - matches header + filters + table layout
export function PanelPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-4 p-6">
        {/* Filters row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 flex-1 max-w-sm rounded-md" />
          <Skeleton className="h-10 w-[140px] rounded-md" />
          <Skeleton className="h-10 w-[140px] rounded-md" />
        </div>
        {/* Table */}
        <div className="rounded-xl border">
          <div className="flex items-center gap-4 border-b bg-muted/50 px-4 py-3">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20 ml-auto" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-md ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Settings page skeleton
export function SettingsSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <HeaderSkeleton />
      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Profile Section */}
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

        {/* Form Fields */}
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

        {/* Action Button */}
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

// Participant study loading skeleton - centered card layout
export function ParticipantStudySkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 dark:bg-background p-4">
      <div className="max-w-lg w-full bg-card rounded-2xl shadow-lg p-8 space-y-6">
        {/* Logo */}
        <div className="flex justify-center">
          <Skeleton className="h-12 w-32" />
        </div>

        {/* Title & Description */}
        <div className="text-center space-y-3">
          <Skeleton className="h-7 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mx-auto" />
        </div>

        {/* Content Area */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>

        {/* Button */}
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

// Card Sort Player loading skeleton – responsive for mobile & desktop
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
        {/* Category chip strip */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex gap-2">
            <Skeleton className="h-7 w-28 rounded-full shrink-0" />
            <Skeleton className="h-7 w-24 rounded-full shrink-0" />
            <Skeleton className="h-7 w-20 rounded-full shrink-0" />
          </div>
        </div>

        {/* Cards to Sort heading + cards */}
        <div className="p-4 pt-3 space-y-2">
          <Skeleton className="h-5 w-24 mb-3" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border">
              <Skeleton className="h-6 w-6 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-full" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop layout: side-by-side cards + categories */}
      <div className="hidden md:flex flex-1 flex-row overflow-hidden">
        {/* Cards pile */}
        <div className="w-80 lg:w-96 border-r p-4 space-y-3">
          <Skeleton className="h-5 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>

        {/* Categories area */}
        <div className="flex-1 p-4 lg:p-6">
          <Skeleton className="h-5 w-24 mb-4" />
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-lg border-2 border-dashed p-4 space-y-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ))}
          </div>
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

// Tree Test Player loading skeleton
export function TreeTestPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6">
      {/* Task Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-8" />
        </div>
        <Skeleton className="h-6 w-3/4" />
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Tree navigation */}
      <div className="flex-1 rounded-lg border p-4 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-48" />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex justify-between">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  )
}

// Prototype Test Player loading skeleton
export function PrototypeTestPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Task Header */}
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

      {/* Figma Embed Area */}
      <div className="flex-1 bg-muted/30 rounded-lg mx-4 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Skeleton className="h-12 w-12 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 pb-4 flex justify-between">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  )
}

// First-Click player loading skeleton
export function FirstClickPlayerSkeleton() {
  return (
    <div className="flex-1 flex flex-col space-y-4">
      {/* Task Header */}
      <div className="px-4 pt-4 space-y-2 bg-card border-b">
        <div className="max-w-7xl mx-auto space-y-2">
          <Skeleton className="h-4 w-24" /> {/* Task progress */}
          <Skeleton className="h-6 w-2/3" /> {/* Task instruction */}
        </div>
      </div>

      {/* Image Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <div className="text-center space-y-3">
          <Skeleton className="h-96 w-full max-w-4xl rounded-lg mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    </div>
  )
}

// Analysis tab content skeleton
export function AnalysisTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Content area */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table/Matrix */}
      <Skeleton className="h-80 rounded-lg" />
    </div>
  )
}

// Generic chart skeleton
export function ChartSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <Skeleton className="h-64 w-full rounded-md" />
    </div>
  )
}

// Similarity Matrix skeleton
export function SimilarityMatrixSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-8 gap-1">
        {Array.from({ length: 64 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

// Dendrogram skeleton
export function DendrogramSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-96 w-full rounded-md" />
    </div>
  )
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  )
}

// Stats row skeleton (for dashboard)
export function StatsRowSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  )
}

// Questionnaire response skeleton
export function QuestionnaireResponseSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

// Downloads tab skeleton
export function DownloadsTabSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <Skeleton className="h-5 sm:h-6 w-40 mb-1.5 sm:mb-2" />
        <Skeleton className="h-4 w-64 mb-3 sm:mb-4" />
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-3 sm:p-4">
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
        ))}
      </div>
    </div>
  )
}

// Recordings tab skeleton
export function RecordingsTabSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <Skeleton className="flex-1 h-10" />
        <Skeleton className="w-[180px] h-10" />
      </div>

      {/* Results count */}
      <Skeleton className="h-4 w-32" />

      {/* Table */}
      <div className="rounded-lg border">
        {/* Header */}
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
        {/* Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0">
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
        ))}
      </div>
    </div>
  )
}

// Preview page skeleton
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
