'use client'

import { memo, useMemo } from 'react'
import { FileText, Users, Play, CheckCircle2 } from 'lucide-react'
import type { StudyWithCount } from './studies-table'

interface StudiesQuickStatsProps {
  studies: StudyWithCount[]
}

export const StudiesQuickStats = memo(function StudiesQuickStats({
  studies,
}: StudiesQuickStatsProps) {
  const stats = useMemo(() => {
    const totalStudies = studies.length
    const totalParticipants = studies.reduce(
      (sum, s) => sum + s.participant_count,
      0
    )
    const activeStudies = studies.filter((s) => s.status === 'active').length
    const completedStudies = studies.filter(
      (s) => s.status === 'completed'
    ).length

    return { totalStudies, totalParticipants, activeStudies, completedStudies }
  }, [studies])

  // Don't show stats row if there are no studies
  if (stats.totalStudies === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <FileText className="h-4 w-4" />
        <span>
          {stats.totalStudies} {stats.totalStudies === 1 ? 'study' : 'studies'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        <span>
          {stats.totalParticipants}{' '}
          {stats.totalParticipants === 1 ? 'participant' : 'participants'}
        </span>
      </div>
      {stats.activeStudies > 0 && (
        <div className="flex items-center gap-1.5">
          <Play className="h-4 w-4 text-green-600" />
          <span>{stats.activeStudies} active</span>
        </div>
      )}
      {stats.completedStudies > 0 && (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <span>{stats.completedStudies} completed</span>
        </div>
      )}
    </div>
  )
})
