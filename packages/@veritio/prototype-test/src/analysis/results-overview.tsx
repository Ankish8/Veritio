'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@veritio/ui/components/card'

// Shared components
import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@veritio/analysis-shared'

// Prototype Test specific components
import { TaskPerformanceChart } from './task-performance-chart'
import { TaskOverviewCard } from './task-overview-card'

import type { PrototypeTestMetrics, PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'
import type { Participant } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface ResultsOverviewProps {
  metrics: PrototypeTestMetrics
  participants: Participant[]
  taskMetrics: PrototypeTaskMetrics[]
}

export const ResultsOverview = memo(function ResultsOverview({ metrics, participants, taskMetrics }: ResultsOverviewProps) {
  // Use actual task times from metrics (sum of total_time_ms from task attempts per participant)
  // This shows time spent on actual tasks, not browser session duration
  const times = metrics.participantTaskTimes

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Participants Section */}
      <section data-pdf-chart="overview-stats">
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

      {/* Performance Metrics Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-3">
        {/* Performance Metrics Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="text-sm font-medium">{metrics.overallSuccessRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Direct Rate</span>
                <span className="text-sm font-medium">{metrics.overallDirectRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Avg. Clicks</span>
                <span className="text-sm font-medium">{metrics.averageClickCount.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Misclick Rate</span>
                <span className="text-sm font-medium">{metrics.averageMisclickRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Task Performance</CardTitle>
            <CardDescription>
              Success rate breakdown by task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskPerformanceChart taskMetrics={taskMetrics} />
          </CardContent>
        </Card>
      </div>

      {/* Task Overview Section */}
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Task Overview</h2>
        <div className="space-y-3">
          {taskMetrics.map((task, index) => (
            <TaskOverviewCard key={task.taskId} task={task} index={index} />
          ))}
          {taskMetrics.length === 0 && (
            <div className="rounded-lg border border-dashed text-center text-muted-foreground py-8">
              No tasks configured for this study.
            </div>
          )}
        </div>
      </section>
    </div>
  )
})
