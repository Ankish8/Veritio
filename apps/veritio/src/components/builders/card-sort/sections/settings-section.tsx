'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, Video } from 'lucide-react'
import { useCardSortSettings, useCardSortActions } from '@/stores/study-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import type { CardSortSettings } from '@veritio/study-types'

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

export function SettingsSection() {
  const settings = useCardSortSettings()
  const { setSettings } = useCardSortActions()
  const { meta, updateSessionRecordingSettings } = useStudyMetaStore()

  return (
    <aside className="space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">Sort Mode</Label>
        <RadioGroup
          value={settings.mode}
          onValueChange={(value) => setSettings({ mode: value as CardSortSettings['mode'] })}
          className="space-y-2"
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
                    <TooltipContent side="right" className="max-w-xs">
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

      <div className="space-y-3 rounded-lg bg-muted/40 p-4">
        <Label className="text-base font-semibold">Options</Label>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="randomize" className="text-sm font-normal">Shuffle cards</Label>
              <p className="text-xs text-muted-foreground">Randomize order for each participant</p>
            </div>
            <Switch
              id="randomize"
              checked={settings.randomizeCards}
              onCheckedChange={(checked) => setSettings({ randomizeCards: checked })}
            />
          </div>
          {settings.mode !== 'open' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="randomize-cats" className="text-sm font-normal">Shuffle categories</Label>
                <p className="text-xs text-muted-foreground">Randomize order for each participant</p>
              </div>
              <Switch
                id="randomize-cats"
                checked={settings.randomizeCategories}
                onCheckedChange={(checked) => setSettings({ randomizeCategories: checked })}
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="progress" className="text-sm font-normal">Show progress</Label>
              <p className="text-xs text-muted-foreground">Display cards remaining</p>
            </div>
            <Switch
              id="progress"
              checked={settings.showProgress}
              onCheckedChange={(checked) => setSettings({ showProgress: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="skip" className="text-sm font-normal">Allow skipping</Label>
              <p className="text-xs text-muted-foreground">Submit without sorting all cards</p>
            </div>
            <Switch
              id="skip"
              checked={settings.allowSkip}
              onCheckedChange={(checked) => setSettings({ allowSkip: checked })}
            />
          </div>
          {settings.mode !== 'open' && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="unclear-category" className="text-sm font-normal">Include unclear category</Label>
                <p className="text-xs text-muted-foreground">For confusing cards</p>
              </div>
              <Switch
                id="unclear-category"
                checked={settings.includeUnclearCategory ?? false}
                onCheckedChange={(checked) => setSettings({ includeUnclearCategory: checked })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-muted/40 p-4">
        <Label className="text-base font-semibold">Recording</Label>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <div className="space-y-0.5">
              <Label htmlFor="session-recording" className="text-sm font-normal">Session recording</Label>
              <p className="text-xs text-muted-foreground">Record audio for think-aloud analysis</p>
            </div>
          </div>
          <Switch
            id="session-recording"
            checked={meta.sessionRecordingSettings.enabled}
            onCheckedChange={(checked) => updateSessionRecordingSettings({ enabled: checked })}
          />
        </div>
      </div>
    </aside>
  )
}
