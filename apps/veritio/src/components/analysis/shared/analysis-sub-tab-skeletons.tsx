'use client'

import { Skeleton } from '@veritio/ui'

export function SimilarityMatrixSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 similarity-matrix-container" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      {/* Matrix grid skeleton */}
      <div className="relative">
        <Skeleton className="h-[500px] w-full rounded-lg" />
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}

/**
 * Mirrors the PCA tab's actual layout: a header block, a controls row, then a
 * responsive grid of cards. It previously drew a chart plus a sidebar, which
 * made the tab jump on open.
 */
export function PCATabSkeleton() {
  return (
    <div className="flex-1 space-y-6 pca-tab-container" data-slot="skeleton">
      {/* Header block */}
      <div className="rounded-lg border p-4 space-y-2">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-3 w-72" />
      </div>
      {/* Controls row */}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>
      {/* Strategy cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-lg" />
        ))}
      </div>
      {/* Individual IAs */}
      <div className="border-t pt-6 space-y-4">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function DendrogramSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 dendrogram-container" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  )
}

export function PietreeSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 pietree-container" data-slot="skeleton">
      <Skeleton className="h-6 w-32" />
      <div className="flex justify-center">
        <Skeleton className="h-[450px] w-[450px] rounded-full" />
      </div>
      <div className="flex justify-center gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
    </div>
  )
}

export function SankeySkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 sankey-container" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-36" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  )
}

export function TaskResultsSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6 task-results-container" data-slot="skeleton">
      {/* Task header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Path visualization */}
      <Skeleton className="h-[300px] w-full rounded-lg" />
    </div>
  )
}

export function CategoriesTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-6 w-16 rounded-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CardsTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-20 w-full rounded" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SurveyResponsesSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-[200px] w-full rounded" />
        </div>
      ))}
    </div>
  )
}

export function ClickMapsSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      {/* Click map image with overlay */}
      <Skeleton className="h-[500px] w-full rounded-lg" />
      {/* Stats bar */}
      <div className="flex gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  )
}

export function FirstClickSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      {/* Task selector */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Click distribution chart */}
      <Skeleton className="h-[400px] w-full rounded-lg" />
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function PathsSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Path list */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="p-3 border rounded-lg flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function DestinationsSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      <Skeleton className="h-6 w-36" />
      {/* Destination breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-[350px] w-full rounded-lg" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
