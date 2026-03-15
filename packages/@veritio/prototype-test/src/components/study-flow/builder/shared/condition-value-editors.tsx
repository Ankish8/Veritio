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
import {
  getQuestionOptions,
  getMatrixRows,
  getMatrixColumns,
  getRankingItems,
  getConstantSumItems,
  getSemanticScales,
  getScaleRange,
  getMaxRankPosition,
  getTotalPoints,
  type DisplayLogicOperatorDef,
} from '@veritio/prototype-test/lib/study-flow/display-logic-operators'

export interface ConditionValueUpdate {
  value?: string | number | boolean
  values?: string[]
  minValue?: number
  maxValue?: number
  rowId?: string
  columnId?: string
  columnIds?: string[]
  itemId?: string
  secondItemId?: string
  position?: number
  scaleId?: string
}

export interface ValueEditorBaseProps {
  condition: Pick<DisplayLogicCondition, keyof ConditionValueUpdate>
  onUpdate: (updates: ConditionValueUpdate) => void
}

export interface ValueEditorWithQuestionProps extends ValueEditorBaseProps {
  sourceQuestion: StudyFlowQuestion
}

export interface ValueEditorProps extends ValueEditorWithQuestionProps {
  operator: DisplayLogicOperatorDef
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

    case 'date':
      return (
        <DateEditor
          condition={condition}
          onUpdate={onUpdate}
        />
      )

    case 'date-range':
      return (
        <DateRangeEditor
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

export function OptionSelectEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
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

export function OptionMultiEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
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

export function NumberEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
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

export function NumberRangeEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
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

export function TextEditor({
  condition,
  onUpdate,
}: ValueEditorBaseProps) {
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

export function RowColumnEditor({
  condition,
  sourceQuestion,
  onUpdate,
  multiColumn,
}: ValueEditorWithQuestionProps & { multiColumn: boolean }) {
  const rows = getMatrixRows(sourceQuestion)
  const columns = getMatrixColumns(sourceQuestion)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={condition.rowId || ''}
        onValueChange={(value) => onUpdate({ rowId: value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select row" />
        </SelectTrigger>
        <SelectContent>
          {rows.map((row) => (
            <SelectItem key={row.id} value={row.id}>
              {row.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {multiColumn ? (
        <div className="flex flex-wrap gap-1">
          {columns.map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-1 text-xs bg-background border rounded px-2 py-1 cursor-pointer hover:bg-muted/50"
            >
              <Checkbox
                checked={(condition.columnIds || []).includes(col.id)}
                onCheckedChange={(checked) => {
                  const current = condition.columnIds || []
                  const newIds = checked
                    ? [...current, col.id]
                    : current.filter(id => id !== col.id)
                  onUpdate({ columnIds: newIds })
                }}
              />
              {col.label}
            </label>
          ))}
        </div>
      ) : (
        <Select
          value={condition.columnId || ''}
          onValueChange={(value) => onUpdate({ columnId: value })}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Select column" />
          </SelectTrigger>
          <SelectContent>
            {columns.map((col) => (
              <SelectItem key={col.id} value={col.id}>
                {col.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function ColumnOnlyEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
  const columns = getMatrixColumns(sourceQuestion)

  return (
    <Select
      value={condition.columnId || ''}
      onValueChange={(value) => onUpdate({ columnId: value })}
    >
      <SelectTrigger className="w-32">
        <SelectValue placeholder="Select column" />
      </SelectTrigger>
      <SelectContent>
        {columns.map((col) => (
          <SelectItem key={col.id} value={col.id}>
            {col.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ItemPositionEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
  const items = getRankingItems(sourceQuestion)
  const maxPosition = getMaxRankPosition(sourceQuestion)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.itemId || ''}
        onValueChange={(value) => onUpdate({ itemId: value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select item" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={condition.position ?? ''}
        onChange={(e) => onUpdate({ position: e.target.value ? Number(e.target.value) : undefined })}
        placeholder="#"
        className="w-16"
        min={1}
        max={maxPosition}
      />
    </div>
  )
}

export function ItemNumberEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
  const isConstantSum = sourceQuestion.question_type === 'constant_sum'
  const isRanking = sourceQuestion.question_type === 'ranking'

  const items = isConstantSum
    ? getConstantSumItems(sourceQuestion)
    : getRankingItems(sourceQuestion)

  const maxValue = isConstantSum
    ? getTotalPoints(sourceQuestion)
    : getMaxRankPosition(sourceQuestion)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.itemId || ''}
        onValueChange={(value) => onUpdate({ itemId: value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select item" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={typeof condition.value === 'number' ? condition.value : ''}
        onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : undefined })}
        placeholder={isConstantSum ? 'Points' : 'Position'}
        className="w-20"
        min={isRanking ? 1 : 0}
        max={maxValue}
      />
      {isConstantSum && (
        <span className="text-xs text-muted-foreground">points</span>
      )}
    </div>
  )
}

export function ItemItemEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
  const items = getRankingItems(sourceQuestion)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.itemId || ''}
        onValueChange={(value) => onUpdate({ itemId: value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select item" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.id} value={item.id}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.secondItemId || ''}
        onValueChange={(value) => onUpdate({ secondItemId: value })}
      >
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Select item" />
        </SelectTrigger>
        <SelectContent>
          {items
            .filter(item => item.id !== condition.itemId)
            .map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function ScaleNumberEditor({
  condition,
  sourceQuestion,
  onUpdate,
}: ValueEditorWithQuestionProps) {
  const scales = getSemanticScales(sourceQuestion)
  const range = getScaleRange(sourceQuestion)

  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.scaleId || ''}
        onValueChange={(value) => onUpdate({ scaleId: value })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Select scale" />
        </SelectTrigger>
        <SelectContent>
          {scales.map((scale) => (
            <SelectItem key={scale.id} value={scale.id}>
              {scale.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        value={typeof condition.value === 'number' ? condition.value : ''}
        onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : undefined })}
        placeholder={range ? `${range.min} to ${range.max}` : 'Value'}
        className="w-20"
        min={range?.min}
        max={range?.max}
      />
    </div>
  )
}

export function DateEditor({
  condition,
  onUpdate,
}: ValueEditorBaseProps) {
  const value = typeof condition.value === 'string' ? condition.value : ''

  return (
    <Input
      type="date"
      value={value}
      onChange={(e) => onUpdate({ value: e.target.value || undefined })}
      className="w-40"
    />
  )
}

export function DateRangeEditor({
  condition,
  onUpdate,
}: ValueEditorBaseProps) {
  const minDate = typeof condition.value === 'string' ? condition.value : ''
  const maxDate = typeof condition.maxValue === 'string' ? condition.maxValue : ''

  return (
    <div className="flex items-center gap-1">
      <Input
        type="date"
        value={minDate}
        onChange={(e) => onUpdate({ value: e.target.value || undefined })}
        className="w-36"
      />
      <span className="text-xs text-muted-foreground">and</span>
      <Input
        type="date"
        value={maxDate}
        onChange={(e) => onUpdate({ maxValue: e.target.value || undefined } as any)}
        className="w-36"
      />
    </div>
  )
}
