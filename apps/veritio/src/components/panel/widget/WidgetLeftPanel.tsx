'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StudySelector } from './study-selector'
import { Copy, Check, MessageSquare, AlignJustify, Square, ArrowRight, Tag, Info, Gift } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type {
  PanelWidgetConfigData,
  PanelWidgetConfig,
  WidgetStyle,
  WidgetAnimation,
  BannerPosition,
  SlideDirection,
  BadgePosition,
  WidgetDemographicField,
  StudyIncentiveConfig,
  Currency,
  IncentiveType,
} from '@/lib/supabase/panel-types'
import { isWidgetDemographicFieldArray } from '@/lib/supabase/panel-types'
import { WidgetDemographicFieldPicker } from './widget-demographic-field-picker'

interface Study {
  id: string
  title: string
  status: string
  study_type: string
}

interface WidgetLeftPanelProps {
  config: PanelWidgetConfig | null
  widgetConfig: PanelWidgetConfigData
  studies: Study[]
  embedCode: string | null
  copied: boolean
  titleInput: { value: string; setValue: (v: string) => void; handleBlur: () => void }
  descriptionInput: { value: string; setValue: (v: string) => void; handleBlur: () => void }
  buttonTextInput: { value: string; setValue: (v: string) => void; handleBlur: () => void }
  submitButtonTextInput: { value: string; setValue: (v: string) => void; handleBlur: () => void }
  participantUrl?: string
  branding?: { themeMode: string; primaryColor: string; radiusOption: string }
  onConfigChange: (updates: Partial<PanelWidgetConfigData>) => void
  onActiveStudyChange: (studyId: string | null) => void
  onCopyCode: () => void
  incentiveConfig?: StudyIncentiveConfig | null
  onIncentiveConfigChange?: (updates: Partial<StudyIncentiveConfig>) => Promise<StudyIncentiveConfig>
}

// Currency options
const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'EUR', label: 'EUR', symbol: '€' },
  { value: 'GBP', label: 'GBP', symbol: '£' },
  { value: 'CAD', label: 'CAD', symbol: 'C$' },
  { value: 'AUD', label: 'AUD', symbol: 'A$' },
]

