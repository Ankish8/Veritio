'use client'

import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { Header } from '@/components/dashboard/header'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2, Smartphone, Monitor, RotateCcw, RefreshCw, ExternalLink } from 'lucide-react'
import { InteractivePreview } from '@/components/builders/shared/tabs/sharing/interactive-preview'
import { SaveStatusIndicator } from '@/components/builders/save-status'
import type { SaveStatus } from '@/stores/study-builder'
import {
  PanelWidgetSettingsPanel,
  type WidgetExtendedSettings,
} from '@/components/panel/widget/PanelWidgetSettingsPanel'
import { WidgetLeftPanel } from '@/components/panel/widget/WidgetLeftPanel'
import { usePanelWidgetPanels } from '@/hooks/panel/use-panel-widget-panels'
import { usePanelWidget, useWidgetEmbedCode } from '@/hooks/panel/use-panel-widget'
import { useStudyIncentiveConfig } from '@/hooks/panel'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'
import { useUserPreferences } from '@/hooks/use-user-preferences'
import { toast } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'
import type { PanelWidgetConfigData } from '@/lib/supabase/panel-types'
import type { InterceptWidgetSettings } from '@/components/builders/shared/types'

export interface WidgetStudy {
  id: string
  title: string
  status: string
  study_type: string
}

interface WidgetClientProps {
  studies: WidgetStudy[]
  organizationId?: string
}

const DEFAULT_CONFIG: PanelWidgetConfigData = {
  enabled: false,
  position: 'bottom-right',
  triggerType: 'time_delay',
  triggerValue: 5,
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  buttonColor: '#000000',
  title: 'Help us improve!',
  description: 'Share your feedback to help us improve.',
  buttonText: 'Get Started',
  captureSettings: {
    collectEmail: true,
    collectDemographics: true,
    demographicFields: ['country', 'age_range'],
    submitButtonText: "Start Survey",
  },
  frequencyCapping: {
    enabled: true,
    maxImpressions: 3,
    timeWindow: 'day',
  },
  widgetStyle: 'popup',
  animation: 'fade',
  bannerPosition: 'bottom',
  slideDirection: 'right',
  badgePosition: 'right',
}

const RADIUS_MAP: Record<string, number> = {
  none: 0,
  small: 4,
  default: 8,
  large: 16,
}

interface BrandingSettings {
  themeMode: 'light' | 'dark' | 'system'
  primaryColor: string
  radiusOption: 'none' | 'small' | 'default' | 'large'
}

/** Convert PanelWidgetConfigData to InterceptWidgetSettings for the preview. */
function toInterceptSettings(
  config: PanelWidgetConfigData,
  branding: BrandingSettings,
  embedCodeId?: string | null
): InterceptWidgetSettings {
  const isDark = branding.themeMode === 'dark'

  return {
    enabled: config.enabled,
    position: config.position,
    triggerType: config.triggerType,
    triggerValue: config.triggerValue,
    backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    textColor: isDark ? '#f5f5f5' : '#1a1a1a',
    buttonColor: branding.primaryColor || config.buttonColor,
    title: config.title,
    description: config.description,
    buttonText: config.buttonText,
    widgetStyle: config.widgetStyle || 'popup',
    animation: config.animation || 'fade',
    bannerPosition: config.bannerPosition || 'bottom',
    slideDirection: config.slideDirection || 'right',
    badgePosition: config.badgePosition || 'right',
    themeMode: branding.themeMode,
    borderRadius: RADIUS_MAP[branding.radiusOption] ?? 8,
    captureSettings: config.captureSettings,
    embedCodeId: embedCodeId || undefined,
  }
}

