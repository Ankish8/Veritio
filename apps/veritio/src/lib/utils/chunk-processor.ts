/**
 * Chunk Processor with Idle Scheduling
 *
 * Processes large arrays in chunks during browser idle time to keep the main
 * thread responsive. This prevents long-running operations from blocking
 * user interactions, animations, and rendering.
 *
 * Phase 3.1: Chunked Processing with Scheduler
 *
 * Key features:
 * - Breaks work into small chunks (default 100 items)
 * - Yields to main thread between chunks using requestIdleCallback
 * - Progress callbacks for UI feedback
 * - AbortSignal support for cancellation
 * - Automatic fallback for browsers without requestIdleCallback (Safari)
 *
 * Usage:
 * ```ts
 * const results = await processInChunks(
 *   responses,
 *   (response) => computeMetrics(response),
 *   {
 *     chunkSize: 50,
 *     onProgress: (progress) => setProgress(progress),
 *     signal: abortController.signal,
 *   }
 * )
 * ```
 */

// ============================================================================
// Types
// ============================================================================

export interface ProcessInChunksOptions {
  /** Number of items to process per chunk (default: 100) */
  chunkSize?: number
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void
  /** AbortSignal for cancellation */
  signal?: AbortSignal
  /** Timeout for requestIdleCallback (default: 50ms) */
  timeout?: number
}

export interface ChunkProcessorResult<T> {
  /** Processing status */
  status: 'processing' | 'complete' | 'aborted' | 'error'
  /** Progress percentage (0-100) */
  progress: number
  /** Processed results (partial if aborted/error) */
  results: T[]
  /** Error if status is 'error' */
  error?: Error
}

// ============================================================================
// Main Processor
// ============================================================================

/**
 * Process an array in chunks with idle scheduling.
 *
 * This function breaks a large array into chunks and processes each chunk
 * during browser idle time, yielding to the main thread between chunks.
 * This keeps the UI responsive during heavy computations.
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param options - Processing options
 * @returns Promise that resolves with processed results
 *
 * @example
 * ```ts
 * const taskMetrics = await processInChunks(
 *   tasks,
 *   (task) => computeSingleTaskMetrics(task, nodes, responses),
 *   {
 *     chunkSize: 2,  // Process 2 tasks per chunk
 *     onProgress: setProgress,
 *     signal: abortController.signal,
 *   }
 * )
 * ```
 */
export async function processInChunks<TItem, TResult>(
  items: TItem[],
  processor: (item: TItem, index: number) => TResult,
  options: ProcessInChunksOptions = {}
): Promise<TResult[]> {
  const {
    chunkSize = 100,
    onProgress,
    signal,
    timeout = 50,
  } = options

  const results: TResult[] = []
  const totalItems = items.length

  // Handle empty array
  if (totalItems === 0) {
    onProgress?.(100)
    return results
  }

  // Process in chunks
  for (let i = 0; i < totalItems; i += chunkSize) {
    // Check for abort
    if (signal?.aborted) {
      throw new Error('Processing aborted')
    }

    // Process current chunk
    const chunkEnd = Math.min(i + chunkSize, totalItems)
    for (let j = i; j < chunkEnd; j++) {
      results.push(processor(items[j], j))
    }

    // Report progress
    const progress = Math.min(100, ((chunkEnd) / totalItems) * 100)
    onProgress?.(progress)

    // Yield to main thread (unless this is the last chunk)
    if (chunkEnd < totalItems) {
      await yieldToMainThread(timeout)
    }
  }

  return results
}

/**
 * Process an array in chunks with detailed status tracking.
 * Returns a result object with status, progress, and error handling.
 *
 * @param items - Array of items to process
 * @param processor - Function to process each item
 * @param options - Processing options
 * @returns Promise that resolves with processing result
 */
