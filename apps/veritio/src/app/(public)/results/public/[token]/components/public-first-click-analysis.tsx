'use client'

import { CheckCircle, XCircle, Clock, MousePointerClick } from 'lucide-react'

interface TaskMetric {
  taskId: string
  taskTitle: string
  successRate: number
  directSuccessRate: number
  averageTimeMs: number
  totalAttempts: number
}

interface PublicFirstClickAnalysisProps {
  tasks: any[]
  metrics: { taskMetrics: TaskMetric[] }
  participants: any[]
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

function SuccessRateBadge({ rate }: { rate: number }) {
  const percentage = Math.round(rate * 100)
  const color =
    percentage >= 70
      ? 'text-green-700 bg-green-50'
      : percentage >= 40
        ? 'text-amber-700 bg-amber-50'
        : 'text-red-700 bg-red-50'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {percentage >= 70 ? (
        <CheckCircle className="h-3 w-3" />
      ) : (
        <XCircle className="h-3 w-3" />
      )}
      {percentage}%
    </span>
  )
}

export function PublicFirstClickAnalysis({
  tasks: _tasks,
  metrics,
  participants,
}: PublicFirstClickAnalysisProps) {
  const taskMetrics = metrics?.taskMetrics

  if (!taskMetrics || taskMetrics.length === 0) {
    return (
      <div className="rounded-lg border bg-card shadow-sm p-6">
        <p className="text-sm text-muted-foreground">No first-click data available.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-base font-semibold">First Click Results</h3>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {participants.length} participant{participants.length !== 1 ? 's' : ''} across {taskMetrics.length} task{taskMetrics.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Task</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Success Rate</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Direct Success</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Avg. Time to Click</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Attempts</th>
            </tr>
          </thead>
          <tbody>
            {taskMetrics.map((metric) => (
              <tr key={metric.taskId} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium">{metric.taskTitle}</td>
                <td className="px-4 py-3 text-center">
                  <SuccessRateBadge rate={metric.successRate} />
                </td>
                <td className="px-4 py-3 text-center">
                  <SuccessRateBadge rate={metric.directSuccessRate} />
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(metric.averageTimeMs)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-muted-foreground">
                  {metric.totalAttempts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