// Incentive type options
const INCENTIVE_TYPE_OPTIONS: { value: IncentiveType; label: string }[] = [
  { value: 'gift_card', label: 'Gift Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'credit', label: 'Credit' },
  { value: 'donation', label: 'Donation' },
  { value: 'other', label: 'Other' },
]

// Context-aware position options based on widget style
const POSITION_OPTIONS_BY_STYLE = {
  popup: [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
  ],
  modal: [
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-left', label: 'Top Left' },
  ],
  banner: [
    { value: 'top', label: 'Top' },
    { value: 'bottom', label: 'Bottom' },
  ],
  drawer: [
    { value: 'left', label: 'From Left' },
    { value: 'right', label: 'From Right' },
  ],
  badge: [
    { value: 'left', label: 'Left Edge' },
    { value: 'right', label: 'Right Edge' },
  ],
} as const

const TRIGGER_OPTIONS = [
  { value: 'time_delay', label: 'Time Delay', unit: 'seconds' },
  { value: 'scroll_percentage', label: 'Scroll Percentage', unit: '%' },
  { value: 'exit_intent', label: 'Exit Intent', unit: null },
] as const

// Helper to get current position value based on widget style
function getCurrentPositionValue(widgetConfig: PanelWidgetConfigData): string {
  const style = widgetConfig.widgetStyle || 'popup'
  switch (style) {
    case 'banner':
      return widgetConfig.bannerPosition || 'bottom'
    case 'drawer':
      return widgetConfig.slideDirection || 'right'
    case 'badge':
      return widgetConfig.badgePosition || 'right'
    default:
      return widgetConfig.position || 'bottom-right'
  }
}

// Helper to create position update based on widget style
function createPositionUpdate(style: WidgetStyle, value: string): Partial<PanelWidgetConfigData> {
  switch (style) {
    case 'banner':
      return { bannerPosition: value as BannerPosition }
    case 'drawer':
      return { slideDirection: value as SlideDirection }
    case 'badge':
      return { badgePosition: value as BadgePosition }
    default:
      return { position: value as PanelWidgetConfigData['position'] }
  }
}

const WIDGET_STYLES = [
  { value: 'popup' as const, label: 'Popup', Icon: MessageSquare },
  { value: 'banner' as const, label: 'Banner', Icon: AlignJustify },
  { value: 'modal' as const, label: 'Modal', Icon: Square },
  { value: 'drawer' as const, label: 'Drawer', Icon: ArrowRight },
  { value: 'badge' as const, label: 'Badge', Icon: Tag },
]

const ANIMATIONS = [
  { value: 'fade' as const, label: 'Fade' },
  { value: 'slide' as const, label: 'Slide' },
  { value: 'zoom' as const, label: 'Zoom' },
  { value: 'bounce' as const, label: 'Bounce' },
]

export function WidgetLeftPanel({
  config,
  widgetConfig,
  studies,
  embedCode,
  copied,
  titleInput,
  descriptionInput,
  buttonTextInput,
  submitButtonTextInput,
  onConfigChange,
  onActiveStudyChange,
  onCopyCode,
  incentiveConfig,
  onIncentiveConfigChange,
}: WidgetLeftPanelProps) {
  const currentTrigger = TRIGGER_OPTIONS.find((t) => t.value === widgetConfig.triggerType)
  const currentStyle = WIDGET_STYLES.find((s) => s.value === (widgetConfig.widgetStyle || 'popup')) || WIDGET_STYLES[0]

  return (
    <div className="w-[340px] min-w-[340px] flex-shrink-0 overflow-y-auto overflow-x-hidden">
      <div className="space-y-4 pr-2">
        {/* Active Study */}
        <StudySelector
          studies={studies}
          selectedStudyId={config?.active_study_id ?? null}
          onStudyChange={onActiveStudyChange}
        />

        {/* Divider */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-foreground">Widget Settings</h3>
        </div>

        {/* Style & Animation - Side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm">Style</Label>
            <Select
              value={widgetConfig.widgetStyle || 'popup'}
              onValueChange={(value: WidgetStyle) => onConfigChange({ widgetStyle: value })}
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
                {WIDGET_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    <div className="flex items-center gap-2">
                      <style.Icon className="h-3.5 w-3.5" />
                      <span>{style.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">Animation</Label>
            <Select
              value={widgetConfig.animation || 'fade'}
              onValueChange={(value: WidgetAnimation) => onConfigChange({ animation: value })}
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

        {/* Position & Trigger - Position options are context-aware based on widget style */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">Position & Trigger</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm">Position</Label>
              <Select
                value={getCurrentPositionValue(widgetConfig)}
                onValueChange={(value: string) =>
                  onConfigChange(createPositionUpdate(widgetConfig.widgetStyle || 'popup', value))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS_BY_STYLE[widgetConfig.widgetStyle || 'popup'].map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Trigger</Label>
              <Select
                value={widgetConfig.triggerType}
                onValueChange={(value: typeof widgetConfig.triggerType) =>
                  onConfigChange({ triggerType: value })
                }
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
              <Label className="text-sm">Value ({currentTrigger.unit})</Label>
              <Input
                type="number"
                min={1}
                max={currentTrigger.value === 'scroll_percentage' ? 100 : 60}
                value={widgetConfig.triggerValue || ''}
                onChange={(e) => onConfigChange({ triggerValue: parseInt(e.target.value) || 5 })}
                placeholder={currentTrigger.value === 'time_delay' ? '5' : '50'}
                className="h-9"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium text-muted-foreground">Content</Label>
            {widgetConfig.copyPersonalization?.variables?.enabled && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-primary hover:text-primary/80">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs p-3">
                    <p className="font-semibold text-sm mb-2">Variable Substitution Enabled</p>
                    <p className="text-sm opacity-80 mb-3">Use these in your text:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-3">
                        <code className="font-mono font-semibold bg-white/20 px-2 py-1 rounded">{'{page_title}'}</code>
                        <span>Page title</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <code className="font-mono font-semibold bg-white/20 px-2 py-1 rounded">{'{site_name}'}</code>
                        <span>Hostname</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <code className="font-mono font-semibold bg-white/20 px-2 py-1 rounded">{'{url}'}</code>
                        <span>URL path</span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Title</Label>
              <Input
                value={titleInput.value}
                onChange={(e) => titleInput.setValue(e.target.value)}
                onBlur={titleInput.handleBlur}
                placeholder={widgetConfig.copyPersonalization?.variables?.enabled ? "Feedback on {page_title}" : "Help us improve!"}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description</Label>
              <Textarea
                value={descriptionInput.value}
                onChange={(e) => descriptionInput.setValue(e.target.value)}
                onBlur={descriptionInput.handleBlur}
                placeholder={widgetConfig.copyPersonalization?.variables?.enabled ? "Help us improve {site_name}" : "Take a quick survey and share your feedback."}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Button Text</Label>
              <Input
                value={buttonTextInput.value}
                onChange={(e) => buttonTextInput.setValue(e.target.value)}
                onBlur={buttonTextInput.handleBlur}
                placeholder="Take Survey"
                className="h-9"
              />
            </div>
          </div>
        </div>

        {/* Data Collection - Core Panel Feature */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-sm font-medium text-muted-foreground">Data Collection</Label>

          {/* Email - Always required */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Collect Email</Label>
              <p className="text-sm text-muted-foreground">Required for panel</p>
            </div>
            <Switch checked disabled />
          </div>

          {/* Demographics */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Collect Demographics</Label>
              <p className="text-sm text-muted-foreground">Additional profile info</p>
            </div>
            <Switch
              checked={widgetConfig.captureSettings?.collectDemographics ?? false}
              onCheckedChange={(checked) =>
                onConfigChange({
                  captureSettings: { ...widgetConfig.captureSettings, collectDemographics: checked },
                })
              }
            />
          </div>

          {widgetConfig.captureSettings?.collectDemographics && (
            <div className="ml-1">
              <WidgetDemographicFieldPicker
                fields={
                  isWidgetDemographicFieldArray(widgetConfig.captureSettings?.demographicFields || [])
                    ? (widgetConfig.captureSettings?.demographicFields as WidgetDemographicField[])
                    : [] // Start fresh with new format
                }
                widgetStyle={widgetConfig.widgetStyle}
                onChange={(fields) =>
                  onConfigChange({
                    captureSettings: {
                      ...widgetConfig.captureSettings,
                      demographicFields: fields,
                    },
                  })
                }
              />
            </div>
          )}

          {/* Submit Button Text - shown on form completion */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-sm">Submit Button Text</Label>
            <Input
              value={submitButtonTextInput.value}
              onChange={(e) => submitButtonTextInput.setValue(e.target.value)}
              onBlur={submitButtonTextInput.handleBlur}
              placeholder="Start Survey"
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Button shown after user fills the form
            </p>
          </div>
        </div>

        {/* Incentives - only show when there's an active study */}
        {config?.active_study_id && onIncentiveConfigChange && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-emerald-600" />
              <Label className="text-sm font-medium text-muted-foreground">Incentives</Label>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Enable Incentives</Label>
                <p className="text-sm text-muted-foreground">Reward participants</p>
              </div>
              <Switch
                checked={incentiveConfig?.enabled ?? false}
                onCheckedChange={(checked) => onIncentiveConfigChange({ enabled: checked })}
              />
            </div>

            {/* Incentive Details - only show when enabled */}
            {incentiveConfig?.enabled && (
              <div className="space-y-3 pl-1">
                {/* Amount & Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm">Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        {CURRENCY_OPTIONS.find(c => c.value === (incentiveConfig?.currency || 'USD'))?.symbol || '$'}
                      </span>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={incentiveConfig?.amount ?? ''}
                        onChange={(e) => onIncentiveConfigChange({ amount: parseFloat(e.target.value) || null })}
                        placeholder="0"
                        className="h-9 pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">Currency</Label>
                    <Select
                      value={incentiveConfig?.currency || 'USD'}
                      onValueChange={(value: Currency) => onIncentiveConfigChange({ currency: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} ({opt.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Incentive Type */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Type</Label>
                  <Select
                    value={incentiveConfig?.incentive_type || 'gift_card'}
                    onValueChange={(value: IncentiveType) => onIncentiveConfigChange({ incentive_type: value })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INCENTIVE_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-sm">Description (optional)</Label>
                  <Input
                    value={incentiveConfig?.description ?? ''}
                    onChange={(e) => onIncentiveConfigChange({ description: e.target.value || null })}
                    placeholder="How participants will receive reward"
                    className="h-9"
                    maxLength={255}
                  />
                </div>

                {/* Info Box */}
                <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  When participants complete the study via widget, an incentive record will be created in your Panel.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Embed Code */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">Embed Code</Label>
          <p className="text-sm text-muted-foreground">
            Paste this code snippet before the closing &lt;/body&gt; tag on your website.
          </p>
          <div className="relative">
            <pre className="bg-muted p-3 rounded-md text-xs overflow-x-auto max-h-32 font-mono">
              <code>{embedCode || '<!-- Loading embed code... -->'}</code>
            </pre>
            <Button
              variant="secondary"
              size="sm"
              onClick={onCopyCode}
              disabled={!embedCode}
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

        </div>
      </div>
    </div>
  )
}
