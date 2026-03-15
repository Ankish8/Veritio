'use client'

import { useState, useCallback, memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Copy,
  Check,
  Eye,
  Smartphone,
  MessageSquare,
  AlignJustify,
  Square,
  ArrowRight,
  Tag,
} from 'lucide-react'
import type { InterceptWidgetSettings } from '../../types'
import { useLocalInputSync } from '@/hooks/use-local-input-sync'
import { InteractivePreview } from './interactive-preview'

interface InterceptWidgetCardProps {
  interceptSettings?: InterceptWidgetSettings
  onInterceptSettingsChange: (updates: Partial<InterceptWidgetSettings>) => void
  participantUrl: string
  isDraft: boolean
  isReadOnly?: boolean
  primaryColor?: string
  studyType?: string
  previewDevice?: 'desktop' | 'mobile'
  previewKey?: number
}

/**
 * Get study-type-aware copy for intercept widget
 */
function getStudyTypeCopy(studyType?: string): {
  description: string
  buttonText: string
} {
  switch (studyType) {
    case 'card_sort':
      return {
        description: 'Help us organize our content by grouping cards.',
        buttonText: 'Start Card Sort',
      }
    case 'tree_test':
      return {
        description: 'Test our navigation by finding items in our menu.',
        buttonText: 'Start Tree Test',
      }
    case 'prototype_test':
      return {
        description: 'Try our prototype and share your feedback.',
        buttonText: 'Try Prototype',
      }
    case 'survey':
      return {
        description: 'Take a quick survey and share your feedback.',
        buttonText: 'Take Survey',
      }
    default:
      return {
        description: 'Share your feedback to help us improve.',
        buttonText: 'Get Started',
      }
  }
}

const DEFAULT_SETTINGS: InterceptWidgetSettings = {
  enabled: true, // Widget is always enabled - requires embed code installation
  position: 'bottom-right',
  triggerType: 'time_delay',
  triggerValue: 5,
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  buttonColor: '#000000',
  title: 'Help us improve!',
  description: 'Share your feedback to help us improve.',
  buttonText: 'Get Started',
}

const POSITION_OPTIONS = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
] as const

const TRIGGER_OPTIONS = [
  { value: 'time_delay', label: 'Time Delay', unit: 'seconds' },
  { value: 'scroll_percentage', label: 'Scroll Percentage', unit: '%' },
  { value: 'exit_intent', label: 'Exit Intent', unit: null },
] as const

const WIDGET_STYLES = [
  {
    value: 'popup' as const,
    label: 'Popup',
    description: 'Corner card (default)',
    Icon: MessageSquare,
  },
  {
    value: 'banner' as const,
    label: 'Banner',
    description: 'Full-width bar',
    Icon: AlignJustify,
  },
  {
    value: 'modal' as const,
    label: 'Modal',
    description: 'Center overlay',
    Icon: Square,
  },
  {
    value: 'drawer' as const,
    label: 'Drawer',
    description: 'Full-height side panel',
    Icon: ArrowRight,
  },
  {
    value: 'badge' as const,
    label: 'Badge',
    description: 'Persistent tab',
    Icon: Tag,
  },
]

const ANIMATIONS = [
  { value: 'fade' as const, label: 'Fade' },
  { value: 'slide' as const, label: 'Slide' },
  { value: 'zoom' as const, label: 'Zoom' },
  { value: 'bounce' as const, label: 'Bounce' },
]

function openWidgetPreview(
  settings: InterceptWidgetSettings,
  participantUrl: string,
  device?: 'mobile'
) {
  const params = new URLSearchParams({
    'study-url': participantUrl,
    'api-base': typeof window !== 'undefined' ? window.location.origin : '',
    position: settings.position,
    'bg-color': settings.backgroundColor,
    'text-color': settings.textColor,
    'button-color': settings.buttonColor,
    title: settings.title,
    description: settings.description,
    'button-text': settings.buttonText,
    trigger: settings.triggerType,
    'trigger-value': String(settings.triggerValue || 5),
  })
  if (device) params.set('device', device)
  window.open(`/widget-preview?${params.toString()}`, '_blank')
}

