'use client'

import { useState } from 'react'
import { Monitor, Smartphone, ChevronRight } from 'lucide-react'
import { useLiveWebsiteSettings, useLiveWebsiteActions } from '@/stores/study-builder'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { SettingToggle, SettingSelect } from '@/components/builders/shared/settings'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DEFAULT_THINK_ALOUD, DEFAULT_EYE_TRACKING } from '@/components/builders/shared/types'

export function SettingsPanel() {
  const settings = useLiveWebsiteSettings()
  const { setSettings } = useLiveWebsiteActions()
  const isLinkOnly = settings.mode === 'url_only'
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const thinkAloud = settings.thinkAloud ?? DEFAULT_THINK_ALOUD
  const _eyeTracking = settings.eyeTracking ?? DEFAULT_EYE_TRACKING
  const hasAudioCapture = settings.recordMicrophone ?? true
  const _hasWebcam = settings.recordWebcam ?? false

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Recording Section */}
        <div>
          <h3 className="font-semibold mb-4">Recording</h3>
          <div className="space-y-4">
            <SettingToggle
              id="record-screen"
              label="Screen recording"
              description="Record the participant's screen while they complete tasks"
              checked={settings.recordScreen}
              onCheckedChange={(checked) => setSettings({ recordScreen: checked })}
            />

            <SettingToggle
              id="record-webcam"
              label="Webcam recording"
              description="Record participant's face via webcam for think-aloud analysis"
              checked={settings.recordWebcam}
              onCheckedChange={(checked) => setSettings({ recordWebcam: checked })}
            />

            <SettingToggle
              id="record-microphone"
              label="Microphone recording"
              description="Record participant's voice for think-aloud analysis"
              checked={settings.recordMicrophone ?? true}
              onCheckedChange={(checked) => setSettings({ recordMicrophone: checked })}
            />

          </div>
        </div>

        {/* Think-Aloud Protocol */}
        {hasAudioCapture && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4">Think-Aloud Protocol</h3>
              <div className="space-y-4">
                <SettingToggle
                  id="think-aloud-enabled"
                  label="Enable think-aloud prompts"
                  description="Automatically prompt participants to share their thoughts when silence is detected"
                  tooltip={`Prompts appear after ${thinkAloud.silenceThresholdSeconds}s of silence and rotate through encouraging messages like "What are you thinking right now?"`}
                  checked={thinkAloud.enabled}
                  onCheckedChange={(enabled) =>
                    setSettings({ thinkAloud: { ...thinkAloud, enabled } })
                  }
                />

                {thinkAloud.enabled && (
                  <SettingToggle
                    id="think-aloud-education"
                    label="Show education screen"
                    description="Brief tutorial on how to think aloud before tasks start"
                    checked={thinkAloud.showEducation}
                    onCheckedChange={(showEducation) =>
                      setSettings({ thinkAloud: { ...thinkAloud, showEducation } })
                    }
                  />
                )}
              </div>
            </div>
          </>
        )}

        {/* Eye Tracking — disabled for now, implementation in progress.
           See docs/plans/eye-tracking.md for status and next steps.
        {hasWebcam && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4">Eye Tracking</h3>
              <div className="space-y-4">
                <SettingToggle
                  id="eye-tracking-enabled"
                  label="Enable eye tracking"
                  description="Track where participants look on the page using their webcam"
                  tooltip="Uses WebGazer.js to estimate gaze position from the webcam feed. The video is only used for gaze detection and is never stored."
                  checked={eyeTracking.enabled}
                  onCheckedChange={(enabled) =>
                    setSettings({ eyeTracking: { ...eyeTracking, enabled } })
                  }
                />

                {eyeTracking.enabled && (
                  <SettingToggle
                    id="eye-tracking-calibration"
                    label="Show calibration screen"
                    description="Guide participants through a 9-point calibration before tasks start"
                    checked={eyeTracking.showCalibration}
                    onCheckedChange={(showCalibration) =>
                      setSettings({ eyeTracking: { ...eyeTracking, showCalibration } })
                    }
                  />
                )}
              </div>
            </div>
          </>
        )}
        */}

        {/* Task Widget (hidden for Link Only) */}
        {!isLinkOnly && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4">Task Widget</h3>
              <div className="space-y-4">
                <SettingSelect
                  id="widget-position"
                  label="Widget position"
                  description="Where the task widget appears on the participant's screen"
                  value={settings.widgetPosition ?? 'bottom-right'}
                  onValueChange={(value) => setSettings({ widgetPosition: value as 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' })}
                  options={[
                    { value: 'bottom-right', label: 'Bottom Right' },
                    { value: 'bottom-left', label: 'Bottom Left' },
                    { value: 'top-right', label: 'Top Right' },
                    { value: 'top-left', label: 'Top Left' },
                  ]}
                />

                <SettingToggle
                  id="block-before-start"
                  label="Block page before task starts"
                  description="Show an overlay preventing interaction until the participant starts the task"
                  checked={settings.blockBeforeStart ?? true}
                  onCheckedChange={(checked) => setSettings({ blockBeforeStart: checked })}
                />
              </div>
            </div>
          </>
        )}

        {/* Advanced (collapsed) */}
        <Separator />
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between py-1 group">
            <h3 className="font-semibold">Advanced</h3>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-6">
            {/* Task Options */}
            <div>
              <h4 className="text-sm font-medium mb-3">Task Options</h4>
              <div className="space-y-4">
                <SettingToggle
                  id="allow-skip"
                  label="Allow participants to skip tasks"
                  description="Show 'Skip this task' link during study"
                  checked={settings.allowSkipTasks ?? true}
                  onCheckedChange={(checked) => setSettings({ allowSkipTasks: checked })}
                />

                <SettingToggle
                  id="show-progress"
                  label="Show task progress"
                  description="Display 'Task 1 of 5' indicator"
                  checked={settings.showTaskProgress ?? true}
                  onCheckedChange={(checked) => setSettings({ showTaskProgress: checked })}
                />
              </div>
            </div>

            <Separator />

            {/* Completion Behavior */}
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Completion Behavior</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="completion-button-text" className="text-sm font-normal">
                    Completion button label
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Text shown on the task completion button.
                  </p>
                  <Input
                    id="completion-button-text"
                    type="text"
                    placeholder="I completed this task"
                    value={settings.completionButtonText ?? 'I completed this task'}
                    onChange={(e) => {
                      setSettings({
                        completionButtonText: e.target.value || 'I completed this task',
                      })
                    }}
                    className="w-64"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Time Limit */}
            <div>
              <h4 className="text-sm font-medium mb-3">Time Limit</h4>
              <div className="space-y-2">
                <Label htmlFor="default-time-limit" className="text-sm font-normal">
                  Default time limit per task (seconds)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Leave empty for no time limit. Individual tasks can override this.
                </p>
                <Input
                  id="default-time-limit"
                  type="number"
                  min={0}
                  placeholder="No limit"
                  value={settings.defaultTimeLimitSeconds ?? ''}
                  onChange={(e) => {
                    const val = e.target.value
                    setSettings({
                      defaultTimeLimitSeconds: val ? parseInt(val, 10) : null,
                    })
                  }}
                  className="w-32"
                />
              </div>
            </div>

            <Separator />

            {/* Device Access */}
            <div>
              <h4 className="text-sm font-medium mb-1">Device Access</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Control which devices can take the test.
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Desktop</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">Always</Badge>
                </div>
                <div
                  className="flex items-center justify-between rounded-md border px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSettings({ allowMobile: !settings.allowMobile })}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Mobile</span>
                  </div>
                  <Badge
                    variant={settings.allowMobile ? 'secondary' : 'outline'}
                    className="text-xs"
                  >
                    {settings.allowMobile ? 'Allowed' : 'Blocked'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Tracking (hidden for Link Only) */}
            {!isLinkOnly && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium mb-3">Tracking</h4>
                  <div className="space-y-4">
                    <SettingToggle
                      id="track-clicks"
                      label="Click tracking"
                      description="Capture click positions and elements for heatmap analysis"
                      checked={settings.trackClickEvents ?? true}
                      onCheckedChange={(checked) => setSettings({ trackClickEvents: checked })}
                    />

                    <SettingToggle
                      id="track-scroll"
                      label="Scroll depth"
                      description="Track how far participants scroll on each page"
                      checked={settings.trackScrollDepth ?? true}
                      onCheckedChange={(checked) => setSettings({ trackScrollDepth: checked })}
                    />
                  </div>
                </div>
              </>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  )
}
