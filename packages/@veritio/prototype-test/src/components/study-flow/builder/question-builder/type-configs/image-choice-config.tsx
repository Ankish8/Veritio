'use client'

import { Label } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Switch } from '@veritio/ui'
import { SegmentedControl } from '@veritio/ui'
import { Plus, CircleDot, CheckSquare, Grid2X2, Grid3X3, LayoutGrid } from 'lucide-react'
import type {
  ImageChoiceQuestionConfig,
  ImageChoiceMode,
  ImageChoiceGridColumns,
} from '../../../../../lib/supabase/study-flow-types'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDndSensors, useDragReorder } from '@veritio/prototype-test/hooks'
import { useImageOptionManagement } from '../hooks/use-image-option-management'
import { SortableImageOptionRow } from '../sortable-image-option-row'
import { OtherOptionSection } from '../other-option-section'
import { SelectionLimitsConfig } from './selection-limits-config'

interface ImageChoiceConfigProps {
  config: ImageChoiceQuestionConfig
  onChange: (config: Partial<ImageChoiceQuestionConfig>) => void
  studyId: string
  questionId: string
}

const MODE_OPTIONS = [
  { value: 'single' as ImageChoiceMode, label: 'Single-select', icon: CircleDot },
  { value: 'multi' as ImageChoiceMode, label: 'Multi-select', icon: CheckSquare },
]

const GRID_OPTIONS = [
  { value: '2', label: '2', icon: Grid2X2 },
  { value: '3', label: '3', icon: Grid3X3 },
  { value: '4', label: '4', icon: LayoutGrid },
] as const

export function ImageChoiceConfig({
  config,
  onChange,
  studyId,
  questionId,
}: ImageChoiceConfigProps) {
  const options = config.options || []
  const mode = config.mode || 'single'
  const gridColumns = config.gridColumns || 3

  const sensors = useDndSensors()

  const handleDragEnd = useDragReorder({
    items: options,
    onReorder: (newOptions: any) => onChange({ options: newOptions }),
  })

  const {
    addOption,
    updateOption,
    removeOption,
    uploadImage,
    deleteImage,
    canRemove,
  } = useImageOptionManagement({
    options,
    onChange,
    studyId,
    questionId,
    minOptions: 2,
  })

  return (
    <div className="space-y-5">
      {/* Mode Selector */}
      <div className="space-y-2">
        <Label>Selection Type</Label>
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onValueChange={(value) => {
            const updates: Partial<ImageChoiceQuestionConfig> = { mode: value as ImageChoiceMode }
            if (value !== 'multi') {
              updates.minSelections = undefined
              updates.maxSelections = undefined
            }
            onChange(updates)
          }}
        />
      </div>

      {/* Grid Layout Selector */}
      <div className="space-y-2">
        <Label>Grid Layout</Label>
        <SegmentedControl
          options={GRID_OPTIONS}
          value={String(gridColumns)}
          onValueChange={(value) => onChange({ gridColumns: parseInt(value, 10) as ImageChoiceGridColumns })}
        />
      </div>

      {/* Image Options List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Image Options*</Label>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="show-labels-toggle" className="text-sm font-normal text-muted-foreground">
                Show labels
              </Label>
              <Switch
                id="show-labels-toggle"
                checked={config.showLabels !== false}
                onCheckedChange={(checked) => onChange({ showLabels: checked })}
              />
            </div>
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
                <SortableImageOptionRow
                  key={option.id}
                  option={option}
                  onUpdate={updateOption}
                  onRemove={removeOption}
                  onUploadImage={uploadImage}
                  onDeleteImage={deleteImage}
                  canRemove={canRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button variant="outline" size="sm" onClick={addOption}>
          <Plus className="mr-2 h-4 w-4" />
          Add image option
        </Button>

        <p className="text-xs text-muted-foreground">
          Upload images up to 2MB each. Labels are used as alt text for accessibility.
        </p>
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
    </div>
  )
}
