'use client'

import { memo, useCallback } from 'react'
import { Filter, Layers, RotateCcw, Route, Eye, EyeOff } from 'lucide-react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui/components/button'
import { Label } from '@veritio/ui/components/label'
import { Slider } from '@veritio/ui/components/slider'
import { Switch } from '@veritio/ui/components/switch'
import { Badge } from '@veritio/ui/components/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@veritio/ui/components/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import type { FlowDiagramFilters, OptimalPathType } from './types'
import type { TaskOutcome } from '../../types/analytics'

interface FlowControlsProps {
  filters: FlowDiagramFilters
  onFiltersChange: (filters: FlowDiagramFilters) => void
  maxParticipants: number
  totalParticipants: number
  backtrackDisabled?: boolean
  className?: string
}
const OUTCOME_CONFIG: Record<TaskOutcome, { label: string; color: string }> = {
  success: { label: 'Success', color: 'bg-green-500' },
  failure: { label: 'Failure', color: 'bg-red-500' },
  abandoned: { label: 'Abandoned', color: 'bg-orange-500' },
  skipped: { label: 'Skipped', color: 'bg-gray-400' },
}
export const FlowControls = memo(function FlowControls({
  filters,
  onFiltersChange,
  maxParticipants,
  totalParticipants,
  backtrackDisabled = false,
  className,
}: FlowControlsProps) {
  // Handler for outcome filter changes
  const handleOutcomeToggle = useCallback(
    (outcome: TaskOutcome) => {
      const newOutcomes = new Set(filters.outcomes)
      if (newOutcomes.has(outcome)) {
        newOutcomes.delete(outcome)
      } else {
        newOutcomes.add(outcome)
      }
      onFiltersChange({ ...filters, outcomes: newOutcomes })
    },
    [filters, onFiltersChange]
  )

  // Handler for directness filter
  const handleDirectnessChange = useCallback(
    (value: 'all' | 'direct' | 'indirect') => {
      onFiltersChange({ ...filters, directness: value })
    },
    [filters, onFiltersChange]
  )

  // Handler for min participants slider
  const handleMinParticipantsChange = useCallback(
    (value: number[]) => {
      onFiltersChange({ ...filters, minParticipants: value[0] })
    },
    [filters, onFiltersChange]
  )

  // Handler for component states toggle
  const handleShowComponentStatesChange = useCallback(
    (checked: boolean) => {
      onFiltersChange({ ...filters, showComponentStates: checked })
    },
    [filters, onFiltersChange]
  )

  // Handler for backtracks toggle
  const handleShowBacktracksChange = useCallback(
    (checked: boolean) => {
      onFiltersChange({ ...filters, showBacktracks: checked })
    },
    [filters, onFiltersChange]
  )

  // Handler for optimal path highlight
  const handleHighlightPathChange = useCallback(
    (value: string) => {
      const pathType = value === 'none' ? null : (value as OptimalPathType)
      onFiltersChange({ ...filters, highlightPath: pathType })
    },
    [filters, onFiltersChange]
  )

  // Count active outcome filters
  const activeOutcomeCount = filters.outcomes.size

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-4 p-3 bg-muted/30 rounded-lg border',
        className
      )}
    >
      {/* Outcome Filter Dropdown */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2">
              <Filter className="h-3.5 w-3.5" />
              Outcomes
              {activeOutcomeCount < 4 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 px-1.5 text-[12px]"
                >
                  {activeOutcomeCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[180px]">
            <DropdownMenuLabel>Filter by outcome</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(Object.entries(OUTCOME_CONFIG) as [TaskOutcome, typeof OUTCOME_CONFIG.success][]).map(
              ([outcome, config]) => (
                <DropdownMenuCheckboxItem
                  key={outcome}
                  checked={filters.outcomes.has(outcome)}
                  onCheckedChange={() => handleOutcomeToggle(outcome)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', config.color)} />
                    {config.label}
                  </div>
                </DropdownMenuCheckboxItem>
              )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Directness Filter */}
      <div className="flex items-center gap-2">
        <Select value={filters.directness} onValueChange={handleDirectnessChange}>
          <SelectTrigger className="h-8 w-[150px]">
            <Route className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All paths</SelectItem>
            <SelectItem value="direct">Direct only</SelectItem>
            <SelectItem value="indirect">Indirect only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Min Participants Slider */}
      <div className="flex items-center gap-3 min-w-[180px]">
        <Label className="text-xs text-muted-foreground whitespace-nowrap">
          Min participants
        </Label>
        <div className="flex items-center gap-2 flex-1">
          <Slider
            value={[filters.minParticipants]}
            onValueChange={handleMinParticipantsChange}
            min={1}
            max={Math.max(maxParticipants, 1)}
            step={1}
            className="w-24"
          />
          <span className="text-xs font-medium w-6 text-right">
            {filters.minParticipants}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Component States Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Switch
              id="show-states"
              checked={filters.showComponentStates}
              onCheckedChange={handleShowComponentStatesChange}
              className="scale-90"
            />
            <Label
              htmlFor="show-states"
              className="text-xs cursor-pointer flex items-center gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              States
            </Label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs">
            Show component states (tabs, toggles, etc.) as separate nodes in the
            diagram.
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Backtracks Toggle — disabled when States is ON + V3 pathway (revisits shown inline) */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', backtrackDisabled && 'opacity-50')}>
            <Switch
              id="show-backtracks"
              checked={backtrackDisabled ? false : filters.showBacktracks}
              onCheckedChange={handleShowBacktracksChange}
              disabled={backtrackDisabled}
              className="scale-90"
            />
            <Label
              htmlFor="show-backtracks"
              className={cn(
                'text-xs flex items-center gap-1.5',
                backtrackDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Backtracks
            </Label>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <p className="text-xs">
            {backtrackDisabled
              ? 'Revisits are already shown as separate nodes when States is enabled.'
              : 'Show navigation back to previously visited screens as reverse arrows.'}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Optimal Path Highlight */}
      <div className="flex items-center gap-2">
        <Select
          value={filters.highlightPath || 'none'}
          onValueChange={handleHighlightPathChange}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Highlight path..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">
              <span className="flex items-center gap-2">
                <EyeOff className="h-3.5 w-3.5" />
                No highlight
              </span>
            </SelectItem>
            <SelectItem value="criteria">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-green-500 rounded" />
                Expected path
              </span>
            </SelectItem>
            <SelectItem value="shortest">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-blue-500 rounded border-dashed border-b border-blue-500" />
                Shortest path
              </span>
            </SelectItem>
            <SelectItem value="common">
              <span className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-purple-500 rounded" style={{ backgroundImage: 'linear-gradient(90deg, #a855f7 50%, transparent 50%)', backgroundSize: '4px 100%' }} />
                Most common
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Participant Count */}
      <div className="ml-auto text-xs text-muted-foreground">
        {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
      </div>
    </div>
  )
})

export default FlowControls
