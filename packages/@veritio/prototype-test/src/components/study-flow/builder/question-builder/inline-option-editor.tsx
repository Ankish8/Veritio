'use client'

import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import { GripVertical, Trash2, ArrowRight, Ban } from 'lucide-react'
import { cn } from '@veritio/ui'
import type {
  ChoiceOption,
  BranchTarget,
  ScreeningCondition,
  StudyFlowQuestion,
} from '../../../../lib/supabase/study-flow-types'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CompoundConditionBuilder } from './compound-condition-builder'
const BRANCH_TARGET_OPTIONS = [
  {
    value: 'next' as const,
    label: 'Next question',
    icon: ArrowRight,
    rowClassName: '',
  },
  {
    value: 'reject' as const,
    label: 'Reject',
    icon: Ban,
    rowClassName: 'bg-red-50/50 border-red-200/50',
  },
]

interface InlineOptionEditorProps {
  option: ChoiceOption
  index: number
  branchTarget: BranchTarget
  onUpdateLabel: (id: string, label: string) => void
  onUpdateTarget: (id: string, target: BranchTarget) => void
  onDelete: (id: string) => void
  canDelete: boolean
  disabled?: boolean
  conditions?: ScreeningCondition[]
  matchAll?: boolean
  availableQuestions?: StudyFlowQuestion[]
  onUpdateConditions?: (id: string, conditions: ScreeningCondition[], matchAll: boolean) => void
}
export function InlineOptionEditor({
  option,
  index,
  branchTarget,
  onUpdateLabel,
  onUpdateTarget,
  onDelete,
  canDelete,
  disabled = false,
  conditions = [],
  matchAll = true,
  availableQuestions = [],
  onUpdateConditions,
}: InlineOptionEditorProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const targetInfo = BRANCH_TARGET_OPTIONS.find((t) => t.value === branchTarget)
  const rowClassName = targetInfo?.rowClassName || ''

  // Show compound conditions when:
  // 1. Branch target is 'reject'
  // 2. There are other questions available to reference
  const showConditions = branchTarget === 'reject' && availableQuestions.length > 0

  const handleConditionsChange = (newConditions: ScreeningCondition[], newMatchAll: boolean) => {
    onUpdateConditions?.(option.id, newConditions, newMatchAll)
  }

  return (
    <div className="space-y-0">
      {/* Main Option Row */}
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border transition-colors',
          rowClassName,
          isDragging && 'opacity-50 shadow-lg',
          disabled && 'opacity-60'
        )}
      >
        {/* Drag Handle */}
        <button
          className={cn(
            'cursor-grab touch-none text-muted-foreground hover:text-foreground shrink-0',
            disabled && 'cursor-not-allowed'
          )}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Index Badge */}
        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
          {index + 1}
        </span>

        {/* Option Label Input */}
        <Input
          value={option.label ?? ''}
          onChange={(e) => onUpdateLabel(option.id, e.target.value)}
          placeholder={`Option ${index + 1}`}
          className="flex-1 min-w-0 max-w-[280px] h-9"
          disabled={disabled}
        />

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(option.id)}
          disabled={!canDelete || disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* "then" text */}
        <span className="text-sm text-muted-foreground shrink-0">then</span>

        {/* Branch Target Dropdown */}
        <Select
          value={branchTarget}
          onValueChange={(value) => onUpdateTarget(option.id, value as BranchTarget)}
          disabled={disabled}
        >
          <SelectTrigger className="w-auto min-w-fit h-9 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_TARGET_OPTIONS.map((target) => {
              const Icon = target.icon
              return (
                <SelectItem key={target.value} value={target.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{target.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Compound Conditions (shown below the option row when target is 'reject') */}
      {showConditions && (
        <CompoundConditionBuilder
          conditions={conditions}
          matchAll={matchAll}
          availableQuestions={availableQuestions}
          onConditionsChange={handleConditionsChange}
          maxConditions={3}
          disabled={disabled}
        />
      )}
    </div>
  )
}
export function StaticInlineOptionEditor({
  option,
  index,
  branchTarget,
  onUpdateLabel,
  onUpdateTarget,
  onDelete,
  canDelete,
  disabled = false,
  conditions = [],
  matchAll = true,
  availableQuestions = [],
  onUpdateConditions,
}: InlineOptionEditorProps) {
  const targetInfo = BRANCH_TARGET_OPTIONS.find((t) => t.value === branchTarget)
  const rowClassName = targetInfo?.rowClassName || ''

  // Show compound conditions when:
  // 1. Branch target is 'reject'
  // 2. There are other questions available to reference
  const showConditions = branchTarget === 'reject' && availableQuestions.length > 0

  const handleConditionsChange = (newConditions: ScreeningCondition[], newMatchAll: boolean) => {
    onUpdateConditions?.(option.id, newConditions, newMatchAll)
  }

  return (
    <div className="space-y-0">
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border transition-colors',
          rowClassName,
          disabled && 'opacity-60'
        )}
      >
        {/* Index Badge */}
        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium shrink-0">
          {index + 1}
        </span>

        {/* Option Label Input */}
        <Input
          value={option.label ?? ''}
          onChange={(e) => onUpdateLabel(option.id, e.target.value)}
          placeholder={`Option ${index + 1}`}
          className="flex-1 min-w-0 max-w-[280px] h-9"
          disabled={disabled}
        />

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(option.id)}
          disabled={!canDelete || disabled}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        {/* "then" text */}
        <span className="text-sm text-muted-foreground shrink-0">then</span>

        {/* Branch Target Dropdown */}
        <Select
          value={branchTarget}
          onValueChange={(value) => onUpdateTarget(option.id, value as BranchTarget)}
          disabled={disabled}
        >
          <SelectTrigger className="w-auto min-w-fit h-9 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCH_TARGET_OPTIONS.map((target) => {
              const Icon = target.icon
              return (
                <SelectItem key={target.value} value={target.value}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{target.label}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Compound Conditions (shown below the option row when target is 'reject') */}
      {showConditions && (
        <CompoundConditionBuilder
          conditions={conditions}
          matchAll={matchAll}
          availableQuestions={availableQuestions}
          onConditionsChange={handleConditionsChange}
          maxConditions={3}
          disabled={disabled}
        />
      )}
    </div>
  )
}

export { BRANCH_TARGET_OPTIONS }
