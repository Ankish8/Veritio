'use client'

import { memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Badge } from '@veritio/ui/components/badge'
import { cn } from '@veritio/ui'
import type { FrameWithStats, FrameSortOption } from '@veritio/prototype-test/types/analytics'

interface AllPagesGridProps {
  frames: FrameWithStats[]
  selectedFrameId?: string
  sortBy: FrameSortOption
  onFrameSelect: (frameId: string) => void
  onSortChange: (sort: FrameSortOption) => void
  isLoading?: boolean
}
export const AllPagesGrid = memo(function AllPagesGrid({
  frames,
  selectedFrameId,
  sortBy,
  onFrameSelect,
  onSortChange,
  isLoading,
}: AllPagesGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">All pages</h3>
          <div className="w-40 h-9 bg-stone-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="aspect-video bg-stone-200 rounded-lg" />
              <div className="h-4 bg-stone-200 rounded w-3/4" />
              <div className="h-3 bg-stone-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (frames.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">All pages</h3>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No frames found for this prototype test.
          </p>
        </div>
      </div>
    )
  }

  // Sort frames based on selected option, then filter out zero-visit pages
  const sortedFrames = [...frames]
    .filter((frame) => frame.pageVisits > 0)
    .sort((a, b) => {
      switch (sortBy) {
        case 'visits':
          return b.pageVisits - a.pageVisits
        case 'time':
          return b.avgTimeMs - a.avgTimeMs
        case 'misclicks':
          return b.misclickCount - a.misclickCount
        default:
          return 0
      }
    })

  return (
    <div className="space-y-4">
      {/* Header with sort control */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">All pages</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by</span>
          <Select value={sortBy} onValueChange={(v) => onSortChange(v as FrameSortOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="visits">Most page visits</SelectItem>
              <SelectItem value="time">Most time spent</SelectItem>
              <SelectItem value="misclicks">Most misclicks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Frame grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sortedFrames.map((frame) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            isSelected={frame.id === selectedFrameId}
            onClick={() => onFrameSelect(frame.id)}
          />
        ))}
      </div>
    </div>
  )
})

interface FrameCardProps {
  frame: FrameWithStats
  isSelected: boolean
  onClick: () => void
}

function FrameCard({ frame, isSelected, onClick }: FrameCardProps) {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group text-left rounded-lg border transition-all hover:border-stone-400 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-stone-100 rounded-t-lg overflow-hidden">
        {frame.thumbnailUrl ? (
          <img
            src={frame.thumbnailUrl}
            alt={frame.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            No preview
          </div>
        )}

        {/* Badges for special screens */}
        <div className="absolute top-1 right-1 flex flex-col gap-1">
          {frame.isStartingScreen && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[12px] px-1.5 py-0">
              Starting screen
            </Badge>
          )}
          {frame.isCorrectDestination && (
            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 text-[12px] px-1.5 py-0">
              Correct destination
            </Badge>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-2 space-y-0.5">
        <div className="font-medium text-sm truncate" title={frame.name}>
          {frame.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {frame.pageVisits} page visit{frame.pageVisits !== 1 ? 's' : ''}
        </div>
      </div>
    </button>
  )
}