function WidgetSettingsSection({
  settings,
  onSettingsChange,
  isReadOnly,
  participantUrl,
  isDraft,
  titleInput,
  descriptionInput,
  buttonTextInput,
  embedCode,
  copied,
  handleCopyCode,
}: {
  settings: InterceptWidgetSettings
  onSettingsChange: (updates: Partial<InterceptWidgetSettings>) => void
  isReadOnly: boolean
  participantUrl: string
  isDraft: boolean
  titleInput: any
  descriptionInput: any
  buttonTextInput: any
  embedCode: string
  copied: boolean
  handleCopyCode: () => void
}) {
  const currentTrigger = TRIGGER_OPTIONS.find((t) => t.value === settings.triggerType)

  const currentStyle = WIDGET_STYLES.find((s) => s.value === settings.widgetStyle) || WIDGET_STYLES[0]

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <h3 className="text-sm font-semibold text-foreground">Widget Settings</h3>

      {/* Style & Animation - Side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Style</Label>
          <Select
            value={settings.widgetStyle || 'popup'}
            onValueChange={(value) =>
              onSettingsChange({
                widgetStyle: value as InterceptWidgetSettings['widgetStyle'],
              })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue>
                <div className="flex items-center gap-2">
                  <currentStyle.Icon className="h-3.5 w-3.5" />
                  <span>{currentStyle.label}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WIDGET_STYLES.map((style) => {
                const Icon = style.Icon
                return (
                  <SelectItem key={style.value} value={style.value}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5" />
                      <span>{style.label}</span>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Animation</Label>
          <Select
            value={settings.animation || 'fade'}
            onValueChange={(value) =>
              onSettingsChange({
                animation: value as InterceptWidgetSettings['animation'],
              })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANIMATIONS.map((anim) => (
                <SelectItem key={anim.value} value={anim.value}>
                  {anim.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Style-specific options (Banner position, Slide direction, Badge position) */}
      {settings.widgetStyle === 'banner' && (
        <div className="space-y-2">
          <Label className="text-xs">Banner Position</Label>
          <Select
            value={settings.bannerPosition || 'bottom'}
            onValueChange={(value) =>
              onSettingsChange({
                bannerPosition: value as InterceptWidgetSettings['bannerPosition'],
              })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top of Page</SelectItem>
              <SelectItem value="bottom">Bottom of Page</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {settings.widgetStyle === 'drawer' && (
        <div className="space-y-2">
          <Label className="text-xs">Drawer Direction</Label>
          <Select
            value={settings.slideDirection || 'right'}
            onValueChange={(value) =>
              onSettingsChange({
                slideDirection: value as InterceptWidgetSettings['slideDirection'],
              })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">From Left</SelectItem>
              <SelectItem value="right">From Right</SelectItem>
              <SelectItem value="top">From Top</SelectItem>
              <SelectItem value="bottom">From Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {settings.widgetStyle === 'badge' && (
        <div className="space-y-2">
          <Label className="text-xs">Badge Position</Label>
          <Select
            value={settings.badgePosition || 'right'}
            onValueChange={(value) =>
              onSettingsChange({
                badgePosition: value as InterceptWidgetSettings['badgePosition'],
              })
            }
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left Edge</SelectItem>
              <SelectItem value="right">Right Edge</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Position & Trigger */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Position & Trigger</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-xs">Position</Label>
            <Select
              value={settings.position}
              onValueChange={(value) =>
                onSettingsChange({
                  position: value as InterceptWidgetSettings['position'],
                })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Trigger</Label>
            <Select
              value={settings.triggerType}
              onValueChange={(value) =>
                onSettingsChange({
                  triggerType: value as InterceptWidgetSettings['triggerType'],
                })
              }
              disabled={isReadOnly}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Trigger Value */}
        {currentTrigger?.unit && (
          <div className="space-y-2">
            <Label className="text-xs">Value ({currentTrigger.unit})</Label>
            <Input
              type="number"
              min={1}
              max={currentTrigger.value === 'scroll_percentage' ? 100 : 60}
              value={settings.triggerValue || ''}
              onChange={(e) =>
                onSettingsChange({ triggerValue: parseInt(e.target.value) || undefined })
              }
              disabled={isReadOnly}
              placeholder={currentTrigger.value === 'time_delay' ? '5' : '50'}
              className="h-9"
            />
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Colors</Label>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isReadOnly} className="gap-2 h-9">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: settings.backgroundColor }}
                />
                Background
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <Input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => onSettingsChange({ backgroundColor: e.target.value })}
                className="w-32 h-8"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isReadOnly} className="gap-2 h-9">
                <div className="w-4 h-4 rounded border" style={{ backgroundColor: settings.textColor }} />
                Text
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <Input
                type="color"
                value={settings.textColor}
                onChange={(e) => onSettingsChange({ textColor: e.target.value })}
                className="w-32 h-8"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={isReadOnly} className="gap-2 h-9">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: settings.buttonColor }}
                />
                Button
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3">
              <Input
                type="color"
                value={settings.buttonColor}
                onChange={(e) => onSettingsChange({ buttonColor: e.target.value })}
                className="w-32 h-8"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Content</Label>
        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input
              value={titleInput.value}
              onChange={(e) => titleInput.setValue(e.target.value)}
              onBlur={titleInput.handleBlur}
              disabled={isReadOnly}
              placeholder="Help us improve!"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={descriptionInput.value}
              onChange={(e) => descriptionInput.setValue(e.target.value)}
              onBlur={descriptionInput.handleBlur}
              disabled={isReadOnly}
              placeholder="Take a quick survey and share your feedback."
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Button Text</Label>
            <Input
              value={buttonTextInput.value}
              onChange={(e) => buttonTextInput.setValue(e.target.value)}
              onBlur={buttonTextInput.handleBlur}
              disabled={isReadOnly}
              placeholder="Take Survey"
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Embed Code */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Embed Code</Label>
        <p className="text-xs text-muted-foreground">
          Paste this code snippet before the closing &lt;/body&gt; tag on your website.
        </p>
        <div className="relative">
          <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-32 font-mono">
            <code>{embedCode}</code>
          </pre>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyCode}
            disabled={isReadOnly || isDraft}
            className="absolute top-2 right-2 h-7"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Test Widget Buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openWidgetPreview(settings, participantUrl)}
            disabled={isDraft}
            className="flex-1 h-9"
          >
            <Eye className="h-4 w-4 mr-2" />
            Test Widget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openWidgetPreview(settings, participantUrl, 'mobile')}
            disabled={isDraft}
            className="flex-1 h-9"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Preview Mobile
          </Button>
        </div>
      </div>
    </div>
  )
}


