/**
 * In-process draft state cache for the assistant create workflow.
 *
 * Replaces iii engine's state.set/get IPC calls (state module), which are
 * unreliable in practice (throw non-Error objects on every call).
 *
 * All chat requests go through the same Bun step worker process, so a
 * module-level Map is sufficient for cross-turn draft state within a session.
 */

const cache = new Map<string, unknown>()

export const draftCache = {
  set(conversationId: string, value: unknown): void {
    cache.set(conversationId, value)
  },
  get(conversationId: string): unknown {
    return cache.get(conversationId) ?? null
  },
  delete(conversationId: string): void {
    cache.delete(conversationId)
  },
}
