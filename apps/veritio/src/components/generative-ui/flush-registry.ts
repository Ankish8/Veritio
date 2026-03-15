/**
 * Module-level registry for flushing pending generative UI state changes.
 *
 * Each Draft* component debounces state changes by 300ms. If the user clicks
 * "Open in Builder" within that window, we need to flush pending changes first.
 *
 * Note: Flow components (DraftFlowSection, DraftFlowQuestions, DraftParticipantId)
 * now write directly to DB via their AI tools and render as read-only previews.
 * This registry is only used by non-flow Draft components (DraftCardStack, etc.).
 */

type FlushCallback = () => void

const flushCallbacks = new Set<FlushCallback>()
const inflightSaves = new Set<Promise<unknown>>()

/** Register a flush callback. Returns cleanup function. */
export function registerFlush(cb: FlushCallback): () => void {
  flushCallbacks.add(cb)
  return () => {
    flushCallbacks.delete(cb)
  }
}

/** Track an in-flight save promise (from GenerativeComponentBubble). */
export function trackSave(promise: Promise<unknown>): void {
  inflightSaves.add(promise)
  promise.finally(() => inflightSaves.delete(promise))
}

/**
 * Flush all pending debounced state and await in-flight saves.
 */
export async function flushAllPendingState(): Promise<void> {
  for (const cb of flushCallbacks) cb()
  if (inflightSaves.size > 0) {
    await Promise.all([...inflightSaves])
  }
}
