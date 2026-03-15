'use client'

import { Users } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'

export function SegmentSummary() {
  const { filteredCount, totalParticipants, isFiltering } = useSegment()

  if (totalParticipants === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>No participants yet</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Users className="h-4 w-4 text-muted-foreground" />
      {isFiltering ? (
        <span>
          <span className="font-medium">{filteredCount}</span>
          <span className="text-muted-foreground"> of {totalParticipants} participants</span>
        </span>
      ) : (
        <span>
          <span className="font-medium">{totalParticipants}</span>
          <span className="text-muted-foreground"> participants</span>
        </span>
      )}
    </div>
  )
}
