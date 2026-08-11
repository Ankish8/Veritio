'use client'

import { memo } from 'react'
import { Layers3, GitBranch, ClipboardList, Frame, MousePointerClick, Eye, Globe, AppWindow } from 'lucide-react'
import { getLiveWebsiteStudyLabel, getLiveWebsiteStudyVariant } from '@/lib/live-website/study-label'

type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'

const typeConfig: Record<StudyType, { icon: typeof Layers3; label: string }> = {
  card_sort: { icon: Layers3, label: 'Card Sort' },
  tree_test: { icon: GitBranch, label: 'Tree Test' },
  survey: { icon: ClipboardList, label: 'Survey' },
  prototype_test: { icon: Frame, label: 'Figma Prototype Test' },
  first_click: { icon: MousePointerClick, label: 'First Click' },
  first_impression: { icon: Eye, label: 'First Impression' },
  live_website_test: { icon: Globe, label: 'Web App Test' },
}

export interface StudyTypeIconProps {
  studyType: StudyType
  /**
   * Study settings. Required to tell "Website Prototype Test" from "Web App
   * Test" — they share the `live_website_test` type and differ only by mode.
   */
  settings?: unknown
}

export const StudyTypeIcon = memo(function StudyTypeIcon({ studyType, settings }: StudyTypeIconProps) {
  const config = typeConfig[studyType as StudyType]
  if (!config) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        {studyType?.replace(/_/g, ' ') ?? 'Unknown'}
      </span>
    )
  }

  const isLiveWebsite = studyType === 'live_website_test'
  const isWebsitePrototype =
    isLiveWebsite && getLiveWebsiteStudyVariant(settings) === 'website_prototype'
  const Icon = isWebsitePrototype ? AppWindow : config.icon
  const label = isLiveWebsite ? getLiveWebsiteStudyLabel(settings) : config.label

  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="h-4 w-4" />
      {label}
    </span>
  )
})
