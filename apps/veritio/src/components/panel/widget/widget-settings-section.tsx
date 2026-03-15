'use client'

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
} from 'lucide-react'
import type { InterceptWidgetSettings } from '../types'
import type { useLocalInputSync } from '@/hooks/use-local-input-sync'
import { TRIGGER_OPTIONS, WIDGET_STYLES, ANIMATIONS, POSITION_OPTIONS } from './widget-constants'

interface WidgetSettingsSectionProps {
  settings: InterceptWidgetSettings
  onSettingsChange: (updates: Partial<InterceptWidgetSettings>) => void
  isReadOnly: boolean
  participantUrl: string
  isDraft: boolean
  titleInput: ReturnType<typeof useLocalInputSync>
  descriptionInput: ReturnType<typeof useLocalInputSync>
  buttonTextInput: ReturnType<typeof useLocalInputSync>
  embedCode: string
  copied: boolean
  handleCopyCode: () => void
}

export function WidgetSettingsSection({
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
}: WidgetSettingsSectionProps) {
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
            onClick={() => {
              const paramsObj: Record<string, string> = {
                'study-url': participantUrl,
                'api-base': typeof window !== 'undefined' ? window.location.origin : '',
                position: settings.position || 'bottom-right',
                'bg-color': settings.backgroundColor || '#ffffff',
                'text-color': settings.textColor || '#1a1a1a',
                'button-color': settings.buttonColor || '#6366f1',
                title: settings.title || '',
                description: settings.description || '',
                'button-text': settings.buttonText || 'Take Survey',
                trigger: settings.triggerType || 'time',
                'trigger-value': String(settings.triggerValue || 5),
              }
              const params = new URLSearchParams(paramsObj)
              window.open(`/widget-preview?${params.toString()}`, '_blank')
            }}
            disabled={isDraft}
            className="flex-1 h-9"
          >
            <Eye className="h-4 w-4 mr-2" />
            Test Widget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const paramsObj: Record<string, string> = {
                'study-url': participantUrl,
                'api-base': typeof window !== 'undefined' ? window.location.origin : '',
                position: settings.position || 'bottom-right',
                'bg-color': settings.backgroundColor || '#ffffff',
                'text-color': settings.textColor || '#1a1a1a',
                'button-color': settings.buttonColor || '#6366f1',
                title: settings.title || '',
                description: settings.description || '',
                'button-text': settings.buttonText || 'Take Survey',
                trigger: settings.triggerType || 'time',
                'trigger-value': String(settings.triggerValue || 5),
              }
              const params = new URLSearchParams(paramsObj)
              window.open(`/widget-preview?${params.toString()}&device=mobile`, '_blank')
            }}
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
