'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Search, Users, AlertTriangle, Tag } from 'lucide-react'
import { usePanelParticipants } from '@/hooks/panel/use-panel-participants'
import { usePanelTags } from '@/hooks/panel/use-panel-tags'
import { ParticipantRow } from './participant-row'
import { useDebounce } from '@/hooks/use-debounce'

interface SelectParticipantsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  studyTitle: string
  /** Called with selected participant IDs and emails when user clicks "Next" */
  onParticipantsSelected?: (ids: string[], emails: string[]) => void
}

const PAGE_SIZE = 50
const MAX_INVITE_LIMIT = 1000

export function SelectParticipantsDialog({
  open,
  onOpenChange,
  studyId: _studyId,
  studyTitle,
  onParticipantsSelected,
}: SelectParticipantsDialogProps) {
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(1)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)

  // Debounce search for better UX
  const debouncedSearch = useDebounce(searchInput, 300)

  // Fetch tags for filter dropdown
  const { tags } = usePanelTags()

  // Fetch participants with current filters
  const { participants, total, hasMore, isLoading } = usePanelParticipants({
    filters: {
      search: debouncedSearch || undefined,
      status: 'active',
      tag_id: selectedTagId || undefined,
    },
    pagination: {
      page,
      limit: PAGE_SIZE,
    },
  })

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set()) // eslint-disable-line react-hooks/set-state-in-effect
      setSearchInput('')
      setPage(1)
      setSelectedTagId(null)
    }
  }, [open])

  // Handle individual participant toggle
  const handleToggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })
  }, [])

  // Handle select all visible participants
  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        participants.forEach((p) => next.add(p.id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        participants.forEach((p) => next.delete(p.id))
        return next
      })
    }
  }, [participants])

  // Check if all visible participants are selected
  const allVisibleSelected = useMemo(() => {
    if (participants.length === 0) return false
    return participants.every((p) => selectedIds.has(p.id))
  }, [participants, selectedIds])

  // Check if selection exceeds limit
  const exceedsLimit = selectedIds.size > MAX_INVITE_LIMIT

  // Handle next step — pass selected IDs + emails to parent
  const handleNext = useCallback(() => {
    if (selectedIds.size === 0) return

    const idsToInvite = Array.from(selectedIds).slice(0, MAX_INVITE_LIMIT)
    const emails = participants
      .filter((p) => selectedIds.has(p.id))
      .map((p) => p.email)

    onParticipantsSelected?.(idsToInvite, emails)
    onOpenChange(false)
  }, [selectedIds, participants, onParticipantsSelected, onOpenChange])

  // Load more participants
  const handleLoadMore = useCallback(() => {
    setPage((p) => p + 1)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Participants
          </DialogTitle>
          <DialogDescription>
            Choose participants from your panel to invite to &ldquo;{studyTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Search + Tag Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={selectedTagId || '_all'}
            onValueChange={(v) => {
              setSelectedTagId(v === '_all' ? null : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[180px] shrink-0">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="All tags" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All tags</SelectItem>
              {(tags || []).map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Warning if over limit */}
        {exceedsLimit && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              You can invite up to {MAX_INVITE_LIMIT} participants at once.
              Only the first {MAX_INVITE_LIMIT} will be invited.
            </span>
          </div>
        )}

        {/* Participant list */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {isLoading && participants.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch || selectedTagId
                  ? 'No participants match your filters'
                  : 'No active participants in your panel'}
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Select all header */}
              <div className="flex items-center gap-3 p-2 border-b shrink-0">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  Select all visible ({participants.length})
                </span>
                {total > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {total} total participants
                  </span>
                )}
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto space-y-1 py-2">
                {participants.map((participant) => (
                  <ParticipantRow
                    key={participant.id}
                    participant={participant}
                    isSelected={selectedIds.has(participant.id)}
                    onToggle={handleToggle}
                  />
                ))}

                {/* Load more */}
                {hasMore && (
                  <div className="pt-2 pb-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
            {exceedsLimit && ` (max ${MAX_INVITE_LIMIT})`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedIds.size === 0}
            >
              Invite {selectedIds.size > 0 ? `(${Math.min(selectedIds.size, MAX_INVITE_LIMIT)})` : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
