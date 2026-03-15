'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Users, AlertTriangle, Filter } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { usePanelSegments } from '@/hooks/panel/use-panel-segments'
import { useAuthFetch } from '@/hooks/use-auth-fetch'
import type { PanelParticipantWithTags } from '@/lib/supabase/panel-types'

interface InviteSegmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  studyTitle: string
  /** Called with collected participant IDs and emails when user clicks "Next" */
  onParticipantsSelected?: (ids: string[], emails: string[]) => void
}

const MAX_INVITE_LIMIT = 1000

export function InviteSegmentDialog({
  open,
  onOpenChange,
  studyId: _studyId,
  studyTitle,
  onParticipantsSelected,
}: InviteSegmentDialogProps) {
  // Selection state
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null)
  const [isFetchingParticipants, setIsFetchingParticipants] = useState(false)

  // Fetch segments
  const { segments, isLoading: isLoadingSegments } = usePanelSegments()

  const authFetch = useAuthFetch()

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSegmentId(null)
    }
  }, [open])

  // Get selected segment
  const selectedSegment = selectedSegmentId
    ? segments.find((s) => s.id === selectedSegmentId)
    : null

  // Check if segment exceeds limit
  const exceedsLimit = selectedSegment && selectedSegment.participant_count > MAX_INVITE_LIMIT

  // Fetch all participant IDs and emails from a segment
  const fetchSegmentParticipants = useCallback(async (segmentId: string): Promise<{ ids: string[]; emails: string[] }> => {
    const ids: string[] = []
    const emails: string[] = []
    let page = 1
    const limit = 100
    let hasMore = true

    while (hasMore && ids.length < MAX_INVITE_LIMIT) {
      const params = new URLSearchParams({
        segment_id: segmentId,
        page: String(page),
        limit: String(limit),
        status: 'active',
      })

      const response = await authFetch(`/api/panel/participants?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch segment participants')
      }

      const data: { data: PanelParticipantWithTags[]; hasMore: boolean } = await response.json()

      data.data.forEach((p) => {
        ids.push(p.id)
        emails.push(p.email)
      })
      hasMore = data.hasMore
      page++

      if (page > 100) break
    }

    return {
      ids: ids.slice(0, MAX_INVITE_LIMIT),
      emails: emails.slice(0, MAX_INVITE_LIMIT),
    }
  }, [authFetch])

  // Handle next step
  const handleNext = useCallback(async () => {
    if (!selectedSegmentId || !selectedSegment) return

    setIsFetchingParticipants(true)

    try {
      const { ids, emails } = await fetchSegmentParticipants(selectedSegmentId)

      if (ids.length === 0) {
        toast.info('No active participants in this segment')
        return
      }

      onParticipantsSelected?.(ids, emails)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to fetch segment participants')
    } finally {
      setIsFetchingParticipants(false)
    }
  }, [selectedSegmentId, selectedSegment, fetchSegmentParticipants, onParticipantsSelected, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Invite Segment
          </DialogTitle>
          <DialogDescription>
            Invite all participants from a segment to &ldquo;{studyTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        {/* Segment list */}
        <div className="py-2">
          {isLoadingSegments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : segments.length === 0 ? (
            <div className="text-center py-8">
              <Filter className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No segments created yet</p>
              <p className="text-xs text-muted-foreground">
                Create segments in your Panel to organize participants
              </p>
            </div>
          ) : (
            <RadioGroup
              value={selectedSegmentId || ''}
              onValueChange={setSelectedSegmentId}
              className="space-y-2 max-h-[300px] overflow-y-auto"
            >
              {segments.map((segment) => (
                <div key={segment.id}>
                  <Label
                    htmlFor={segment.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors [&:has(:checked)]:border-purple-500 [&:has(:checked)]:bg-purple-50/50"
                  >
                    <RadioGroupItem value={segment.id} id={segment.id} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{segment.name}</p>
                      {segment.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {segment.description}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      <Users className="h-3 w-3 mr-1" />
                      {segment.participant_count}
                    </Badge>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </div>

        {/* Warning if over limit */}
        {exceedsLimit && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This segment has {selectedSegment?.participant_count} participants.
              Only the first {MAX_INVITE_LIMIT} will be invited.
            </span>
          </div>
        )}

        {/* Selected segment summary */}
        {selectedSegment && !exceedsLimit && (
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <span className="font-medium">{selectedSegment.participant_count}</span>{' '}
            participant{selectedSegment.participant_count !== 1 ? 's' : ''} will be invited
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleNext}
            disabled={!selectedSegmentId || isFetchingParticipants}
          >
            {isFetchingParticipants && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Invite Segment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
