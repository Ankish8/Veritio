'use client'

import { useState, useDeferredValue, useMemo, useCallback, memo } from 'react'
import Link from 'next/link'
import { Pencil, Copy, Check } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { useAuthFetch, useSorting } from '@/hooks'
import { prefetchStudy } from '@/lib/swr'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { SortableColumnHeader } from '@/components/ui/sortable-column-header'
import { BulkDeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog'
import { TypeToDeleteDialog } from '@/components/ui/type-to-delete-dialog'
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

import { type StudyStatus } from './study-status-badge'
import { StudyStatusToggle } from './study-status-toggle'
import { StudiesTableToolbar } from './studies-table-toolbar'
import { StudyTypeIcon } from './study-type-icon'
import { StudyActionMenu } from './study-action-menu'
import { useStudyActions } from './use-study-actions'

export type StudyType =
  | 'card_sort'
  | 'tree_test'
  | 'survey'
  | 'prototype_test'
  | 'first_click'
  | 'first_impression'
  | 'live_website_test'

export interface StudyWithCount {
  id: string
  title: string
  description: string | null
  study_type: StudyType
  status: StudyStatus
  share_code?: string
  participant_count: number
  created_at: string
  updated_at: string | null
  launched_at: string | null
  // Optional project info - present when showing all studies across projects
  project_id?: string
  project_name?: string
}

interface StudiesTableProps {
  studies: StudyWithCount[]
  /** Project ID - required for single-project view, optional for all-studies view */
  projectId?: string
  /** Show project column - automatically true if projectId is not provided */
  showProjectColumn?: boolean
  onRefetch: () => void
}

export const StudiesTable = memo(function StudiesTable({
  studies,
  projectId,
  showProjectColumn: showProjectColumnProp,
  onRefetch,
}: StudiesTableProps) {
  const authFetch = useAuthFetch()

  // Show project column if explicitly set, or if no projectId is provided (all-studies view)
  const showProjectColumn = showProjectColumnProp ?? !projectId

  // Helper to get the project ID for a study (from prop or study itself)
  const getProjectId = useCallback(
    (study: StudyWithCount) => projectId || study.project_id || '',
    [projectId]
  )

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Track which study link was just copied (for showing check icon briefly)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Copy study link to clipboard
  const handleCopyLink = useCallback(async (study: StudyWithCount) => {
    const studyUrl = `${window.location.origin}/s/${study.share_code}`
    try {
      await navigator.clipboard.writeText(studyUrl)
      setCopiedId(study.id)
      toast.success('Study link copied to clipboard')
      // Reset the check icon after 2 seconds
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }, [])

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StudyStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<StudyType | 'all'>('all')
  // Use deferred value for smooth filtering
  const deferredSearch = useDeferredValue(searchQuery)

  // Study actions hook - pass projectId for cache invalidation
  const actions = useStudyActions({ authFetch, onRefetch, projectId })

  // Filter studies based on search, status, type, and exclude studies being archived/deleted
  const filteredStudies = useMemo(() => {
    if (!Array.isArray(studies)) return []
    return studies.filter((study) => {
      // Immediately hide studies being archived (optimistic UI)
      if (actions.archivingStudyIds.has(study.id)) return false
      // Immediately hide studies being deleted (optimistic UI)
      if (actions.deletingStudyIds.has(study.id)) return false

      const matchesSearch = study.title
        .toLowerCase()
        .includes(deferredSearch.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || study.status === statusFilter
      const matchesType =
        typeFilter === 'all' || study.study_type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [studies, deferredSearch, statusFilter, typeFilter, actions.archivingStudyIds, actions.deletingStudyIds])

  // Sorting - client-side only, applied after filtering
  type SortKey = 'title' | 'status' | 'participant_count' | 'created_at'
  const { sortedData, toggleSort, getSortDirection } = useSorting<
    StudyWithCount,
    SortKey
  >(filteredStudies, {
    initialSort: { key: 'created_at', direction: 'desc' },
  })

  // Selection helpers
  const allSelected =
    filteredStudies.length > 0 &&
    filteredStudies.every((s) => selectedIds.has(s.id))
  const someSelected = selectedIds.size > 0 && !allSelected

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(filteredStudies.map((s) => s.id)) : new Set())
    },
    [filteredStudies]
  )

  const handleSelectOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  // Clear selection when filters change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setSelectedIds(new Set())
  }, [])

  const handleStatusFilterChange = useCallback((status: StudyStatus | 'all') => {
    setStatusFilter(status)
    setSelectedIds(new Set())
  }, [])

  const handleTypeFilterChange = useCallback((type: StudyType | 'all') => {
    setTypeFilter(type)
    setSelectedIds(new Set())
  }, [])

  // Bulk delete with selection clear
  const handleBulkDelete = useCallback(async () => {
    await actions.handleBulkDelete(selectedIds)
    setSelectedIds(new Set())
  }, [actions, selectedIds])

  return (
    <div className="space-y-4">
      <StudiesTableToolbar
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
        selectedCount={selectedIds.size}
        onBulkDelete={actions.openBulkDeleteDialog}
        isDeleting={actions.isDeleting}
      />

      <div className="overflow-x-auto bg-background rounded-lg">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sticky left-0 bg-muted z-10" sortable={false}>
                <Checkbox
                  checked={allSelected}
                  data-state={someSelected ? 'indeterminate' : undefined}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all studies"
                />
              </TableHead>
              <TableHead sortable={false} className="sticky left-12 bg-muted z-10">
                <SortableColumnHeader
                  direction={getSortDirection('title')}
                  onClick={() => toggleSort('title')}
                >
                  Title
                </SortableColumnHeader>
              </TableHead>
              {showProjectColumn && <TableHead className="hidden lg:table-cell">Project</TableHead>}
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead sortable={false}>
                <SortableColumnHeader
                  direction={getSortDirection('status')}
                  onClick={() => toggleSort('status')}
                >
                  Status
                </SortableColumnHeader>
              </TableHead>
              <TableHead sortable={false} className="hidden sm:table-cell">
                <SortableColumnHeader
                  direction={getSortDirection('participant_count')}
                  onClick={() => toggleSort('participant_count')}
                >
                  Participants
                </SortableColumnHeader>
              </TableHead>
              <TableHead sortable={false} className="hidden lg:table-cell">
                <SortableColumnHeader
                  direction={getSortDirection('created_at')}
                  onClick={() => toggleSort('created_at')}
                >
                  Created
                </SortableColumnHeader>
              </TableHead>
              <TableHead className="text-right" sortable={false}>
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showProjectColumn ? 8 : 7} className="h-24 text-center">
                  <p className="text-muted-foreground">
                    {!studies?.length
                      ? 'No studies yet'
                      : 'No studies match your filters'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((study, index) => (
                <TableRow
                  key={study.id}
                  data-state={selectedIds.has(study.id) ? 'selected' : undefined}
                  className="animate-in fade-in slide-in-from-bottom-2"
                  onMouseEnter={() => prefetchStudy(study.id)}
                  style={{
                    animationDelay: `${Math.min(index * 30, 300)}ms`,
                    animationDuration: "400ms",
                    animationFillMode: "both",
                  }}
                >
                  <TableCell className="sticky left-0 bg-background z-10">
                    <Checkbox
                      checked={selectedIds.has(study.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOne(study.id, checked as boolean)
                      }
                      aria-label={`Select ${study.title}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-xs sticky left-12 bg-background z-10">
                    <Link
                      href={`/projects/${getProjectId(study)}/studies/${study.id}`}
                      className="font-medium hover:underline truncate block"
                      title={study.title}
                    >
                      {study.title}
                    </Link>
                  </TableCell>
                  {showProjectColumn && (
                    <TableCell className="hidden lg:table-cell">
                      <Link
                        href={`/projects/${getProjectId(study)}`}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {study.project_name || 'Unknown Project'}
                      </Link>
                    </TableCell>
                  )}
                  <TableCell className="hidden sm:table-cell">
                    <StudyTypeIcon studyType={study.study_type} />
                  </TableCell>
                  <TableCell>
                    <StudyStatusToggle
                      status={study.status}
                      onStatusChange={(status) =>
                        actions.handleStatusChange(study.id, status)
                      }
                    />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Link
                      href={`/projects/${getProjectId(study)}/studies/${study.id}/results`}
                      className="text-muted-foreground hover:text-primary hover:underline font-medium tabular-nums"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {study.participant_count}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {new Date(study.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {study.status === 'draft' ? (
                        // Draft studies: Show edit (pencil) button
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          asChild
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Link href={`/projects/${getProjectId(study)}/studies/${study.id}/builder`}>
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit {study.title}</span>
                          </Link>
                        </Button>
                      ) : (
                        // Launched studies: Show copy link button
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopyLink(study)}
                        >
                          {copiedId === study.id ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span className="sr-only">Copy link for {study.title}</span>
                        </Button>
                      )}
                      <StudyActionMenu
                        studyId={study.id}
                        studyStatus={study.status}
                        projectId={getProjectId(study)}
                        onDuplicate={() => actions.handleDuplicate(study)}
                        onArchive={() => actions.openArchiveDialog(study)}
                        onDelete={() => actions.openDeleteDialog(study)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk Delete Dialog */}
      <BulkDeleteConfirmationDialog
        open={actions.bulkDeleteDialogOpen}
        onOpenChange={(open) => !open && actions.closeBulkDeleteDialog()}
        count={selectedIds.size}
        itemType={selectedIds.size === 1 ? 'study' : 'studies'}
        onConfirm={handleBulkDelete}
        isDeleting={actions.isDeleting}
      />

      {/* Single Study Delete Dialog */}
      <TypeToDeleteDialog
        open={!!actions.studyToDelete}
        onOpenChange={(open) => !open && actions.closeDeleteDialog()}
        itemName={actions.studyToDelete?.title ?? ''}
        itemType="study"
        description={
          <>
            This will permanently delete{' '}
            <span className="font-semibold text-foreground">
              &quot;{actions.studyToDelete?.title}&quot;
            </span>{' '}
            and all associated data including participants and responses. This action cannot be undone.
          </>
        }
        onConfirm={actions.handleSingleDelete}
        loading={actions.isDeleting}
      />

      {/* Archive Study Dialog */}
      <AlertDialog
        open={!!actions.studyToArchive}
        onOpenChange={(open) => !open && actions.closeArchiveDialog()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive study?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive &ldquo;{actions.studyToArchive?.title}&rdquo;.
              Archived studies are hidden from your main views but can be restored
              anytime from the Archive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={actions.handleArchiveConfirm}
              disabled={actions.isArchiving}
            >
              {actions.isArchiving ? 'Archiving...' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
})
