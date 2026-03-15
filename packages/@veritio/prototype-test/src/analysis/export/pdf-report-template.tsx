'use client'
import { forwardRef } from 'react'
import { cn } from '@veritio/ui'
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'
import type { AdvancedTaskMetrics } from '@veritio/prototype-test/algorithms/advanced-metrics'
import { getScoreRangeLabel, getLostnessLabel } from '@veritio/prototype-test/lib/constants/prototype-thresholds'
// Types

export interface PDFReportTemplateProps {
  studyTitle: string
  studyDescription?: string
  exportDate: Date
  taskMetrics: PrototypeTaskMetrics[]
  advancedMetrics?: Map<string, AdvancedTaskMetrics>
  participantCount: number
  overview: {
    totalResponses: number
    completionRate: number
    averageTimeMs: number
    overallSuccessRate: number
  }
  capturedImages?: Map<string, string>
  className?: string
}
// Helper Functions

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

function getSuccessColorClass(rate: number): string {
  if (rate >= 80) return 'text-emerald-600'
  if (rate >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function getScoreColorClass(score: number): string {
  if (score >= 8) return 'text-emerald-600'
  if (score >= 6) return 'text-amber-600'
  return 'text-red-600'
}

function getLostnessColorClass(score: number): string {
  if (score <= 0.3) return 'text-emerald-600'
  if (score <= 0.6) return 'text-amber-600'
  return 'text-red-600'
}

function getEfficiencyColorClass(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}
// Component
export const PDFReportTemplate = forwardRef<HTMLDivElement, PDFReportTemplateProps>(
  function PDFReportTemplate(
    {
      studyTitle,
      studyDescription,
      exportDate,
      taskMetrics,
      advancedMetrics,
      participantCount,
      overview,
      capturedImages,
      className,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white text-gray-900 p-8 max-w-4xl mx-auto',
          // Print styles
          'print:p-4 print:max-w-full',
          className
        )}
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        {/* ================================================================= */}
        {/* Title Section */}
        {/* ================================================================= */}
        <header className="text-center border-b border-gray-200 pb-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{studyTitle}</h1>
          <p className="text-gray-500 text-sm">Prototype Test Results Report</p>
          <p className="text-gray-400 text-xs mt-2">
            Generated: {exportDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {studyDescription && (
            <p className="text-gray-600 text-sm mt-4 max-w-2xl mx-auto">
              {studyDescription}
            </p>
          )}
        </header>

        {/* ================================================================= */}
        {/* Overview Section */}
        {/* ================================================================= */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Overview</h2>
          <div className="grid grid-cols-3 gap-4">
            <OverviewStatCard
              label="Participants"
              value={participantCount.toString()}
            />
            <OverviewStatCard
              label="Total Responses"
              value={overview.totalResponses.toString()}
            />
            <OverviewStatCard
              label="Completion Rate"
              value={`${overview.completionRate.toFixed(1)}%`}
            />
            <OverviewStatCard
              label="Overall Success Rate"
              value={`${overview.overallSuccessRate.toFixed(1)}%`}
              valueClassName={getSuccessColorClass(overview.overallSuccessRate)}
            />
            <OverviewStatCard
              label="Avg. Time"
              value={formatTime(overview.averageTimeMs)}
            />
            <OverviewStatCard
              label="Tasks"
              value={taskMetrics.length.toString()}
            />
          </div>
        </section>

        {/* ================================================================= */}
        {/* Task Summary Table */}
        {/* ================================================================= */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Task Summary</h2>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Task</th>
                  <th className="text-center px-4 py-2 font-medium">Success</th>
                  <th className="text-center px-4 py-2 font-medium">Directness</th>
                  <th className="text-center px-4 py-2 font-medium">Avg Time</th>
                  <th className="text-center px-4 py-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody>
                {taskMetrics.map((task, index) => (
                  <tr
                    key={task.taskId}
                    className={cn(
                      'border-t border-gray-200',
                      index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                    )}
                  >
                    <td className="px-4 py-2 font-medium">{task.taskTitle}</td>
                    <td className={cn('text-center px-4 py-2', getSuccessColorClass(task.successRate))}>
                      {task.successRate.toFixed(1)}%
                    </td>
                    <td className="text-center px-4 py-2">
                      {task.directRate.toFixed(1)}%
                    </td>
                    <td className="text-center px-4 py-2">
                      {formatTime(task.averageTimeMs)}
                    </td>
                    <td className={cn('text-center px-4 py-2 font-medium', getScoreColorClass(task.taskScore))}>
                      {task.taskScore.toFixed(1)}/10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================================================================= */}
        {/* Individual Task Details */}
        {/* ================================================================= */}
        {taskMetrics.map((task, index) => (
          <TaskDetailSection
            key={task.taskId}
            task={task}
            index={index}
            advancedMetrics={advancedMetrics?.get(task.taskId)}
            capturedImage={capturedImages?.get(`task-${task.taskId}`)}
          />
        ))}

        {/* ================================================================= */}
        {/* Footer */}
        {/* ================================================================= */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-gray-400 text-xs">
          <p>Generated by VeriTio | {exportDate.toISOString().slice(0, 10)}</p>
        </footer>
      </div>
    )
  }
)
// Sub-components

interface OverviewStatCardProps {
  label: string
  value: string
  valueClassName?: string
}

function OverviewStatCard({ label, value, valueClassName }: OverviewStatCardProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className={cn('text-2xl font-bold', valueClassName || 'text-gray-900')}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

interface TaskDetailSectionProps {
  task: PrototypeTaskMetrics
  index: number
  advancedMetrics?: AdvancedTaskMetrics
  capturedImage?: string
}

function TaskDetailSection({
  task,
  index,
  advancedMetrics,
  capturedImage,
}: TaskDetailSectionProps) {
  return (
    <section
      className="mb-10 page-break-before-auto"
      style={{ pageBreakInside: 'avoid' }}
    >
      <h3 className="text-lg font-semibold text-gray-800 mb-2">
        Task {index + 1}: {task.taskTitle}
      </h3>

      {task.taskInstruction && (
        <p className="text-sm text-gray-600 mb-4">{task.taskInstruction}</p>
      )}

      {/* Task Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStatCard label="Responses" value={task.responseCount.toString()} />
        <MiniStatCard
          label="Success Rate"
          value={`${task.successRate.toFixed(1)}%`}
          valueClassName={getSuccessColorClass(task.successRate)}
        />
        <MiniStatCard label="Directness" value={`${task.directRate.toFixed(1)}%`} />
        <MiniStatCard
          label="Task Score"
          value={`${task.taskScore.toFixed(1)}/10`}
          valueClassName={getScoreColorClass(task.taskScore)}
          sublabel={getScoreRangeLabel(task.taskScore)}
        />
        <MiniStatCard label="Avg Time" value={formatTime(task.averageTimeMs)} />
        <MiniStatCard label="Misclick Rate" value={`${task.misclickRate.toFixed(1)}%`} />
      </div>

      {/* Advanced Metrics */}
      {advancedMetrics && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Advanced Metrics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Lostness: </span>
              <span className={cn('font-medium', getLostnessColorClass(advancedMetrics.lostness.score))}>
                {advancedMetrics.lostness.score.toFixed(3)}
              </span>
              <span className="text-gray-400 ml-1">
                ({getLostnessLabel(advancedMetrics.lostness.score)})
              </span>
            </div>
            <div>
              <span className="text-gray-500">Path Efficiency: </span>
              <span className={cn('font-medium', getEfficiencyColorClass(advancedMetrics.pathEfficiency.score))}>
                {advancedMetrics.pathEfficiency.score.toFixed(1)}%
              </span>
            </div>
          </div>

          {advancedMetrics.dwellTime.confusionPoints.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-amber-600 text-xs font-medium">
                {advancedMetrics.dwellTime.confusionPoints.length} Confusion Point
                {advancedMetrics.dwellTime.confusionPoints.length !== 1 ? 's' : ''} Detected
              </span>
              <ul className="mt-1 text-xs text-gray-600">
                {advancedMetrics.dwellTime.confusionPoints.slice(0, 3).map((cp, i) => (
                  <li key={i}>
                    • {cp.frameName}: {cp.dwellTimeMs.toFixed(0)}ms ({cp.ratio.toFixed(1)}x threshold)
                  </li>
                ))}
                {advancedMetrics.dwellTime.confusionPoints.length > 3 && (
                  <li>• and {advancedMetrics.dwellTime.confusionPoints.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Success Breakdown */}
      {task.statusBreakdown && (
        <div className="text-xs text-gray-500 mb-4">
          <span className="font-medium">Breakdown: </span>
          <span className="text-emerald-600">
            {task.statusBreakdown.success.direct} direct
          </span>
          {' + '}
          <span className="text-emerald-500">
            {task.statusBreakdown.success.indirect} indirect
          </span>
          {' success, '}
          <span className="text-red-500">
            {task.failureCount} failure
          </span>
          {', '}
          <span className="text-gray-500">
            {task.skippedCount} skipped
          </span>
        </div>
      )}

      {/* Captured Image */}
      {capturedImage && (
        <div className="mt-4">
          <img
            src={capturedImage}
            alt={`Statistics for ${task.taskTitle}`}
            className="max-w-full border border-gray-200 rounded-lg"
          />
        </div>
      )}
    </section>
  )
}

interface MiniStatCardProps {
  label: string
  value: string
  valueClassName?: string
  sublabel?: string
}

function MiniStatCard({ label, value, valueClassName, sublabel }: MiniStatCardProps) {
  return (
    <div className="bg-gray-50 rounded p-2">
      <div className={cn('text-lg font-bold', valueClassName || 'text-gray-900')}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{label}</div>
      {sublabel && (
        <div className="text-xs text-gray-400">{sublabel}</div>
      )}
    </div>
  )
}
// Exports

export default PDFReportTemplate
