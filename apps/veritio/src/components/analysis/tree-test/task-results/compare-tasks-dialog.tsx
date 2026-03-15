'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Download, X, Users } from 'lucide-react'
import { TaskBreadcrumb } from './task-breadcrumb'
import { ResultPieChart } from './result-pie-chart'
import { StatusBreakdownTable } from './status-breakdown-table'
import { MetricBar } from './metric-bar'
import { TimeBoxPlot } from './time-box-plot'
import { ScoreBar } from './score-bar'
import { ComparisonPathsTable } from './comparison-paths-table'
import type { TaskMetrics, StatusBreakdown, ConfidenceInterval, BoxPlotStats } from '@/lib/algorithms/tree-test-analysis'

// Default values for extended metrics
const defaultStatusBreakdown: StatusBreakdown = {
  success: { direct: 0, indirect: 0, total: 0 },
  fail: { direct: 0, indirect: 0, total: 0 },
  skip: { direct: 0, indirect: 0, total: 0 },
}
const defaultCI: ConfidenceInterval = { lowerBound: 0, upperBound: 0, level: 0.95 }
const defaultBoxPlot: BoxPlotStats = { min: 0, q1: 0, median: 0, q3: 0, max: 0, outliers: [] }

/** Get safe extended metrics with defaults for undefined values */
function getSafeMetrics(task: TaskMetrics) {
  return {
    statusBreakdown: task.statusBreakdown ?? defaultStatusBreakdown,
    successCI: task.successCI ?? defaultCI,
    directnessCI: task.directnessCI ?? defaultCI,
    timeBoxPlot: task.timeBoxPlot ?? defaultBoxPlot,
    taskScore: task.taskScore ?? 0,
    correctPathBreadcrumb: task.correctPathBreadcrumb ?? [],
  }
}

/** Renders a task header card with index, question, and correct path */
function TaskHeaderCard({ task, taskIndex }: { task: TaskMetrics; taskIndex: number }) {
  const safe = getSafeMetrics(task)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium px-2 py-1 bg-muted rounded">
          Task {taskIndex + 1}
        </span>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {task.responseCount}
        </div>
      </div>
      <p className="font-medium">{task.question}</p>
      <TaskBreadcrumb
        taskNumber={taskIndex + 1}
        taskQuestion=""
        breadcrumbPath={safe.correctPathBreadcrumb}
      />
    </div>
  )
}

/** Renders task result metrics: pie chart, breakdown table, metric bars, time, and score */
function TaskResultsColumn({ task }: { task: TaskMetrics }) {
  const safe = getSafeMetrics(task)
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <ResultPieChart
          statusBreakdown={safe.statusBreakdown}
          responseCount={task.responseCount}
        />
      </div>
      <StatusBreakdownTable
        statusBreakdown={safe.statusBreakdown}
        responseCount={task.responseCount}
      />
      <div className="space-y-3 pt-4 border-t">
        <MetricBar label="Success" value={task.successRate} confidenceInterval={safe.successCI} color="green" />
        <MetricBar label="Directness" value={task.directnessRate} confidenceInterval={safe.directnessCI} color="blue" />
        <TimeBoxPlot stats={safe.timeBoxPlot} medianValue={safe.timeBoxPlot.median} />
        <ScoreBar score={safe.taskScore} />
      </div>
    </div>
  )
}

/** Placeholder shown when no task is selected in a comparison slot */
function ComparisonPlaceholder({ message = 'Select a task to compare' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center border-2 border-dashed rounded-lg p-8 text-muted-foreground">
      {message}
    </div>
  )
}

interface CompareTasksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskMetrics: TaskMetrics[]
  initialTask1Id?: string | null
  initialTask2Id?: string | null
}

/**
 * Dialog for comparing two tasks side-by-side.
 * Shows task results, paths, and pietree comparison.
 */
export function CompareTasksDialog({
  open,
  onOpenChange,
  taskMetrics,
  initialTask1Id,
  initialTask2Id,
}: CompareTasksDialogProps) {
  // Track selected tasks
  const [task1Id, setTask1Id] = useState<string | null>(
    initialTask1Id ?? (taskMetrics.length > 0 ? taskMetrics[0].taskId : null)
  )
  const [task2Id, setTask2Id] = useState<string | null>(
    initialTask2Id ?? (taskMetrics.length > 1 ? taskMetrics[1].taskId : null)
  )

  const task1 = taskMetrics.find(t => t.taskId === task1Id) ?? null
  const task2 = taskMetrics.find(t => t.taskId === task2Id) ?? null
  const task1Index = taskMetrics.findIndex(t => t.taskId === task1Id)
  const task2Index = taskMetrics.findIndex(t => t.taskId === task2Id)

  const selectorTasks = useMemo(() => {
    return taskMetrics.map((t, index) => ({
      taskId: t.taskId,
      label: `Task ${index + 1}`,
      question: t.question,
    }))
  }, [taskMetrics])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between gap-4">
          <DialogTitle>Comparison</DialogTitle>
          <div className="flex items-center gap-4">
            {/* Task 1 selector */}
            <Select value={task1Id ?? undefined} onValueChange={setTask1Id}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select task 1..." />
              </SelectTrigger>
              <SelectContent>
                {selectorTasks.map((task) => (
                  <SelectItem
                    key={task.taskId}
                    value={task.taskId}
                    disabled={task.taskId === task2Id}
                  >
                    {task.label}: {task.question.slice(0, 30)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground">vs</span>

            {/* Task 2 selector */}
            <Select value={task2Id ?? undefined} onValueChange={setTask2Id}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Select task 2..." />
              </SelectTrigger>
              <SelectContent>
                {selectorTasks.map((task) => (
                  <SelectItem
                    key={task.taskId}
                    value={task.taskId}
                    disabled={task.taskId === task1Id}
                  >
                    {task.label}: {task.question.slice(0, 30)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-4">
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Comparison content */}
        <div className="grid grid-cols-2 gap-6 mt-6">
          {task1 ? <TaskHeaderCard task={task1} taskIndex={task1Index} /> : <ComparisonPlaceholder />}
          {task2 ? <TaskHeaderCard task={task2} taskIndex={task2Index} /> : <ComparisonPlaceholder />}
        </div>

        {/* Task Results Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Task results</CardTitle>
            <CardDescription>Success and failure metrics from this task.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {task1 ? <TaskResultsColumn task={task1} /> : <ComparisonPlaceholder />}
              {task2 ? <TaskResultsColumn task={task2} /> : <ComparisonPlaceholder />}
            </div>
          </CardContent>
        </Card>

        {/* Paths Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Paths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {task1 ? <ComparisonPathsTable paths={task1.commonPaths} /> : <ComparisonPlaceholder />}
              {task2 ? <ComparisonPathsTable paths={task2.commonPaths} /> : <ComparisonPlaceholder />}
            </div>
          </CardContent>
        </Card>

        {/* Pietree Comparison Section - Placeholder for Phase 6 */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Pietree comparison</CardTitle>
              <CardDescription>
                Visualize how many participants went down the correct or incorrect path,
                and where they backtracked.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Pietree settings
              </Button>
              <Button variant="outline" size="sm">
                Expand
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* Pietree visualizations will be added in Phase 6 */}
              <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                Pietree visualization coming soon
              </div>
              <div className="h-64 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                Pietree visualization coming soon
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
