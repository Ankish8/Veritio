'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'
import { cn } from '@/lib/utils'
import {
  AnalysisTable,
  AnalysisTableRow,
  AnalysisTableCell,
  type AnalysisTableColumn,
} from '@/components/analysis/shared'

interface TaskSummaryTableProps {
  tasks: TaskMetrics[]
  onTaskSelect?: (taskId: string) => void
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'bg-green-500'
  if (value >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

function formatTime(ms: number): string {
  if (ms <= 0) return '—'
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

const columns: AnalysisTableColumn[] = [
  { key: 'number', label: '#', width: '50px' },
  { key: 'question', label: 'Task Question', width: '1fr' },
  { key: 'responses', label: 'Responses', width: '100px', align: 'center' },
  { key: 'success', label: 'Success', width: '140px' },
  { key: 'directness', label: 'Directness', width: '140px' },
  { key: 'time', label: 'Avg Time', width: '90px', align: 'center' },
  { key: 'action', label: '', width: '50px' },
]

const gridColumns = columns.map(c => c.width).join(' ')

export function TaskSummaryTable({ tasks, onTaskSelect }: TaskSummaryTableProps) {
  return (
    <AnalysisTable
      columns={columns}
      data={tasks}
      emptyMessage="No task data available."
      minWidth="700px"
      renderRow={(task, index) => (
        <AnalysisTableRow
          key={task.taskId}
          gridColumns={gridColumns}
          clickable={!!onTaskSelect}
          onClick={() => onTaskSelect?.(task.taskId)}
        >
          <AnalysisTableCell className="font-mono text-muted-foreground">
            {index + 1}
          </AnalysisTableCell>
          <AnalysisTableCell>
            <div className="space-y-1">
              <p className="font-medium line-clamp-2">{task.question}</p>
              <p className="text-xs text-muted-foreground">
                Correct{task.correctNodeIds?.length > 1 ? ` (${task.correctNodeIds.length})` : ''}: {task.correctNodeLabel}
              </p>
            </div>
          </AnalysisTableCell>
          <AnalysisTableCell align="center">
            <Badge variant="outline">{task.responseCount}</Badge>
          </AnalysisTableCell>
          <AnalysisTableCell>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={cn(
                  task.successRate >= 80 && 'text-green-600',
                  task.successRate >= 60 && task.successRate < 80 && 'text-yellow-600',
                  task.successRate < 60 && 'text-red-600',
                )}>
                  {task.successRate.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full transition-all', getProgressColor(task.successRate))}
                  style={{ width: `${task.successRate}%` }}
                />
              </div>
            </div>
          </AnalysisTableCell>
          <AnalysisTableCell>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className={cn(
                  task.directnessRate >= 80 && 'text-green-600',
                  task.directnessRate >= 60 && task.directnessRate < 80 && 'text-yellow-600',
                  task.directnessRate < 60 && 'text-red-600',
                )}>
                  {task.directnessRate.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn('h-full transition-all', getProgressColor(task.directnessRate))}
                  style={{ width: `${task.directnessRate}%` }}
                />
              </div>
            </div>
          </AnalysisTableCell>
          <AnalysisTableCell align="center" className="text-muted-foreground">
            {formatTime(task.averageTimeMs)}
          </AnalysisTableCell>
          <AnalysisTableCell>
            {onTaskSelect && (
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </AnalysisTableCell>
        </AnalysisTableRow>
      )}
    />
  )
}
