/**
 * Worker Factory for Next.js
 *
 * Provides lazy instantiation, task-based messaging, and automatic fallbacks
 * for Web Workers in Next.js with Turbopack.
 */

type WorkerType = 'similarity-matrix' | 'dendrogram' | 'pca'

interface WorkerMessage {
  taskId: string
  result: any
  error: string | null
}

interface PendingTask {
  resolve: (result: any) => void
  reject: (error: Error) => void
}

class WorkerPool {
  private workers: Map<WorkerType, Worker> = new Map()
  private pendingTasks: Map<string, PendingTask> = new Map()
  private taskCounter = 0

  /**
   * Get or create a worker instance
   */
  private getWorker(type: WorkerType): Worker | null {
    // SSR check
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null
    }

    if (this.workers.has(type)) {
      return this.workers.get(type)!
    }

    try {
      let worker: Worker

      // Next.js Turbopack/Webpack compatible worker instantiation
      switch (type) {
        case 'similarity-matrix':
          worker = new Worker(
            new URL('./similarity-matrix.worker.ts', import.meta.url)
          )
          break
        case 'dendrogram':
          worker = new Worker(
            new URL('./dendrogram.worker.ts', import.meta.url)
          )
          break
        case 'pca':
          worker = new Worker(
            new URL('./pca.worker.ts', import.meta.url)
          )
          break
        default:
          return null
      }

      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const { taskId, result, error } = event.data
        const pending = this.pendingTasks.get(taskId)

        if (pending) {
          this.pendingTasks.delete(taskId)

          if (error) {
            pending.reject(new Error(error))
          } else {
            pending.resolve(result)
          }
        }
      }

      worker.onerror = (error) => {
        console.error(`Worker ${type} error:`, error)
        // Reject all pending tasks for this worker
        for (const [taskId, pending] of this.pendingTasks) {
          pending.reject(new Error(`Worker error: ${error.message}`))
          this.pendingTasks.delete(taskId)
        }
      }

      this.workers.set(type, worker)
      return worker
    } catch (_e) {
      // Failed to create worker — fall back to main thread
      return null
    }
  }

  /**
   * Execute a method in a worker
   */
  async execute<T>(
    workerType: WorkerType,
    method: string,
    data: any,
    fallback: () => T
  ): Promise<T> {
    const worker = this.getWorker(workerType)

    if (!worker) {
      // Fall back to main thread
      return fallback()
    }

    const taskId = `${workerType}-${++this.taskCounter}`

    return new Promise<T>((resolve, _reject) => {
      // Set up timeout to prevent hanging
      const timeout = setTimeout(() => {
        this.pendingTasks.delete(taskId)
        // Worker task timed out, falling back to main thread
        resolve(fallback())
      }, 30000) // 30 second timeout

      this.pendingTasks.set(taskId, {
        resolve: (result: T) => {
          clearTimeout(timeout)
          resolve(result)
        },
        reject: (_error: Error) => {
          clearTimeout(timeout)
          // Fall back on error instead of rejecting
          // Worker task failed — fall back to main thread
          resolve(fallback())
        },
      })

      worker.postMessage({ taskId, method, data })
    })
  }

  /**
   * Terminate all workers
   */
  terminate(): void {
    for (const worker of this.workers.values()) {
      worker.terminate()
    }
    this.workers.clear()

    // Reject all pending tasks
    for (const pending of this.pendingTasks.values()) {
      pending.reject(new Error('Worker pool terminated'))
    }
    this.pendingTasks.clear()
  }
}

// Singleton instance
let workerPool: WorkerPool | null = null

function getWorkerPool(): WorkerPool {
  if (!workerPool) {
    workerPool = new WorkerPool()
  }
  return workerPool
}

/**
 * Execute similarity matrix computation in worker
 */
export async function computeSimilarityMatrixAsync(
  responses: Array<{ participantId: string; placements: Array<{ cardId: string; categoryId: string }> }>,
  cards: Array<{ id: string; label: string }>
): Promise<{
  matrix: number[][]
  countMatrix: number[][]
  cardIds: string[]
  cardLabels: string[]
}> {
  // Dynamic import for fallback to avoid bundling in worker
  const { computeSimilarityMatrix } = await import('../algorithms/similarity-matrix')

  return getWorkerPool().execute(
    'similarity-matrix',
    'computeSimilarityMatrix',
    { responses, cards },
    () => computeSimilarityMatrix(responses, cards)
  )
}

/**
 * Execute hierarchical clustering in worker
 */
export async function performHierarchicalClusteringAsync(
  matrix: number[][],
  labels: string[]
): Promise<{
  dendrogram: any
  order: string[]
  suggestedClusters: { count: number; heights: number[] }
}> {
  const { performHierarchicalClustering } = await import('../algorithms/hierarchical-clustering')

  return getWorkerPool().execute(
    'dendrogram',
    'performHierarchicalClustering',
    { matrix, labels },
    () => performHierarchicalClustering({ matrix, labels })
  )
}

/**
 * Execute PCA analysis in worker
 */
export async function performPCAAnalysisAsync(
  responses: Array<{ participant_id: string; card_placements: Record<string, string> }>,
  cards: Array<{ id: string; label: string }>,
  topN: number = 3,
  minClusterSimilarity: number = 0.5
): Promise<{
  topIAs: any[]
  totalParticipants: number
  computedAt: Date
}> {
  const { performPCAAnalysis } = await import('../algorithms/pca-analysis')

  return getWorkerPool().execute(
    'pca',
    'performPCAAnalysis',
    { responses, cards, topN, minClusterSimilarity },
    () => performPCAAnalysis(responses, cards, topN, minClusterSimilarity)
  )
}

/**
 * Cleanup workers when no longer needed
 */
export function terminateWorkers(): void {
  if (workerPool) {
    workerPool.terminate()
    workerPool = null
  }
}
