'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Copy,
  Check,
  RefreshCw,
  Eye,
  Code,
  Loader2,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { usePublicResultsSettings } from '@/hooks'
import { EmbedCodeDialog } from '@/components/analysis/shared/embed-code-dialog'
import { getAuthFetchInstance } from '@/lib/swr'
import type { PublicResultsSettings } from '@/components/builders/shared/types'

interface SharingTabProps {
  studyId: string
  shareCode: string
  studyStatus: string
}

const METRICS_OPTIONS = [
  { key: 'overview', label: 'Overview', description: 'Summary statistics and completion rates' },
  { key: 'participants', label: 'Participants', description: 'Response count and timing data' },
  { key: 'analysis', label: 'Analysis', description: 'Main study results and visualizations' },
  { key: 'questionnaire', label: 'Questionnaire', description: 'Pre/post survey responses' },
  { key: 'aiInsights', label: 'AI Insights', description: 'AI-generated insights report with charts' },
] as const

export function SharingTab({ studyId }: SharingTabProps) {
  const [copiedResults, setCopiedResults] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const { settings, token, publicUrl, isLoading, updateSettings, regenerateToken, refreshSettings } =
    usePublicResultsSettings(studyId)

  // Auto-enable public results (toggle removed — always on)
  const autoEnabledRef = useRef(false)
  useEffect(() => {
    if (!isLoading && !settings.enabled && !autoEnabledRef.current) {
      autoEnabledRef.current = true
      updateSettings({ enabled: true })
    }
  }, [isLoading, settings.enabled, updateSettings])

  const handleCopyResultsLink = useCallback(async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedResults(true)
      setTimeout(() => setCopiedResults(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [publicUrl])

  const handleRegenerateToken = useCallback(async () => {
    setRegenerating(true)
    try {
      await regenerateToken()
      toast.success('Link regenerated. Old links are now invalid.')
    } finally {
      setRegenerating(false)
    }
  }, [regenerateToken])

  const handleMetricToggle = useCallback(
    (metricKey: keyof PublicResultsSettings['sharedMetrics'], checked: boolean) => {
      updateSettings({
        sharedMetrics: {
          ...settings.sharedMetrics,
          [metricKey]: checked,
        },
      })
    },
    [settings.sharedMetrics, updateSettings]
  )

  const handleExpiryChange = useCallback(
    (value: string) => {
      updateSettings({
        expiresAt: value ? `${value}T23:59:59Z` : undefined,
      })
    },
    [updateSettings]
  )

  const handleSavePassword = useCallback(async () => {
    if (!passwordValue) return
    setSavingPassword(true)
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/studies/${studyId}/public-results/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordValue }),
      })
      if (!response.ok) throw new Error('Failed to save password')
      // Refresh settings from server so hasPassword reflects the new state
      await refreshSettings()
      setPasswordSaved(true)
      setPasswordValue('')
      toast.success('Password saved')
      setTimeout(() => setPasswordSaved(false), 2000)
    } catch {
      toast.error('Failed to save password')
    } finally {
      setSavingPassword(false)
    }
  }, [passwordValue, studyId, refreshSettings])

  const handleRemovePassword = useCallback(async () => {
    setSavingPassword(true)
    try {
      const authFetch = getAuthFetchInstance()
      const response = await authFetch(`/api/studies/${studyId}/public-results/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: null }),
      })
      if (!response.ok) throw new Error('Failed to remove password')
      // Refresh settings from server so hasPassword reflects the cleared state
      await refreshSettings()
      setPasswordValue('')
      toast.success('Password removed')
    } catch {
      toast.error('Failed to remove password')
    } finally {
      setSavingPassword(false)
    }
  }, [studyId, refreshSettings])

  return (
    <div className="space-y-6">
      {/* Public Results Sharing */}
      <div className="rounded-lg border p-4">
        <div className="flex-1 space-y-4">
          <div>
            <h4 className="font-medium">Public Results</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Share a read-only view of results with stakeholders.
            </p>
          </div>

          {/* Shareable Link */}
          {token ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Shareable Link</Label>
                {/* Regenerate + Embed */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerateToken}
                    disabled={regenerating}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 mr-1.5 ${regenerating ? 'animate-spin' : ''}`}
                    />
                    Regenerate link
                  </Button>
                  <EmbedCodeDialog token={token}>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      <Code className="h-3.5 w-3.5 mr-1.5" />
                      Embed
                    </Button>
                  </EmbedCodeDialog>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono truncate">
                  {publicUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyResultsLink}
                  className="shrink-0"
                >
                  {copiedResults ? (
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
              </div>

              {/* View analytics */}
              {settings.viewCount != null && settings.viewCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Eye className="h-3.5 w-3.5" />
                  Viewed {settings.viewCount} time{settings.viewCount !== 1 ? 's' : ''}
                  {settings.lastViewedAt && (
                    <span className="text-muted-foreground/70">
                      · Last viewed {new Date(settings.lastViewedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Generating shareable link...
              </p>
            </div>
          )}

          {/* Shared Sections */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Shared Sections</Label>
            <div className="space-y-2">
              {METRICS_OPTIONS.map((metric) => (
                <div key={metric.key} className="flex items-start gap-3">
                  <Checkbox
                    id={`metric-${metric.key}`}
                    checked={(settings.sharedMetrics[metric.key as keyof typeof settings.sharedMetrics] as boolean | undefined) ?? false}
                    onCheckedChange={(checked) =>
                      handleMetricToggle(metric.key as keyof PublicResultsSettings['sharedMetrics'], checked as boolean)
                    }
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor={`metric-${metric.key}`}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {metric.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Access Controls */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Access Controls</Label>

            <div className="grid grid-cols-2 gap-4">
              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="results-password" className="text-sm">
                  Password (optional)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="results-password"
                    type="password"
                    value={passwordValue}
                    onChange={(e) => {
                      setPasswordValue(e.target.value)
                      setPasswordSaved(false)
                    }}
                    placeholder={(settings.password || settings.passwordHash) ? '••••••••' : 'Set a password'}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleSavePassword}
                    disabled={savingPassword || passwordSaved || !passwordValue}
                    className="shrink-0"
                  >
                    {savingPassword ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : passwordSaved ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Saved
                      </>
                    ) : (settings.password || settings.passwordHash) ? (
                      'Update'
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
                {(settings.password || settings.passwordHash) && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Password protection is active.</p>
                    <button
                      type="button"
                      onClick={handleRemovePassword}
                      disabled={savingPassword}
                      className="text-xs text-destructive hover:underline disabled:opacity-50"
                    >
                      Remove password
                    </button>
                  </div>
                )}
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <Label htmlFor="results-expiry" className="text-sm">
                  Expiration Date (optional)
                </Label>
                <Input
                  id="results-expiry"
                  type="date"
                  value={settings.expiresAt ? settings.expiresAt.split('T')[0] : ''}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
