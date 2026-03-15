'use client'

import { useFirstClickSettings, useFirstClickActions } from '@/stores/study-builder'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { SettingToggle, SettingRadioGroup } from '@/components/builders/shared/settings'

const imageScalingOptions = [
  {
    value: 'scale_on_small' as const,
    label: 'Scale on small screens',
    description: 'Images are fixed on larger screens, and scale to fit on screens < 768px wide',
  },
  {
    value: 'fit' as const,
    label: 'Scale to fit',
    description: 'Images scale to fit screens smaller than the full size of the image',
  },
  {
    value: 'never_scale' as const,
    label: 'Never scale',
    description: 'Images are displayed full size and overflow on smaller screens',
  },
]

const taskFeedbackPageModeOptions = [
  { value: 'all_on_one' as const, label: 'All questions on one page' },
  { value: 'one_per_page' as const, label: 'One question per page' },
]

export function SettingsPanel() {
  const settings = useFirstClickSettings()
  const { setSettings } = useFirstClickActions()

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Task Options Section */}
        <div>
          <h3 className="font-semibold mb-4">Task Options</h3>
          <div className="space-y-4">
            <SettingToggle
              id="allow-skip"
              label="Allow participants to skip tasks"
              description="Show 'Skip this task' link during study"
              checked={settings.allowSkipTasks ?? true}
              onCheckedChange={(checked) => setSettings({ allowSkipTasks: checked })}
            />

            <SettingToggle
              id="start-immediately"
              label="Start tasks immediately"
              description="Skip the 'Start task' button"
              checked={settings.startTasksImmediately ?? false}
              onCheckedChange={(checked) => setSettings({ startTasksImmediately: checked })}
            />

            <SettingToggle
              id="randomize"
              label="Randomize task order"
              description="Show tasks in random order for each participant"
              checked={settings.randomizeTasks ?? true}
              onCheckedChange={(checked) => setSettings({ randomizeTasks: checked })}
            />

            <SettingToggle
              id="keep-first"
              label="Don't randomize the first task"
              description="Always show the first task first"
              when={settings.randomizeTasks}
              checked={settings.dontRandomizeFirstTask ?? true}
              onCheckedChange={(checked) => setSettings({ dontRandomizeFirstTask: checked })}
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

        {/* Image Options Section */}
        <div>
          <h3 className="font-semibold mb-4">Image Options</h3>
          <SettingRadioGroup
            label="Image scaling"
            options={imageScalingOptions}
            value={settings.imageScaling || 'scale_on_small'}
            onValueChange={(value) => setSettings({ imageScaling: value })}
          />
        </div>

        <Separator />

        {/* Task Feedback Options */}
        <div>
          <h3 className="font-semibold mb-4">Task Feedback</h3>
          <SettingRadioGroup
            label="Post-task questions display"
            description="How to show feedback questions after each task"
            options={taskFeedbackPageModeOptions}
            value={settings.taskFeedbackPageMode ?? 'all_on_one'}
            onValueChange={(value) =>
              setSettings({ taskFeedbackPageMode: value as 'one_per_page' | 'all_on_one' })
            }
          />
        </div>
      </div>
    </ScrollArea>
  )
}
