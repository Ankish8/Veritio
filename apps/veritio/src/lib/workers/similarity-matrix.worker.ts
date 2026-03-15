/**
 * Web Worker for Similarity Matrix computations
 * Offloads O(n²) matrix calculations from main thread
 */

import {
  computeSimilarityMatrix,
  getTopSimilarPairs,
  findNaturalClusters,
  type ParticipantResponse,
  type SimilarityResult,
} from '../algorithms/similarity-matrix'

type MessageData = {
  taskId: string
  method: string
  data: any
}

self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { taskId, method, data } = event.data

  try {
    let result: any

    switch (method) {
      case 'computeSimilarityMatrix':
        result = computeSimilarityMatrix(
          data.responses as ParticipantResponse[],
          data.cards as { id: string; label: string }[]
        )
        break

      case 'getTopSimilarPairs':
        result = getTopSimilarPairs(
          data.similarityResult as SimilarityResult,
          data.topN as number
        )
        break

      case 'findNaturalClusters':
        result = findNaturalClusters(
          data.similarityResult as SimilarityResult,
          data.threshold as number
        )
        break

      default:
        throw new Error(`Unknown method: ${method}`)
    }

    self.postMessage({
      taskId,
      result,
      error: null,
    })
  } catch (error) {
    self.postMessage({
      taskId,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
