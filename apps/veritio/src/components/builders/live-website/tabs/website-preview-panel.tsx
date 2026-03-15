import { memo, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ExternalLink, Globe, RefreshCw, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { VARIANT_COLORS, normalizeUrl } from './tracking-mode-selector'
import type { LiveWebsiteVariant } from '@/stores/study-builder/live-website-builder'

/** Check if a URL string is valid */
function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

interface WebsitePreviewPanelProps {
  websiteUrl: string | undefined
  abTestingEnabled: boolean
  variants: LiveWebsiteVariant[]
  selectedVariantId: string | null
  authToken: string | null
  setSelectedVariantId: (id: string) => void
}

function WebsitePreviewPanelComponent({
  websiteUrl,
  abTestingEnabled,
  variants,
  selectedVariantId,
  authToken,
  setSelectedVariantId,
}: WebsitePreviewPanelProps) {
  const [showPreview, setShowPreview] = useState(true)
  const [iframeLoading, setIframeLoading] = useState(() => isValidUrl(websiteUrl ?? ''))
  const [iframeError, setIframeError] = useState(false)
  const [showNotLoadingHint, setShowNotLoadingHint] = useState(false)
  const [iframeSrcdoc, setIframeSrcdoc] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const hasValidUrl = useMemo(() => isValidUrl(websiteUrl ?? ''), [websiteUrl])
  const normalizedUrl = useMemo(() => hasValidUrl ? normalizeUrl(websiteUrl ?? '') : '', [hasValidUrl, websiteUrl])

  // Preview URL: when AB testing, show the selected variant's URL; otherwise show the single URL
  const previewUrl = useMemo(() => {
    if (abTestingEnabled) {
      const v = variants.find((v) => v.id === selectedVariantId) ?? variants[0]
      return v?.url ? normalizeUrl(v.url) : ''
    }
    return normalizedUrl
  }, [abTestingEnabled, variants, selectedVariantId, normalizedUrl])
  const previewHasValidUrl = useMemo(() => isValidUrl(previewUrl), [previewUrl])

  // Fetch HTML via proxy and set as srcdoc
  useEffect(() => {
    if (!previewHasValidUrl || !authToken) {
      setIframeSrcdoc(null) // eslint-disable-line react-hooks/set-state-in-effect
      return
    }

    const proxyUrl = `/api/live-website/proxy?url=${encodeURIComponent(previewUrl)}&token=${encodeURIComponent(authToken)}`
    const ac = new AbortController()

    setIframeLoading(true)
    setIframeError(false)
    setShowNotLoadingHint(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)

    fetch(proxyUrl, { signal: ac.signal })
      .then(async (res) => {
        const text = await res.text()
        // Motia JSON-encodes string bodies — unwrap if needed
        let html = text
        try {
          const parsed = JSON.parse(text)
          if (typeof parsed === 'string') html = parsed
        } catch { /* already raw HTML */ }
        return html
      })
      .then((html) => {
        setIframeSrcdoc(html)
        setIframeLoading(false)
        hintTimerRef.current = setTimeout(() => setShowNotLoadingHint(true), 2000)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setIframeError(true)
        setIframeLoading(false)
      })

    return () => ac.abort()
  }, [previewUrl, authToken, previewHasValidUrl, refreshTrigger])

  // Clean up hint timer on unmount
  useEffect(() => {
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
    }
  }, [])

  const handleRefreshIframe = useCallback(() => {
    setRefreshTrigger((t) => t + 1)
    setShowNotLoadingHint(false)
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current)
  }, [])

  if (!showPreview) {
    return (
      <div className="w-8 shrink-0 bg-muted/20 flex flex-col items-center pt-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setShowPreview(true)}
          title="Expand preview"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="mt-4 flex-1 flex items-start justify-center">
          <span
            className="text-[12px] text-muted-foreground/50 uppercase tracking-wider font-medium"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Preview
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-muted/30">
      {previewHasValidUrl ? (
        <>
          {/* Preview toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowPreview(false)}
              title="Collapse preview"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[12px] text-muted-foreground/60 shrink-0 uppercase tracking-wider font-medium">Preview</span>
            {abTestingEnabled && variants.length > 0 && (
              <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5 shrink-0">
                {variants.map((v, i) => {
                  const isActive = selectedVariantId === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-background shadow-sm text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', VARIANT_COLORS[i % VARIANT_COLORS.length])} />
                      {v.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-0 rounded-md border bg-muted/50 px-2 py-1">
              <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{previewUrl}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleRefreshIframe} title="Refresh preview">
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild title="Open in new tab">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>

          {/* Iframe */}
          <div className="flex-1 relative">
            {iframeLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading preview...</p>
                </div>
              </div>
            )}
            {iframeError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 text-center px-8 max-w-sm">
                  <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Preview unavailable</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Could not load this website for preview. Participants will still be able to access it in a new tab during the test.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open in new tab
                    </a>
                  </Button>
                </div>
              </div>
            ) : iframeSrcdoc !== null ? (
              <>
                <iframe
                  ref={iframeRef}
                  key={refreshTrigger}
                  srcDoc={iframeSrcdoc}
                  className="w-full h-full border-0"
                  title="Website preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
                {showNotLoadingHint && !iframeLoading && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-sm">
                    <p className="text-xs text-muted-foreground">Site not rendering correctly?</p>
                    <Button variant="outline" size="sm" className="h-6 text-xs px-2" asChild>
                      <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                        Open in new tab
                      </a>
                    </Button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-background">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowPreview(false)}
              title="Collapse preview"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[12px] text-muted-foreground/60 shrink-0 uppercase tracking-wider font-medium">Preview</span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <Globe className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Website Preview</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {abTestingEnabled
                    ? 'Enter variant URLs in the A/B Testing section to see a live preview.'
                    : 'Enter a URL on the left to see a live preview of the website.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const WebsitePreviewPanel = memo(WebsitePreviewPanelComponent)
