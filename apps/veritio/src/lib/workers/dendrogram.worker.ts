/**
 * Web Worker for Dendrogram (Hierarchical Clustering) computations
 */

import { performHierarchicalClustering } from '../algorithms/hierarchical-clustering'

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
      case 'performHierarchicalClustering':
        result = performHierarchicalClustering(data)
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
