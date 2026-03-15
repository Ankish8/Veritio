import { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Copy, Check, Code, ExternalLink, RefreshCw, Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from '@/components/ui/sonner'

interface SnippetSetupSectionProps {
  studyId: string
  snippetId: string | undefined
  snippetVerified: boolean | undefined
  hasValidUrl: boolean
  normalizedUrl: string
  authToken: string | null
  setSettings: (updates: Record<string, unknown>) => void
}

function SnippetSetupSectionComponent({
  studyId,
  snippetId,
  snippetVerified,
  hasValidUrl,
  normalizedUrl,
  authToken,
  setSettings,
}: SnippetSetupSectionProps) {
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [snippetCountdown, setSnippetCountdown] = useState(0)
  const [snippetSiteOpened, setSnippetSiteOpened] = useState(false)
  const proxyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const snippetCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (proxyPollRef.current) clearInterval(proxyPollRef.current)
      if (snippetCountdownRef.current) clearInterval(snippetCountdownRef.current)
    }
  }, [])

  const snippetCode = snippetId
    ? `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/snippet/${snippetId}.js" async></script>`
    : null

  const handleCopy = useCallback(() => {
    if (snippetCode) {
      navigator.clipboard.writeText(snippetCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [snippetCode])

  const handleGenerateSnippet = useCallback(() => {
    const newSnippetId = crypto.randomUUID().slice(0, 12)
    setSettings({ snippetId: newSnippetId, mode: 'snippet' })
  }, [setSettings])

  const handleCheckVerification = useCallback(async () => {
    if (!snippetId || !authToken) return
    setVerifying(true)
    setSnippetSiteOpened(false)

    try {
      setSettings({ snippetVerified: false })

      const POLL_SECONDS = 20
      setSnippetCountdown(POLL_SECONDS)
      if (snippetCountdownRef.current) clearInterval(snippetCountdownRef.current)
      snippetCountdownRef.current = setInterval(() => {
        setSnippetCountdown((prev) => {
          if (prev <= 1) {
            if (snippetCountdownRef.current) clearInterval(snippetCountdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      if (proxyPollRef.current) clearInterval(proxyPollRef.current)
      let attempts = 0
      const MAX_ATTEMPTS = Math.ceil(POLL_SECONDS / 1.5)

      proxyPollRef.current = setInterval(async () => {
        attempts++
        try {
          const res = await fetch(`/api/studies/${studyId}`, {
            headers: { Authorization: `Bearer ${authToken}` },
          })
          if (res.ok) {
            const study = await res.json()
            const db = (study.settings && typeof study.settings === 'object')
              ? study.settings as Record<string, unknown>
              : {}
            if (db.snippetVerified) {
              setSettings({ snippetVerified: true })
              setVerifying(false)
              setSnippetCountdown(0)
              if (proxyPollRef.current) clearInterval(proxyPollRef.current)
              if (snippetCountdownRef.current) clearInterval(snippetCountdownRef.current)
              toast.success('Snippet detected — your site is ready.', { id: 'snippet-check' })
              return
            }
          }
        } catch { /* silent */ }

        if (attempts >= MAX_ATTEMPTS) {
          setVerifying(false)
          setSnippetCountdown(0)
          if (proxyPollRef.current) clearInterval(proxyPollRef.current)
          if (snippetCountdownRef.current) clearInterval(snippetCountdownRef.current)
          toast.error('Not detected. Check the code is installed and try again.', { id: 'snippet-check' })
        }
      }, 1500)
    } catch {
      setVerifying(false)
    }
  }, [snippetId, authToken, studyId, setSettings])

  return (
    <>
      <Separator />

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Install this code</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Paste before <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> on every page you're testing.
          </p>
        </div>

        {snippetCode ? (
          <div className="relative group">
            <pre className="bg-muted p-3 rounded-lg text-xs font-mono overflow-x-auto border break-all whitespace-pre-wrap">
              {snippetCode}
            </pre>
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={handleGenerateSnippet}>
            <Code className="h-4 w-4 mr-2" />
            Generate Snippet
          </Button>
        )}

        {snippetCode && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Verify installation</h3>
                {snippetVerified && !verifying && (
                  <Badge variant="secondary" className="text-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    {verifying
                      ? 'Listening for a connection\u2026 Visit any page on your site that has the code installed.'
                      : 'Add the code to your site, then click below. We\'ll detect the script automatically.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckVerification}
                  disabled={verifying || !hasValidUrl}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Listening\u2026 {snippetCountdown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Check connection
                    </>
                  )}
                </Button>
                {verifying && hasValidUrl && (
                  snippetSiteOpened ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setVerifying(false)
                        setSnippetCountdown(0)
                        if (proxyPollRef.current) clearInterval(proxyPollRef.current)
                        if (snippetCountdownRef.current) clearInterval(snippetCountdownRef.current)
                        toast.dismiss('snippet-check')
                      }}
                    >
                      Not working? Stop
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSnippetSiteOpened(true)
                        window.open(normalizedUrl, '_blank')
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open your site
                    </Button>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}

export const SnippetSetupSection = memo(SnippetSetupSectionComponent)
