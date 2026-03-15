'use client'

import { Layers, GitBranch } from 'lucide-react'
import { cn } from '@veritio/ui'

interface FlowActivityItemProps {
  title: string
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  isActive: boolean
  onSelect: () => void
}
export function FlowActivityItem({
  title,
  studyType,
  isActive,
  onSelect,
}: FlowActivityItemProps) {
  const isCardSort = studyType === 'card_sort'
  // Note: Survey type never uses FlowActivityItem (it uses FlowQuestionSection instead)
  // but we include 'survey' in the type for compile-time safety
  const Icon = isCardSort ? Layers : GitBranch

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={cn(
        'w-full text-left rounded-lg border px-4 py-3 transition-all cursor-pointer',
        'bg-primary/[0.03] border-primary/30',
        isActive && 'ring-1 ring-primary/20'
      )}
      aria-current={isActive ? 'step' : undefined}
    >
      <div className="flex items-center gap-3">
        {/* Icon - highlighted for main activity */}
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'text-sm font-medium block',
              isActive ? 'text-foreground' : 'text-foreground/80'
            )}
          >
            {title}
          </span>
          <p className="text-xs text-muted-foreground mt-0.5">
            {studyType === 'card_sort'
              ? 'Configure cards and categories'
              : studyType === 'tree_test'
                ? 'Configure tree structure'
                : studyType === 'live_website_test'
                  ? 'Configure tasks and website'
                  : studyType === 'prototype_test'
                    ? 'Configure prototype and tasks'
                    : studyType === 'first_click'
                      ? 'Configure images and tasks'
                      : studyType === 'first_impression'
                        ? 'Configure design and questions'
                        : 'Configure survey questions'}
          </p>
        </div>
      </div>
    </div>
  )
}
