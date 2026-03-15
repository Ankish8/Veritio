'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { HelpCircle, Video, Mic, Monitor, Camera } from 'lucide-react'
import { useCardSortSettings, useCardSortActions } from '@/stores/study-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import type { CardSortSettings } from '@veritio/study-types'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'
import { DEFAULT_THINK_ALOUD } from '@/components/builders/shared/types'

const captureModes: { value: RecordingCaptureMode; label: string; icon: React.ReactNode }[] = [
  { value: 'audio', label: 'Audio only', icon: <Mic className="h-4 w-4" /> },
  { value: 'screen_and_audio', label: 'Screen + Audio', icon: <Monitor className="h-4 w-4" /> },
  { value: 'video_and_audio', label: 'Screen + Audio + Webcam', icon: <Camera className="h-4 w-4" /> },
]

const sortModes: { value: CardSortSettings['mode']; label: string; description: string; tooltip: string }[] = [
  {
    value: 'open',
    label: 'Open Sort',
    description: 'Participants create their own categories',
    tooltip: 'Participants see all your cards and freely create their own custom categories to organize them. Use this when you want to discover how users naturally organize your content without any predefined structure.',
  },
  {
    value: 'closed',
    label: 'Closed Sort',
    description: 'Participants use only your predefined categories',
    tooltip: 'Participants drag cards into the categories you\'ve predefined. This is ideal for validating an existing information structure or testing whether your proposed navigation works for users.',
  },
  {
    value: 'hybrid',
    label: 'Hybrid Sort',
    description: 'Participants can use your categories or create new ones',
    tooltip: 'Participants can organize cards using your predefined categories OR create their own new ones. This is useful when you want validation of your structure while remaining open to discovering new organizational needs.',
  },
]

export function BuilderCardSortSettingsPanel() {
  const settings = useCardSortSettings()
  const { setSettings } = useCardSortActions()
  const { meta, updateSessionRecordingSettings } = useStudyMetaStore()

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Sort Mode Section */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Sort Mode
          </span>
          <RadioGroup
            value={settings.mode}
            onValueChange={(value) => setSettings({ mode: value as CardSortSettings['mode'] })}
            className="mt-3 space-y-2"
          >
            {sortModes.map((mode) => (
              <label
                key={mode.value}
                className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem value={mode.value} className="mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{mode.label}</span>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={`More information about ${mode.label}`}
                        >
                          <HelpCircle className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs">
                        {mode.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground">{mode.description}</p>
                </div>
              </label>
            ))}
          </RadioGroup>
        </div>

        {/* Options Section */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Options
          </span>

          <div className="mt-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="randomize-panel" className="text-sm font-normal">Shuffle cards</Label>
                <p className="text-xs text-muted-foreground">Randomize order for each participant</p>
              </div>
              <Switch
                id="randomize-panel"
                checked={settings.randomizeCards}
                onCheckedChange={(checked) => setSettings({ randomizeCards: checked })}
              />
            </div>

            {settings.mode !== 'open' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="randomize-cats-panel" className="text-sm font-normal">Shuffle categories</Label>
                  <p className="text-xs text-muted-foreground">Randomize order for each participant</p>
                </div>
                <Switch
                  id="randomize-cats-panel"
                  checked={settings.randomizeCategories}
                  onCheckedChange={(checked) => setSettings({ randomizeCategories: checked })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="progress-panel" className="text-sm font-normal">Show progress</Label>
                <p className="text-xs text-muted-foreground">Display cards remaining</p>
              </div>
              <Switch
                id="progress-panel"
                checked={settings.showProgress}
                onCheckedChange={(checked) => setSettings({ showProgress: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="skip-panel" className="text-sm font-normal">Allow skipping</Label>
                <p className="text-xs text-muted-foreground">Submit without sorting all cards</p>
              </div>
              <Switch
                id="skip-panel"
                checked={settings.allowSkip}
                onCheckedChange={(checked) => setSettings({ allowSkip: checked })}
              />
            </div>

            {settings.mode !== 'open' && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="unclear-category-panel" className="text-sm font-normal">Include unclear category</Label>
                  <p className="text-xs text-muted-foreground">For confusing cards</p>
                </div>
                <Switch
                  id="unclear-category-panel"
                  checked={settings.includeUnclearCategory ?? false}
                  onCheckedChange={(checked) => setSettings({ includeUnclearCategory: checked })}
                />
              </div>
            )}
          </div>
        </div>

        {/* Recording Section */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Recording
          </span>

          <div className="mt-3 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <div className="space-y-0.5">
                  <Label htmlFor="session-recording-panel" className="text-sm font-normal">Session recording</Label>
                  <p className="text-xs text-muted-foreground">Record for think-aloud analysis</p>
                </div>
              </div>
              <Switch
                id="session-recording-panel"
                checked={meta.sessionRecordingSettings.enabled}
                onCheckedChange={(checked) => updateSessionRecordingSettings({ enabled: checked })}
              />
            </div>

            {/* Capture Mode - shown when recording is enabled */}
            {meta.sessionRecordingSettings.enabled && (
              <div className="space-y-2 pl-6 border-l-2 border-muted">
                <Label className="text-xs text-muted-foreground">Capture mode</Label>
                <RadioGroup
                  value={meta.sessionRecordingSettings.captureMode}
                  onValueChange={(value) => updateSessionRecordingSettings({ captureMode: value as RecordingCaptureMode })}
                  className="space-y-1"
                >
                  {captureModes.map((mode) => (
                    <label
                      key={mode.value}
                      className="flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 has-[:checked]:bg-primary/5"
                    >
                      <RadioGroupItem value={mode.value} className="h-3.5 w-3.5" />
                      <span className="text-muted-foreground">{mode.icon}</span>
                      <span className="text-sm">{mode.label}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* Think-Aloud Prompts - shown when recording is enabled */}
            {meta.sessionRecordingSettings.enabled && (
              <div className="flex items-center justify-between pl-6 border-l-2 border-muted">
                <div className="space-y-0.5">
                  <Label htmlFor="think-aloud-panel" className="text-sm font-normal">Think-aloud prompts</Label>
                  <p className="text-xs text-muted-foreground">Prompt on silence</p>
                </div>
                <Switch
                  id="think-aloud-panel"
                  checked={meta.sessionRecordingSettings.thinkAloud?.enabled ?? false}
                  onCheckedChange={(checked) => {
                    const currentThinkAloud = meta.sessionRecordingSettings.thinkAloud ?? DEFAULT_THINK_ALOUD
                    updateSessionRecordingSettings({
                      thinkAloud: { ...currentThinkAloud, enabled: checked }
                    })
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
