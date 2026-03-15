"use client"

import { memo } from "react"
import Link from "next/link"
import {
  Layers3,
  GitBranch,
  ClipboardList,
  Users,
  MousePointerClick,
  Frame,
  Eye,
  Globe,
  Scale,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { RecentStudy } from "@/hooks/use-dashboard-stats"
import { cn } from "@/lib/utils"

interface RecentStudyCardProps {
  study: RecentStudy
}

const studyTypeConfig = {
  card_sort: { icon: Layers3, label: "Card Sort" },
  tree_test: { icon: GitBranch, label: "Tree Test" },
  survey: { icon: ClipboardList, label: "Survey" },
  first_click: { icon: MousePointerClick, label: "First-Click Test" },
  prototype_test: { icon: Frame, label: "Figma Prototype Test" },
  first_impression: { icon: Eye, label: "First Impression Test" },
  live_website_test: { icon: Globe, label: "Web App Test" },
  preference_test: { icon: Scale, label: "Preference Test" },
} as const

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export const RecentStudyCard = memo(function RecentStudyCard({ study }: RecentStudyCardProps) {
  const studyType = study.study_type as keyof typeof studyTypeConfig
  const config = studyTypeConfig[studyType] ?? studyTypeConfig.card_sort
  const Icon = config.icon

  return (
    <Link
      href={`/projects/${study.project_id}/studies/${study.id}`}
      className="block rounded-2xl bg-muted/50 border border-border p-6 w-full min-h-[200px] flex flex-col"
    >
      {/* Icon */}
      <Icon className="h-10 w-10 text-muted-foreground" />

      {/* Heading */}
      <h3 className="text-base font-semibold text-foreground mt-5 truncate">
        {study.title}
      </h3>

      {/* Type label */}
      <p className="text-sm text-muted-foreground mt-1">
        {config.label}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-200/60 dark:border-slate-800/60">
        <Badge
          variant="secondary"
          className={cn("capitalize text-xs font-medium px-2.5 py-1 rounded-lg", statusColors[study.status ?? 'draft'])}
        >
          {study.status ?? 'draft'}
        </Badge>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm font-semibold">{study.participant_count}</span>
        </div>
      </div>
    </Link>
  )
})
