'use client'

import { useRef, useState } from 'react'
import { Button } from '@veritio/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@veritio/ui/components/dropdown-menu'
import { Download, Image, FileSpreadsheet, Loader2 } from 'lucide-react'
import { exportElementToPNG } from '@veritio/analysis-shared/lib/analytics/heatmap-export'
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface TaskResultsExportProps {
  taskMetrics: PrototypeTaskMetrics
  studyTitle: string
  captureRef: React.RefObject<HTMLElement>
}
function formatTime(ms: number): string {
  if (ms === 0) return '0s'
  if (ms < 1000) return `${Math.round(ms)}ms`

  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)

  if (remainingSeconds === 0) return `${minutes}m`
  return `${minutes}m ${remainingSeconds}s`
}
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''

  const str = String(value)
  const formulaChars = ['=', '+', '-', '@', '\t', '\r']
  const needsFormulaPrefix = formulaChars.some(char => str.startsWith(char))
  const needsQuoting = str.includes(',') || str.includes('"') || str.includes('\n') || needsFormulaPrefix

  if (needsQuoting) {
    const escaped = str.replace(/"/g, '""')
    return needsFormulaPrefix ? `"'${escaped}"` : `"${escaped}"`
  }

  return str
}
function generateTaskMetricsCSV(metrics: PrototypeTaskMetrics, studyTitle: string): string {
  const rows = [
    ['Study', studyTitle],
    ['Task', metrics.taskTitle],
    ['Task Instruction', metrics.taskInstruction || ''],
    [],
    ['Metric', 'Value', 'Additional Info'],
    [],
    ['Responses', metrics.responseCount.toString()],
    [],
    ['-- Outcomes --'],
    ['Success Count', metrics.successCount.toString(), `${metrics.successRate.toFixed(1)}%`],
    ['Failure Count', metrics.failureCount.toString(), `${metrics.failureRate.toFixed(1)}%`],
    ['Skipped Count', metrics.skippedCount.toString(), `${metrics.skippedRate.toFixed(1)}%`],
    [],
    ['-- Success Breakdown --'],
    ['Direct Success', metrics.statusBreakdown?.success.direct.toString() || '0'],
    ['Indirect Success', metrics.statusBreakdown?.success.indirect.toString() || '0'],
    [],
    ['-- Key Metrics --'],
    ['Success Rate', `${metrics.successRate.toFixed(1)}%`, `95% CI: ${metrics.successCI?.lowerBound?.toFixed(1) || 0}% - ${metrics.successCI?.upperBound?.toFixed(1) || 0}%`],
    ['Directness Rate', `${metrics.directRate.toFixed(1)}%`, `95% CI: ${metrics.directnessCI?.lowerBound?.toFixed(1) || 0}% - ${metrics.directnessCI?.upperBound?.toFixed(1) || 0}%`],
    ['Average Time', formatTime(metrics.averageTimeMs), `${metrics.averageTimeMs.toFixed(0)}ms`],
    ['Misclick Rate', `${metrics.misclickRate.toFixed(1)}%`],
    ['Task Score', `${metrics.taskScore.toFixed(1)}/10`, '(Success × 3 + Directness) / 4'],
    [],
    ['-- Click Statistics --'],
    ['Average Clicks', metrics.averageClickCount.toFixed(1)],
    ['Average Misclicks', metrics.averageMisclickCount.toFixed(1)],
    ['Average Backtracks', metrics.averageBacktrackCount.toFixed(1)],
    [],
    ['-- Time Distribution --'],
    ['Min', formatTime(metrics.timeBoxPlot?.min || 0)],
    ['Q1 (25th percentile)', formatTime(metrics.timeBoxPlot?.q1 || 0)],
    ['Median', formatTime(metrics.timeBoxPlot?.median || 0)],
    ['Q3 (75th percentile)', formatTime(metrics.timeBoxPlot?.q3 || 0)],
    ['Max', formatTime(metrics.timeBoxPlot?.max || 0)],
    ['Outliers', (metrics.timeBoxPlot?.outliers?.length || 0).toString()],
  ]

  return rows.map(row => row.map(escapeCsvValue).join(',')).join('\n')
}
function exportTaskMetricsToCSV(metrics: PrototypeTaskMetrics, studyTitle: string): void {
  const csvContent = generateTaskMetricsCSV(metrics, studyTitle)
  const timestamp = new Date().toISOString().slice(0, 10)
  const sanitizedTask = metrics.taskTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
  const filename = `task-results-${sanitizedTask}-${timestamp}`

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
export function TaskResultsExport({
  taskMetrics,
  studyTitle,
  captureRef,
}: TaskResultsExportProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportPNG = async () => {
    if (!captureRef.current) {
      console.error('[TaskResultsExport] No capture ref available')
      alert('Export failed: Unable to capture content. Please try again.')
      return
    }

    setIsExporting(true)
    try {
      const timestamp = new Date().toISOString().slice(0, 10)
      const sanitizedTask = taskMetrics.taskTitle.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      const filename = `task-results-${sanitizedTask}-${timestamp}`
      await exportElementToPNG(captureRef.current, filename)
    } catch (error) {
      console.error('Failed to export PNG:', error)
      alert('Export failed. Please try exporting as CSV instead.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCSV = () => {
    exportTaskMetricsToCSV(taskMetrics, studyTitle)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleExportPNG} disabled={isExporting}>
          <Image className="h-4 w-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
