'use client'

import { Label, Switch, RadioGroup, RadioGroupItem, Separator } from '@veritio/ui'
import { Video, Mic, Monitor, Camera } from 'lucide-react'
import { SettingToggle, SettingSelect, SettingRadioGroup } from './shared/settings'
import { useStudyMetaStore } from '../stores/study-meta-store'
import type { PrototypeTestSettings } from '@veritio/study-types'
import type { RecordingCaptureMode } from './shared/types'
import { DEFAULT_THINK_ALOUD } from './shared/types'

const captureModes: { value: RecordingCaptureMode; label: string; icon: React.ReactNode }[] = [
  { value: 'audio', label: 'Audio only', icon: <Mic className="h-4 w-4" /> },
  { value: 'screen_and_audio', label: 'Screen + Audio', icon: <Monitor className="h-4 w-4" /> },
  { value: 'video_and_audio', label: 'Screen + Audio + Webcam', icon: <Camera className="h-4 w-4" /> },
]

const positionOptions = [
  { value: 'bottom-left' as const, label: 'Bottom Left' },
  { value: 'bottom-right' as const, label: 'Bottom Right' },
  { value: 'top-left' as const, label: 'Top Left' },
  { value: 'top-right' as const, label: 'Top Right' },
]

const taskFeedbackPageModeOptions = [
  { value: 'all_on_one' as const, label: 'All questions on one page' },
  { value: 'one_per_page' as const, label: 'One question per page' },
]

interface SettingsPanelProps {
  settings: PrototypeTestSettings
  onUpdate: (settings: Partial<PrototypeTestSettings>) => void
}

export function SettingsPanel({ settings, onUpdate }: SettingsPanelProps) {
  const { meta, updateSessionRecordingSettings } = useStudyMetaStore()

  return (
    <div className="space-y-6">
      {/* Task Options */}
      <div>
        <h3 className="text-sm font-medium mb-4">Task Options</h3>
        <div className="space-y-4">
          <SettingToggle
            id="randomize-tasks"
            label="Randomize task order"
            description="Present tasks in a random order for each participant"
            checked={settings.randomizeTasks ?? true}
            onCheckedChange={(checked) => onUpdate({ randomizeTasks: checked })}
          />

          <SettingToggle
            id="dont-randomize-first"
            label="Keep first task first"
            description="Always show the first task first (when randomizing)"
            checked={settings.dontRandomizeFirstTask ?? true}
            onCheckedChange={(checked) => onUpdate({ dontRandomizeFirstTask: checked })}
            when={settings.randomizeTasks ?? true}
          />

          <SettingToggle
            id="allow-skip"
            label="Allow skipping tasks"
            description="Let participants skip tasks they can't complete"
            checked={settings.allowSkipTasks ?? true}
            onCheckedChange={(checked) => onUpdate({ allowSkipTasks: checked })}
          />

          <SettingToggle
            id="allow-failure-response"
            label="Allow failure response"
            description="Let participants give up on tasks by clicking 'I'm stuck'"
            tooltip="When enabled, participants can click 'I'm stuck' if they cannot complete a task. This records a failure outcome with their navigation path, providing valuable data about where users get lost."
            checked={settings.allowFailureResponse ?? false}
            onCheckedChange={(checked) => onUpdate({ allowFailureResponse: checked })}
          />

          <SettingToggle
            id="show-progress"
            label="Show task progress"
            description="Display which task number participants are on"
            checked={settings.showTaskProgress ?? true}
            onCheckedChange={(checked) => onUpdate({ showTaskProgress: checked })}
          />
        </div>
      </div>

      <Separator />

      {/* Display Options */}
      <div>
        <h3 className="text-sm font-medium mb-4">Display Options</h3>
        <div className="space-y-4">
          <SettingSelect
            id="instruction-position"
            label="Task instruction position"
            description="Where to show task instructions during the test"
            options={positionOptions}
            value={settings.taskInstructionPosition ?? 'top-left'}
            onValueChange={(value) =>
              onUpdate({ taskInstructionPosition: value as PrototypeTestSettings['taskInstructionPosition'] })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Recording Section */}
      <div>
        <h3 className="text-sm font-medium mb-4">Recording</h3>
        <div className="space-y-4">
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

      <Separator />

      {/* Task Feedback Options */}
      <div>
        <h3 className="text-sm font-medium mb-4">Task Feedback</h3>
        <div className="space-y-4">
          <SettingRadioGroup
            label="Post-task questions display"
            description="How to show feedback questions after each task"
            options={taskFeedbackPageModeOptions}
            value={settings.taskFeedbackPageMode ?? 'all_on_one'}
            onValueChange={(value) =>
              onUpdate({ taskFeedbackPageMode: value as 'one_per_page' | 'all_on_one' })
            }
          />
        </div>
      </div>
    </div>
  )
}
