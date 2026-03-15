'use client'

import { useMemo } from 'react'
import { Info, MousePointerClick, Shuffle, Trash2, Ungroup, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { UrlPathStep } from '@/stores/study-builder/live-website-builder'

interface UrlPathStepsListProps {
  steps: UrlPathStep[]
  isRecording: boolean
  isSelectMode: boolean
  selectedStepIds: Set<string>
  groupHintDismissed: boolean
  canCreateGroup: boolean
  onSetIsSelectMode: (value: boolean) => void
  onSetSelectedStepIds: (value: Set<string>) => void
  onSetGroupHintDismissed: (value: boolean) => void
  onCreateGroup: () => void
  onUngroup: (groupId: string) => void
  onRemoveStep: (id: string) => void
}

export function UrlPathStepsList({
  steps,
  isRecording,
  isSelectMode,
  selectedStepIds,
  groupHintDismissed,
  canCreateGroup,
  onSetIsSelectMode,
  onSetSelectedStepIds,
  onSetGroupHintDismissed,
  onCreateGroup,
  onUngroup,
  onRemoveStep,
}: UrlPathStepsListProps) {
  const hasExistingGroups = useMemo(() => steps.some(s => s.group), [steps])
  const showGroupHint = steps.length >= 4 && !isRecording && !hasExistingGroups && !groupHintDismissed && !isSelectMode

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">
            Recorded steps ({steps.length})
          </Label>
          {steps.length >= 4 && !isRecording && (
            <div className="flex items-center gap-2">
              {isSelectMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={!canCreateGroup}
                        onClick={onCreateGroup}
                      >
                        <Shuffle className="h-3 w-3 mr-1" />
                        Mark as Any Order
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px]">
                    {canCreateGroup
                      ? 'Group selected steps so participants can complete them in any order'
                      : 'Select 2 or more consecutive middle steps (not Start or Goal)'}
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSelectMode ? 'secondary' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      onSetIsSelectMode(!isSelectMode)
                      onSetSelectedStepIds(new Set())
                    }}
                  >
                    {isSelectMode ? (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </>
                    ) : (
                      <>
                        <Shuffle className="h-3 w-3 mr-1" />
                        Allow Any Order
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px]">
                  {isSelectMode
                    ? 'Exit selection mode'
                    : 'Select steps that participants can complete in any order (e.g. filling in settings that don\'t depend on each other)'}
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Selection mode banner */}
        {isSelectMode && (
          <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              Check the steps that can be done in <strong>any order</strong>, then click <strong>Mark as Any Order</strong>.
              Start and Goal steps must stay in position.
            </p>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto overflow-x-hidden rounded-md border">
          {steps.map((step, index) => {
            const isFirstInGroup = step.group && (index === 0 || steps[index - 1].group !== step.group)
            const isLastInGroup = step.group && (index === steps.length - 1 || steps[index + 1].group !== step.group)
            const isInGroup = !!step.group
            const isFirst = index === 0
            const isLast = index === steps.length - 1 && steps.length > 1
            const isSelectable = isSelectMode && !isFirst && !isLast && !isInGroup

            return (
              <div key={step.id}>
                {/* Group header */}
                {isFirstInGroup && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border-b border-l-2 border-l-primary">
                    <Shuffle className="h-3 w-3 text-primary" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs font-medium text-primary cursor-default">
                          Any order
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px]">
                        Participants can complete these steps in any sequence. All steps must still be completed for success.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onUngroup(step.group!)}
                          className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <Ungroup className="h-3 w-3" />
                          Ungroup
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Remove grouping and require these steps in exact order
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm border-b last:border-b-0 min-w-0 ${
                    isInGroup ? 'border-l-2 border-l-primary bg-primary/[0.02]' : ''
                  } ${isLastInGroup ? 'border-b-2 border-b-primary/20' : ''}`}
                >
                  {/* Selection checkbox */}
                  {isSelectMode && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Checkbox
                            checked={selectedStepIds.has(step.id)}
                            disabled={!isSelectable}
                            onCheckedChange={(checked) => {
                              const next = new Set(selectedStepIds)
                              if (checked) next.add(step.id)
                              else next.delete(step.id)
                              onSetSelectedStepIds(next)
                            }}
                            className="flex-shrink-0"
                          />
                        </span>
                      </TooltipTrigger>
                      {!isSelectable && (
                        <TooltipContent side="left">
                          {isFirst ? 'Start step must stay first'
                            : isLast ? 'Goal step must stay last'
                            : 'Already in a group'}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                  <span className="flex-shrink-0 text-sm font-medium text-muted-foreground w-5">
                    {index + 1}.
                  </span>
                  {isFirst && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground uppercase cursor-default">
                          Start
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        The first page participants land on
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {isLast && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-foreground uppercase cursor-default">
                          Goal
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        The final step that completes the task
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {step.type === 'click' ? (
                    <>
                      <span className="flex-shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground uppercase flex items-center gap-0.5">
                        <MousePointerClick className="h-3 w-3" />
                        Click
                      </span>
                      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                        {step.elementText || step.label}
                      </span>
                      <span className="flex-shrink-0 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap font-mono text-xs text-muted-foreground">
                        {step.selector}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm">{step.pathname}</span>
                      <span className="flex-shrink-0 max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-muted-foreground">
                        {step.label !== step.pathname ? step.label : ''}
                      </span>
                    </>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => onRemoveStep(step.id)}
                        className="flex-shrink-0 text-muted-foreground hover:text-destructive p-1"
                        aria-label={`Remove step ${index + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left">Remove step</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            )
          })}
        </div>

        {/* Grouping hint — shown once when enough steps, no groups yet */}
        {showGroupHint && (
          <div className="flex items-start gap-2 rounded-md border border-muted bg-muted/30 px-3 py-2">
            <Shuffle className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground">
                Some steps can be done in any order?
                Use <strong className="text-foreground">Allow Any Order</strong> above to let participants complete them in whatever sequence they prefer.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSetGroupHintDismissed(true)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Dismiss hint"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
