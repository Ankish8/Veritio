'use client'

import { useState, useCallback, memo, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Copy, Check, RefreshCw, Lock, Calendar } from 'lucide-react'
import type { PublicResultsSettings } from '../../types'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'

interface PublicResultsCardProps {
  studyId: string
  publicResultsSettings?: PublicResultsSettings
  onPublicResultsSettingsChange: (updates: Partial<PublicResultsSettings>) => void
  isReadOnly?: boolean
  publicResultsToken?: string
  onRegenerateToken?: () => Promise<void>
}

const DEFAULT_SETTINGS: PublicResultsSettings = {
  enabled: false,
  sharedMetrics: {
    overview: true,
    participants: true,
    analysis: true,
    questionnaire: false,
  },
}

const METRICS_OPTIONS = [
  { key: 'overview', label: 'Overview', description: 'Summary statistics and completion rates' },
  { key: 'participants', label: 'Participants', description: 'Response count and timing data' },
  { key: 'analysis', label: 'Analysis', description: 'Main study results and visualizations' },
  { key: 'questionnaire', label: 'Questionnaire', description: 'Pre/post survey responses' },
] as const

export const PublicResultsCard = memo(function PublicResultsCard({
  studyId: _studyId,  
  publicResultsSettings,
  onPublicResultsSettingsChange,
  isReadOnly = false,
  publicResultsToken,
  onRegenerateToken,
}: PublicResultsCardProps) {
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Merge with defaults
  const settings = useMemo(
    () => ({
      ...DEFAULT_SETTINGS,
      ...publicResultsSettings,
      sharedMetrics: {
        ...DEFAULT_SETTINGS.sharedMetrics,
        ...publicResultsSettings?.sharedMetrics,
      },
    }),
    [publicResultsSettings]
  )

  // Local sync for password field
  const passwordInput = useLocalInputSync(settings.password || '', {
    debounceMs: 500,
    onSync: (value) => onPublicResultsSettingsChange({ password: value || undefined }),
  })

  // Generate the public results URL
  const publicResultsUrl = useMemo(() => {
    if (!publicResultsToken || !settings.enabled) return ''
    return typeof window !== 'undefined'
      ? `${window.location.origin}/results/public/${publicResultsToken}`
      : ''
  }, [publicResultsToken, settings.enabled])

  const handleCopyLink = useCallback(async () => {
    if (!publicResultsUrl) return

    try {
      await navigator.clipboard.writeText(publicResultsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [publicResultsUrl])

  const handleRegenerateToken = useCallback(async () => {
    if (!onRegenerateToken) return
    setRegenerating(true)
    try {
      await onRegenerateToken()
    } finally {
      setRegenerating(false)
    }
  }, [onRegenerateToken])

  const handleMetricToggle = useCallback(
    (metricKey: keyof PublicResultsSettings['sharedMetrics'], checked: boolean) => {
      onPublicResultsSettingsChange({
        sharedMetrics: {
          ...settings.sharedMetrics,
          [metricKey]: checked,
        },
      })
    },
    [settings.sharedMetrics, onPublicResultsSettingsChange]
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Public Results</CardTitle>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => onPublicResultsSettingsChange({ enabled: checked })}
            disabled={isReadOnly}
          />
        </div>
        <CardDescription>
          Share a read-only view of your study results with stakeholders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!settings.enabled ? (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-sm text-muted-foreground">
              Enable public sharing to generate a shareable link for stakeholders.
            </p>
          </div>
        ) : (
          <>
            {/* Shareable Link */}
            {publicResultsToken && (
              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                    {publicResultsUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    disabled={isReadOnly}
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                  {onRegenerateToken && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateToken}
                      disabled={isReadOnly || regenerating}
                      title="Regenerate link (invalidates old links)"
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view selected results.
                </p>
              </div>
            )}

            {!publicResultsToken && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  Save changes to generate a shareable link.
                </p>
              </div>
            )}

            {/* Metrics Selection */}
            <div className="space-y-3 pt-2 border-t">
              <Label>Shared Sections</Label>
              <div className="space-y-2">
                {METRICS_OPTIONS.map((metric) => (
                  <div key={metric.key} className="flex items-start gap-3">
                    <Checkbox
                      id={`metric-${metric.key}`}
                      checked={settings.sharedMetrics[metric.key]}
                      onCheckedChange={(checked) =>
                        handleMetricToggle(metric.key, checked as boolean)
                      }
                      disabled={isReadOnly}
                    />
                    <div className="space-y-0.5">
                      <Label
                        htmlFor={`metric-${metric.key}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {metric.label}
                      </Label>
                      <p className="text-xs text-muted-foreground">{metric.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Access Controls */}
            <div className="space-y-3 pt-2 border-t">
              <Label>Access Controls</Label>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="results-password" className="text-sm">
                    Password (optional)
                  </Label>
                </div>
                <Input
                  id="results-password"
                  type="password"
                  value={passwordInput.value}
                  onChange={(e) => passwordInput.setValue(e.target.value)}
                  onBlur={passwordInput.handleBlur}
                  disabled={isReadOnly}
                  placeholder="Leave blank for no password"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="results-expiry" className="text-sm">
                    Expiration Date (optional)
                  </Label>
                </div>
                <Input
                  id="results-expiry"
                  type="date"
                  value={settings.expiresAt ? settings.expiresAt.split('T')[0] : ''}
                  onChange={(e) =>
                    onPublicResultsSettingsChange({
                      expiresAt: e.target.value ? `${e.target.value}T23:59:59Z` : undefined,
                    })
                  }
                  disabled={isReadOnly}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
})
