'use client'

import { cn } from '@/lib/utils'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { OptionKeyboardHint } from '../option-keyboard-hint'
import { getKeyboardHint } from '@/lib/study-flow/keyboard-handlers'
import type {
  MatrixQuestionConfig,
  MatrixResponseValue,
  ResponseValue,
} from '@veritio/study-types/study-flow-types'

interface MatrixRendererProps {
  config: MatrixQuestionConfig
  value: ResponseValue | undefined
  onChange: (value: MatrixResponseValue) => void
  showKeyboardHints?: boolean
  onSelectionComplete?: () => void
}

export function MatrixRenderer({
  config,
  value,
  onChange,
  showKeyboardHints = false,
  onSelectionComplete,
}: MatrixRendererProps) {
  const matrixConfig = config as MatrixQuestionConfig
  const currentValue = (value as MatrixResponseValue) || {}

  const { rows = [], columns = [], allowMultiplePerRow } = matrixConfig

  const handleRadioChange = (rowId: string, columnId: string) => {
    const newValue = {
      ...currentValue,
      [rowId]: columnId,
    }
    onChange(newValue)

    // Check if all rows are now filled (for auto-advance)
    const allRowsFilled = rows.every(row => newValue[row.id])
    if (allRowsFilled) {
      onSelectionComplete?.()
    }
  }

  const handleCheckboxChange = (rowId: string, columnId: string, checked: boolean) => {
    const currentRowValue = currentValue[rowId]
    const currentColumnIds = Array.isArray(currentRowValue)
      ? currentRowValue
      : currentRowValue
        ? [currentRowValue]
        : []

    const newColumnIds = checked
      ? [...currentColumnIds, columnId]
      : currentColumnIds.filter((id) => id !== columnId)

    onChange({
      ...currentValue,
      [rowId]: newColumnIds,
    })
  }

  const isSelected = (rowId: string, columnId: string): boolean => {
    const rowValue = currentValue[rowId]
    if (Array.isArray(rowValue)) {
      return rowValue.includes(columnId)
    }
    return rowValue === columnId
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 text-left"></th>
            {columns.map((column, index) => (
              <th
                key={column.id}
                className="p-2 text-center text-sm font-medium min-w-[80px]"
              >
                <div className="flex flex-col items-center gap-1">
                  {showKeyboardHints && (
                    <OptionKeyboardHint hint={getKeyboardHint('matrix', index)} />
                  )}
                  {column.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className={cn(rowIndex % 2 === 0 ? 'bg-muted/30' : '')}
            >
              <td className="p-2 text-sm font-medium">{row.label}</td>
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={cn(
                    "p-4 text-center cursor-pointer transition-colors",
                    "hover:bg-muted/50",
                    isSelected(row.id, column.id) && "bg-muted/30"
                  )}
                  onClick={() => {
                    if (allowMultiplePerRow) {
                      handleCheckboxChange(row.id, column.id, !isSelected(row.id, column.id))
                    } else {
                      handleRadioChange(row.id, column.id)
                    }
                  }}
                >
                  {allowMultiplePerRow ? (
                    <Checkbox
                      branded
                      checked={isSelected(row.id, column.id)}
                      onCheckedChange={(checked) =>
                        handleCheckboxChange(row.id, column.id, checked === true)
                      }
                      className="pointer-events-none"
                    />
                  ) : (
                    <RadioGroup
                      value={currentValue[row.id] as string || ''}
                      onValueChange={(value) => handleRadioChange(row.id, value)}
                      className="flex justify-center pointer-events-none"
                    >
                      <RadioGroupItem
                        branded
                        value={column.id}
                        id={`${row.id}-${column.id}`}
                      />
                    </RadioGroup>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
