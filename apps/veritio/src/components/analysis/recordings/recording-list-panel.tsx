'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Recording } from '@/hooks/use-recordings'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import { RecordingCard } from './recording-card'

interface RecordingListPanelProps {
  recordings: Recording[]
  totalCount: number
  selectedRecordingId: string | null
  participantMap: Map<string, Participant>
  participantNumberMap: Map<string, number>
  displaySettings?: ParticipantDisplaySettings | null
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  sortBy: string
  onSortChange: (sort: string) => void
  onSelect: (recording: Recording) => void
  onPreload?: (recordingId: string) => void
}

export function RecordingListPanel({
  recordings,
  totalCount,
  selectedRecordingId,
  participantMap,
  participantNumberMap,
  displaySettings,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortChange,
  onSelect,
  onPreload,
}: RecordingListPanelProps) {
  return (
    <div className="w-80 flex-shrink-0 border-r flex flex-col h-full">
      <div className="px-3 py-2 border-b flex-shrink-0 space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search participants..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="playable">Playable</SelectItem>
              <SelectItem value="has_transcript">Has Transcript</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="longest">Longest</SelectItem>
              <SelectItem value="shortest">Shortest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {recordings.length === totalCount
            ? `${totalCount} recording${totalCount !== 1 ? 's' : ''}`
            : `${recordings.length} of ${totalCount} recordings`
          }
        </p>
      </div>
      <div className="overflow-y-auto flex-1">
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            participantNumber={participantNumberMap.get(recording.participant_id) || 0}
            participant={participantMap.get(recording.participant_id)}
            displaySettings={displaySettings}
            isActive={recording.id === selectedRecordingId}
            onClick={onSelect}
            onPreload={onPreload ? () => onPreload(recording.id) : undefined}
          />
        ))}
      </div>
    </div>
  )
}
