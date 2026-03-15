import { memo, useCallback, useState, useRef, useEffect } from 'react'
import { Check, Code, Copy, Link, Zap, FlaskConical, Plus, Trash2, ExternalLink, AlertTriangle, Loader2, Info, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { SettingToggle } from '@/components/builders/shared/settings'
import type { LiveWebsiteVariant } from '@/stores/study-builder/live-website-builder'

const TRACKING_MODES = [
  {
    value: 'reverse_proxy' as const,
    icon: Zap,
    label: 'Auto Mode',
    badge: null,
    description: 'No code needed. Best for landing pages, Lovable/v0/Bolt prototypes, and public sites.',
    features: ['Screen recording', 'Click tracking', 'Scroll depth', 'Auto task detection'],
  },
  {
    value: 'snippet' as const,
    icon: Code,
    label: 'Snippet Mode',
    badge: 'Needs a developer' as const,
    description: 'Add a small script tag. Best for production apps and sites behind authentication.',
    features: ['Screen recording', 'Click tracking', 'Scroll depth', 'Auto task detection'],
  },
  {
    value: 'url_only' as const,
    icon: Link,
    label: 'Observer Mode',
    badge: null,
    description: 'Share a URL with participants. Watch their session recordings and collect post-task responses.',
    features: ['Screen recording', 'Post-task questions'],
  },
]

export const VARIANT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500']

/** Ensure URL has a protocol */
export function normalizeUrl(url: string): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

interface TrackingModeSelectorProps {
  mode: string | undefined
  snippetId: string | undefined
  websiteUrl: string | undefined
  abTestingEnabled: boolean
  variants: LiveWebsiteVariant[]
  selectedVariantId: string | null
  hiddenModes?: ('url_only' | 'reverse_proxy' | 'snippet')[]
  studyId: string
  snippetVerified: boolean | undefined
  hasValidUrl: boolean
  normalizedUrl: string
  authToken: string | null
  setSettings: (updates: Record<string, unknown>) => void
  addVariant: () => string
  updateVariant: (id: string, updates: Partial<LiveWebsiteVariant>) => void
  removeVariant: (id: string) => void
  setSelectedVariantId: (id: string) => void
}

function TrackingModeSelectorComponent({
  mode,
  snippetId,
  websiteUrl,
  abTestingEnabled,
  variants,
  selectedVariantId,
  hiddenModes,
  studyId,
  snippetVerified,
  hasValidUrl,
  normalizedUrl,
  authToken,
  setSettings,
  addVariant,
  updateVariant,
  removeVariant,
  setSelectedVariantId,
}: TrackingModeSelectorProps) {
  const visibleModes = hiddenModes?.length
    ? TRACKING_MODES.filter((m) => !hiddenModes.includes(m.value))
    : TRACKING_MODES

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Tracking Mode</p>
        <p className="text-xs text-muted-foreground mt-0.5">How participant interactions are captured</p>
      </div>
      <div className="space-y-2">
        {visibleModes.map((modeItem) => {
          const Icon = modeItem.icon
          const isSelected = mode === modeItem.value
          const handleModeClick = () => {
            if (modeItem.value === mode) return
            const updates: Record<string, unknown> = { mode: modeItem.value, snippetVerified: false }
            if (modeItem.value !== 'reverse_proxy') updates.abTestingEnabled = false
            if ((modeItem.value === 'snippet' || modeItem.value === 'reverse_proxy') && !snippetId) {
              setSettings({ ...updates, snippetId: crypto.randomUUID().slice(0, 12) })
            } else {
              setSettings(updates)
            }
          }
          return (
            <div
              key={modeItem.value}
              className={cn(
                'rounded-lg border transition-colors',
                isSelected ? 'border-primary/50' : 'border-border hover:border-muted-foreground/30'
              )}
            >
              {/* Clickable mode header */}
              <button
                type="button"
                onClick={handleModeClick}
                className="w-full text-left p-3"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'shrink-0 h-8 w-8 rounded-md flex items-center justify-center mt-0.5',
                    isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{modeItem.label}</span>
                      {modeItem.badge && (
                        <span className="text-xs text-muted-foreground">{modeItem.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{modeItem.description}</p>
                    {isSelected && modeItem.features.length > 1 && (
                      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                        {modeItem.features.map((feature) => (
                          <span key={feature} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-primary shrink-0" />
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Snippet Mode expanded section */}
              {modeItem.value === 'snippet' && isSelected && (
                <SnippetSetupInlineSection
                  studyId={studyId}
                  snippetId={snippetId}
                  snippetVerified={snippetVerified}
                  hasValidUrl={hasValidUrl}
                  normalizedUrl={normalizedUrl}
                  authToken={authToken}
                  setSettings={setSettings}
                />
              )}

              {/* Auto Mode expanded sections */}
              {modeItem.value === 'reverse_proxy' && isSelected && (
                <>
                  {/* Compatibility check */}
                  {!abTestingEnabled && (
                    <CompatibilityCheckSection
                      studyId={studyId}
                      snippetId={snippetId}
                      snippetVerified={snippetVerified}
                      hasValidUrl={hasValidUrl}
                      normalizedUrl={normalizedUrl}
                      authToken={authToken}
                      setSettings={setSettings}
                    />
                  )}

                  {/* A/B Testing */}
                  <ABTestingSection
                    abTestingEnabled={abTestingEnabled}
                    variants={variants}
                    selectedVariantId={selectedVariantId}
                    websiteUrl={websiteUrl}
                    setSettings={setSettings}
                    addVariant={addVariant}
                    updateVariant={updateVariant}
                    removeVariant={removeVariant}
                    setSelectedVariantId={setSelectedVariantId}
                  />
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const TrackingModeSelector = memo(TrackingModeSelectorComponent)

/* ─── Compatibility Check (inside Auto Mode card) ─── */

interface CompatibilityCheckSectionProps {
  studyId: string
  snippetId: string | undefined
  snippetVerified: boolean | undefined
  hasValidUrl: boolean
  normalizedUrl: string
  authToken: string | null
  setSettings: (updates: Record<string, unknown>) => void
}

function CompatibilityCheckSection({
  studyId,
  snippetId,
  snippetVerified,
  hasValidUrl,
  normalizedUrl,
  authToken,
  setSettings,
}: CompatibilityCheckSectionProps) {
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
            toast.success('Site is compatible with Auto Mode!', { id: 'proxy-check' })
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
      toast.success('Site is compatible with Auto Mode!')
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
    <div className="border-t px-3 pb-3 pt-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compatibility</span>
        {snippetVerified && !proxyChecking && (
          <Badge variant="secondary" className="text-green-600 text-xs px-1.5 py-0">
            <Check className="h-3 w-3 mr-1" />
            Compatible
          </Badge>
        )}
      </div>

      <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5 dark:text-amber-500" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            May not work on sites behind a login or with strict security.
          </p>
        </div>
      </div>

      {hasValidUrl && snippetId ? (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestCompatibility}
            disabled={proxyChecking}
            className="w-full"
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
          {proxyChecking && (
            <p className="text-xs text-muted-foreground mt-1.5">
              Opens your site in a new tab. Return here once it loads.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Enter a website URL above to test compatibility.
        </p>
      )}
    </div>
  )
}

/* ─── A/B Testing (inside Auto Mode card) ─── */

interface ABTestingSectionProps {
  abTestingEnabled: boolean
  variants: LiveWebsiteVariant[]
  selectedVariantId: string | null
  websiteUrl: string | undefined
  setSettings: (updates: Record<string, unknown>) => void
  addVariant: () => string
  updateVariant: (id: string, updates: Partial<LiveWebsiteVariant>) => void
  removeVariant: (id: string) => void
  setSelectedVariantId: (id: string) => void
}

function ABTestingSection({
  abTestingEnabled,
  variants,
  selectedVariantId,
  websiteUrl,
  setSettings,
  addVariant,
  updateVariant,
  removeVariant,
  setSelectedVariantId,
}: ABTestingSectionProps) {
  return (
    <div className="border-t px-3 pb-3 pt-3 space-y-3">
      <div className="flex items-center gap-1.5">
        <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">A/B Testing</span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0">Beta</Badge>
      </div>
      <SettingToggle
        id="ab-testing"
        label="Enable A/B Testing"
        description={abTestingEnabled
          ? 'Participants are randomly assigned a variant URL based on weights.'
          : 'Enable to test multiple website URLs against the same task set.'}
        checked={abTestingEnabled}
        onCheckedChange={(checked) => {
          setSettings({ abTestingEnabled: checked })
          if (checked) {
            if (variants.length === 0) {
              const idA = addVariant()
              if (websiteUrl) updateVariant(idA, { url: normalizeUrl(websiteUrl) })
              addVariant()
              setSelectedVariantId(idA)
            } else if (variants.length === 1) {
              if (!variants[0].url && websiteUrl) {
                updateVariant(variants[0].id, { url: normalizeUrl(websiteUrl) })
              }
              addVariant()
            }
          }
        }}
      />

      {/* Variant URLs — visible when A/B testing is enabled */}
      {abTestingEnabled && (
        <div className="space-y-2">
          {/* Weight distribution bar */}
          {variants.length >= 2 && (
            <div className="mb-3">
              <div className="h-1.5 rounded-full overflow-hidden flex bg-muted">
                {(() => {
                  const total = variants.reduce((s, v) => s + v.weight, 0)
                  return variants.map((v, i) => (
                    <div
                      key={v.id}
                      className={cn(VARIANT_COLORS[i % VARIANT_COLORS.length], 'transition-all duration-300')}
                      style={{ width: `${total > 0 ? Math.round(v.weight / total * 100) : 0}%` }}
                      title={`Variant ${v.name}: ${total > 0 ? Math.round(v.weight / total * 100) : 0}%`}
                    />
                  ))
                })()}
              </div>
              <div className="flex gap-3 mt-1.5 flex-wrap">
                {(() => {
                  const total = variants.reduce((s, v) => s + v.weight, 0)
                  return variants.map((v, i) => (
                    <span key={v.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className={cn('inline-block w-2 h-2 rounded-full', VARIANT_COLORS[i % VARIANT_COLORS.length])} />
                      Variant {v.name}: {total > 0 ? Math.round(v.weight / total * 100) : 0}%
                    </span>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Variant cards */}
          {variants.map((variant, index) => {
            const isVariantSelected = selectedVariantId === variant.id
            return (
              <div
                key={variant.id}
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition-colors',
                  isVariantSelected ? 'bg-muted/50' : 'hover:bg-muted/30'
                )}
                onClick={() => setSelectedVariantId(variant.id)}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <span className={cn(
                    'inline-flex items-center justify-center w-5 h-5 rounded text-white text-xs font-bold shrink-0',
                    VARIANT_COLORS[index % VARIANT_COLORS.length]
                  )}>
                    {variant.name}
                  </span>
                  <span className="text-sm font-medium">Variant {variant.name}</span>
                  <div className="flex-1 min-w-0" />
                  {variants.length > 2 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => { e.stopPropagation(); removeVariant(variant.id) }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm text-muted-foreground">Website URL</Label>
                    <Input
                      value={variant.url}
                      onChange={(e) => updateVariant(variant.id, { url: e.target.value })}
                      placeholder="https://your-app.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Traffic weight</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={variant.weight}
                        onChange={(e) => updateVariant(variant.id, { weight: parseInt(e.target.value, 10) || 0 })}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground">points</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add variant — at the bottom */}
          {variants.length < 5 && (
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-1"
              onClick={() => {
                const id = addVariant()
                setSelectedVariantId(id)
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Variant
            </Button>
          )}

          <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              A/B testing uses <strong>Auto Mode</strong> tracking automatically. The preview shows the selected variant.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Snippet Setup (inside Snippet Mode card) ─── */

interface SnippetSetupInlineSectionProps {
  studyId: string
  snippetId: string | undefined
  snippetVerified: boolean | undefined
  hasValidUrl: boolean
  normalizedUrl: string
  authToken: string | null
  setSettings: (updates: Record<string, unknown>) => void
}

function SnippetSetupInlineSection({
  studyId,
  snippetId,
  snippetVerified,
  hasValidUrl,
  normalizedUrl,
  authToken,
  setSettings,
}: SnippetSetupInlineSectionProps) {
  const [copied, setCopied] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [snippetCountdown, setSnippetCountdown] = useState(0)
  const [snippetSiteOpened, setSnippetSiteOpened] = useState(false)
  const proxyPollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const snippetCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    <div className="border-t px-3 pb-3 pt-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Install Code</span>
        {snippetVerified && !verifying && (
          <Badge variant="secondary" className="text-green-600 text-xs px-1.5 py-0">
            <Check className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )}
      </div>

      {snippetCode ? (
        <>
          <p className="text-xs text-muted-foreground">
            Paste before <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">&lt;/body&gt;</code> on every page you're testing.
          </p>
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
                <><Check className="h-3.5 w-3.5 mr-1" />Copied</>
              ) : (
                <><Copy className="h-3.5 w-3.5 mr-1" />Copy</>
              )}
            </Button>
          </div>

          {/* Verify */}
          <div className="pt-1 space-y-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verify</span>
            <div className="rounded-md bg-muted/50 border px-3 py-2">
              <div className="flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  {verifying
                    ? 'Listening for a connection\u2026 Visit any page with the code installed.'
                    : 'Add the code to your site, then click below.'}
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
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Listening\u2026 {snippetCountdown}s</>
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Check connection</>
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
                    Stop
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
      ) : (
        <Button variant="secondary" size="sm" onClick={handleGenerateSnippet} className="w-full">
          <Code className="h-3.5 w-3.5 mr-1.5" />
          Generate Snippet
        </Button>
      )}
    </div>
  )
}
