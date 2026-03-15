'use client'

import { useState, useCallback } from 'react'
import { useAuthFetch } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, MoreHorizontal, Edit2, Trash2, PlayCircle, Users } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { CreateSegmentModal } from './create-segment-modal'
import { formatDate } from '@/lib/utils'
import { getConditionGroupsSummary } from './condition-group-builder'
import type {
  Participant,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
  SegmentCondition,
  SegmentConditionsV2,
  StudySegment,
} from '@veritio/study-types'
import { isSegmentConditionsV2 } from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type { StudyType, DesignOption, ResponseTagOption } from '@/lib/segment-conditions'

interface ResponseData {
  id?: string
  participant_id: string
  card_placements?: Record<string, string> | unknown
  total_time_ms?: number | null
}

interface SegmentsListProps {
  studyId: string
  participants: Participant[]
  responses: ResponseData[]
  flowQuestions?: StudyFlowQuestionRow[]
  flowResponses?: StudyFlowResponseRow[]
  studyType?: StudyType
  designs?: DesignOption[]
  responseTags?: ResponseTagOption[]
}

export function SegmentsList({
  studyId,
  participants: _participants,
  responses: _responses,
  flowQuestions: _flowQuestions = [],
  flowResponses: _flowResponses = [],
  studyType = 'card_sort',
  designs = [],
  responseTags = [],
}: SegmentsListProps) {
  const {
    savedSegments,
    activeSegmentId,
    availableQuestions,
    availableUrlTags,
    categoriesRange,
    timeRange,
    setSavedSegments,
    applySegment,
    clearSegment,
  } = useSegment()

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editingSegment, setEditingSegment] = useState<StudySegment | null>(null)
  const [deletingSegment, setDeletingSegment] = useState<StudySegment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const authFetch = useAuthFetch()

  const handleCreateSegment = useCallback(async (
    name: string,
    description: string | null,
    conditions: SegmentConditionsV2
  ) => {
    const response = await authFetch(`/api/studies/${studyId}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, conditions }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create segment')
    }

    const segment = await response.json()
    setSavedSegments([...savedSegments, segment])
  }, [studyId, savedSegments, setSavedSegments, authFetch])

  const handleUpdateSegment = useCallback(async (
    name: string,
    description: string | null,
    conditions: SegmentConditionsV2
  ) => {
    if (!editingSegment) return

    const response = await authFetch(`/api/studies/${studyId}/segments/${editingSegment.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, conditions }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update segment')
    }

    const segment = await response.json()
    setSavedSegments(savedSegments.map((s) => (s.id === segment.id ? segment : s)))
    setEditingSegment(null)
  }, [studyId, editingSegment, savedSegments, setSavedSegments, authFetch])

  const handleDeleteSegment = useCallback(async () => {
    if (!deletingSegment) return

    setIsDeleting(true)
    try {
      const response = await authFetch(`/api/studies/${studyId}/segments/${deletingSegment.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete segment')
      }

      setSavedSegments(savedSegments.filter((s) => s.id !== deletingSegment.id))

      if (activeSegmentId === deletingSegment.id) {
        clearSegment()
      }
    } catch {
      // no-op
    } finally {
      setIsDeleting(false)
      setDeletingSegment(null)
    }
  }, [studyId, deletingSegment, savedSegments, setSavedSegments, activeSegmentId, clearSegment, authFetch])

  const handleApplySegment = useCallback((segment: StudySegment) => {
    if (activeSegmentId === segment.id) {
      clearSegment()
    } else {
      applySegment(segment.id)
    }
  }, [activeSegmentId, applySegment, clearSegment])

  const formatConditions = (segment: StudySegment): string => {
    if (!segment.conditions) {
      return 'No conditions'
    }

    const conditions = castJson<SegmentCondition[] | SegmentConditionsV2>(segment.conditions, [])

    // Handle V2 conditions format
    if (isSegmentConditionsV2(conditions)) {
      const summary = getConditionGroupsSummary(conditions.groups)
      return summary || 'No conditions'
    }

    // Handle legacy V1 conditions array
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return 'No conditions'
    }

    return conditions.map((c) => {
      if (c.type === 'question_response' && c.questionText) {
        return `Q: "${c.questionText.slice(0, 20)}..."`
      }
      if (c.type === 'status') return `Status: ${c.value}`
      if (c.type === 'url_tag') return `Tag: ${c.tagKey}`
      if (c.type === 'categories_created') return `Categories: ${c.value}`
      if (c.type === 'time_taken') return `Time: ${c.value}s`
      if (c.type === 'participant_id') return `ID: ${c.value}`
      return c.type
    }).join(', ')
  }

  return (
    <>
      <div className="space-y-4">
        {/* Empty state - only when no segments */}
        {savedSegments.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No segments yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create and manage saved participant segments for quick filtering.
            </p>
            <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create segment
            </Button>
          </div>
        ) : (
          <>
            {/* Header with create button - only when segments exist */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Create and manage saved participant segments for quick filtering.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create segment
              </Button>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead className="text-center">Participants</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {savedSegments.map((segment) => (
                <TableRow
                  key={segment.id}
                  className={activeSegmentId === segment.id ? 'bg-primary/5' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{segment.name}</span>
                      {activeSegmentId === segment.id && (
                        <Badge variant="secondary" className="text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    {segment.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {segment.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatConditions(segment)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {segment.participant_count ?? '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(segment.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant={activeSegmentId === segment.id ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => handleApplySegment(segment)}
                        title={activeSegmentId === segment.id ? 'Clear filter' : 'Apply filter'}
                      >
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingSegment(segment)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingSegment(segment)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </>
        )}
      </div>

      {/* Create segment modal */}
      <CreateSegmentModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSave={handleCreateSegment}
        studyType={studyType}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={categoriesRange}
        timeRange={timeRange}
        designs={designs}
        responseTags={responseTags}
      />

      {/* Edit segment modal */}
      <CreateSegmentModal
        open={editingSegment !== null}
        onOpenChange={(open) => !open && setEditingSegment(null)}
        onSave={handleUpdateSegment}
        studyType={studyType}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={categoriesRange}
        timeRange={timeRange}
        designs={designs}
        responseTags={responseTags}
        editingSegment={editingSegment}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deletingSegment !== null}
        onOpenChange={(open) => !open && setDeletingSegment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSegment?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSegment}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
