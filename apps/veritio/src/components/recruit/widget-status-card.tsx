'use client'

import { useState, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Settings,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import { usePanelWidget, useWidgetEmbedCode } from '@/hooks/panel/use-panel-widget'
import { toast } from '@/components/ui/sonner'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { PanelWidgetConfigData } from '@/lib/supabase/panel-types'

interface WidgetStatusCardProps {
  studyId: string
  studyCode: string
  studyTitle: string
  isDraft: boolean
  isReadOnly?: boolean
  baseUrl: string
  currentActiveStudyTitle?: string
}

export const WidgetStatusCard = memo(function WidgetStatusCard({
  studyId,
  studyCode,
  studyTitle,
  isDraft,
  isReadOnly = false,
  currentActiveStudyTitle,
}: WidgetStatusCardProps) {
  const [copied, setCopied] = useState(false)
  const [showSwitchDialog, setShowSwitchDialog] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)

  // Use global panel widget hook
  const { config, isLoading, updateConfig, setActiveStudy } = usePanelWidget()
  const { embedCode } = useWidgetEmbedCode()

  const widgetConfig = (config?.config as PanelWidgetConfigData) || {
    enabled: false,
    title: 'Help us improve!',
    buttonText: 'Take Survey',
    position: 'bottom-right',
  }

  // Determine widget state
  const isThisStudyActive = config?.active_study_id === studyId
  const isOtherStudyActive = !!(config?.active_study_id && config.active_study_id !== studyId)

  const handleCopy = useCallback(async () => {
    if (!embedCode) return
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [embedCode])

  // Handle toggle change
  const handleToggle = useCallback(
    async (checked: boolean) => {
      if (checked) {
        // Turning ON - if another study is active, show confirmation
        if (isOtherStudyActive) {
          setShowSwitchDialog(true)
          return
        }
        // Otherwise, activate this study
        setIsSwitching(true)
        try {
          // If widget is disabled, enable it too
          if (!widgetConfig.enabled) {
            await updateConfig({ config: { enabled: true } })
          }
          await setActiveStudy(studyId)
          toast.success('Widget activated for this study')
        } catch {
          toast.error('Failed to activate widget')
        } finally {
          setIsSwitching(false)
        }
      } else {
        // Turning OFF - deactivate (clear active study)
        setIsSwitching(true)
        try {
          await setActiveStudy(null)
          toast.success('Widget deactivated')
        } catch {
          toast.error('Failed to deactivate widget')
        } finally {
          setIsSwitching(false)
        }
      }
    },
    [studyId, isOtherStudyActive, widgetConfig.enabled, updateConfig, setActiveStudy]
  )

  // Handle switch confirmation
  const handleConfirmSwitch = useCallback(async () => {
    // If widget is disabled, enable it too
    if (!widgetConfig.enabled) {
      await updateConfig({ config: { enabled: true } })
    }
    await setActiveStudy(studyId)
    toast.success('Widget switched to this study')
  }, [studyId, widgetConfig.enabled, updateConfig, setActiveStudy])

  // Quick customization handlers
  const handleTitleChange = useCallback(
    async (title: string) => {
      try {
        await updateConfig({ config: { title } })
      } catch {
        toast.error('Failed to update title')
      }
    },
    [updateConfig]
  )

  const handleButtonTextChange = useCallback(
    async (buttonText: string) => {
      try {
        await updateConfig({ config: { buttonText } })
      } catch {
        toast.error('Failed to update button text')
      }
    },
    [updateConfig]
  )

  const handlePositionChange = useCallback(
    async (position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left') => {
      try {
        await updateConfig({ config: { position } })
        toast.success('Position updated')
      } catch {
        toast.error('Failed to update position')
      }
    },
    [updateConfig]
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Website Widget</CardTitle>
            </div>
            {!isDraft && (
              <div className="flex items-center gap-2">
                {isThisStudyActive && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </span>
                )}
                <Switch
                  id="widget-toggle"
                  checked={isThisStudyActive}
                  onCheckedChange={handleToggle}
                  disabled={isReadOnly || isSwitching}
                />
              </div>
            )}
          </div>
          <CardDescription>
            Capture participants directly from your website with a popup survey.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDraft ? (
            /* Draft State */
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-sm text-amber-800">
                Launch your study to activate the widget.
              </p>
            </div>
          ) : isThisStudyActive ? (
            /* State 1: This study IS active - show preview + customization */
            <>
              {/* Live Preview */}
              <WidgetPreviewMockup
                title={widgetConfig.title}
                buttonText={widgetConfig.buttonText}
                position={widgetConfig.position}
              />

              {/* Quick Customization */}
              <div className="space-y-3 p-3 rounded-lg bg-muted/50 border">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="widget-title" className="text-xs">
                      Title
                    </Label>
                    <Input
                      id="widget-title"
                      value={widgetConfig.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Help us improve!"
                      className="h-9 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="widget-button" className="text-xs">
                      Button Text
                    </Label>
                    <Input
                      id="widget-button"
                      value={widgetConfig.buttonText}
                      onChange={(e) => handleButtonTextChange(e.target.value)}
                      placeholder="Take Survey"
                      className="h-9 text-sm"
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="widget-position" className="text-xs">
                    Position
                  </Label>
                  <Select
                    value={widgetConfig.position}
                    onValueChange={handlePositionChange}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger id="widget-position" className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="top-left">Top Left</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <a
                    href={`/s/${studyCode}?preview=true`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Preview Widget
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild className="flex-1">
                  <Link href="/panel/widget">
                    <Settings className="h-3.5 w-3.5 mr-2" />
                    Full Settings
                  </Link>
                </Button>
              </div>

              {/* Embed Code - Collapsible */}
              {embedCode && (
                <details className="group">
                  <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    <Copy className="h-3.5 w-3.5" />
                    <span>Show embed code</span>
                  </summary>
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Paste this code before the{' '}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        &lt;/body&gt;
                      </code>{' '}
                      tag on your website
                    </p>
                    <div className="relative">
                      <code className="block px-3 py-3 pr-20 bg-muted rounded-md text-sm font-mono break-all leading-relaxed">
                        {embedCode}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        disabled={isReadOnly}
                        className="absolute top-2 right-2 h-8"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
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
                  </div>
                </details>
              )}
            </>
          ) : isOtherStudyActive ? (
            /* State 2: Another study is active - show info message */
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {currentActiveStudyTitle
                  ? `"${currentActiveStudyTitle}" is currently the active study.`
                  : 'Another study is currently active.'}{' '}
                Turn on the toggle to switch to this study.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/panel/widget">
                  <Settings className="h-3.5 w-3.5 mr-2" />
                  Widget Settings
                </Link>
              </Button>
            </div>
          ) : (
            /* State 3: Widget not active - show preview + features */
            <div className="space-y-4">
              {/* Widget Preview Mockup */}
              <WidgetPreviewMockup
                title="Help us improve!"
                buttonText="Take Survey"
                position="bottom-right"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Switch Study Confirmation Dialog - using reusable ConfirmDialog */}
      <ConfirmDialog
        open={showSwitchDialog}
        onOpenChange={setShowSwitchDialog}
        title="Switch Active Study?"
        description={`This will change the widget from "${currentActiveStudyTitle || 'another study'}" to "${studyTitle}".`}
        confirmText="Switch Study"
        variant="info"
        icon={<RefreshCw className="h-5 w-5" />}
        onConfirm={handleConfirmSwitch}
      />
    </>
  )
})

interface WidgetPreviewMockupProps {
  title: string
  buttonText: string
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const WidgetPreviewMockup = memo(function WidgetPreviewMockup({
  title,
  buttonText,
  position,
}: WidgetPreviewMockupProps) {
  // Position classes for the widget popup
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-16 right-6',
    'top-left': 'top-16 left-6',
  }

  return (
    <div className="rounded-lg border bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-3 relative min-h-[220px]">
      {/* Browser mockup */}
      <div className="rounded-lg bg-white dark:bg-slate-950 border shadow-sm p-3 space-y-2 min-h-[200px]">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 pb-2 border-b">
          <div className="h-2 w-2 rounded-full bg-red-400" />
          <div className="h-2 w-2 rounded-full bg-yellow-400" />
          <div className="h-2 w-2 rounded-full bg-green-400" />
          <div className="flex-1 bg-muted rounded h-4 ml-3" />
        </div>

        {/* Page content skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="h-2.5 bg-muted rounded w-1/2" />
          <div className="h-2 bg-muted/60 rounded w-full" />
          <div className="h-2 bg-muted/60 rounded w-11/12" />
          <div className="h-2 bg-muted/60 rounded w-full" />
          <div className="h-2 bg-muted/60 rounded w-4/5" />
          <div className="mt-2 h-2.5 bg-muted rounded w-1/3" />
          <div className="h-2 bg-muted/60 rounded w-full" />
        </div>

        {/* Widget popup mockup */}
        <div className={`absolute ${positionClasses[position]} w-56 rounded-xl border-2 border-primary/20 shadow-2xl bg-white dark:bg-slate-950 p-3 space-y-2.5 animate-in slide-in-from-bottom-4 duration-500`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                Share your feedback in a quick 2-minute survey
              </p>
            </div>
            <button className="text-muted-foreground hover:text-foreground shrink-0">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <button className="w-full bg-primary text-primary-foreground text-xs font-medium py-2 px-3 rounded-lg hover:bg-primary/90 transition-colors">
            {buttonText}
          </button>
          <p className="text-[12px] text-muted-foreground text-center">Takes ~2 minutes</p>
        </div>
      </div>
    </div>
  )
})
