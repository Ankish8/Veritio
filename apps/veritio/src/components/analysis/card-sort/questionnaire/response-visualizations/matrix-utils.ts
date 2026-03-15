import type { StudyFlowResponseRow } from '@veritio/study-types'
import { MATRIX_COLUMN_COLORS } from '@/lib/colors'

export { MATRIX_COLUMN_COLORS }

type MatrixResponse = Record<string, string | string[]>

interface MatrixItem {
  id: string
  label: string
}

/**
 * Normalize matrix items: handle both {id, label} objects and plain strings.
 */
export function normalizeMatrixItems(items: any[]): MatrixItem[] {
  return items.map((item: any, index: number) => {
    if (typeof item === 'string') {
      return { id: item, label: item }
    }
    return { id: item.id || `item-${index}`, label: item.label || item.id || `Item ${index + 1}` }
  })
}

export function countMatrixResponses(
  responses: StudyFlowResponseRow[],
  rows: MatrixItem[],
  columns: MatrixItem[]
): { cellCounts: Record<string, Record<string, number>>; rowCounts: Record<string, number> } {
  const cellCounts: Record<string, Record<string, number>> = {}
  const rowCounts: Record<string, number> = {}

  for (const row of rows) {
    cellCounts[row.id] = {}
    rowCounts[row.id] = 0
    for (const col of columns) {
      cellCounts[row.id][col.id] = 0
    }
  }

  // Build label→id lookups for handling legacy responses stored with label keys/values
  const rowLabelToId = new Map<string, string>()
  const colLabelToId = new Map<string, string>()
  for (const row of rows) rowLabelToId.set(row.label.toLowerCase(), row.id)
  for (const col of columns) colLabelToId.set(col.label.toLowerCase(), col.id)

  for (const response of responses) {
    const value = response.response_value as MatrixResponse
    if (!value || typeof value !== 'object') continue

    for (const key of Object.keys(value)) {
      // Resolve row: try direct ID match, then label match
      const rowId = cellCounts[key] ? key : rowLabelToId.get(key.toLowerCase()) || null
      if (!rowId || !cellCounts[rowId]) continue

      const colValue = value[key]
      if (Array.isArray(colValue)) {
        for (const cv of colValue) {
          // Resolve column: try direct ID match, then label match
          const colId = cellCounts[rowId][cv] !== undefined ? cv : colLabelToId.get(String(cv).toLowerCase()) || null
          if (colId && cellCounts[rowId][colId] !== undefined) {
            cellCounts[rowId][colId]++
            rowCounts[rowId]++
          }
        }
      } else if (typeof colValue === 'string') {
        const colId = cellCounts[rowId][colValue] !== undefined ? colValue : colLabelToId.get(colValue.toLowerCase()) || null
        if (colId && cellCounts[rowId][colId] !== undefined) {
          cellCounts[rowId][colId]++
          rowCounts[rowId]++
        }
      }
    }
  }

  return { cellCounts, rowCounts }
}
