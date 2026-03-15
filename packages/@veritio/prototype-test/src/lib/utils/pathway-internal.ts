/**
 * Internal pathway utilities.
 * Not part of the public API - used by pathway-creation, pathway-conversion, and pathway-queries.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}
