'use client'

import { useState } from 'react'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Button } from '@veritio/ui'
import { Checkbox } from '@veritio/ui'
import { Plus, Trash2 } from 'lucide-react'
import type { MatrixQuestionConfig, MatrixItem } from '../../../../../lib/supabase/study-flow-types'

interface MatrixConfigProps {
  config: MatrixQuestionConfig
  onChange: (config: Partial<MatrixQuestionConfig>) => void
}
export function MatrixConfig({ config, onChange }: MatrixConfigProps) {
  const [showListView, setShowListView] = useState(false)
  const rows = config.rows || []
  const columns = config.columns || []

  const handleAddRow = () => {
    const newRow: MatrixItem = {
      id: crypto.randomUUID(),
      label: 'Row value',
    }
    onChange({ rows: [...rows, newRow] })
  }

  const handleAddColumn = () => {
    const newColumn: MatrixItem = {
      id: crypto.randomUUID(),
      label: 'Column value',
    }
    onChange({ columns: [...columns, newColumn] })
  }

  const handleUpdateRow = (id: string, label: string) => {
    onChange({ rows: rows.map((r) => (r.id === id ? { ...r, label } : r)) })
  }

  const handleUpdateColumn = (id: string, label: string) => {
    onChange({ columns: columns.map((c) => (c.id === id ? { ...c, label } : c)) })
  }

  const handleRemoveRow = (id: string) => {
    if (rows.length > 1) {
      onChange({ rows: rows.filter((r) => r.id !== id) })
    }
  }

  const handleRemoveColumn = (id: string) => {
    if (columns.length > 1) {
      onChange({ columns: columns.filter((c) => c.id !== id) })
    }
  }

  // List view for smaller screens or preference
  if (showListView) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Matrix Configuration</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-list-view"
              checked={showListView}
              onCheckedChange={(checked) => setShowListView(!!checked)}
            />
            <Label htmlFor="show-list-view" className="text-sm font-normal cursor-pointer">
              Show list view
            </Label>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Rows */}
          <div className="space-y-2">
            <Label>Rows (Items to Rate)</Label>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <Input
                    value={row.label}
                    onChange={(e) => handleUpdateRow(row.id, e.target.value)}
                    placeholder="Row label"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Row
            </Button>
          </div>

          {/* Columns */}
          <div className="space-y-2">
            <Label>Columns (Rating Options)</Label>
            <div className="space-y-2">
              {columns.map((column) => (
                <div key={column.id} className="flex items-center gap-2">
                  <Input
                    value={column.label}
                    onChange={(e) => handleUpdateColumn(column.id, e.target.value)}
                    placeholder="Column label"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => handleRemoveColumn(column.id)}
                    disabled={columns.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleAddColumn}>
              <Plus className="mr-2 h-4 w-4" />
              Add Column
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Grid view (default) - like Optimal Workshop
  return (
    <div className="space-y-4">
      {/* Grid Table */}
      <div className="rounded-lg border overflow-x-auto">
        <table className="w-full">
          {/* Header Row with Column Labels */}
          <thead>
            <tr className="bg-muted/30">
              {/* Empty cell for row labels column */}
              <th className="w-[200px] min-w-[200px]"></th>
              {columns.map((col, index) => (
                <th key={col.id} className="p-2 text-center min-w-[120px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {index + 1}
                    </span>
                    <Input
                      value={col.label}
                      onChange={(e) => handleUpdateColumn(col.id, e.target.value)}
                      className="text-center text-sm h-8 px-2 bg-background border border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary"
                      placeholder="Column name"
                    />
                  </div>
                </th>
              ))}
              {/* Delete column buttons row */}
              <th className="w-10"></th>
            </tr>
          </thead>

          {/* Body Rows */}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="border-t">
                {/* Row Label Cell */}
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                      {rowIndex + 1}
                    </span>
                    <Input
                      value={row.label}
                      onChange={(e) => handleUpdateRow(row.id, e.target.value)}
                      className="text-sm h-8 px-2 bg-background border border-input hover:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary"
                      placeholder="Row name"
                    />
                  </div>
                </td>
                {/* Radio/Checkbox cells for each column */}
                {columns.map((col) => (
                  <td key={col.id} className="p-2 text-center">
                    <div className="flex justify-center">
                      {config.allowMultiplePerRow ? (
                        <div className="w-5 h-5 rounded border-2 border-muted-foreground/40" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/40 flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                  </td>
                ))}
                {/* Delete Row Button */}
                <td className="p-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveRow(row.id)}
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}

            {/* Delete Column Buttons Row */}
            <tr className="border-t">
              <td></td>
              {columns.map((col) => (
                <td key={col.id} className="p-2 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveColumn(col.id)}
                    disabled={columns.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              ))}
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleAddRow}>
          <Plus className="mr-2 h-4 w-4" />
          Add row
        </Button>
        <Button variant="outline" size="sm" onClick={handleAddColumn}>
          <Plus className="mr-2 h-4 w-4" />
          Add column
        </Button>
        <div className="flex items-center gap-2 ml-4">
          <Checkbox
            id="show-list-view"
            checked={showListView}
            onCheckedChange={(checked) => setShowListView(!!checked)}
          />
          <Label htmlFor="show-list-view" className="text-sm font-normal cursor-pointer">
            Show list view
          </Label>
        </div>
      </div>
    </div>
  )
}
