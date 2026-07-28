/**
 * Settings handed from the server to the builder stores.
 *
 * The builder used to rebuild this object from a hard-coded list of keys per
 * study type, which silently dropped every setting outside that list. The
 * builder then rendered those toggles as off, and the next save wrote the
 * truncated object back — so `showCardDescriptions` and
 * `includeUnclearCategory` looked like they "reset after saving" and were
 * eventually deleted from the study for real.
 *
 * Keep every saved key; defaults only fill in what is missing.
 */
export function contentSettingsWithDefaults<T extends Record<string, unknown>>(
  rawSettings: unknown,
  defaults: T
): T & Record<string, unknown> {
  const isPlainObject =
    !!rawSettings && typeof rawSettings === 'object' && !Array.isArray(rawSettings)

  // studyFlow lives in the same column but belongs to the flow store, not the
  // content store.
  const { studyFlow: _studyFlow, ...saved } = (isPlainObject
    ? (rawSettings as Record<string, unknown>)
    : {}) as Record<string, unknown>

  const merged: Record<string, unknown> = { ...saved }

  for (const [key, fallback] of Object.entries(defaults)) {
    if (merged[key] === undefined || merged[key] === null) {
      merged[key] = fallback
    }
  }

  return merged as T & Record<string, unknown>
}