function WidgetPreviewPanel({
  settings,
  participantUrl,
  device,
  previewKey,
}: {
  settings: InterceptWidgetSettings
  participantUrl: string
  device: 'desktop' | 'mobile'
  previewKey: number
}) {
  return (
    <div className="hidden md:flex flex-col relative sticky top-6 self-start h-[calc(100vh-180px)] flex-1 max-w-[1280px]">
      {/* Full-size preview - takes full height */}
      <div className="flex-1 rounded-lg border overflow-hidden">
        <InteractivePreview
          settings={settings}
          participantUrl={participantUrl}
          device={device}
          triggerKey={previewKey}
        />
      </div>
    </div>
  )
}

export const InterceptWidgetCard = memo(function InterceptWidgetCard({
  interceptSettings,
  onInterceptSettingsChange,
  participantUrl,
  isDraft,
  isReadOnly = false,
  primaryColor = '#000000',
  studyType,
  previewDevice = 'desktop',
  previewKey = 0,
}: InterceptWidgetCardProps) {
  const [copied, setCopied] = useState(false)

  // Merge with defaults
  const settings = useMemo(() => {
    const studyTypeCopy = getStudyTypeCopy(studyType)
    return {
      ...DEFAULT_SETTINGS,
      ...studyTypeCopy,
      buttonColor: primaryColor,
      ...interceptSettings,
    }
  }, [interceptSettings, primaryColor, studyType])

  // Use local input sync for text fields
  const titleInput = useLocalInputSync(settings.title, {
    debounceMs: 500,
    onSync: (value) => onInterceptSettingsChange({ title: value }),
  })

  const descriptionInput = useLocalInputSync(settings.description, {
    debounceMs: 500,
    onSync: (value) => onInterceptSettingsChange({ description: value }),
  })

  const buttonTextInput = useLocalInputSync(settings.buttonText, {
    debounceMs: 500,
    onSync: (value) => onInterceptSettingsChange({ buttonText: value }),
  })

  // Generate embed code
  const embedCode = useMemo(() => {
    if (isDraft || !participantUrl) {
      return '<!-- Launch your study to get the embed code -->'
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''

    // Check if using any Phase 3 features
    const hasAdvancedFeatures =
      settings.advancedTriggers?.enabled ||
      settings.widgetStyle !== 'popup' ||
      settings.scheduling?.enabled ||
      settings.privacy?.respectDoNotTrack ||
      settings.placement?.mode !== 'fixed'

    if (hasAdvancedFeatures) {
      const advancedConfig = {
        ...settings,
        studyUrl: participantUrl,
        apiBase: origin,
      }

      return `<script
  src="${origin}/intercept-widget-v3.js"
  data-study-url="${participantUrl}"
  data-config='${JSON.stringify(advancedConfig).replace(/'/g, "\\'")}'
></script>`
    }

    return `<script
  src="${origin}/intercept-widget-enhanced.js"
  data-study-url="${participantUrl}"
  data-api-base="${origin}"
  data-position="${settings.position}"
  data-trigger="${settings.triggerType}"
  data-trigger-value="${settings.triggerValue || ''}"
  data-bg-color="${settings.backgroundColor}"
  data-text-color="${settings.textColor}"
  data-button-color="${settings.buttonColor}"
  data-title="${settings.title}"
  data-description="${settings.description}"
  data-button-text="${settings.buttonText}"
></script>`
  }, [isDraft, participantUrl, settings])

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [embedCode])

  return (
    <div className="w-full">
      {isDraft ? (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm text-amber-800">Launch your study to configure the widget.</p>
        </div>
      ) : (
        <div className="flex gap-4 pb-6 pl-4">
          {/* Left Side - Controls */}
          <div className="w-[340px] flex-shrink-0">
            {/* Widget Settings Section */}
            <WidgetSettingsSection
              settings={settings}
              onSettingsChange={onInterceptSettingsChange}
              isReadOnly={isReadOnly}
              participantUrl={participantUrl}
              isDraft={isDraft}
              titleInput={titleInput}
              descriptionInput={descriptionInput}
              buttonTextInput={buttonTextInput}
              embedCode={embedCode}
              copied={copied}
              handleCopyCode={handleCopyCode}
            />
          </div>

          {/* Right Side - Live Preview (70%) */}
          <WidgetPreviewPanel
            settings={settings}
            participantUrl={participantUrl}
            device={previewDevice}
            previewKey={previewKey}
          />
        </div>
      )}
    </div>
  )
})
