'use client'

/**
 * PDF Render Page - Task Performance Chart
 *
 * Renders the task performance stacked bar chart for PDF capture.
 */

import { useEffect, useState } from 'react'
import { TaskPerformanceChart } from '@/components/analysis/tree-test/task-performance-chart'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'

interface TaskPerformanceRenderProps {
  params: Promise<{ studyId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function TaskPerformanceRenderPage({
  params,
  searchParams,
}: TaskPerformanceRenderProps) {
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { studyId } = await params
        const { token } = await searchParams

        if (!token) {
          setError('Missing access token')
          setLoading(false)
          return
        }

        // Fetch tree test results data from API
        const response = await fetch(`/api/studies/${studyId}/tree-test-results`, {
          headers: {
            'X-PDF-Render-Token': token,
          },
        })

        if (!response.ok) {
          const errData = await response.json()
          setError(errData.message || 'Failed to fetch data')
          setLoading(false)
          return
        }

        const result = await response.json()

        if (!result.metrics?.tasks) {
          setError('No task performance data available')
          setLoading(false)
          return
        }

        setTaskMetrics(result.metrics.tasks)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadData()
  }, [params, searchParams])

  // Signal ready when component is rendered
  useEffect(() => {
    if (!loading && (taskMetrics.length > 0 || error)) {
      // Wait for Recharts to finish rendering
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, taskMetrics, error])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#64748b',
        }}
      >
        Loading task performance...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#ef4444',
        }}
      >
        Error: {error}
      </div>
    )
  }

  if (taskMetrics.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#64748b',
        }}
      >
        No task data available
      </div>
    )
  }

  return (
    <div data-pdf-chart="task-performance" data-pdf-title="Task Performance">
      <TaskPerformanceChart tasks={taskMetrics} />
    </div>
  )
}
