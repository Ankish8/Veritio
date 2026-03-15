import { useEffect, useRef, useState, useCallback } from 'react'
import type { Task, TreeNode } from '@veritio/study-types'
import type {
  TreeTestResponse,
  Participant,
  OverallMetrics,
} from '@/lib/algorithms/tree-test-analysis'
import { computeTreeTestMetrics } from '@/lib/algorithms/tree-test-analysis'
import type {
  MetricsWorkerInput,
  MetricsWorkerOutput,
} from '@/workers/tree-test-metrics.worker'
import {
  getCachedOverallMetrics,
  setCachedOverallMetrics,
} from '@/lib/cache/metrics-cache'

export interface MetricsWorkerPayload {
  studyId: string // For cache key generation
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  participants: Participant[]
  segmentId?: string // Optional for cache key generation
}

export interface UseMetricsWorkerResult {
  /** Trigger computation with the given payload */
  compute: (payload: MetricsWorkerPayload) => void
  /** Whether computation is currently in progress */
  isComputing: boolean
  /** Progress percentage (0-100) */
  progress: number
  /** Current task being processed (for detailed progress) */
  currentTask: string
  /** Computed result (null while computing or on error) */
  result: OverallMetrics | null
  /** Error message if computation failed */
  error: string | null
  /** Abort the current computation */
  abort: () => void
}

export function useMetricsWorker(): UseMetricsWorkerResult {
  const workerRef = useRef<Worker | null>(null)
  const [isComputing, setIsComputing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState('')
  const [result, setResult] = useState<OverallMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Track current payload for caching worker results
  const currentPayloadRef = useRef<MetricsWorkerPayload | null>(null)

  // Initialize worker on mount
  useEffect(() => {
    if (typeof Worker === 'undefined') return

    try {
      workerRef.current = new Worker(
        new URL('../workers/tree-test-metrics.worker.ts', import.meta.url)
      )

      workerRef.current.onmessage = (event: MessageEvent<MetricsWorkerOutput>) => {
        const message = event.data
        switch (message.type) {
          case 'progress':
            setProgress(message.progress)
            if (message.currentTask) setCurrentTask(message.currentTask)
            break
          case 'result':
            // Phase 3.2: Cache worker results
            if (currentPayloadRef.current) {
              const { studyId, responses, segmentId } = currentPayloadRef.current
              setCachedOverallMetrics(studyId, responses, message.data, segmentId)
            }
            setResult(message.data)
            setIsComputing(false)
            setProgress(100)
            setCurrentTask('Complete')
            break
          case 'error':
            setError(message.error)
            setIsComputing(false)
            break
        }
      }

      workerRef.current.onerror = (event) => {
        setError(event.message || 'Worker execution failed')
        setIsComputing(false)
      }
    } catch {
      // Worker creation failed, will use fallback in compute()
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  // Compute function with Phase 3.2 caching
  const compute = useCallback((payload: MetricsWorkerPayload) => {
    const { studyId, responses, segmentId } = payload

    // Phase 3.2: Check cache before computing
    const cached = getCachedOverallMetrics(studyId, responses, segmentId)
    if (cached) {
      // Cache hit! Return immediately without computing
      setResult(cached)
      setProgress(100)
      setCurrentTask('Loaded from cache')
      setIsComputing(false)
      setError(null)
      return
    }

    // Cache miss - proceed with computation
    setIsComputing(true)
    setProgress(0)
    setCurrentTask('Starting...')
    setError(null)
    setResult(null)

    // Track payload for caching when worker returns
    currentPayloadRef.current = payload

    // If worker is available, use it
    if (workerRef.current) {
      const message: MetricsWorkerInput = {
        type: 'compute',
        payload,
      }
      workerRef.current.postMessage(message)
      return
    }

    // Fallback to main thread computation
    try {
      const { tasks, nodes, responses, participants } = payload
      const metrics = computeTreeTestMetrics(tasks, nodes, responses, participants)

      // Phase 3.2: Store in cache after computing
      setCachedOverallMetrics(studyId, responses, metrics, segmentId)

      setResult(metrics)
      setProgress(100)
      setCurrentTask('Complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Computation failed')
    } finally {
      setIsComputing(false)
    }
  }, [])

  // Abort function
  const abort = useCallback(() => {
    if (workerRef.current && isComputing) {
      // Terminate and recreate worker to abort current operation
      workerRef.current.terminate()
      workerRef.current = new Worker(
        new URL('../workers/tree-test-metrics.worker.ts', import.meta.url)
      )
      setIsComputing(false)
      setProgress(0)
      setCurrentTask('')
      setError('Computation aborted')
    }
  }, [isComputing])

  return {
    compute,
    isComputing,
    progress,
    currentTask,
    result,
    error,
    abort,
  }
}

/** Hook that automatically computes metrics when inputs change. */
export function useTreeTestMetrics(
  payload: MetricsWorkerPayload | null
): {
  metrics: OverallMetrics | null
  isComputing: boolean
  progress: number
  error: string | null
} {
  const { compute, isComputing, progress, result, error } = useMetricsWorker()
  const prevPayloadRef = useRef<string | null>(null)

  // Compute when payload changes
  useEffect(() => {
    if (!payload) return

    // Create a simple hash of the payload to detect changes
    const payloadHash = `${payload.tasks.length}:${payload.nodes.length}:${payload.responses.length}:${payload.participants.length}`

    // Only recompute if payload actually changed
    if (payloadHash !== prevPayloadRef.current) {
      prevPayloadRef.current = payloadHash
      compute(payload)
    }
  }, [payload, compute])

  return {
    metrics: result,
    isComputing,
    progress,
    error,
  }
}
