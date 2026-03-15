'use client'

import { useState } from 'react'
import { ChevronDown, Type, ChevronDownIcon, List, Grid3X3, ArrowUpDown, BarChart3, AlertCircle, SlidersHorizontal, Sliders, ThumbsUp, Images, ArrowLeftRight, PieChart, Mic } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@veritio/ui'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@veritio/ui'
import { Button } from '@veritio/ui'
import { cn } from '@veritio/ui'
import type { QuestionType } from '../../../../lib/supabase/study-flow-types'
export const ALL_QUESTION_TYPES = [
  {
    type: 'single_line_text' as const,
    label: 'Short text',
    icon: Type,
    description: 'Short text response',
  },
  {
    type: 'multi_line_text' as const,
    label: 'Long text',
    icon: Type,
    description: 'Long text response',
  },
  {
    type: 'multiple_choice' as const,
    label: 'Selection',
    icon: List,
    description: 'Single-select, multi-select, or dropdown from a list of options',
  },
  {
    type: 'yes_no' as const,
    label: 'Yes / No',
    icon: ThumbsUp,
    description: 'Binary choice with icons or emotions',
  },
  {
    type: 'opinion_scale' as const,
    label: 'Opinion Scale',
    icon: SlidersHorizontal,
    description: 'Customizable rating scale',
  },
  {
    type: 'nps' as const,
    label: 'NPS',
    icon: BarChart3,
    description: 'Net Promoter Score (0-10)',
  },
  {
    type: 'matrix' as const,
    label: 'Matrix',
    icon: Grid3X3,
    description: 'Grid of rows and columns',
  },
  {
    type: 'ranking' as const,
    label: 'Ranking',
    icon: ArrowUpDown,
    description: 'Order items by preference',
  },
  {
    type: 'slider' as const,
    label: 'Slider',
    icon: Sliders,
    description: 'Drag to select a value on a scale',
  },
  {
    type: 'image_choice' as const,
    label: 'Image Choice',
    icon: Images,
    description: 'Select from images in a visual grid',
  },
  {
    type: 'semantic_differential' as const,
    label: 'Semantic Differential',
    icon: ArrowLeftRight,
    description: 'Rate between bipolar adjectives (e.g., Difficult ↔ Easy)',
  },
  {
    type: 'constant_sum' as const,
    label: 'Constant Sum',
    icon: PieChart,
    description: 'Distribute points across items to show relative importance',
  },
  {
    type: 'audio_response' as const,
    label: 'Audio Response',
    icon: Mic,
    description: 'Record verbal answers with automatic transcription',
  },
] as const

export type PrePostQuestionType = (typeof ALL_QUESTION_TYPES)[number]['type']

/**
 * Labels for deprecated types (for display in migration dialogs)
 */
const DEPRECATED_TYPE_LABELS: Record<string, string> = {
  radio: 'Radio (legacy)',
  checkbox: 'Checkbox (legacy)',
  likert: 'Likert (legacy)',
}
function getTypeLabel(type: QuestionType): string {
  const typeInfo = ALL_QUESTION_TYPES.find((t) => t.type === type)
  if (typeInfo) return typeInfo.label
  return DEPRECATED_TYPE_LABELS[type] || type
}
function areTypesCompatible(currentType: QuestionType, newType: QuestionType): boolean {
  // Text types are compatible with each other
  const textTypes = ['single_line_text', 'multi_line_text']
  if (textTypes.includes(currentType) && textTypes.includes(newType)) {
    return true
  }

  // Choice types are compatible with each other (uses new unified types)
  const choiceTypes = ['multiple_choice', 'dropdown']
  if (choiceTypes.includes(currentType) && choiceTypes.includes(newType)) {
    return true
  }

  // All other combinations are incompatible (would lose data)
  return false
}

interface PrePostTypeSwitcherProps {
  currentType: QuestionType
  onTypeChange: (newType: QuestionType) => void
  disabled?: boolean
}
export function PrePostTypeSwitcher({
  currentType,
  onTypeChange,
  disabled = false,
}: PrePostTypeSwitcherProps) {
  const [pendingType, setPendingType] = useState<QuestionType | null>(null)

  const currentTypeInfo = ALL_QUESTION_TYPES.find((t) => t.type === currentType)
  const Icon = currentTypeInfo?.icon || Type

  const handleTypeSelect = (newType: QuestionType) => {
    if (newType === currentType) return

    const compatible = areTypesCompatible(currentType, newType)
    if (compatible) {
      // Switch immediately for compatible types
      onTypeChange(newType)
    } else {
      // Show confirmation for incompatible types
      setPendingType(newType)
    }
  }

  const handleConfirmTypeChange = () => {
    if (pendingType) {
      onTypeChange(pendingType)
      setPendingType(null)
    }
  }

  return (
    <>
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
        <DropdownMenuContent align="start" className="w-auto p-2 min-w-[220px] space-y-1">
          {ALL_QUESTION_TYPES.map((questionType) => {
            const TypeIcon = questionType.icon
            const isSelected = questionType.type === currentType

            return (
              <DropdownMenuItem
                key={questionType.type}
                onClick={() => handleTypeSelect(questionType.type)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-md',
                  isSelected && 'bg-accent'
                )}
              >
                <TypeIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className={cn('text-sm', isSelected && 'font-medium')}>
                    {questionType.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{questionType.description}</div>
                </div>
                {isSelected && (
                  <span className="ml-auto text-muted-foreground">✓</span>
                )}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Data Loss Warning Dialog */}
      <AlertDialog open={!!pendingType} onOpenChange={(open) => !open && setPendingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Switching question type
            </AlertDialogTitle>
            <AlertDialogDescription>
              {`Switching from ${getTypeLabel(currentType)} to ${
                pendingType ? getTypeLabel(pendingType) : ''
              } will clear your current question configuration.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTypeChange}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
