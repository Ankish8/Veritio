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
  getMatrixRows,
  getMatrixColumns,
  getRankingItems,
  getConstantSumItems,
  getSemanticScales,
  getScaleRange,
  getMaxRankPosition,
  getTotalPoints,
} from '@veritio/prototype-test/lib/study-flow/display-logic-operators'

export function RowColumnEditor({
  condition,
  sourceQuestion,
  onUpdate,
  multiColumn,
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
  multiColumn: boolean
}) {
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
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
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
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
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
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
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
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
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
}: {
  condition: DisplayLogicCondition
  sourceQuestion: StudyFlowQuestion
  onUpdate: (updates: Partial<DisplayLogicCondition>) => void
}) {
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
