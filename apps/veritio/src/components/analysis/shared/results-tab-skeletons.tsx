'use client'

/**
 * Results Tab Skeleton Loaders
 *
 * Skeleton components that match the final content dimensions to prevent
 * Cumulative Layout Shift (CLS) during tab loading. Used with dynamic imports
 * for code splitting and lazy loading of heavy tab components.
 */

import { Skeleton } from '@veritio/ui'

/**
 * Skeleton for Overview tab - metrics grid + summary cards
 */
export function OverviewTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      {/* Metrics row */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      {/* Chart area */}
      <Skeleton className="h-[300px] w-full rounded-lg" />
      {/* Task/item summary */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for Participants tab - filter bar + data table
 */
export function ParticipantsTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4" data-slot="skeleton">
      {/* Filters row */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Table header */}
      <div className="flex gap-4 py-3 border-b">
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Table rows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for Analysis tab - sub-tabs + content area
 */
export function AnalysisTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      {/* Sub-tab bar */}
      <div className="flex gap-4 border-b pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24" />
        ))}
      </div>
      {/* Content area - two column layout */}
      <div className="grid grid-cols-2 gap-6">
        <Skeleton className="h-[400px] w-full rounded-lg" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    </div>
  )
}

/**
 * Skeleton for Questionnaire tab - question cards with charts
 */
export function QuestionnaireTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      {/* Section tabs */}
      <div className="flex gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* Question cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="p-4 border rounded-lg space-y-4">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-[150px] w-full rounded" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton for Recordings tab - video thumbnail grid
 */
export function RecordingsTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-[180px] w-full rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for Downloads tab - export option cards
 */
export function DownloadsTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-6 border rounded-lg space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton for Sharing tab - share options and embed code
 */
export function SharingTabSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-6" data-slot="skeleton">
      <Skeleton className="h-8 w-32" />
      {/* Share URL section */}
      <div className="p-4 border rounded-lg space-y-4">
        <Skeleton className="h-5 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      {/* Embed code section */}
      <div className="p-4 border rounded-lg space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-24 w-full rounded" />
      </div>
    </div>
  )
}
