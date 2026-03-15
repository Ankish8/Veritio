/**
 * Web Worker for PCA Analysis computations
 * Offloads heavy mathematical operations from main thread
 */

// Import the PCA algorithm (assuming it's pure and can be imported)
// In a real setup, this would be dynamically imported or inlined
import { performPCAAnalysisWorker, extractParticipantIAWorker } from '../algorithms/pca-analysis'

type MessageData = {
  taskId: string
  method: string
  data: any
}

// Worker message handler
self.onmessage = async (event: MessageEvent<MessageData>) => {
  const { taskId, method, data } = event.data

  try {
    let result: any

    switch (method) {
      case 'performPCAAnalysis':
        result = performPCAAnalysisWorker(data)
        break

      case 'extractParticipantIA':
        result = extractParticipantIAWorker(data)
        break

      default:
        throw new Error(`Unknown method: ${method}`)
    }

    // Send result back to main thread
    self.postMessage({
      taskId,
      result,
      error: null,
    })
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      taskId,
      result: null,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
