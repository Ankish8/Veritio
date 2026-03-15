'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { rebuild, createCache, createMirror } from 'rrweb-snapshot'
import { Loader2 } from 'lucide-react'

interface SnapshotRendererProps {
  snapshotUrl: string
  viewportWidth?: number | null
  viewportHeight?: number | null
  /** When true, clip rendering to viewport height (for modal/dialog snapshots where
   *  the overlay uses position:fixed and should fill the entire view). */
  clipToViewport?: boolean
  containerRef?: React.RefObject<HTMLDivElement | null>
  onLoad?: () => void
  onDimensionsMeasured?: (dims: { width: number; height: number }) => void
}

/** rrweb-snapshot serialized node types */
const SN_ELEMENT = 2
const SN_TEXT = 3

/**
 * Manually build a DOM subtree from an rrweb serialized node.
 * Used as a fallback when rrweb's rebuild() silently drops nodes
 * (known issue with position:fixed overlays in certain browsers).
 */
function buildDomFromSerializedNode(sn: any, doc: Document): Node | null {
  if (!sn) return null
  if (sn.type === SN_TEXT) return doc.createTextNode(sn.textContent || '')
  if (sn.type === SN_ELEMENT) {
    const el = sn.tagName === 'svg' || sn.isSVG
      ? doc.createElementNS('http://www.w3.org/2000/svg', sn.tagName)
      : doc.createElement(sn.tagName)
    if (sn.attributes) {
      for (const [key, val] of Object.entries(sn.attributes)) {
        if (key.startsWith('rr_')) continue
        try { el.setAttribute(key, String(val)) } catch { /* skip invalid attrs */ }
      }
    }
    if (sn.childNodes) {
      for (const child of sn.childNodes) {
        const childEl = buildDomFromSerializedNode(child, doc)
        if (childEl) el.appendChild(childEl)
      }
    }
    return el
  }
  return null
}

/**
 * Find serialized nodes whose class contains a specific substring.
 * Returns all matches (not just the first).
 */
function findSerializedNodesByClass(sn: any, classSubstring: string): any[] {
  const results: any[] = []
  if (sn?.attributes?.class?.includes(classSubstring)) results.push(sn)
  if (sn?.childNodes) {
    for (const c of sn.childNodes) {
      results.push(...findSerializedNodesByClass(c, classSubstring))
    }
  }
  return results
}

/**
 * After rrweb rebuild(), check for position:fixed overlay nodes that were
 * silently dropped. This is a known rrweb-snapshot bug in browsers where
 * certain nodes are skipped during document reconstruction (works fine in
 * JSDOM but fails in real browsers). When detected, manually rebuild the
 * missing subtree using plain DOM APIs and inject it.
 */
function injectMissingFixedOverlays(
  iframeDoc: Document,
  snapshotNode: any,
) {
  // Find all fixed overlay nodes in the snapshot data
  const fixedOverlays = findSerializedNodesByClass(snapshotNode, 'fixed inset-0')
  if (fixedOverlays.length === 0) return

  for (const overlay of fixedOverlays) {
    // Check if this node was already rebuilt in the DOM
    // We can't match by rrweb node ID, so match by class signature
    const cls = overlay.attributes?.class || ''
    // Build a CSS selector from the first few class tokens
    const classTokens = cls.split(/\s+/).slice(0, 3)
    const selector = classTokens.map((c: string) => `.${CSS.escape(c)}`).join('')
    const existing = iframeDoc.querySelector(selector)
    if (existing) continue // Already in DOM

    // Find the parent in the snapshot and locate the corresponding DOM parent
    const parentNode = findParentOf(snapshotNode, overlay.id)
    if (!parentNode) continue

    const parentCls = parentNode.attributes?.class || ''
    const parentTokens = parentCls.split(/\s+/).slice(0, 3)
    const parentSelector = parentTokens.map((c: string) => `.${CSS.escape(c)}`).join('')
    const domParent = iframeDoc.querySelector(parentSelector)
    if (!domParent) continue

    // Build the missing overlay subtree and inject it
    const overlayEl = buildDomFromSerializedNode(overlay, iframeDoc)
    if (overlayEl) {
      domParent.appendChild(overlayEl)
    }
  }
}

/** Find the parent node of a node with the given ID in the serialized tree. */
function findParentOf(sn: any, targetId: number): any {
  if (sn?.childNodes) {
    for (const c of sn.childNodes) {
      if (c.id === targetId) return sn
      const found = findParentOf(c, targetId)
      if (found) return found
    }
  }
  return null
}

