'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAsyncComputation, type ComputationState } from './use-async-computation'
import {
  computeSimilarityMatrixAsync,
  performHierarchicalClusteringAsync,
  performPCAAnalysisAsync,
  terminateWorkers,
} from '@/lib/workers/worker-factory'
import type { ParticipantResponse, SimilarityResult } from '@/lib/algorithms/similarity-matrix'
import type { DendrogramNode } from '@/lib/algorithms/hierarchical-clustering'

/** Computes similarity matrix in a Web Worker. */
export function useSimilarityMatrix(
  responses: ParticipantResponse[] | null,
  cards: Array<{ id: string; label: string }> | null
): ComputationState<SimilarityResult> {
  return useAsyncComputation(
    async (data: { responses: ParticipantResponse[]; cards: Array<{ id: string; label: string }> }) => {
      return computeSimilarityMatrixAsync(data.responses, data.cards)
    },
    responses && cards ? { responses, cards } : null,
    [responses, cards]
  )
}

/** Builds dendrogram in a Web Worker. */
export function useHierarchicalClustering(
  matrix: number[][] | null,
  labels: string[] | null
): ComputationState<{
  dendrogram: DendrogramNode
  order: string[]
  suggestedClusters: { count: number; heights: number[] }
}> {
  return useAsyncComputation(
    async (data: { matrix: number[][]; labels: string[] }) => {
      return performHierarchicalClusteringAsync(data.matrix, data.labels)
    },
    matrix && labels ? { matrix, labels } : null,
    [matrix, labels]
  )
}

// There is deliberately no usePCAAnalysis hook. The PCA tab splits its work into
// a threshold-independent model (memoized on the response set) and a selection
// step that costs microseconds, so it does not need a worker. Routing it through
// useAsyncComputation would be a regression: that hook resets to
// { result: null, loading: true } on every dependency change, which unmounts the
// strategy cards on each slider tick. performPCAAnalysisAsync below remains
// available for a future non-interactive caller.

/** Returns a compute function for similarity matrix calculation. */
export function useSimilarityMatrixCompute(): {
  compute: (
    responses: ParticipantResponse[],
    cards: Array<{ id: string; label: string }>
  ) => Promise<SimilarityResult>
  loading: boolean
  error: Error | null
} {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const compute = useCallback(
    async (
      responses: ParticipantResponse[],
      cards: Array<{ id: string; label: string }>
    ): Promise<SimilarityResult> => {
      setLoading(true)
      setError(null)

      try {
        const result = await computeSimilarityMatrixAsync(responses, cards)
        setLoading(false)
        return result
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        setError(err)
        setLoading(false)
        throw err
      }
    },
    []
  )

  return { compute, loading, error }
}

/** Terminates workers when component unmounts. */
export function useWorkerCleanup(): void {
  useEffect(() => {
    return () => {
      terminateWorkers()
    }
  }, [])
}

export {
  computeSimilarityMatrixAsync,
  performHierarchicalClusteringAsync,
  performPCAAnalysisAsync,
  terminateWorkers,
}
export type { ComputationState }
