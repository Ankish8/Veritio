'use client'

import { useState, useCallback } from 'react'
import { mutate as globalMutate } from 'swr'
import { toast } from '@/components/ui/sonner'
import { invalidateCache } from '@/lib/swr/cache-invalidation'
import type { StudyStatus } from './study-status-badge'
import type { StudyWithCount } from './studies-table'

type AuthFetchFn = ReturnType<typeof import('@/hooks').useAuthFetch>

interface UseStudyActionsOptions {
  authFetch: AuthFetchFn
  onRefetch: () => void
  /** Project ID for cache invalidation - use when studies are scoped to a project */
  projectId?: string
}

/**
 * Hook for study CRUD actions (status change, duplicate, archive, delete).
 */
export function useStudyActions({ authFetch, onRefetch, projectId: scopeProjectId }: UseStudyActionsOptions) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [studyToDelete, setStudyToDelete] = useState<StudyWithCount | null>(null)
  const [studyToArchive, setStudyToArchive] = useState<StudyWithCount | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  // Track study IDs being archived for immediate UI feedback
  const [archivingStudyIds, setArchivingStudyIds] = useState<Set<string>>(new Set())
  // Track study IDs being deleted for immediate UI feedback (optimistic updates)
  const [deletingStudyIds, setDeletingStudyIds] = useState<Set<string>>(new Set())

  // Status change handler
  const handleStatusChange = useCallback(
    async (studyId: string, newStatus: StudyStatus) => {
      try {
        const response = await authFetch(`/api/studies/${studyId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })

        if (!response.ok) throw new Error('Failed to update status')

        const statusLabels: Record<StudyStatus, string> = {
          draft: 'moved to draft',
          active: 'launched',
          paused: 'paused',
          completed: 'completed',
        }

        toast.success(`Study ${statusLabels[newStatus]}`)
        onRefetch()
      } catch {
        toast.error('Failed to update study status')
      }
    },
    [authFetch, onRefetch]
  )

  // Duplicate study handler
  const handleDuplicate = useCallback(
    async (study: StudyWithCount) => {
      try {
        const response = await authFetch(`/api/studies/${study.id}/duplicate`, {
          method: 'POST',
        })

        if (!response.ok) throw new Error('Failed to duplicate')

        toast.success('Study duplicated')
        onRefetch()
      } catch {
        toast.error('Failed to duplicate study')
      }
    },
    [authFetch, onRefetch]
  )

  // Archive study handler - called after confirmation
  const handleArchiveConfirm = useCallback(async () => {
    if (!studyToArchive) return

    const study = studyToArchive
    const studyTitle = study.title
    const studyId = study.id
    const projectId = study.project_id || scopeProjectId

    // IMMEDIATELY hide the study from the UI by tracking it locally
    // This provides instant feedback regardless of SWR cache behavior
    setArchivingStudyIds((prev) => new Set(prev).add(studyId))

    // Close dialog immediately
    setStudyToArchive(null)
    setIsArchiving(true)

    try {
      const response = await authFetch(`/api/studies/${studyId}/archive`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to archive')

      toast.success(`"${studyTitle}" has been archived`)

      // Revalidate the current paginated studies list in the background.
      // archivingStudyIds keeps the row hidden while fresh data loads.
      onRefetch()

      // Also revalidate dashboard stats and other caches (fire-and-forget)
      authFetch('/api/internal/refresh-dashboard-stats', { method: 'POST' }).catch(() => {})
      invalidateCache('study:archived', { studyId, projectId }).catch(() => {})
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats')).catch(() => {})

      // Don't clear archivingStudyIds — keep the row hidden until SWR returns fresh data
    } catch {
      toast.error('Failed to archive study')
      // Rollback: remove from archiving set so it reappears
      setArchivingStudyIds((prev) => {
        const next = new Set(prev)
        next.delete(studyId)
        return next
      })
      onRefetch()
    } finally {
      setIsArchiving(false)
    }
  }, [studyToArchive, authFetch, onRefetch, scopeProjectId])

  // Single study delete handler
  const handleSingleDelete = useCallback(async () => {
    if (!studyToDelete) return

    const study = studyToDelete
    const studyId = study.id
    const studyTitle = study.title
    const projectId = study.project_id || scopeProjectId

    // IMMEDIATELY hide the study from the UI by tracking it locally
    // This provides instant feedback regardless of SWR cache behavior
    setDeletingStudyIds((prev) => new Set(prev).add(studyId))

    // Close dialog immediately
    setStudyToDelete(null)
    setIsDeleting(true)

    try {
      const response = await authFetch(`/api/studies/${studyId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success(`"${studyTitle}" has been deleted`)

      // Revalidate the current paginated studies list in the background.
      // deletingStudyIds keeps the row hidden while fresh data loads, preventing flash.
      onRefetch()

      // Also revalidate dashboard stats and other caches in the background (fire-and-forget)
      authFetch('/api/internal/refresh-dashboard-stats', { method: 'POST' }).catch(() => {})
      invalidateCache('study:deleted', { studyId, projectId }).catch(() => {})
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/dashboard/stats')).catch(() => {})
      globalMutate((key) => typeof key === 'string' && key.startsWith('/api/projects') && !key.includes('/studies')).catch(() => {})

      // Don't clear deletingStudyIds — keep the row hidden until SWR revalidation
      // returns fresh data (which won't contain the deleted study)
    } catch {
      toast.error('Failed to delete study')
      // Rollback: remove from deleting set so it reappears
      setDeletingStudyIds((prev) => {
        const next = new Set(prev)
        next.delete(studyId)
        return next
      })
      onRefetch()
    } finally {
      setIsDeleting(false)
    }
  }, [studyToDelete, authFetch, onRefetch, scopeProjectId])

  // Bulk delete handler
  const handleBulkDelete = useCallback(
    async (selectedIds: Set<string>) => {
      const idsToDelete = Array.from(selectedIds)

      // IMMEDIATELY hide all studies being deleted from UI
      setDeletingStudyIds((prev) => {
        const next = new Set(prev)
        idsToDelete.forEach((id) => next.add(id))
        return next
      })

      // Close dialog immediately
      setBulkDeleteDialogOpen(false)
      setIsDeleting(true)

      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          authFetch(`/api/studies/${id}`, { method: 'DELETE' })
        )
      )

      const failedCount = results.filter((r) => r.status === 'rejected').length
      const successCount = idsToDelete.length - failedCount
      const failedIds = idsToDelete.filter((_, index) => results[index].status === 'rejected')

      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} ${failedCount === 1 ? 'study' : 'studies'}`)
      }

      if (successCount > 0) {
        toast.success(`Deleted ${successCount} ${successCount === 1 ? 'study' : 'studies'}`)

        // Refresh materialized view once for all deletions
        await authFetch('/api/internal/refresh-dashboard-stats', {
          method: 'POST',
        }).catch(() => {})

        // Invalidate caches for each successfully deleted study
        // The cache orchestrator will handle dashboard and other related cache invalidations
        await Promise.all(
          idsToDelete
            .filter((_, index) => results[index].status === 'fulfilled')
            .map((studyId) => invalidateCache('study:deleted', { studyId, projectId: scopeProjectId }))
        )
      }

      // Remove successfully deleted studies from deleting set
      // Keep failed ones visible again (rollback)
      setDeletingStudyIds((prev) => {
        const next = new Set(prev)
        idsToDelete.forEach((id) => {
          if (!failedIds.includes(id)) {
            next.delete(id)
          }
        })
        return next
      })

      // Also remove failed IDs to show them again
      if (failedIds.length > 0) {
        setDeletingStudyIds((prev) => {
          const next = new Set(prev)
          failedIds.forEach((id) => next.delete(id))
          return next
        })
      }

      setIsDeleting(false)
      onRefetch()
    },
    [authFetch, onRefetch, scopeProjectId]
  )

  // Dialog controls
  const openDeleteDialog = useCallback((study: StudyWithCount) => {
    setStudyToDelete(study)
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setStudyToDelete(null)
  }, [])

  const openBulkDeleteDialog = useCallback(() => {
    setBulkDeleteDialogOpen(true)
  }, [])

  const closeBulkDeleteDialog = useCallback(() => {
    setBulkDeleteDialogOpen(false)
  }, [])

  const openArchiveDialog = useCallback((study: StudyWithCount) => {
    setStudyToArchive(study)
  }, [])

  const closeArchiveDialog = useCallback(() => {
    setStudyToArchive(null)
  }, [])

  return {
    // State
    isDeleting,
    isArchiving,
    studyToDelete,
    studyToArchive,
    bulkDeleteDialogOpen,
    archivingStudyIds, // For filtering out studies being archived from UI
    deletingStudyIds, // For filtering out studies being deleted from UI (optimistic updates)

    // Actions
    handleStatusChange,
    handleDuplicate,
    handleArchiveConfirm,
    handleSingleDelete,
    handleBulkDelete,

    // Dialog controls
    openDeleteDialog,
    closeDeleteDialog,
    openBulkDeleteDialog,
    closeBulkDeleteDialog,
    openArchiveDialog,
    closeArchiveDialog,
  }
}
