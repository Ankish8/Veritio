/**
 * Async utility functions for controlled concurrency and batching.
 *
 * These utilities help prevent resource exhaustion when processing
 * large numbers of async operations (API calls, DB queries, etc.)
 */

/**
 * Maps over an array with controlled concurrency.
 *
 * Unlike Promise.all which runs everything in parallel, this limits
 * concurrent operations to prevent overwhelming external services
 * (R2, databases, etc.) with too many simultaneous requests.
 *
 * @example
 * // Process 100 recordings with max 10 concurrent R2 calls
 * const results = await throttledMap(
 *   recordings,
 *   async (rec) => {
 *     await completeMultipartUpload(rec.path, rec.uploadId, rec.parts)
 *     return rec.id
 *   },
 *   10
 * )
 */
export async function throttledMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<R[]> {
  const results: R[] = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => fn(item, i + batchIndex))
    )
    results.push(...batchResults)
  }

  return results
}

/**
 * Maps over an array with controlled concurrency, collecting both
 * successful results and errors without failing fast.
 *
 * Useful when you want to process all items even if some fail,
 * then handle successes and failures separately.
 *
 * @example
 * const { successes, failures } = await throttledMapSettled(
 *   recordings,
 *   async (rec) => abortMultipartUpload(rec.path, rec.uploadId),
 *   10
 * )
 * console.log(`Aborted ${successes.length}, failed ${failures.length}`)
 */
export async function throttledMapSettled<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<{
  successes: Array<{ item: T; result: R; index: number }>
  failures: Array<{ item: T; error: Error; index: number }>
}> {
  const successes: Array<{ item: T; result: R; index: number }> = []
  const failures: Array<{ item: T; error: Error; index: number }> = []

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(
      batch.map((item, batchIndex) => fn(item, i + batchIndex))
    )

    batchResults.forEach((result, batchIndex) => {
      const globalIndex = i + batchIndex
      const item = items[globalIndex]

      if (result.status === 'fulfilled') {
        successes.push({ item, result: result.value, index: globalIndex })
      } else {
        failures.push({
          item,
          error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          index: globalIndex,
        })
      }
    })
  }

  return { successes, failures }
}

/**
 * Splits an array into chunks of specified size.
 *
 * @example
 * const ids = ['a', 'b', 'c', 'd', 'e']
 * const batches = chunk(ids, 2) // [['a', 'b'], ['c', 'd'], ['e']]
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be positive')

  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Delays execution for the specified duration.
 *
 * @example
 * await delay(1000) // Wait 1 second
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
