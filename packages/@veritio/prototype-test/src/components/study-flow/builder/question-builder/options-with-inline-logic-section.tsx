'use client'

import { useState, useCallback } from 'react'
import { Button } from '@veritio/ui'
import { Label } from '@veritio/ui'
import { Checkbox } from '@veritio/ui'
import { Plus, FileEdit, Info } from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDndSensors, useDragReorder } from './hooks/use-sortable-options'
import type {
  StudyFlowQuestion,
  ChoiceOption,
  BranchTarget,
  BranchingLogic,
  MultipleChoiceQuestionConfig,
  ScreeningCondition,
} from '../../../../lib/supabase/study-flow-types'
import {
  QuestionTypeSwitcher,
  SELECTION_MODES,
  type SelectionMode,
} from './question-type-switcher'
import { InlineOptionEditor } from './inline-option-editor'
import { BulkEditModal } from './bulk-edit-modal'
import { CheckboxLogicHint } from './checkbox-logic-hint'

type ChoiceConfig = MultipleChoiceQuestionConfig

interface OptionsWithInlineLogicSectionProps {
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
  hideTypeSwitcher?: boolean
  allSectionQuestions?: StudyFlowQuestion[]
}
export function OptionsWithInlineLogicSection({
  question,
  onUpdate,
  hideTypeSwitcher = false,
  allSectionQuestions = [],
}: OptionsWithInlineLogicSectionProps) {
  const [bulkEditOpen, setBulkEditOpen] = useState(false)

  const config = question.config as unknown as ChoiceConfig
  const options = config.options || []
  const branchingLogic = question.branching_logic as BranchingLogic | null | undefined

  // Check the mode from the multiple_choice config
  const currentMode = config.mode || 'single'
  const isCheckbox = currentMode === 'multi'
  const isRadio = currentMode === 'single'

  // Get available questions for compound conditions (all screening questions except current)
  const availableQuestions = allSectionQuestions.filter((q) => q.id !== question.id)

  // Shared DnD sensors
  const sensors = useDndSensors()
  const getBranchTargetForOption = useCallback(
    (optionId: string): BranchTarget => {
      if (!branchingLogic) return 'next'
      const rules = branchingLogic.rules || []
      const rule = rules.find((r) => r.optionId === optionId)
      return rule?.target || branchingLogic.defaultTarget || 'next'
    },
    [branchingLogic]
  )
  const getConditionsForOption = useCallback(
    (optionId: string): { conditions: ScreeningCondition[]; matchAll: boolean } => {
      if (!branchingLogic) return { conditions: [], matchAll: true }
      const rules = branchingLogic.rules || []
      const rule = rules.find((r) => r.optionId === optionId)
      return {
        conditions: rule?.conditions || [],
        matchAll: rule?.matchAll !== false, // Default to true (AND)
      }
    },
    [branchingLogic]
  )
  const handleModeChange = (newMode: SelectionMode) => {
    if (newMode === currentMode) return

    onUpdate({
      config: {
        ...config,
        mode: newMode,
      },
      // Preserve branching logic - it works with all modes
    })
  }

  // Shared drag-end handler
  const handleDragEnd = useDragReorder({
    items: options,
    onReorder: (newOptions) => {
      onUpdate({
        config: { ...config, options: newOptions },
      })
    },
  })
  const handleAddOption = () => {
    const newOption: ChoiceOption = {
      id: crypto.randomUUID(),
      label: '',
    }
    onUpdate({
      config: { ...config, options: [...options, newOption] },
    })
  }
  const handleUpdateOptionLabel = (id: string, label: string) => {
    onUpdate({
      config: {
        ...config,
        options: options.map((o) => (o.id === id ? { ...o, label } : o)),
      },
    })
  }
  const handleUpdateBranchTarget = (optionId: string, target: BranchTarget) => {
    const currentLogic: BranchingLogic = branchingLogic || {
      rules: [],
      defaultTarget: 'next',
    }

    const existingRuleIndex = currentLogic.rules.findIndex(
      (r) => r.optionId === optionId
    )

    let newRules = [...currentLogic.rules]

    if (target === currentLogic.defaultTarget) {
      // Remove explicit rule if it matches default (also removes conditions)
      newRules = newRules.filter((r) => r.optionId !== optionId)
    } else if (existingRuleIndex >= 0) {
      // Update existing rule, preserve conditions
      const existingRule = currentLogic.rules[existingRuleIndex]
      newRules[existingRuleIndex] = {
        optionId,
        target,
        // Preserve conditions only if new target is 'reject'
        ...(target === 'reject' && existingRule.conditions
          ? { conditions: existingRule.conditions, matchAll: existingRule.matchAll }
          : {}
        ),
      }
    } else {
      // Add new rule
      newRules.push({ optionId, target })
    }

    onUpdate({
      branching_logic: {
        rules: newRules,
        defaultTarget: currentLogic.defaultTarget,
      },
    })
  }
  const handleUpdateConditions = (
    optionId: string,
    conditions: ScreeningCondition[],
    matchAll: boolean
  ) => {
    const currentLogic: BranchingLogic = branchingLogic || {
      rules: [],
      defaultTarget: 'next',
    }

    const existingRuleIndex = currentLogic.rules.findIndex(
      (r) => r.optionId === optionId
    )

    const newRules = [...currentLogic.rules]

    if (existingRuleIndex >= 0) {
      // Update existing rule with conditions
      const existingRule = currentLogic.rules[existingRuleIndex]
      newRules[existingRuleIndex] = {
        ...existingRule,
        conditions: conditions.length > 0 ? conditions : undefined,
        matchAll: conditions.length > 0 ? matchAll : undefined,
      }
    } else {
      // Create new rule with conditions (shouldn't happen normally)
      newRules.push({
        optionId,
        target: 'reject',
        conditions: conditions.length > 0 ? conditions : undefined,
        matchAll: conditions.length > 0 ? matchAll : undefined,
      })
    }

    onUpdate({
      branching_logic: {
        rules: newRules,
        defaultTarget: currentLogic.defaultTarget,
      },
    })
  }
  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) return // Minimum 2 options required

    const newOptions = options.filter((o) => o.id !== id)

    // Remove any branching rules for this option
    const newLogic = branchingLogic
      ? {
          rules: branchingLogic.rules.filter((r) => r.optionId !== id),
          defaultTarget: branchingLogic.defaultTarget,
        }
      : null

    onUpdate({
      config: { ...config, options: newOptions },
      branching_logic: newLogic,
    })
  }
  const handleRandomOrderChange = (checked: boolean) => {
    // Dropdown mode doesn't typically use randomOrder, but we allow it anyway
    onUpdate({
      config: { ...config, shuffle: checked },
    })
  }
  const handleBulkEditSave = (
    newOptions: ChoiceOption[],
    newLogic: BranchingLogic | null
  ) => {
    onUpdate({
      config: { ...config, options: newOptions },
      branching_logic: newLogic,
    })
  }

  // Dropdown mode doesn't typically need random order, but single/multiple do
  const supportsRandomOrder = currentMode === 'single' || currentMode === 'multi'
  // Support both old 'randomOrder' and new 'shuffle' config property
  const randomOrder = (config as { shuffle?: boolean; randomOrder?: boolean }).shuffle ??
    (config as { shuffle?: boolean; randomOrder?: boolean }).randomOrder ?? false

  return (
    <div className="space-y-4">
      {/* Options Section Label */}
      <Label className="text-sm font-medium">Options</Label>

      {/* Drag and Drop Option List */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={options.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {options.map((option, index) => {
              const { conditions, matchAll } = getConditionsForOption(option.id)
              return (
                <InlineOptionEditor
                  key={option.id}
                  option={option}
                  index={index}
                  branchTarget={getBranchTargetForOption(option.id)}
                  onUpdateLabel={handleUpdateOptionLabel}
                  onUpdateTarget={handleUpdateBranchTarget}
                  onDelete={handleRemoveOption}
                  canDelete={options.length > 2}
                  conditions={conditions}
                  matchAll={matchAll}
                  availableQuestions={availableQuestions}
                  onUpdateConditions={handleUpdateConditions}
                />
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      {/* Screening Helper Text */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Set at least one option to <span className="font-medium text-red-600">Reject</span> to filter out participants who don&apos;t qualify.
        </span>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="default"
          size="sm"
          onClick={handleAddOption}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add option
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setBulkEditOpen(true)}
          className="gap-1.5"
        >
          <FileEdit className="h-3.5 w-3.5" />
          Bulk edit
        </Button>
      </div>

      {/* Checkbox Options Row */}
      {supportsRandomOrder && (
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              id="screening-random-order"
              checked={randomOrder}
              onCheckedChange={handleRandomOrderChange}
            />
            <Label
              htmlFor="screening-random-order"
              className="text-sm font-normal cursor-pointer"
            >
              Random order
            </Label>
          </div>
        </div>
      )}

      {/* Checkbox Logic Priority Hint */}
      {isCheckbox && <CheckboxLogicHint />}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        options={options}
        branchingLogic={branchingLogic}
        onSave={handleBulkEditSave}
      />
    </div>
  )
}
