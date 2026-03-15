'use client'


import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// Shared components
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay, FindabilityGauge } from '@/components/analysis/shared'

// Tree Test specific components
import { MetricsBadgeGrid } from './metrics-badge-grid'
import { TaskPerformanceChart } from './task-performance-chart'
import { TaskOverviewCard } from './task-overview-card'
import { DestinationsOverview } from './destinations-overview'

import type { OverallMetrics, TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'
import type { Task, TreeNode } from '@veritio/study-types'
import { Button } from '@/components/ui/button'

const TASK_DISPLAY_LIMIT = 10

interface ResultsOverviewProps {
  metrics: OverallMetrics
  responses: TreeTestResponse[]
  participants: any[] // For DeviceInfoDisplay compatibility
  tasks: Task[]
  nodes: TreeNode[]
}

export function ResultsOverview({ metrics, responses, participants, tasks: _tasks, nodes }: ResultsOverviewProps) {
  const [showAllTasks, setShowAllTasks] = useState(false)
  // Calculate time stats from responses for the TimeDisplay component
  const times = useMemo(() => {
    return responses
      .filter(r => r.total_time_ms && r.total_time_ms > 0)
      .map(r => r.total_time_ms as number)
  }, [responses])

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Completion Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletionDisplay
                completed={metrics.completedParticipants}
                total={metrics.totalParticipants}
              />
            </CardContent>
          </Card>

          {/* Time Taken Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time taken</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeDisplay
                avgMs={metrics.averageCompletionTimeMs}
                times={times}
              />
            </CardContent>
          </Card>

          {/* Device Info Card */}
          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceInfoDisplay participants={participants as any} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Row 2: Findability Score Hero & Performance Metrics */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* Findability Score Gauge - Hero metric */}
        <Card>
          <CardContent className="pt-4">
            <FindabilityGauge
              score={metrics.overallScore / 10}
              grade={metrics.overallFindabilityGrade}
              gradeDescription={metrics.overallFindabilityGradeDescription}
              title="Overall Findability"
              size="sm"
            />
          </CardContent>
        </Card>

        {/* Performance Metrics Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <MetricsBadgeGrid metrics={metrics} />
          </CardContent>
        </Card>

        {/* Task Performance Chart - full width on mobile, 2/3 on lg+ */}
        <Card className="md:col-span-2 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Performance</CardTitle>
            <CardDescription>
              Success rate breakdown by task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskPerformanceChart tasks={metrics.taskMetrics} />
          </CardContent>
        </Card>
      </div>

      {/* Task Overview Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Task Overview</h2>
        <Card>
          <CardContent className="pt-4">
            {(showAllTasks ? metrics.taskMetrics : metrics.taskMetrics.slice(0, TASK_DISPLAY_LIMIT)).map((task, index) => (
              <TaskOverviewCard key={task.taskId} task={task} index={index} />
            ))}
            {metrics.taskMetrics.length > TASK_DISPLAY_LIMIT && (
              <div className="text-center pt-3">
                <Button variant="ghost" size="sm" onClick={() => setShowAllTasks(!showAllTasks)}>
                  {showAllTasks ? 'Show less' : `Show all ${metrics.taskMetrics.length} tasks`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Destinations Overview Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Destinations Overview</h2>
        <Card>
          <CardContent className="pt-4">
            <DestinationsOverview
              taskMetrics={metrics.taskMetrics}
              nodes={nodes}
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
