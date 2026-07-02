import { getImageProps } from 'next/image'

/**
 * Hosts the Next.js image optimizer is allowed to fetch from.
 * Mirrors `images.remotePatterns` in next.config.ts — keep in sync. Only URLs
 * matching one of these patterns are optimized; anything else (legacy or
 * external data) is returned untouched so nothing breaks.
 */
const OPTIMIZABLE_PATTERNS: { hostSuffix: string; pathPrefix?: string }[] = [
  { hostSuffix: '.supabase.co', pathPrefix: '/storage/v1/object/public/' },
  { hostSuffix: 'images.unsplash.com' },
]

function isOptimizable(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  return OPTIMIZABLE_PATTERNS.some(({ hostSuffix, pathPrefix }) => {
    const hostMatches = hostSuffix.startsWith('.')
      ? parsed.hostname.endsWith(hostSuffix)
      : parsed.hostname === hostSuffix
    if (!hostMatches) return false
    return pathPrefix ? parsed.pathname.startsWith(pathPrefix) : true
  })
}

interface OptimizedImgOpts {
  width: number
  quality?: number
  sizes?: string
}

/**
 * Build responsive `src`/`srcSet` for a raw image URL using the Next.js image
 * optimizer, without altering the element's layout.
 *
 * getImageProps requires width+height (or fill), but participant images carry no
 * intrinsic dimensions. We pass `width` as both width and height only to satisfy
 * the API, then extract ONLY `src` and `srcSet` from the result — the width/height
 * props are deliberately NOT spread onto the <img>, so the existing layout classes
 * (object-contain, max-w/max-h, etc.) and aspect ratio are untouched. `srcSet`
 * generation is driven by `sizes`/deviceSizes; for a fixed width Next emits 1x/2x
 * candidates.
 *
 * For non-optimizable hosts, returns `{ src: url }` unchanged.
 */
export function getOptimizedImgProps(
  url: string,
  opts: OptimizedImgOpts
): { src: string; srcSet?: string } {
  if (!url || !isOptimizable(url)) return { src: url }

  const { props } = getImageProps({
    src: url,
    alt: '',
    width: opts.width,
    height: opts.width,
    sizes: opts.sizes,
    quality: opts.quality ?? 75,
  })

  return { src: props.src, srcSet: props.srcSet }
}
