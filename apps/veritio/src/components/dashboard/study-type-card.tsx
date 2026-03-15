"use client"

import { ArrowRight } from "lucide-react"
import { CreateStudyWithProjectDialog } from "./create-study-with-project-dialog"
import type { UseCaseDefinition, UseCaseCategory } from "@/lib/plugins/study-type-icons"

// Re-export for backward compat
export type { UseCaseCategory as StudyCategory }
export type { UseCaseDefinition }

const USE_CASE_COLORS: Record<string, { icon: string; bg: string }> = {
  card_sort: { icon: 'text-blue-500', bg: 'bg-blue-500/10' },
  tree_test: { icon: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  figma_prototype_test: { icon: 'text-violet-500', bg: 'bg-violet-500/10' },
  website_prototype_test: { icon: 'text-purple-500', bg: 'bg-purple-500/10' },
  web_app_test: { icon: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  first_click: { icon: 'text-orange-500', bg: 'bg-orange-500/10' },
  first_impression: { icon: 'text-amber-500', bg: 'bg-amber-500/10' },
  survey: { icon: 'text-emerald-500', bg: 'bg-emerald-500/10' },
}

const DEFAULT_COLORS = { icon: 'text-muted-foreground', bg: 'bg-muted' }

interface StudyTypeCardProps {
  useCase: UseCaseDefinition
}

export function StudyTypeCard({ useCase }: StudyTypeCardProps) {
  const { id, name, description, subtitle, icon: Icon, comingSoon } = useCase
  const colors = USE_CASE_COLORS[id] || DEFAULT_COLORS
  const iconColor = colors.icon
  const bgColor = colors.bg

  if (comingSoon) {
    return (
      <div
        className="relative rounded-xl border border-border/60 p-4 flex flex-col gap-3 w-full opacity-40 cursor-not-allowed"
      >
        <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            <span className="text-[12px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Soon</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
          <p className="text-xs text-muted-foreground/50 mt-2">{subtitle}</p>
        </div>
      </div>
    )
  }

  return (
    <CreateStudyWithProjectDialog
      useCase={useCase}
      trigger={
        <div
          className="group relative rounded-xl border border-border/60 p-4 flex flex-col gap-3 w-full cursor-pointer transition-all duration-150 hover:border-border hover:bg-background/60 active:scale-[0.97]"
        >
          <div className="flex items-start justify-between">
            <div className={`h-8 w-8 rounded-lg ${bgColor} flex items-center justify-center group-hover:scale-105 transition-transform`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{name}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{description}</p>
            <p className="text-xs text-muted-foreground/50 mt-2">{subtitle}</p>
          </div>
        </div>
      }
    />
  )
}
