'use client'

import { useEffect, useState } from 'react'
import { PietreeVisualization } from '@/components/analysis/tree-test/pietree/pietree-visualization'
import type { TreeNode } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'

interface Task {
  id: string
  question: string
  expected_answer_ids: string[]
}

interface PietreeRenderProps {
  params: Promise<{ studyId: string; taskId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function PietreeRenderPage({
  params,
  searchParams,
}: PietreeRenderProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [nodes, setNodes] = useState<TreeNode[]>([])
  const [responses, setResponses] = useState<TreeTestResponse[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { studyId, taskId } = await params
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

        // Find the specific task
        const tasks = result.tasks || []
        const targetTask = tasks.find((t: Task) => t.id === taskId)

        if (!targetTask) {
          setError(`Task ${taskId} not found`)
          setLoading(false)
          return
        }

        // Filter responses for this task
        const allResponses = result.responses || []
        const taskResponses = allResponses.filter(
          (r: TreeTestResponse) => r.task_id === taskId
        )

        setTask(targetTask)
        setNodes(result.nodes || [])
        setResponses(taskResponses)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadData()
  }, [params, searchParams])

  const correctNodeIds = task?.expected_answer_ids || []

  // Signal ready when component is rendered
  useEffect(() => {
    if (!loading && (task || error)) {
      // Wait for D3 to finish rendering
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [loading, task, error])

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
        Loading pietree...
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

  if (!task || nodes.length === 0) {
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
        No data available
      </div>
    )
  }

  return (
    <div
      data-pdf-chart={`pietree-${task.id}`}
      data-pdf-title={task.question || 'Navigation Flow'}
    >
      <PietreeVisualization
        nodes={nodes}
        responses={responses}
        correctNodeIds={correctNodeIds}
        width={780}
        height={560}
        layout="horizontal"
      />
    </div>
  )
}
