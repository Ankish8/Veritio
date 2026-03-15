'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Settings2, Palette, Target, Database, Clock } from 'lucide-react'
import type { PanelWidgetConfig, PanelWidgetConfigData } from '@/lib/supabase/panel-types'
import { useUserPreferences } from '@/hooks/use-user-preferences'

interface WidgetConfigFormProps {
  config: PanelWidgetConfig | null
  onConfigChange: (updates: Partial<PanelWidgetConfigData>) => void
  onActiveStudyChange: (studyId: string | null) => void
  availableStudies: Array<{ id: string; title: string; study_type: string }>
}

export function WidgetConfigForm({
  config,
  onConfigChange,
  onActiveStudyChange,
  availableStudies,
}: WidgetConfigFormProps) {
  // Get user's branding colors for defaults
  const { preferences } = useUserPreferences()
  const userBranding = preferences?.studyDefaults?.branding

  const widgetConfig = (config?.config as PanelWidgetConfigData) || {
    enabled: false,
    position: 'bottom-right',
    triggerType: 'time_delay',
    triggerValue: 5,
    backgroundColor: userBranding?.backgroundColor || '#ffffff',
    textColor: '#1a1a1a',
    buttonColor: userBranding?.primaryColor || '#18181b',
    title: 'Help us improve!',
    description: 'Share your feedback to help us improve.',
    buttonText: 'Get Started',
    captureSettings: {
      collectEmail: true,
      collectDemographics: true,
      demographicFields: ['country', 'age_range'],
    },
    frequencyCapping: {
      enabled: true,
      maxImpressions: 3,
      timeWindow: 'day',
    },
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card className="border-purple-100/50 bg-gradient-to-br from-white to-purple-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-base">Basic Settings</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="widget-enabled" className="text-sm font-medium">
                Enable Widget
              </Label>
              <p className="text-xs text-muted-foreground">
                Show the widget on your website
              </p>
            </div>
            <Switch
              id="widget-enabled"
              checked={widgetConfig.enabled}
              onCheckedChange={(checked) => onConfigChange({ enabled: checked })}
            />
          </div>

          <Separator />

          {/* Active Study */}
          <div className="space-y-2">
            <Label htmlFor="active-study">Active Study</Label>
            <Select
              value={config?.active_study_id || 'none'}
              onValueChange={(value) => onActiveStudyChange(value === 'none' ? null : value)}
            >
              <SelectTrigger id="active-study">
                <SelectValue placeholder="Select a study" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No study selected</SelectItem>
                {availableStudies.map((study) => (
                  <SelectItem key={study.id} value={study.id}>
                    {study.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Participants captured by the widget will be invited to this study
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Settings */}
      <Card className="border-violet-100/50 bg-gradient-to-br from-white to-violet-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-base">Trigger Conditions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Trigger Type */}
          <div className="space-y-2">
            <Label htmlFor="trigger-type">Trigger Type</Label>
            <Select
              value={widgetConfig.triggerType}
              onValueChange={(value: string) => onConfigChange({ triggerType: value as PanelWidgetConfigData['triggerType'] })}
            >
              <SelectTrigger id="trigger-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time_delay">Time Delay</SelectItem>
                <SelectItem value="scroll_percentage">Scroll Percentage</SelectItem>
                <SelectItem value="exit_intent">Exit Intent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Trigger Value */}
          {widgetConfig.triggerType !== 'exit_intent' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="trigger-value">
                  {widgetConfig.triggerType === 'time_delay' ? 'Delay (seconds)' : 'Scroll (%)'}
                </Label>
                <Badge variant="secondary" className="font-mono">
                  {widgetConfig.triggerValue}
                  {widgetConfig.triggerType === 'scroll_percentage' && '%'}
                </Badge>
              </div>
              <Slider
                id="trigger-value"
                min={widgetConfig.triggerType === 'time_delay' ? 0 : 0}
                max={widgetConfig.triggerType === 'time_delay' ? 60 : 100}
                step={widgetConfig.triggerType === 'time_delay' ? 1 : 5}
                value={[widgetConfig.triggerValue]}
                onValueChange={([value]) => onConfigChange({ triggerValue: value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-pink-100/50 bg-gradient-to-br from-white to-pink-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-pink-600" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Position */}
          <div className="space-y-2">
            <Label htmlFor="position">Position</Label>
            <Select
              value={widgetConfig.position}
              onValueChange={(value: string) => onConfigChange({ position: value as PanelWidgetConfigData['position'] })}
            >
              <SelectTrigger id="position">
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

          {/* Brand Color */}
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium">Brand Color</Label>
            {userBranding && (
              <button
                type="button"
                onClick={() => onConfigChange({
                  buttonColor: userBranding.primaryColor || '#18181b',
                })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Reset to branding
              </button>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="button-color" className="text-xs">
              Button Color
            </Label>
            <div className="flex gap-2">
              <Input
                id="button-color"
                type="color"
                value={widgetConfig.buttonColor}
                onChange={(e) => onConfigChange({ buttonColor: e.target.value })}
                className="w-14 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={widgetConfig.buttonColor}
                onChange={(e) => onConfigChange({ buttonColor: e.target.value })}
                className="flex-1 font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Used for the CTA button. Other colors are set automatically for optimal contrast.
            </p>
          </div>

          <Separator />

          {/* Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={widgetConfig.title}
                onChange={(e) => onConfigChange({ title: e.target.value })}
                placeholder="Help us improve!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={widgetConfig.description}
                onChange={(e) => onConfigChange({ description: e.target.value })}
                placeholder="Share your feedback..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="button-text">Button Text</Label>
              <Input
                id="button-text"
                value={widgetConfig.buttonText}
                onChange={(e) => onConfigChange({ buttonText: e.target.value })}
                placeholder="Get Started"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incentive-text">
                Incentive Text{' '}
                <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              </Label>
              <Input
                id="incentive-text"
                value={widgetConfig.incentiveText || ''}
                onChange={(e) => onConfigChange({ incentiveText: e.target.value || undefined })}
                placeholder="Earn {incentive} for your feedback"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{'{incentive}'}</code> to show the
                configured incentive amount (e.g., "$90 Gift Card")
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Capture Settings */}
      <Card className="border-blue-100/50 bg-gradient-to-br from-white to-blue-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base">Data Capture</CardTitle>
          </div>
          <CardDescription>Configure what information to collect from participants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">Always collected for panel identification</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Required
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="collect-demo" className="text-sm font-medium">
                Collect Demographics
              </Label>
              <p className="text-xs text-muted-foreground">Ask for additional profile information</p>
            </div>
            <Switch
              id="collect-demo"
              checked={widgetConfig.captureSettings.collectDemographics}
              onCheckedChange={(checked) =>
                onConfigChange({
                  captureSettings: { ...widgetConfig.captureSettings, collectDemographics: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Frequency Capping */}
      <Card className="border-amber-100/50 bg-gradient-to-br from-white to-amber-50/10">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Frequency Capping</CardTitle>
          </div>
          <CardDescription>Limit how often the widget appears to the same visitor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="freq-enabled" className="text-sm font-medium">
              Enable Frequency Capping
            </Label>
            <Switch
              id="freq-enabled"
              checked={widgetConfig.frequencyCapping.enabled}
              onCheckedChange={(checked) =>
                onConfigChange({
                  frequencyCapping: { ...widgetConfig.frequencyCapping, enabled: checked },
                })
              }
            />
          </div>

          {widgetConfig.frequencyCapping.enabled && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-impressions" className="text-sm">
                    Max Impressions
                  </Label>
                  <Badge variant="secondary" className="font-mono">
                    {widgetConfig.frequencyCapping.maxImpressions}
                  </Badge>
                </div>
                <Slider
                  id="max-impressions"
                  min={1}
                  max={10}
                  step={1}
                  value={[widgetConfig.frequencyCapping.maxImpressions]}
                  onValueChange={([value]) =>
                    onConfigChange({
                      frequencyCapping: { ...widgetConfig.frequencyCapping, maxImpressions: value },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time-window" className="text-sm">
                  Time Window
                </Label>
                <Select
                  value={widgetConfig.frequencyCapping.timeWindow}
                  onValueChange={(value: string) =>
                    onConfigChange({
                      frequencyCapping: { ...widgetConfig.frequencyCapping, timeWindow: value as 'day' | 'week' | 'month' | 'forever' },
                    })
                  }
                >
                  <SelectTrigger id="time-window">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Per Day</SelectItem>
                    <SelectItem value="week">Per Week</SelectItem>
                    <SelectItem value="month">Per Month</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