export async function processInChunksWithStatus<TItem, TResult>(
  items: TItem[],
  processor: (item: TItem, index: number) => TResult,
  options: ProcessInChunksOptions = {}
): Promise<ChunkProcessorResult<TResult>> {
  const result: ChunkProcessorResult<TResult> = {
    status: 'processing',
    progress: 0,
    results: [],
  }

  try {
    result.results = await processInChunks(items, processor, {
      ...options,
      onProgress: (progress) => {
        result.progress = progress
        options.onProgress?.(progress)
      },
    })
    result.status = 'complete'
    result.progress = 100
  } catch (error) {
    if (error instanceof Error && error.message === 'Processing aborted') {
      result.status = 'aborted'
    } else {
      result.status = 'error'
      result.error = error instanceof Error ? error : new Error('Unknown error')
    }
  }

  return result
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Yield to the main thread to allow browser to process events, rendering, etc.
 * Uses requestIdleCallback if available, falls back to setTimeout.
 *
 * @param timeout - Maximum time to wait for idle callback (ms)
 */
function yieldToMainThread(timeout: number = 50): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      // Use requestIdleCallback (Chrome, Edge, Opera)
      requestIdleCallback(() => resolve(), { timeout })
    } else {
      // Fallback for Safari and other browsers
      // Use setTimeout(0) to yield to event loop
      setTimeout(() => resolve(), 0)
    }
  })
}

/**
 * Process a Map's entries in chunks.
 * Useful for processing large Map data structures.
 *
 * @param map - Map to process
 * @param processor - Function to process each entry
 * @param options - Processing options
 * @returns Promise that resolves with processed results
 */
export async function processMapInChunks<K, V, TResult>(
  map: Map<K, V>,
  processor: (key: K, value: V, index: number) => TResult,
  options: ProcessInChunksOptions = {}
): Promise<TResult[]> {
  const entries = Array.from(map.entries())
  return processInChunks(
    entries,
    ([key, value], index) => processor(key, value, index),
    options
  )
}

/**
 * Process a Set's entries in chunks.
 * Useful for processing large Set data structures.
 *
 * @param set - Set to process
 * @param processor - Function to process each entry
 * @param options - Processing options
 * @returns Promise that resolves with processed results
 */
export async function processSetInChunks<T, TResult>(
  set: Set<T>,
  processor: (value: T, index: number) => TResult,
  options: ProcessInChunksOptions = {}
): Promise<TResult[]> {
  const values = Array.from(set)
  return processInChunks(values, processor, options)
}

// ============================================================================
// Batch Processor
// ============================================================================

/**
 * Process items in batches where each batch is processed as a unit.
 * Unlike processInChunks which processes items individually, this processes
 * entire batches at once.
 *
 * Useful when you need to process groups of items together (e.g., bulk API calls).
 *
 * @param items - Array of items to process
 * @param batchProcessor - Function to process an entire batch
 * @param options - Processing options
 * @returns Promise that resolves with processed results
 *
 * @example
 * ```ts
 * const results = await processBatches(
 *   participantIds,
 *   async (batch) => {
 *     return await fetchParticipants(batch)
 *   },
 *   { chunkSize: 50 }
 * )
 * ```
 */
export async function processBatches<TItem, TResult>(
  items: TItem[],
  batchProcessor: (batch: TItem[], batchIndex: number) => TResult | Promise<TResult>,
  options: ProcessInChunksOptions = {}
): Promise<TResult[]> {
  const {
    chunkSize = 100,
    onProgress,
    signal,
    timeout = 50,
  } = options

  const results: TResult[] = []
  const totalItems = items.length
  const batchCount = Math.ceil(totalItems / chunkSize)

  // Handle empty array
  if (totalItems === 0) {
    onProgress?.(100)
    return results
  }

  // Process batches
  for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
    // Check for abort
    if (signal?.aborted) {
      throw new Error('Processing aborted')
    }

    // Extract batch
    const start = batchIndex * chunkSize
    const end = Math.min(start + chunkSize, totalItems)
    const batch = items.slice(start, end)

    // Process batch
    const batchResult = await batchProcessor(batch, batchIndex)
    results.push(batchResult)

    // Report progress
    const progress = Math.min(100, ((batchIndex + 1) / batchCount) * 100)
    onProgress?.(progress)

    // Yield to main thread (unless this is the last batch)
    if (batchIndex < batchCount - 1) {
      await yieldToMainThread(timeout)
    }
  }

  return results
}

// ============================================================================
// Development Utilities
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // Expose utilities for testing in development
  if (typeof window !== 'undefined') {
    ;(window as any).__chunkProcessor = {
      processInChunks,
      processInChunksWithStatus,
      processMapInChunks,
      processSetInChunks,
      processBatches,
    }
  }
}
