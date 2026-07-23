import {
  isCompanionTrackingMode,
  isValidLiveWebsiteSnippetId,
  type LiveWebsiteTrackingMode,
} from '@/lib/live-website/snippet-id'

export type LiveWebsiteLaunchResult =
  | { ok: true; url: string }
  | {
      ok: false
      reason: 'missing-snippet-id' | 'invalid-target-url'
    }

interface BuildLiveWebsiteLaunchUrlInput {
  targetUrl: string
  mode: LiveWebsiteTrackingMode
  snippetId: string | null
  studyId: string
  sessionId: string
  proxyWorkerUrl: string
  frontendOrigin?: string
  apiOverride?: string
  variantId?: string | null
  encodeOrigin?: (value: string) => string
}

export function buildLiveWebsiteLaunchUrl({
  targetUrl,
  mode,
  snippetId,
  studyId,
  sessionId,
  proxyWorkerUrl,
  frontendOrigin,
  apiOverride,
  variantId,
  encodeOrigin = (value) => btoa(value),
}: BuildLiveWebsiteLaunchUrlInput): LiveWebsiteLaunchResult {
  if (isCompanionTrackingMode(mode) && !isValidLiveWebsiteSnippetId(snippetId)) {
    return { ok: false, reason: 'missing-snippet-id' }
  }

  if (mode !== 'reverse_proxy') {
    return { ok: true, url: targetUrl }
  }

  try {
    const target = new URL(targetUrl)
    const proxyBase = proxyWorkerUrl.replace(/\/$/, '')
    const originSegment = encodeOrigin(target.origin)
    const launchUrl = new URL(`${proxyBase}/p/${studyId}/${snippetId}/${originSegment}${target.pathname || '/'}`)

    for (const [key, value] of target.searchParams.entries()) {
      launchUrl.searchParams.append(key, value)
    }
    launchUrl.searchParams.set('__sess', sessionId)
    if (apiOverride) launchUrl.searchParams.set('__api', apiOverride)
    if (variantId) launchUrl.searchParams.set('__variant', variantId)
    if (frontendOrigin) launchUrl.searchParams.set('__veritio_frontend', frontendOrigin)
    launchUrl.hash = target.hash

    return { ok: true, url: launchUrl.toString() }
  } catch {
    return { ok: false, reason: 'invalid-target-url' }
  }
}
