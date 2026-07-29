'use client'

import { useState, useCallback, useMemo } from 'react'
import { toast } from '@/components/ui/sonner'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { StudyInfoPanel } from '@/components/shared'
import { useAuthFetch, useRealtimeParticipants } from '@/hooks'

type StudyStatus = 'draft' | 'active' | 'paused' | 'completed'

interface BuilderStudyInfoPanelProps {
  studyType: string
  studyId: string
}

export function BuilderStudyInfoPanel({ studyType, studyId }: BuilderStudyInfoPanelProps) {
  const authFetch = useAuthFetch()
  const { meta, loadFromStudy } = useStudyMetaStore()
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  // Response counts come from the stats endpoint, not the meta store: the store
  // holds author-editable draft state, and a count kept there goes stale the
  // moment a participant responds. Drafts have no responses, so skip the fetch.
  const isDraft = meta.status === 'draft'
  const { stats, isLoading: isLoadingStats } = useRealtimeParticipants(studyId, {
    enabled: !isDraft,
  })

  const responseStats = useMemo(
    () =>
      isDraft
        ? null
        : {
            total: stats.total,
            completed: stats.completed,
            inProgress: stats.inProgress,
            completionRate: stats.completionRate,
            averageDurationSeconds: stats.averageDurationSeconds,
            lastResponseAt: stats.lastResponseAt,
          },
    [isDraft, stats],
  )

  const handleStatusChange = useCallback(async (newStatus: StudyStatus) => {
    setIsChangingStatus(true)
    try {
      const response = await authFetch(`/api/studies/${studyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error('Failed to update status')

      // API returns the study directly in the body (not wrapped in { study: ... })
      const updatedStudy = await response.json()

      // Update local store with new status
      if (updatedStudy?.id) {
        loadFromStudy(updatedStudy)
      }

      const labels: Record<StudyStatus, string> = {
        draft: 'moved to draft',
        active: newStatus === 'active' && meta.status === 'paused' ? 'resumed' : 'launched',
        paused: 'paused',
        completed: 'completed',
      }
      toast.success(`Study ${labels[newStatus]}`)
    } catch {
      toast.error('Failed to update study status')
    } finally {
      setIsChangingStatus(false)
    }
  }, [authFetch, studyId, loadFromStudy, meta.status])

  return (
    <StudyInfoPanel
      studyType={studyType}
      status={meta.status}
      createdAt={meta.createdAt}
      updatedAt={meta.updatedAt}
      launchedAt={meta.launchedAt}
      responseStats={responseStats}
      isLoadingResponseStats={isLoadingStats}
      closingRule={meta.closingRule}
      language={meta.language}
      isPasswordProtected={!!meta.password}
      isRecordingEnabled={!!meta.sessionRecordingSettings?.enabled}
      onStatusChange={handleStatusChange}
      isChangingStatus={isChangingStatus}
      context="builder"
    />
  )
}
