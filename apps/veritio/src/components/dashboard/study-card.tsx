'use client'

import { Layers3, GitBranch, ClipboardList, Frame, MousePointerClick, Eye, Globe, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RecentStudy } from '@/hooks/use-dashboard-stats'

const studyTypeIcons: Record<string, LucideIcon> = {
  card_sort: Layers3,
  tree_test: GitBranch,
  survey: ClipboardList,
  prototype_test: Frame,
  first_click: MousePointerClick,
  first_impression: Eye,
  live_website_test: Globe,
}

const studyTypeLabels: Record<string, string> = {
  card_sort: 'Card Sort',
  tree_test: 'Tree Test',
  survey: 'Survey',
  prototype_test: 'Figma Prototype Test',
  first_click: 'First Click',
  first_impression: 'First Impression',
  live_website_test: 'Web App Test',
}

const studyTypeColors: Record<string, { icon: string; bg: string }> = {
  card_sort: { icon: 'text-violet-500', bg: 'bg-violet-500/10' },
  tree_test: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  survey: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  prototype_test: { icon: 'text-amber-500', bg: 'bg-amber-500/10' },
  first_click: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  first_impression: { icon: 'text-violet-500', bg: 'bg-violet-500/10' },
  live_website_test: { icon: 'text-amber-500', bg: 'bg-amber-500/10' },
}

const defaultColors = { icon: 'text-muted-foreground', bg: 'bg-muted' }

interface StudyCardProps {
  study: RecentStudy
  onClick: () => void
}

export function StudyCard({ study, onClick }: StudyCardProps) {
  const Icon = studyTypeIcons[study.study_type] ?? Layers3
  const typeLabel = studyTypeLabels[study.study_type] ?? study.study_type
  const colors = studyTypeColors[study.study_type] ?? defaultColors

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-xl border border-border/60 p-4 flex flex-col gap-3 w-full text-left cursor-pointer transition-colors hover:border-border hover:bg-background/60"
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          <Icon className={`h-4 w-4 ${colors.icon}`} />
        </div>
        <span className="text-xs text-muted-foreground">{typeLabel}</span>
      </div>
      <h3 className="text-sm font-semibold text-foreground truncate">{study.title}</h3>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {study.participant_count} participant{study.participant_count !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${study.status === 'active' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          {study.status === 'active' ? 'Active' : 'Completed'}
        </span>
      </div>
    </button>
  )
}
