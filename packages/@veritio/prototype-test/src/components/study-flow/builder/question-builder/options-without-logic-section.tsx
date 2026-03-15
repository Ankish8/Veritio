'use client'

import { useState, useCallback } from 'react'
import { Button } from '@veritio/ui'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Checkbox } from '@veritio/ui'
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
import { Plus, FileEdit, GitBranch, CornerDownRight, Trash2 } from 'lucide-react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDndSensors, useDragReorder } from './hooks/use-sortable-options'
import type {
  StudyFlowQuestion,
  ChoiceOption,
  BranchTarget,
  BranchingLogic,
  MultipleChoiceQuestionConfig,
  MultipleChoiceMode,
} from '../../../../lib/supabase/study-flow-types'
import { SimpleOptionEditor } from './simple-option-editor'
import { InlineOptionEditor } from './inline-option-editor'
import { BulkEditModal } from './bulk-edit-modal'
import { CheckboxLogicHint } from './checkbox-logic-hint'
import { SelectionModeToggle } from './selection-mode-toggle'
import { SelectionLimitsConfig } from './type-configs'

type ChoiceConfig = MultipleChoiceQuestionConfig

interface OptionsWithoutLogicSectionProps {
  question: StudyFlowQuestion
  onUpdate: (updates: Partial<StudyFlowQuestion>) => void
}
export function OptionsWithoutLogicSection({
  question,
  onUpdate,
}: OptionsWithoutLogicSectionProps) {
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [showBranchingConfirm, setShowBranchingConfirm] = useState(false)

  const config = question.config as unknown as ChoiceConfig
  const options = config.options || []
  const branchingLogic = question.branching_logic as BranchingLogic | null | undefined
  const hasBranchingLogic = !!branchingLogic && branchingLogic.rules.length >= 0
  const mode = config.mode || 'single'
  const isCheckbox = mode === 'multi'
  const isRadio = mode === 'single'
  const isDropdown = mode === 'dropdown'

  // "Other" option support (single and multi only, not dropdown)
  const supportsOther = mode !== 'dropdown'
  const allowOther = config.allowOther || false
  const otherLabel = config.otherLabel || 'Other (please specify)'

  // Shared DnD sensors
  const sensors = useDndSensors()

  // Shared drag-end handler
  const handleDragEnd = useDragReorder({
    items: options,
    onReorder: (newOptions) => {
      onUpdate({
        config: { ...config, options: newOptions },
      })
    },
  })

  const getBranchTargetForOption = useCallback(
    (optionId: string): BranchTarget => {
      if (!branchingLogic) return 'next'
      const rule = branchingLogic.rules.find((r) => r.optionId === optionId)
      return rule?.target || branchingLogic.defaultTarget
    },
    [branchingLogic]
  )
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
      // Remove explicit rule if it matches default
      newRules = newRules.filter((r) => r.optionId !== optionId)
    } else if (existingRuleIndex >= 0) {
      // Update existing rule
      newRules[existingRuleIndex] = { optionId, target }
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
  const handleRandomOrderChange = (checked: boolean) => {
    if (isDropdown) return // Dropdown doesn't support randomOrder
    onUpdate({
      config: { ...config, randomOrder: checked },
    })
  }
  const handleEnableBranching = () => {
    onUpdate({
      branching_logic: {
        rules: [],
        defaultTarget: 'next',
      },
    })
    setShowBranchingConfirm(false)
  }
  const handleRemoveBranching = () => {
    onUpdate({
      branching_logic: null,
    })
  }
  const handleAddOther = () => {
    onUpdate({
      config: { ...config, allowOther: true, otherLabel: 'Other (please specify)' },
    })
  }
  const handleRemoveOther = () => {
    onUpdate({
      config: { ...config, allowOther: false, otherLabel: undefined },
    })
  }

  const handleUpdateOtherLabel = (label: string) => {
    onUpdate({
      config: { ...config, otherLabel: label },
    })
  }

  const handleBulkEditSave = (
    newOptions: ChoiceOption[],
    newLogic: BranchingLogic | null
  ) => {
    onUpdate({
      config: { ...config, options: newOptions },
      branching_logic: hasBranchingLogic ? newLogic : null,
    })
  }

  const handleModeChange = (newMode: MultipleChoiceMode) => {
    const updatedConfig: Partial<MultipleChoiceQuestionConfig> = { mode: newMode }

    // Clear multi-select specific fields when switching away from multi
    if (mode === 'multi' && newMode !== 'multi') {
      updatedConfig.minSelections = undefined
      updatedConfig.maxSelections = undefined
    }

    // Clear dropdown-specific fields when switching away from dropdown
    if (mode === 'dropdown' && newMode !== 'dropdown') {
      updatedConfig.placeholder = undefined
    }

    // Clear allowOther when switching to dropdown (not supported)
    if (newMode === 'dropdown' && config.allowOther) {
      updatedConfig.allowOther = false
      updatedConfig.otherLabel = undefined
    }

    onUpdate({ config: { ...config, ...updatedConfig } })
  }

  const handleConfigChange = useCallback(
    (updates: Partial<MultipleChoiceQuestionConfig>) => {
      onUpdate({ config: { ...config, ...updates } })
    },
    [config, onUpdate]
  )

  const supportsRandomOrder = isRadio || isCheckbox
  // Support both old 'randomOrder' and new 'shuffle' config property
  const randomOrder = (config as { shuffle?: boolean; randomOrder?: boolean }).shuffle ??
    (config as { shuffle?: boolean; randomOrder?: boolean }).randomOrder ?? false

  return (
    <div className="space-y-4">
      {/* Selection Mode Toggle (Single/Multi/Dropdown) */}
      <SelectionModeToggle value={mode} onValueChange={handleModeChange} />

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
            {options.map((option, index) =>
              hasBranchingLogic ? (
                <InlineOptionEditor
                  key={option.id}
                  option={option}
                  index={index}
                  branchTarget={getBranchTargetForOption(option.id)}
                  onUpdateLabel={handleUpdateOptionLabel}
                  onUpdateTarget={handleUpdateBranchTarget}
                  onDelete={handleRemoveOption}
                  canDelete={options.length > 2}
                />
              ) : (
                <SimpleOptionEditor
                  key={option.id}
                  option={option}
                  index={index}
                  onUpdateLabel={handleUpdateOptionLabel}
                  onDelete={handleRemoveOption}
                  canDelete={options.length > 2}
                />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>

      {/* "Other" option row when enabled */}
      {supportsOther && allowOther && (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed bg-muted/20">
          <CornerDownRight className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
          <span className="flex h-6 w-6 items-center justify-center rounded bg-muted/50 text-xs text-muted-foreground shrink-0">
            Other
          </span>
          <Input
            value={otherLabel}
            onChange={(e) => handleUpdateOtherLabel(e.target.value)}
            placeholder="Other (please specify)"
            className="flex-1 h-9"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={handleRemoveOther}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

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

        {hasBranchingLogic ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemoveBranching}
            className="gap-1.5"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Remove conditions
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBranchingConfirm(true)}
            className="gap-1.5"
          >
            <GitBranch className="h-3.5 w-3.5" />
            Add conditions
          </Button>
        )}

        {supportsOther && !allowOther && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddOther}
            className="gap-1.5"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
            Add &apos;Other&apos; input
          </Button>
        )}
      </div>

      {/* Checkbox Options Row */}
      <div className="flex items-center gap-6 flex-wrap">
        {supportsRandomOrder && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="random-order"
              checked={randomOrder}
              onCheckedChange={handleRandomOrderChange}
            />
            <Label
              htmlFor="random-order"
              className="text-sm font-normal cursor-pointer"
            >
              Random order
            </Label>
          </div>
        )}
      </div>

      {/* Selection Limits (Multi-select only) */}
      {mode === 'multi' && (
        <SelectionLimitsConfig
          minSelections={config.minSelections}
          maxSelections={config.maxSelections}
          maxOptions={options.length}
          onChange={handleConfigChange}
        />
      )}

      {/* Checkbox Logic Priority Hint */}
      {isCheckbox && hasBranchingLogic && <CheckboxLogicHint />}

      {/* Branching Logic Confirmation Modal */}
      <AlertDialog open={showBranchingConfirm} onOpenChange={setShowBranchingConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adding logic</AlertDialogTitle>
            <AlertDialogDescription>
              When logic is added to your questionnaire, each question will be displayed on a separate page.
              This allows for customized question paths based on previous responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnableBranching}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={bulkEditOpen}
        onOpenChange={setBulkEditOpen}
        options={options}
        branchingLogic={hasBranchingLogic ? branchingLogic : null}
        onSave={handleBulkEditSave}
      />
    </div>
  )
}
