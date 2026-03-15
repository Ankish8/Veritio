'use client'

import { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Video, Mic, Monitor, Camera } from 'lucide-react'
import { useTreeTestBuilderStore } from '@/stores/study-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import type { RecordingCaptureMode } from '@/components/builders/shared/types'
import { DEFAULT_THINK_ALOUD } from '@/components/builders/shared/types'

const captureModes: { value: RecordingCaptureMode; label: string; icon: React.ReactNode }[] = [
  { value: 'audio', label: 'Audio only', icon: <Mic className="h-4 w-4" /> },
  { value: 'screen_and_audio', label: 'Screen + Audio', icon: <Monitor className="h-4 w-4" /> },
  { value: 'video_and_audio', label: 'Screen + Audio + Webcam', icon: <Camera className="h-4 w-4" /> },
]

export function BuilderTaskOptionsPanel() {
  const { settings, setSettings } = useTreeTestBuilderStore()
  const { meta, updateSessionRecordingSettings } = useStudyMetaStore()

  // Local state for blur-to-save on text input
  const [localAnswerButtonText, setLocalAnswerButtonText] = useState(
    settings.answerButtonText || "I'd find it here"
  )

  // Sync local state when store value changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalAnswerButtonText(settings.answerButtonText || "I'd find it here")
  }, [settings.answerButtonText])

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {/* Task Options Section */}
        <div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Task Options
          </span>

          <div className="mt-4 space-y-4">
            {/* Allow participants to skip tasks */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allow-skip-panel">Allow skipping tasks</Label>
                <p className="text-xs text-muted-foreground">
                  Let participants skip tasks they can&apos;t complete
                </p>
              </div>
              <Switch
                id="allow-skip-panel"
                checked={settings.allowSkipTasks ?? false}
                onCheckedChange={(checked) =>
                  setSettings({ allowSkipTasks: checked })
                }
              />
            </div>

            {/* Randomize task order */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="randomize-tasks-panel">Randomize task order</Label>
                <p className="text-xs text-muted-foreground">
                  Present tasks in a random order for each participant
                </p>
              </div>
              <Switch
                id="randomize-tasks-panel"
                checked={settings.randomizeTasks ?? false}
                onCheckedChange={(checked) =>
                  setSettings({ randomizeTasks: checked })
                }
              />
            </div>

            {/* Don't randomize first task */}
            {settings.randomizeTasks && (
              <div className="flex items-center justify-between ml-4">
                <div className="space-y-0.5">
                  <Label htmlFor="dont-randomize-first-panel">Keep first task first</Label>
                  <p className="text-xs text-muted-foreground">
                    Always show the first task first (as a warmup)
                  </p>
                </div>
                <Switch
                  id="dont-randomize-first-panel"
                  checked={settings.dontRandomizeFirstTask ?? false}
                  onCheckedChange={(checked) =>
                    setSettings({ dontRandomizeFirstTask: checked })
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Answer Button Customization */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Selected answer button
          </span>
          <Input
            value={localAnswerButtonText}
            onChange={(e) => setLocalAnswerButtonText(e.target.value)}
            onBlur={() => {
              if (localAnswerButtonText !== settings.answerButtonText) {
                setSettings({ answerButtonText: localAnswerButtonText })
              }
            }}
            placeholder="I'd find it here"
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">
            This text appears on the button participants click to confirm their selection.
          </p>
        </div>

        {/* Task Feedback Section */}
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Task Feedback
          </span>
          <div className="space-y-2">
            <Label className="text-sm font-normal">Post-task questions display</Label>
            <p className="text-xs text-muted-foreground">
              How to show feedback questions after each task
            </p>
            <RadioGroup
              value={settings.taskFeedbackPageMode ?? 'all_on_one'}
              onValueChange={(value) =>
                setSettings({ taskFeedbackPageMode: value as 'one_per_page' | 'all_on_one' })
              }
              className="mt-2 space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all_on_one" id="all-on-one" />
                <Label htmlFor="all-on-one" className="font-normal cursor-pointer">
                  All questions on one page
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="one_per_page" id="one-per-page" />
                <Label htmlFor="one-per-page" className="font-normal cursor-pointer">
                  One question per page
                </Label>
              </div>
            </RadioGroup>
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
