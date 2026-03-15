import { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Check, ExternalLink, AlertTriangle, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'

interface ReverseProxySectionProps {
  studyId: string
  snippetId: string | undefined
  snippetVerified: boolean | undefined
  hasValidUrl: boolean
  normalizedUrl: string
  authToken: string | null
  setSettings: (updates: Record<string, unknown>) => void
}

function ReverseProxySectionComponent({
  studyId,
  snippetId,
  snippetVerified,
  hasValidUrl,
  normalizedUrl,
  authToken,
  setSettings,
}: ReverseProxySectionProps) {
  const [proxyChecking, setProxyChecking] = useState(false)
  const proxyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleTestCompatibility = useCallback(async () => {
    if (!snippetId || !hasValidUrl || !authToken) return

    const origin = (() => { try { return new URL(normalizedUrl).origin } catch { return normalizedUrl } })()
    const b64Origin = btoa(origin)
    const path = normalizedUrl.replace(origin, '') || '/'
    const proxyWorkerUrl = process.env.NEXT_PUBLIC_PROXY_WORKER_URL || 'https://your-proxy-worker.workers.dev'
    window.open(`${proxyWorkerUrl}/p/${studyId}/${snippetId}/${b64Origin}${path}?__test=true`, '_blank')

    setProxyChecking(true)
    try {
      const res = await fetch(`/api/studies/${studyId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (res.ok) {
        const study = await res.json()
        const dbSettings = (study.settings && typeof study.settings === 'object')
          ? study.settings as Record<string, unknown>
          : {}
        if (dbSettings.snippetVerified) {
          setSettings({ snippetVerified: true })
          setProxyChecking(false)
          return
        }
      }
    } catch { /* continue to poll */ }

    if (proxyPollRef.current) clearInterval(proxyPollRef.current)

    let attempts = 0
    const MAX_ATTEMPTS = 40

    proxyPollRef.current = setInterval(async () => {
      attempts++

      try {
        const res = await fetch(`/api/studies/${studyId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (res.ok) {
          const study = await res.json()
          const dbSettings = (study.settings && typeof study.settings === 'object')
            ? study.settings as Record<string, unknown>
            : {}
          if (dbSettings.snippetVerified) {
            setSettings({ snippetVerified: true })
            setProxyChecking(false)
            if (proxyPollRef.current) clearInterval(proxyPollRef.current)
            toast.success('Site is compatible with reverse proxy tracking!', { id: 'proxy-check' })
            return
          }
        }
      } catch { /* silent */ }

      if (attempts >= MAX_ATTEMPTS) {
        setProxyChecking(false)
        if (proxyPollRef.current) clearInterval(proxyPollRef.current)
      }
    }, 1500)
  }, [snippetId, hasValidUrl, normalizedUrl, studyId, authToken, setSettings])

  // Listen for compatibility confirmation postMessage from the test tab
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'veritio-lwt-compatible') return
      setSettings({ snippetVerified: true })
      setProxyChecking(false)
      if (proxyPollRef.current) {
        clearInterval(proxyPollRef.current)
        proxyPollRef.current = null
      }
      toast.success('Site is compatible with reverse proxy tracking!')
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setSettings])

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (proxyPollRef.current) clearInterval(proxyPollRef.current)
    }
  }, [])

  return (
    <>
      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Check compatibility</h3>
          {snippetVerified && !proxyChecking && (
            <Badge variant="secondary" className="text-green-600">
              <Check className="h-3 w-3 mr-1" />
              Works with your site
            </Badge>
          )}
        </div>

        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              We load your site through our servers to track clicks and scrolls. Participants won't notice any difference.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              May not work on sites behind a login or with strict security. Run the check below first. If it doesn't work, try Observer Mode or Snippet Mode instead.
            </p>
          </div>
        </div>

        {hasValidUrl && snippetId ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestCompatibility}
                disabled={proxyChecking}
              >
                {proxyChecking ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Check if my site is compatible
                  </>
                )}
              </Button>
            </div>
            {proxyChecking && (
              <p className="text-xs text-muted-foreground">
                Opens your site in a new tab. Return here once it loads — we'll detect if tracking connected.
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Enter a website URL above to test compatibility.
          </p>
        )}
      </div>
    </>
  )
}

export const ReverseProxySection = memo(ReverseProxySectionComponent)
