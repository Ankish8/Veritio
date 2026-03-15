'use client'

import { Checkbox } from '@veritio/ui/components/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Input } from '@veritio/ui/components/input'
import type {
  StudyFlowQuestion,
  DisplayLogicCondition,
} from '../../../../lib/supabase/study-flow-types'
import type { DisplayLogicOperatorDef } from '@veritio/prototype-test/lib/study-flow/display-logic-operators'
import {
  getQuestionOptions,
  getScaleRange,
} from '@veritio/prototype-test/lib/study-flow/display-logic-operators'
import {
  RowColumnEditor,
  ColumnOnlyEditor,
  ItemPositionEditor,
  ItemNumberEditor,
  ItemItemEditor,
  ScaleNumberEditor,
} from './value-editors-complex'

interface ValueEditorProps {
  condition: DisplayLogicCondition
  operator: DisplayLogicOperatorDef
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}

export function ValueEditor({ condition, operator, sourceQuestion, onUpdate }: ValueEditorProps) {
  const valueUI = operator.valueUI

  switch (valueUI) {
    case 'none':
      return null

    case 'option-select':
      return (
        <OptionSelectEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'option-multi':
      return (
        <OptionMultiEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'number':
      return (
        <NumberEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'number-range':
      return (
        <NumberRangeEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'text':
      return (
        <TextEditor
          condition={condition}
          onUpdate={onUpdate}
        />
      )

    case 'row-column':
      return (
        <RowColumnEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
          multiColumn={false}
        />
      )

    case 'row-column-multi':
      return (
        <RowColumnEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
          multiColumn={true}
        />
      )

    case 'column-only':
      return (
        <ColumnOnlyEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'item-position':
      return (
        <ItemPositionEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'item-number':
      return (
        <ItemNumberEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'item-item':
      return (
        <ItemItemEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    case 'scale-number':
      return (
        <ScaleNumberEditor
          condition={condition}
          sourceQuestion={sourceQuestion}
          onUpdate={onUpdate}
        />
      )

    default:
      return null
  }
}

function OptionSelectEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
  const options = getQuestionOptions(sourceQuestion)
  const selectedValue = condition.values?.[0] || ''

  return (
    <Select
      value={selectedValue}
      onValueChange={(value) => onUpdate({ values: [value] })}
    >
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function OptionMultiEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
  const options = getQuestionOptions(sourceQuestion)
  const selectedValues = condition.values || []

  const toggleOption = (optionId: string) => {
    const newValues = selectedValues.includes(optionId)
      ? selectedValues.filter(v => v !== optionId)
      : [...selectedValues, optionId]
    onUpdate({ values: newValues })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <label
          key={opt.id}
          className="flex items-center gap-1.5 text-xs bg-background border rounded px-2 py-1 cursor-pointer hover:bg-muted/50"
        >
          <Checkbox
            checked={selectedValues.includes(opt.id)}
            onCheckedChange={() => toggleOption(opt.id)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function NumberEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
  const range = getScaleRange(sourceQuestion)
  const value = typeof condition.value === 'number' ? condition.value : ''

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : undefined })}
        placeholder={range ? `${range.min}-${range.max}` : 'Value'}
        className="w-20"
        min={range?.min}
        max={range?.max}
      />
      {range && (
        <span className="text-xs text-muted-foreground">
          ({range.min}-{range.max})
        </span>
      )}
    </div>
  )
}

function NumberRangeEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
  const range = getScaleRange(sourceQuestion)

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={condition.minValue ?? ''}
        onChange={(e) => onUpdate({ minValue: e.target.value ? Number(e.target.value) : undefined })}
        placeholder="Min"
        className="w-16"
        min={range?.min}
        max={range?.max}
      />
      <span className="text-xs text-muted-foreground">and</span>
      <Input
        type="number"
        value={condition.maxValue ?? ''}
        onChange={(e) => onUpdate({ maxValue: e.target.value ? Number(e.target.value) : undefined })}
        placeholder="Max"
        className="w-16"
        min={range?.min}
        max={range?.max}
      />
    </div>
  )
}

function TextEditor({
  condition,
  onUpdate,
}: {
  condition: DisplayLogicCondition
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
  const value = typeof condition.value === 'string' ? condition.value : ''

  return (
    <Input
      type="text"
      value={value}
      onChange={(e) => onUpdate({ value: e.target.value || undefined })}
      placeholder="Enter text"
      className="w-40"
    />
  )
}
