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
import type { PCAResult } from '@/lib/algorithms/pca-analysis'

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

/** Runs PCA analysis in a Web Worker. */
export function usePCAAnalysis(
  responses: Array<{ participant_id: string; card_placements: Record<string, string> }> | null,
  cards: Array<{ id: string; label: string }> | null,
  topN: number = 3,
  minClusterSimilarity: number = 0.5
): ComputationState<PCAResult> {
  return useAsyncComputation(
    async (data: {
      responses: Array<{ participant_id: string; card_placements: Record<string, string> }>
      cards: Array<{ id: string; label: string }>
    }) => {
      return performPCAAnalysisAsync(data.responses, data.cards, topN, minClusterSimilarity)
    },
    responses && cards ? { responses, cards, topN, minClusterSimilarity } : null,
    [responses, cards, topN, minClusterSimilarity]
  )
}

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
