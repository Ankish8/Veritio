'use client'

import { memo, useState, useCallback, useMemo, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useLiveWebsiteSettings, useLiveWebsiteActions, useLiveWebsiteVariants, useLiveWebsiteSelectedVariantId } from '@/stores/study-builder'
import { getAuthToken } from '@veritio/auth/client'
import { TrackingModeSelector } from './tracking-mode-selector'
import { WebsitePreviewPanel } from './website-preview-panel'

/** Check if a URL string is valid */
function isValidUrl(url: string): boolean {
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`)
    return true
  } catch {
    return false
  }
}

/** Ensure URL has a protocol */
function normalizeUrl(url: string): string {
  if (!url) return ''
  return url.startsWith('http') ? url : `https://${url}`
}

interface WebsiteTabProps {
  studyId: string
}

function WebsiteTabComponent({ studyId }: WebsiteTabProps) {
  const settings = useLiveWebsiteSettings()
  const { setSettings, addVariant, updateVariant, removeVariant, setSelectedVariantId } = useLiveWebsiteActions()
  const variants = useLiveWebsiteVariants()
  const selectedVariantId = useLiveWebsiteSelectedVariantId()
  const [localUrl, setLocalUrl] = useState(settings.websiteUrl ?? '')
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Fetch auth token on mount for proxy requests
  useEffect(() => {
    getAuthToken().then(setAuthToken)
  }, [])

  const abTestingEnabled = settings.abTestingEnabled === true
  const hasValidUrl = useMemo(() => isValidUrl(settings.websiteUrl ?? ''), [settings.websiteUrl])
  const normalizedUrl = useMemo(() => hasValidUrl ? normalizeUrl(settings.websiteUrl ?? '') : '', [hasValidUrl, settings.websiteUrl])

  const handleUrlBlur = useCallback(() => {
    if (localUrl !== (settings.websiteUrl ?? '')) {
      setSettings({ websiteUrl: localUrl, snippetVerified: false })
    }
  }, [localUrl, settings.websiteUrl, setSettings])

  return (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {/* Left Column — Settings */}
      <div className="w-[440px] min-w-[380px] shrink-0 overflow-y-auto p-6 border-r">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold">Website Setup</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Configure the website and how participants interact with it.
            </p>
          </div>

          {/* Website URL (single, hidden when A/B testing enabled) */}
          {!abTestingEnabled && (
            <div className="space-y-1.5">
              <Label htmlFor="website-url" className="text-sm font-medium">
                Website URL
                <span className="text-destructive ml-1" aria-label="required">*</span>
              </Label>
              <Input
                id="website-url"
                type="url"
                placeholder="https://example.com"
                value={localUrl}
                onChange={(e) => setLocalUrl(e.target.value)}
                onBlur={handleUrlBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') handleUrlBlur() }}
              />
              <p className="text-xs text-muted-foreground">
                Press Enter or click away to see a preview.
              </p>
            </div>
          )}

          <Separator />

          {/* Tracking Mode */}
          <TrackingModeSelector
            mode={settings.mode}
            snippetId={settings.snippetId ?? undefined}
            websiteUrl={settings.websiteUrl ?? undefined}
            abTestingEnabled={abTestingEnabled}
            variants={variants}
            selectedVariantId={selectedVariantId}
            hiddenModes={
              settings.createdFromUseCase === 'website_prototype_test' ? ['snippet'] :
              settings.createdFromUseCase === 'web_app_test' ? ['reverse_proxy'] :
              undefined
            }
            studyId={studyId}
            snippetVerified={settings.snippetVerified}
            hasValidUrl={hasValidUrl}
            normalizedUrl={normalizedUrl}
            authToken={authToken}
            setSettings={setSettings as (updates: Record<string, unknown>) => void}
            addVariant={addVariant}
            updateVariant={updateVariant}
            removeVariant={removeVariant}
            setSelectedVariantId={setSelectedVariantId}
          />

        </div>
      </div>

      {/* Right Column — Website Preview */}
      <WebsitePreviewPanel
        websiteUrl={settings.websiteUrl}
        abTestingEnabled={abTestingEnabled}
        variants={variants}
        selectedVariantId={selectedVariantId}
        authToken={authToken}
        setSelectedVariantId={setSelectedVariantId}
      />
    </div>
  )
}

export const WebsiteTab = memo(
  WebsiteTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
