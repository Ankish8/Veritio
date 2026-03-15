'use client'

import { ChevronDown, CircleDot, ChevronDownIcon, CheckSquare, List, ThumbsUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@veritio/ui'
import { Button } from '@veritio/ui'
import { cn } from '@veritio/ui'
import type { QuestionType } from '../../../../lib/supabase/study-flow-types'
export const SCREENING_TYPES = [
  {
    type: 'multiple_choice' as const,
    label: 'Selection',
    icon: List,
    description: 'Single/multi-select or dropdown',
  },
  {
    type: 'yes_no' as const,
    label: 'Yes / No',
    icon: ThumbsUp,
    description: 'Simple binary choice',
  },
] as const

export type ScreeningType = (typeof SCREENING_TYPES)[number]['type']
export const SELECTION_MODES = [
  {
    mode: 'single' as const,
    label: 'Single select',
    icon: CircleDot,
    description: 'Pick one option from the list',
  },
  {
    mode: 'dropdown' as const,
    label: 'Dropdown',
    icon: ChevronDownIcon,
    description: 'Pick one from a dropdown menu',
  },
  {
    mode: 'multi' as const,
    label: 'Multi-select',
    icon: CheckSquare,
    description: 'Pick multiple options',
  },
] as const

export type SelectionMode = (typeof SELECTION_MODES)[number]['mode']

interface QuestionTypeSwitcherProps {
  currentMode: SelectionMode
  onModeChange: (newMode: SelectionMode) => void
  disabled?: boolean
}

interface ScreeningTypeSwitcherProps {
  currentType: QuestionType
  onTypeChange: (newType: ScreeningType) => void
  disabled?: boolean
}
export function ScreeningTypeSwitcher({
  currentType,
  onTypeChange,
  disabled = false,
}: ScreeningTypeSwitcherProps) {
  const currentTypeInfo = SCREENING_TYPES.find((t) => t.type === currentType)
  const Icon = currentTypeInfo?.icon || List

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 font-medium',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Icon className="h-4 w-4" />
          {currentTypeInfo?.label || 'Select type'}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto p-2 min-w-[200px]">
        {SCREENING_TYPES.map((typeOption) => {
          const TypeIcon = typeOption.icon
          const isSelected = typeOption.type === currentType

          return (
            <DropdownMenuItem
              key={typeOption.type}
              onClick={() => onTypeChange(typeOption.type)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 cursor-pointer rounded-md',
                isSelected && 'bg-accent'
              )}
            >
              <TypeIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className={cn('text-sm block', isSelected && 'font-medium')}>
                  {typeOption.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {typeOption.description}
                </span>
              </div>
              {isSelected && (
                <span className="text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
export function QuestionTypeSwitcher({
  currentMode,
  onModeChange,
  disabled = false,
}: QuestionTypeSwitcherProps) {
  const currentModeInfo = SELECTION_MODES.find((m) => m.mode === currentMode)
  const Icon = currentModeInfo?.icon || CircleDot

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 font-medium',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          <Icon className="h-4 w-4" />
          {currentModeInfo?.label || 'Select mode'}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto p-2 min-w-[200px] space-y-1">
        {SELECTION_MODES.map((modeOption) => {
          const ModeIcon = modeOption.icon
          const isSelected = modeOption.mode === currentMode

          return (
            <DropdownMenuItem
              key={modeOption.mode}
              onClick={() => onModeChange(modeOption.mode)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-md',
                isSelected && 'bg-accent'
              )}
            >
              <ModeIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className={cn('whitespace-nowrap text-sm', isSelected && 'font-medium')}>
                {modeOption.label}
              </span>
              {isSelected && (
                <span className="ml-auto text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
