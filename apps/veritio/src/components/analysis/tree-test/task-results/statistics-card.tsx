'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ResultPieChart } from './result-pie-chart'
import { StatusBreakdownTable } from './status-breakdown-table'
import { BulletChart } from './bullet-chart'
import { TimeBoxPlot } from './time-box-plot'
import { ScoreBar } from './score-bar'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'
import type { StatusBreakdown, BoxPlotStats } from '@/lib/algorithms/statistics'
import { wilsonScoreCI, calculateTaskScore } from '@/lib/algorithms/statistics'
import { getFindabilityGrade } from '@/lib/algorithms/findability-score'

interface StatisticsCardProps {
  taskMetrics: TaskMetrics
  className?: string
}

/**
 * Main statistics card with side-by-side layout:
 * - Left: Pie chart + Status breakdown table
 * - Right: Bullet charts (Success, Directness, Time taken, Score)
 */
export function StatisticsCard({ taskMetrics, className }: StatisticsCardProps) {
  // Compute derived values with client-side fallback if server values missing
  const computedMetrics = useMemo(() => {
    const responseCount = taskMetrics.responseCount || 0
    const successRate = taskMetrics.successRate || 0
    const directnessRate = taskMetrics.directnessRate || 0

    // Calculate success and direct counts from rates
    const successCount = Math.round((successRate / 100) * responseCount)
    const directCount = Math.round((directnessRate / 100) * responseCount)
    const directSuccessCount = taskMetrics.directSuccessRate
      ? Math.round((taskMetrics.directSuccessRate / 100) * responseCount)
      : directCount

    // Build status breakdown from available data
    const statusBreakdown: StatusBreakdown = taskMetrics.statusBreakdown ?? {
      success: {
        direct: directSuccessCount,
        indirect: successCount - directSuccessCount,
        total: successCount,
      },
      fail: {
        direct: 0,
        indirect: responseCount - successCount - (taskMetrics.skipCount || 0),
        total: responseCount - successCount - (taskMetrics.skipCount || 0),
      },
      skip: { total: taskMetrics.skipCount || 0 },
    }

    // Confidence intervals
    const successCI = taskMetrics.successCI ?? wilsonScoreCI(successCount, responseCount)
    const directnessCI = taskMetrics.directnessCI ?? wilsonScoreCI(directCount, responseCount)

    // Time box plot - use server value or create default from average
    const timeBoxPlot: BoxPlotStats = taskMetrics.timeBoxPlot ?? {
      min: 0,
      q1: taskMetrics.averageTimeMs * 0.5,
      median: taskMetrics.averageTimeMs,
      q3: taskMetrics.averageTimeMs * 1.5,
      max: taskMetrics.averageTimeMs * 2,
      outliers: [],
    }

    // Findability score and grade
    const taskScore = taskMetrics.taskScore ?? calculateTaskScore(successRate, directnessRate)

    // Use pre-computed grade if available, otherwise compute it
    const { grade: findabilityGrade, gradeDescription: findabilityGradeDescription } =
      taskMetrics.findabilityGrade
        ? { grade: taskMetrics.findabilityGrade, gradeDescription: taskMetrics.findabilityGradeDescription }
        : getFindabilityGrade(taskScore)

    return { statusBreakdown, successCI, directnessCI, timeBoxPlot, taskScore, findabilityGrade, findabilityGradeDescription }
  }, [taskMetrics])

  const { statusBreakdown, successCI, directnessCI, timeBoxPlot, taskScore, findabilityGrade, findabilityGradeDescription } = computedMetrics

  return (
    <Card className={`border-0 shadow-none ${className || ''}`}>
      <CardContent className="pt-0 px-0">
        {/* Side-by-side layout: Left (pie+table) | Right (bullet charts) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left section: Pie chart + Status breakdown table */}
          <div className="space-y-6">
            {/* Pie chart - centered */}
            <div className="flex justify-center">
              <ResultPieChart
                statusBreakdown={statusBreakdown}
                responseCount={taskMetrics.responseCount}
              />
            </div>

            {/* Status breakdown table */}
            <StatusBreakdownTable
              statusBreakdown={statusBreakdown}
              responseCount={taskMetrics.responseCount}
            />
          </div>

          {/* Right section: Bullet charts */}
          <div className="space-y-7">
            {/* Success rate */}
            <BulletChart
              label="Success"
              value={taskMetrics.successRate}
              confidenceInterval={successCI}
              color="green"
              max={100}
            />

            {/* Directness rate */}
            <BulletChart
              label="Directness"
              value={taskMetrics.directnessRate}
              confidenceInterval={directnessCI}
              color="blue"
              max={100}
            />

            {/* Time taken (box plot) */}
            <TimeBoxPlot
              stats={timeBoxPlot}
              medianValue={timeBoxPlot.median}
            />

            {/* Findability Score */}
            <ScoreBar
              score={taskScore}
              grade={findabilityGrade}
              gradeDescription={findabilityGradeDescription}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