export function SnapshotRenderer({
  snapshotUrl,
  viewportWidth,
  viewportHeight,
  clipToViewport,
  containerRef,
  onLoad,
  onDimensionsMeasured,
}: SnapshotRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const internalContainerRef = useRef<HTMLDivElement>(null)
  const activeRef = containerRef ?? internalContainerRef

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  const vpWidth = viewportWidth ?? 1920
  const vpHeight = viewportHeight ?? 1080

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const updateScale = useCallback(() => {
    const container = activeRef.current
    if (!container) return
    const containerWidth = container.clientWidth
    if (containerWidth > 0 && vpWidth > 0) {
      setScale(containerWidth / vpWidth)
    }
  }, [activeRef, vpWidth])

  useEffect(() => {
    updateScale()
    const observer = new ResizeObserver(() => updateScale())
    const container = activeRef.current
    if (container) observer.observe(container)
    return () => observer.disconnect()
  }, [activeRef, updateScale])

  useEffect(() => {
    let cancelled = false
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect
    setError(null)

    fetch(snapshotUrl)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to fetch snapshot: ${res.status}`)
        return res.json()
      })
      .then(snapshotData => {
        if (cancelled) return

        const iframe = iframeRef.current
        if (!iframe) return

        const iframeDoc = iframe.contentDocument
        if (!iframeDoc) {
          setError('Failed to access iframe document')
          setLoading(false)
          return
        }

        // The snapshot data is the serialized node tree (first element if array)
        const node = Array.isArray(snapshotData) ? snapshotData[0] : snapshotData

        try {
          const cache = createCache()
          const mirror = createMirror()
          rebuild(node, { doc: iframeDoc, cache, mirror })

          // rrweb-snapshot rebuild() has a known browser bug where position:fixed
          // overlay nodes (modals, dialogs) are silently dropped during DOM
          // reconstruction. Detect and manually inject any missing overlays.
          injectMissingFixedOverlays(iframeDoc, node)

          // Fix viewport-relative units (vh/vw/dvh/svh) — they resolve relative
          // to the iframe dimensions, not the original viewport. Replace them
          // with the correct pixel values in all stylesheets.
          const unitToPx: Record<string, number> = { vh: vpHeight, vw: vpWidth, dvh: vpHeight, svh: vpHeight }
          const fixVhUnits = (css: string) =>
            css.replace(/(\d+(?:\.\d+)?)(vh|vw|dvh|svh)/g, (_, n, unit) =>
              `${(parseFloat(n) * unitToPx[unit]) / 100}px`
            )

          // Fix inline <style> tags
          iframeDoc.querySelectorAll('style').forEach(style => {
            // Remove the snapshot override tag (captured at snapshot time) — we'll
            // re-inject a fresh one below that also covers external stylesheets.
            if (style.id === '__veritio_snapshot_override') {
              style.remove()
              return
            }
            style.textContent = fixVhUnits(style.textContent || '')
          })

          // Force all elements visible — scroll-triggered animations leave
          // below-fold content at opacity:0. This also covers older snapshots
          // captured without the capture-time override.
          const visOverride = iframeDoc.createElement('style')
          visOverride.textContent = '*, *::before, *::after { opacity: 1 !important; visibility: visible !important; animation: none !important; transition: none !important; }'
          iframeDoc.head?.appendChild(visOverride)

          // Convert external <link> stylesheets to inline <style> so we can fix vh units
          const links = iframeDoc.querySelectorAll('link[rel="stylesheet"]')
          const linkFixPromises = Array.from(links).map(async (link) => {
            const href = link.getAttribute('href')
            if (!href) return
            try {
              const res = await fetch(href)
              if (!res.ok) return
              const css = await res.text()
              const style = iframeDoc.createElement('style')
              style.textContent = fixVhUnits(css)
              link.parentNode?.replaceChild(style, link)
            } catch {
              // External stylesheet unreachable — leave as-is
            }
          })

          Promise.all(linkFixPromises).then(() => {
            if (cancelled) return
            // Re-measure after all stylesheets fixed
            requestAnimationFrame(() => {
              if (cancelled) return
              const measuredHeight = iframeDoc.documentElement.scrollHeight
              if (measuredHeight > 0) {
                // For modal pages, clip to viewport height so position:fixed
                // overlays fill the entire rendered area.
                const maxH = clipToViewport ? vpHeight : vpHeight * 3
                const cappedHeight = clipToViewport ? vpHeight : Math.min(measuredHeight, maxH)
                setContentHeight(measuredHeight)
                onDimensionsMeasured?.({ width: vpWidth, height: cappedHeight })
              }
            })
          })

          setLoading(false)
          onLoad?.()
        } catch {
          setError('Failed to rebuild snapshot')
          setLoading(false)
        }
      })
      .catch(err => {
        if (cancelled) return
        setError(err.message || 'Failed to load snapshot')
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [snapshotUrl, onLoad, onDimensionsMeasured, vpWidth, vpHeight, clipToViewport])

  // Cap height at 3x viewport height to avoid massive empty whitespace
  // below the fold. Click coordinates beyond this are still plotted correctly
  // (they just fall outside the visible area and get filtered by the >100% check).
  // For modal pages, clip to viewport height so position:fixed overlays fill the view.
  const maxHeight = clipToViewport ? vpHeight : vpHeight * 3
  const effectiveHeight = clipToViewport ? vpHeight : (contentHeight ? Math.min(contentHeight, maxHeight) : vpHeight)

  if (error) {
    return (
      <div
        ref={activeRef}
        className="w-full bg-muted/50 rounded-lg flex items-center justify-center"
        style={{ aspectRatio: `${vpWidth} / ${vpHeight}` }}
      >
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div
      ref={activeRef}
      className="relative w-full overflow-hidden rounded-lg bg-muted/30"
      style={{ aspectRatio: `${vpWidth} / ${effectiveHeight}` }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-muted/50">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        ref={iframeRef}
        sandbox="allow-same-origin"
        title="Page snapshot"
        style={{
          width: vpWidth,
          height: effectiveHeight,
          border: 'none',
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
