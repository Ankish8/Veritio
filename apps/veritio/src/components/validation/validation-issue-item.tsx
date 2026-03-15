'use client'

import { ChevronRight } from 'lucide-react'
import type { ValidationIssue } from '@/lib/validation'

interface ValidationIssueItemProps {
  issue: ValidationIssue
  onNavigate: (issue: ValidationIssue) => void
}

export function ValidationIssueItem({ issue, onNavigate }: ValidationIssueItemProps) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(issue)}
      className="group flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors hover:border-destructive/20 hover:bg-destructive/5"
    >
      <div className="flex-1 min-w-0">
        <span className="text-destructive">
          {issue.sectionLabel}
        </span>
        <span className="text-muted-foreground"> – </span>
        <span className="text-foreground">{issue.message}</span>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}
