'use client'

import { useState, useCallback, memo } from 'react'
import { Layers, Plus, Trash2, HelpCircle } from 'lucide-react'
import {
  cn,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@veritio/ui'
import type { ComponentStateSuccessCriteria } from '@veritio/study-types/study-flow-types'
import type { PrototypeTestPrototype } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { StateCaptureDialog } from './component-state-capture-dialog'

export type StateLogicOperator = 'AND' | 'OR'

export interface StateSuccessCriteriaConfig {
  states: ComponentStateSuccessCriteria[]
  logic: StateLogicOperator
}

interface StateSuccessCriteriaProps {
  value: StateSuccessCriteriaConfig | null
  onChange: (config: StateSuccessCriteriaConfig) => void
  prototype: PrototypeTestPrototype | null
  startFrameId: string | null
  className?: string
}
export const StateSuccessCriteria = memo(function StateSuccessCriteria({
  value,
  onChange,
  prototype,
  startFrameId,
  className,
}: StateSuccessCriteriaProps) {
  const [showCaptureDialog, setShowCaptureDialog] = useState(false)

  const states = value?.states || []
  const logic = value?.logic || 'AND'

  const handleCaptureStates = useCallback((newStates: ComponentStateSuccessCriteria[]) => {
    onChange({
      states: newStates,
      logic: value?.logic || 'AND',
    })
  }, [onChange, value?.logic])

  const handleLogicChange = useCallback((newLogic: StateLogicOperator) => {
    onChange({
      states: value?.states || [],
      logic: newLogic,
    })
  }, [onChange, value?.states])

  const handleRemoveState = useCallback((index: number) => {
    const newStates = [...states]
    newStates.splice(index, 1)
    onChange({
      states: newStates,
      logic: value?.logic || 'AND',
    })
  }, [states, onChange, value?.logic])

  const canCapture = Boolean(prototype && startFrameId)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with logic selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
            <Layers className="w-4 h-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Required Component States</p>
            <p className="text-xs text-muted-foreground">
              Task succeeds when participant reaches these states
            </p>
          </div>
        </div>

        {states.length >= 2 && (
          <div className="flex items-center gap-2">
            <Select value={logic} onValueChange={(v) => handleLogicChange(v as StateLogicOperator)}>
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND">
                  <span className="font-medium">ALL</span>
                </SelectItem>
                <SelectItem value="OR">
                  <span className="font-medium">ANY</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="text-xs">
                  <strong>ALL:</strong> Participant must reach all selected states.
                  <br />
                  <strong>ANY:</strong> Participant must reach at least one selected state.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* State list */}
      {states.length > 0 ? (
        <div className="space-y-2">
          {states.map((state, index) => (
            <StateItem
              key={`${state.componentNodeId}-${index}`}
              state={state}
              index={index}
              showLogic={index > 0}
              logic={logic}
              onRemove={() => handleRemoveState(index)}
            />
          ))}

          {/* Add more button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed border-violet-300 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/50"
            disabled={!canCapture}
            onClick={() => setShowCaptureDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another State
          </Button>
        </div>
      ) : (
        /* Empty state */
        <div className="border-2 border-dashed border-violet-200 dark:border-violet-800 rounded-lg p-6 text-center">
          <Layers className="w-8 h-8 text-violet-400 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            No component states configured yet
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canCapture}
            onClick={() => setShowCaptureDialog(true)}
            className="border-violet-300 text-violet-600 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Capture States from Prototype
          </Button>
          {!canCapture && (
            <p className="text-xs text-muted-foreground mt-2">
              Set a start screen first to capture states
            </p>
          )}
        </div>
      )}

      {/* State capture dialog */}
      {canCapture && prototype && startFrameId && (
        <StateCaptureDialog
          open={showCaptureDialog}
          onOpenChange={setShowCaptureDialog}
          prototype={prototype}
          targetFrameNodeId={startFrameId}
          currentStates={states}
          onCapture={handleCaptureStates}
        />
      )}
    </div>
  )
})

interface StateItemProps {
  state: ComponentStateSuccessCriteria
  index: number
  showLogic: boolean
  logic: StateLogicOperator
  onRemove: () => void
}

const StateItem = memo(function StateItem({
  state,
  index,
  showLogic,
  logic,
  onRemove,
}: StateItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const displayLabel = state.variantName || `State ${state.variantId.slice(-6)}`

  return (
    <div className="relative">
      {/* Logic connector */}
      {showLogic && (
        <div className="flex items-center justify-center mb-2">
          <Badge
            variant="outline"
            className={cn(
              'text-[12px] px-2',
              logic === 'AND'
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
            )}
          >
            {logic}
          </Badge>
        </div>
      )}

      {/* State card */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'relative flex items-center gap-3 p-3 rounded-lg border transition-all',
          'bg-gradient-to-br from-violet-50/50 to-purple-50/50 border-violet-200/50',
          'dark:from-violet-950/20 dark:to-purple-950/20 dark:border-violet-800/50',
          isHovered && 'ring-2 ring-red-400/50'
        )}
      >
        {/* Step number */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>

        {/* State icon */}
        <div className="w-6 h-6 rounded bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
          <Layers className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
        </div>

        {/* State info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {displayLabel}
          </p>
          <p className="text-[12px] text-muted-foreground truncate">
            Component: {state.componentNodeId.slice(-8)}
          </p>
        </div>

        {/* Delete button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0 transition-opacity',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
})

export default StateSuccessCriteria
