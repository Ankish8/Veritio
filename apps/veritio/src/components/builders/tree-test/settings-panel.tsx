'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useTreeTestSettings, useTreeTestActions } from '@/stores/study-builder'
import { SettingToggle, SettingRadioGroup } from '@/components/builders/shared/settings'

const taskFeedbackPageModeOptions = [
  { value: 'all_on_one' as const, label: 'All questions on one page' },
  { value: 'one_per_page' as const, label: 'One question per page' },
]

export function SettingsPanel() {
  // Use granular selectors for performance
  const settings = useTreeTestSettings()
  const { setSettings } = useTreeTestActions()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <SettingToggle
          id="randomize-tasks"
          label="Randomize Tasks"
          description="Present tasks in a random order to each participant"
          checked={settings.randomizeTasks}
          onCheckedChange={(checked) => setSettings({ randomizeTasks: checked })}
        />

        <SettingToggle
          id="show-breadcrumbs"
          label="Show Breadcrumbs"
          description="Display navigation path while browsing the tree"
          checked={settings.showBreadcrumbs}
          onCheckedChange={(checked) => setSettings({ showBreadcrumbs: checked })}
        />

        <SettingToggle
          id="allow-back"
          label="Allow Back Navigation"
          description="Let participants go back to previous levels"
          checked={settings.allowBack}
          onCheckedChange={(checked) => setSettings({ allowBack: checked })}
        />

        <SettingToggle
          id="show-progress"
          label="Show Task Progress"
          description="Display &ldquo;Task X of Y&rdquo; indicator"
          checked={settings.showTaskProgress}
          onCheckedChange={(checked) => setSettings({ showTaskProgress: checked })}
        />

        <Separator />

        {/* Task Feedback Options */}
        <div>
          <h3 className="text-sm font-medium mb-4">Task Feedback</h3>
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
      </CardContent>
    </Card>
  )
}
