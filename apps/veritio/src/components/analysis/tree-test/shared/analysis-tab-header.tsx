'use client'

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { TaskSelector } from '../task-results/task-selector'

interface SelectorTask {
  taskId: string
  question: string
}

interface AnalysisTabHeaderProps {
  title: string
  tooltipText: string
  tasks: SelectorTask[]
  selectedTaskId: string | null
  onTaskSelect: (taskId: string) => void
  /** Extra controls rendered alongside the task selector */
  children?: ReactNode
}

/**
 * Shared header for analysis tabs (destinations, first-click, paths).
 * Renders a title with info tooltip and task selector, with an optional
 * slot for additional controls (filters, toggles, etc.).
 */
export function AnalysisTabHeader({
  title,
  tooltipText,
  tasks,
  selectedTaskId,
  onTaskSelect,
  children,
}: AnalysisTabHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Title with info tooltip */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-4 w-4" />
              <span className="sr-only">About {title.toLowerCase()}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Controls row */}
      <div className="flex items-end gap-3">
        <TaskSelector
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onTaskSelect={onTaskSelect}
          className="max-w-md"
        />
        {children}
      </div>
    </div>
  )
}
