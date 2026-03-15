/**
 * Server-rendered skeleton for the results content area.
 * Shown instantly while heavy data fetches stream in via nested Suspense.
 */
export function ResultsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tab bar skeleton */}
      <div className="flex gap-6 border-b pb-2">
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-8 w-20 bg-muted rounded" />
        <div className="h-8 w-28 bg-muted rounded" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 bg-muted rounded-lg" />
        ))}
      </div>

      {/* Chart area */}
      <div className="h-72 bg-muted rounded-lg" />

      {/* Table rows */}
      <div className="space-y-2">
        <div className="h-10 bg-muted rounded-lg" />
        <div className="h-10 bg-muted/70 rounded-lg" />
        <div className="h-10 bg-muted/50 rounded-lg" />
        <div className="h-10 bg-muted/30 rounded-lg" />
      </div>
    </div>
  )
}
