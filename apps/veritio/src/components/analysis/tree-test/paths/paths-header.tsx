'use client'

import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { TaskSelector } from '../task-results/task-selector'
import { ResultFiltersDropdown } from './result-filters-dropdown'
import type { ResultType } from './paths-utils'

interface Task {
  taskId: string
  question: string
}

interface PathsHeaderProps {
  tasks: Task[]
  selectedTaskId: string | null
  onTaskSelect: (taskId: string) => void
  selectedResultTypes: Set<ResultType>
  onSelectedResultTypesChange: (types: Set<ResultType>) => void
  showAllParticipants: boolean
  onShowAllParticipantsChange: (show: boolean) => void
}

/**
 * Header component for the Paths analysis tab.
 * Contains title with info tooltip, task selector, result filters, and participant toggle.
 */
export function PathsHeader({
  tasks,
  selectedTaskId,
  onTaskSelect,
  selectedResultTypes,
  onSelectedResultTypesChange,
  showAllParticipants,
  onShowAllParticipantsChange,
}: PathsHeaderProps) {
  return (
    <div className="space-y-3">
      {/* Title with info tooltip */}
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-foreground">
          Participant paths
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Info className="h-4 w-4" />
              <span className="sr-only">About participant paths</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">
              The paths table shows you how participants moved through your tree
              for each task, and if the path they took to a destination was
              direct or indirect. If a large portion of participants changed
              direction as they navigated through your tree (indirect routes),
              it suggests that certain parts of your tree are confusing.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Controls row */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        {/* Left side: Task selector and result filters */}
        <div className="flex items-end gap-3">
          <TaskSelector
            tasks={tasks}
            selectedTaskId={selectedTaskId}
            onTaskSelect={onTaskSelect}
            className="max-w-md"
          />

          <ResultFiltersDropdown
            selectedTypes={selectedResultTypes}
            onSelectedTypesChange={onSelectedResultTypesChange}
          />
        </div>

        {/* Right side: Show all participants checkbox */}
        <div className="flex items-center gap-2 pb-0.5">
          <Checkbox
            id="show-all-participants"
            checked={showAllParticipants}
            onCheckedChange={(checked) =>
              onShowAllParticipantsChange(checked === true)
            }
          />
          <Label
            htmlFor="show-all-participants"
            className="text-sm cursor-pointer"
          >
            Show all participant paths
          </Label>
        </div>
      </div>
    </div>
  )
}
