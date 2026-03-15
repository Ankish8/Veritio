'use client'

import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Switch } from '@veritio/ui'
import { Plus } from 'lucide-react'
import type { MultipleChoiceQuestionConfig } from '../../../../../lib/supabase/study-flow-types'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDndSensors, useDragReorder, useOptionManagement } from '../hooks/use-sortable-options'
import { SortableOptionRow } from '../sortable-option-row'
import { OtherOptionSection } from '../other-option-section'
import { SelectionModeToggle } from '../selection-mode-toggle'
import { SelectionLimitsConfig } from './selection-limits-config'
import { AiFollowupConfigSection } from './ai-followup-config-section'

interface MultipleChoiceConfigProps {
  questionId?: string
  config: MultipleChoiceQuestionConfig
  onChange: (config: Partial<MultipleChoiceQuestionConfig>) => void
}

export function MultipleChoiceConfig({ questionId, config, onChange }: MultipleChoiceConfigProps) {
  const options = config.options || []
  const mode = config.mode || 'single'

  const sensors = useDndSensors()

  const handleDragEnd = useDragReorder({
    items: options,
    onReorder: (newOptions) => onChange({ options: newOptions }),
  })

  const { addOption, updateOption, removeOption, canRemove } = useOptionManagement({
    options,
    onChange,
    minOptions: 1,
  })

  return (
    <div className="space-y-5">
      <SelectionModeToggle
        value={mode}
        onValueChange={(value) => {
          const updates: Partial<MultipleChoiceQuestionConfig> = { mode: value }
          if (value !== 'multi') {
            updates.minSelections = undefined
            updates.maxSelections = undefined
          }
          if (value !== 'dropdown') {
            updates.placeholder = undefined
          }
          onChange(updates)
        }}
      />

      {/* Choices List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Choices*</Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="shuffle-toggle" className="text-sm font-normal text-muted-foreground">
              Shuffle
            </Label>
            <Switch
              id="shuffle-toggle"
              checked={config.shuffle || false}
              onCheckedChange={(checked) => onChange({ shuffle: checked })}
            />
          </div>
        </div>

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
              {options.map((option) => (
                <SortableOptionRow
                  key={option.id}
                  option={option}
                  onUpdate={updateOption}
                  onRemove={removeOption}
                  canRemove={canRemove}
                  placeholder="Enter choice"
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button variant="outline" size="sm" onClick={addOption}>
          <Plus className="mr-2 h-4 w-4" />
          Add choice
        </Button>
      </div>

      <OtherOptionSection
        allowOther={config.allowOther || false}
        otherLabel={config.otherLabel || ''}
        onAllowOtherChange={(checked) => onChange({ allowOther: checked })}
        onOtherLabelChange={(label) => onChange({ otherLabel: label })}
      />

      {mode === 'multi' && (
        <SelectionLimitsConfig
          minSelections={config.minSelections}
          maxSelections={config.maxSelections}
          maxOptions={options.length}
          onChange={onChange}
        />
      )}

      {mode === 'dropdown' && (
        <div className="space-y-2">
          <Label htmlFor="dropdown-placeholder">Placeholder text</Label>
          <Input
            id="dropdown-placeholder"
            value={config.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            placeholder="Select an option..."
          />
        </div>
      )}

      {questionId && (
        <AiFollowupConfigSection
          questionId={questionId}
          config={(config as any).aiFollowup}
          onChange={(aiFollowup) => onChange({ aiFollowup } as any)}
          showTriggerConditions={true}
          options={config.options}
        />
      )}
    </div>
  )
}