export function WidgetClient({ studies, organizationId }: WidgetClientProps) {
  const { config, isLoading, updateConfig, setActiveStudy } = usePanelWidget(organizationId)
  const { embedCode } = useWidgetEmbedCode(organizationId)
  const { preferences } = useUserPreferences()

  // Incentive config for the active study
  const activeStudyId = config?.active_study_id || null
  const { config: incentiveConfig, updateConfig: updateIncentiveConfig } = useStudyIncentiveConfig(activeStudyId)
  const [copied, setCopied] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [previewKey, setPreviewKey] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [extendedSettings, setExtendedSettings] = useState<WidgetExtendedSettings>({})

  const remoteConfig = (config?.config as PanelWidgetConfigData) || DEFAULT_CONFIG
  const [localConfig, setLocalConfig] = useState<PanelWidgetConfigData>(remoteConfig)
  const pendingUpdatesRef = useRef<Partial<PanelWidgetConfigData>>({})
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local config when remote changes (skip during active save to avoid flicker)
  useEffect(() => {
    if (saveStatus !== 'saving') {
      setLocalConfig(remoteConfig)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync when remoteConfig changes, not on every saveStatus change
  }, [remoteConfig])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const widgetConfig = localConfig

  const branding: BrandingSettings = useMemo(() => ({
    themeMode: preferences?.studyDefaults?.branding?.themeMode || 'light',
    primaryColor: preferences?.studyDefaults?.branding?.primaryColor || '#7c3aed',
    radiusOption: preferences?.studyDefaults?.branding?.radiusOption || 'default',
  }), [preferences])

  const interceptSettings = useMemo(
    () => toInterceptSettings(widgetConfig, branding, config?.embed_code_id),
    [widgetConfig, branding, config?.embed_code_id]
  )

  const titleInput = useLocalInputSync(widgetConfig.title, {
    debounceMs: 0,
    onSync: (value) => handleConfigChange({ title: value }),
  })

  const descriptionInput = useLocalInputSync(widgetConfig.description, {
    debounceMs: 0,
    onSync: (value) => handleConfigChange({ description: value }),
  })

  const buttonTextInput = useLocalInputSync(widgetConfig.buttonText, {
    debounceMs: 0,
    onSync: (value) => handleConfigChange({ buttonText: value }),
  })

  const submitButtonTextInput = useLocalInputSync(
    widgetConfig.captureSettings?.submitButtonText || "Start Survey",
    {
      debounceMs: 0,
      onSync: (value) =>
        handleConfigChange({
          captureSettings: { ...widgetConfig.captureSettings, submitButtonText: value },
        }),
    }
  )

  const handleConfigChange = useCallback(
    (updates: Partial<PanelWidgetConfigData>) => {
      setLocalConfig((prev) => ({ ...prev, ...updates }))
      pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }

      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      setSaveStatus('saving')

      debounceTimeoutRef.current = setTimeout(() => {
        const pending = pendingUpdatesRef.current
        pendingUpdatesRef.current = {}

        updateConfig({ config: pending })
          .then(() => {
            setSaveStatus('saved')
            saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
          })
          .catch(() => {
            setSaveStatus('error')
            toast.error('Failed to update widget configuration')
            saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
          })
      }, 500)
    },
    [updateConfig]
  )

  const handleActiveStudyChange = useCallback(
    async (studyId: string | null) => {
      try {
        await setActiveStudy(studyId)
        toast.success(studyId ? 'Active study updated' : 'Active study cleared')
      } catch {
        toast.error('Failed to update active study')
      }
    },
    [setActiveStudy]
  )

  const handleCopyCode = useCallback(async () => {
    if (!embedCode) return
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy embed code')
    }
  }, [embedCode])

  const handleExtendedSettingsChange = useCallback((updates: Partial<WidgetExtendedSettings>) => {
    setExtendedSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  const participantUrl = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/panel/join`
  }, [])

  const floatingPanelContent = useMemo(
    () => (
      <PanelWidgetSettingsPanel
        config={widgetConfig}
        onConfigChange={handleConfigChange}
        extendedSettings={extendedSettings}
        onExtendedSettingsChange={handleExtendedSettingsChange}
      />
    ),
    [widgetConfig, handleConfigChange, extendedSettings, handleExtendedSettingsChange]
  )
  usePanelWidgetPanels(floatingPanelContent, widgetConfig.enabled)

  if (isLoading) {
    return (
      <>
        <Header title="Widget" />
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading widget configuration...</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Widget">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Enable Widget</span>
            <Switch
              checked={widgetConfig.enabled}
              onCheckedChange={(checked) => handleConfigChange({ enabled: checked })}
            />
          </div>

          <div className="h-6 w-px bg-border" />

          <SaveStatusIndicator status={saveStatus} />

          <div className={cn(
            "flex items-center gap-1 p-0.5 bg-background rounded-md shadow-sm border border-border",
            !widgetConfig.enabled && 'opacity-50 pointer-events-none'
          )}>
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={cn(
                'p-2 rounded transition-colors',
                previewDevice === 'desktop'
                  ? 'bg-muted shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={cn(
                'p-2 rounded transition-colors',
                previewDevice === 'mobile'
                  ? 'bg-muted shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!widgetConfig.enabled}
            onClick={() => setPreviewKey((prev) => prev + 1)}
            className="h-8 gap-2"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Trigger
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={!widgetConfig.enabled}
            onClick={() => setReloadKey((prev) => prev + 1)}
            className="h-8 gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </Button>

          <Button
            size="sm"
            disabled={!widgetConfig.enabled}
            onClick={() => {
              const params = new URLSearchParams({
                'study-url': participantUrl,
                'api-base': typeof window !== 'undefined' ? window.location.origin : '',
                position: widgetConfig.position,
                'theme-mode': branding.themeMode,
                'button-color': branding.primaryColor,
                'border-radius': String(RADIUS_MAP[branding.radiusOption] ?? 8),
                title: widgetConfig.title,
                description: widgetConfig.description,
                'button-text': widgetConfig.buttonText,
                trigger: widgetConfig.triggerType,
                'trigger-value': String(widgetConfig.triggerValue || 5),
                'widget-style': widgetConfig.widgetStyle || 'popup',
                animation: widgetConfig.animation || 'fade',
                'banner-position': widgetConfig.bannerPosition || 'bottom',
                'slide-direction': widgetConfig.slideDirection || 'right',
                'badge-position': widgetConfig.badgePosition || 'right',
              })
              if (widgetConfig.captureSettings) {
                params.set('capture-settings', JSON.stringify(widgetConfig.captureSettings))
              }
              if (config?.embed_code_id) {
                params.set('embed-code-id', config.embed_code_id)
              }
              window.open(`/widget-preview?${params.toString()}`, '_blank')
            }}
            className="h-8 gap-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Test Widget
          </Button>
        </div>
      </Header>

      <div className="flex gap-4 p-6 h-[calc(100vh-120px)]">
        <div className={cn(!widgetConfig.enabled && 'opacity-50 pointer-events-none select-none')}>
          <WidgetLeftPanel
            config={config}
            widgetConfig={widgetConfig}
            studies={studies}
            embedCode={embedCode}
            copied={copied}
            titleInput={titleInput}
            descriptionInput={descriptionInput}
            buttonTextInput={buttonTextInput}
            submitButtonTextInput={submitButtonTextInput}
            participantUrl={participantUrl}
            branding={branding}
            onConfigChange={handleConfigChange}
            onActiveStudyChange={handleActiveStudyChange}
            onCopyCode={handleCopyCode}
            incentiveConfig={incentiveConfig}
            onIncentiveConfigChange={updateIncentiveConfig}
          />
        </div>

        <div className="relative flex-1 rounded-lg border border-border overflow-hidden">
          <InteractivePreview
            settings={interceptSettings}
            participantUrl={participantUrl}
            device={previewDevice}
            triggerKey={previewKey}
            reloadKey={reloadKey}
          />
          {!widgetConfig.enabled && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-black/20 via-black/40 to-black/20 dark:from-black/40 dark:via-black/60 dark:to-black/40 backdrop-blur-[3px]">
              <div className="flex flex-col items-center gap-4 rounded-2xl bg-background/95 px-10 py-8 shadow-2xl ring-1 ring-border">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-semibold text-foreground">Widget is off</span>
                  <span className="text-xs text-muted-foreground">Turn it on to preview and configure</span>
                </div>
                <div className="flex items-center gap-2.5 rounded-full bg-muted px-4 py-2">
                  <span className="text-xs font-medium text-muted-foreground">Off</span>
                  <Switch
                    checked={false}
                    onCheckedChange={() => handleConfigChange({ enabled: true })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
