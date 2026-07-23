export type LiveWebsiteTrackingMode = 'url_only' | 'snippet' | 'reverse_proxy'

const SNIPPET_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/

export function isCompanionTrackingMode(mode: unknown): mode is 'snippet' | 'reverse_proxy' {
  return mode === 'snippet' || mode === 'reverse_proxy'
}

export function isValidLiveWebsiteSnippetId(snippetId: unknown): snippetId is string {
  return typeof snippetId === 'string' && SNIPPET_ID_PATTERN.test(snippetId)
}

export function createLiveWebsiteSnippetId(randomUUID: () => string = () => crypto.randomUUID()): string {
  return randomUUID().slice(0, 12)
}

export function ensureLiveWebsiteSnippetId<T extends object>(
  settings: T,
  createSnippetId: () => string = createLiveWebsiteSnippetId
): T {
  const values = settings as Record<string, unknown>
  if (!isCompanionTrackingMode(values.mode) || isValidLiveWebsiteSnippetId(values.snippetId)) {
    return settings
  }

  return {
    ...settings,
    snippetId: createSnippetId(),
  } as T
}

export function hasValidLiveWebsiteTrackingConfiguration(
  settings: Pick<Record<string, unknown>, 'mode' | 'snippetId'>
): boolean {
  return !isCompanionTrackingMode(settings.mode) || isValidLiveWebsiteSnippetId(settings.snippetId)
}
