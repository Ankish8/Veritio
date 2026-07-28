import type { BrandingSettings } from '@/components/builders/shared/types'

const PUBLIC_STORAGE_MARKER = '/storage/v1/object/public/study-assets/'

export interface BrandingAssetCopy {
  fromPath: string
  toPath: string
}

function pathFromPublicUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const markerIndex = parsed.pathname.indexOf(PUBLIC_STORAGE_MARKER)
    if (markerIndex === -1) return null
    return decodeURIComponent(
      parsed.pathname.slice(markerIndex + PUBLIC_STORAGE_MARKER.length),
    )
  } catch {
    return null
  }
}

function rewritePublicUrl(url: string, path: string): string {
  try {
    const parsed = new URL(url)
    const markerIndex = parsed.pathname.indexOf(PUBLIC_STORAGE_MARKER)
    if (markerIndex === -1) return url
    parsed.pathname =
      parsed.pathname.slice(0, markerIndex + PUBLIC_STORAGE_MARKER.length) +
      path.split('/').map(encodeURIComponent).join('/')
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Clone study-owned branding references while leaving external/shared assets
 * untouched. The caller performs the returned storage copies before persisting
 * the rewritten branding object.
 */
export function planBrandingAssetDuplication(
  branding: BrandingSettings | null | undefined,
  originalStudyId: string,
  newStudyId: string,
): { branding: BrandingSettings | null; copies: BrandingAssetCopy[] } {
  if (!branding) return { branding: null, copies: [] }

  const cloned = structuredClone(branding)
  const copies = new Map<string, BrandingAssetCopy>()
  const originalPrefix = `${originalStudyId}/`

  const rewriteAsset = (
    asset: { url: string; path?: string } | undefined,
  ) => {
    if (!asset?.url) return
    const fromPath = asset.path || pathFromPublicUrl(asset.url)
    if (!fromPath?.startsWith(originalPrefix)) return
    const toPath = `${newStudyId}/${fromPath.slice(originalPrefix.length)}`
    copies.set(fromPath, { fromPath, toPath })
    asset.path = toPath
    asset.url = rewritePublicUrl(asset.url, toPath)
  }

  rewriteAsset(cloned.logo)
  rewriteAsset(cloned.socialImage)
  rewriteAsset(cloned.background?.image)

  return { branding: cloned, copies: Array.from(copies.values()) }
}
