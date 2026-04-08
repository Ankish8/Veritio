'use client'

import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle } from 'lucide-react'
import { useCardSortSettings, useCardSortActions } from '@/stores/study-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { SettingToggle } from '@/components/builders/shared/settings'
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

  const showCategoryOptions = settings.mode !== 'open'

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
          <SettingToggle
            id="randomize"
            label="Shuffle cards"
            description="Randomize order for each participant"
            checked={settings.randomizeCards}
            onCheckedChange={(checked) => setSettings({ randomizeCards: checked })}
          />
          <SettingToggle
            id="randomize-cats"
            label="Shuffle categories"
            description="Randomize order for each participant"
            checked={settings.randomizeCategories}
            onCheckedChange={(checked) => setSettings({ randomizeCategories: checked })}
            when={showCategoryOptions}
          />
          <SettingToggle
            id="progress"
            label="Show progress"
            description="Display cards remaining"
            checked={settings.showProgress}
            onCheckedChange={(checked) => setSettings({ showProgress: checked })}
          />
          <SettingToggle
            id="skip"
            label="Allow skipping"
            description="Submit without sorting all cards"
            checked={settings.allowSkip}
            onCheckedChange={(checked) => setSettings({ allowSkip: checked })}
          />
          <SettingToggle
            id="unclear-category"
            label="Include unclear category"
            description="For confusing cards"
            checked={settings.includeUnclearCategory ?? false}
            onCheckedChange={(checked) => setSettings({ includeUnclearCategory: checked })}
            when={showCategoryOptions}
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg bg-muted/40 p-4">
        <Label className="text-base font-semibold">Recording</Label>
        <SettingToggle
          id="session-recording"
          label="Session recording"
          description="Record audio for think-aloud analysis"
          checked={meta.sessionRecordingSettings.enabled}
          onCheckedChange={(checked) => updateSessionRecordingSettings({ enabled: checked })}
        />
      </div>
    </aside>
  )
}
