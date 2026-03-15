'use client'

import {
  useFirstImpressionSettings,
  useFirstImpressionActions,
  useFirstImpressionDesigns,
} from '@/stores/study-builder'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingToggle, SettingRadioGroup } from '@/components/builders/shared/settings'
import { Monitor } from 'lucide-react'
import type {
  FirstImpressionQuestionDisplayMode,
  FirstImpressionDesignAssignmentMode,
  FirstImpressionDisplayMode,
  FirstImpressionQuestionMode,
} from '@veritio/study-types/study-flow-types'

const questionModeOptions = [
  {
    value: 'shared' as FirstImpressionQuestionMode,
    label: 'Shared across designs',
    description: 'Same questions after each design',
  },
  {
    value: 'per_design' as FirstImpressionQuestionMode,
    label: 'Per design',
    description: 'Different questions per design',
  },
]

const questionDisplayOptions = [
  {
    value: 'one_per_page' as FirstImpressionQuestionDisplayMode,
    label: 'One per page',
    description: 'Show each question on its own page',
  },
  {
    value: 'all_on_page' as FirstImpressionQuestionDisplayMode,
    label: 'All on page',
    description: 'Show all questions together',
  },
]

const designAssignmentOptions = [
  {
    value: 'random_single' as FirstImpressionDesignAssignmentMode,
    label: 'Random single (A/B)',
    description: 'Each participant sees one design based on weights',
  },
  {
    value: 'sequential_all' as FirstImpressionDesignAssignmentMode,
    label: 'Sequential all',
    description: 'Each participant sees all designs in order',
  },
]

export function BuilderFirstImpressionSettingsPanel() {
  const settings = useFirstImpressionSettings()
  const { setSettings, setSharedQuestions } = useFirstImpressionActions()
  const designs = useFirstImpressionDesigns()

  // Convert ms to seconds for display
  const exposureSeconds = settings.exposureDurationMs / 1000
  const countdownSeconds = settings.countdownDurationMs / 1000

  // Only show multi-design options when there are 2+ designs
  const hasMultipleDesigns = designs.length >= 2
  const questionMode = settings.questionMode ?? 'shared'

  // First non-practice design (used as source of truth for shared questions)
  const firstNonPracticeDesign = designs.find((d) => !d.is_practice)

  const handleQuestionModeChange = (value: string) => {
    const newMode = value as FirstImpressionQuestionMode
    setSettings({ questionMode: newMode })

    // When switching TO shared, sync questions from first non-practice design to all others
    if (newMode === 'shared' && firstNonPracticeDesign) {
      setSharedQuestions(firstNonPracticeDesign.questions || [])
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* Timing Section */}
        <div>
          <h3 className="font-semibold mb-4">Timing</h3>
          <div className="space-y-5">
            {/* Exposure Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Exposure Duration</Label>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {exposureSeconds}s
                </span>
              </div>
              <Slider
                value={[exposureSeconds]}
                onValueChange={([value]) =>
                  setSettings({ exposureDurationMs: value * 1000 })
                }
                min={5}
                max={20}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                How long each design is shown (5-20 seconds)
              </p>
            </div>

            {/* Countdown Duration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Countdown Before</Label>
                <span className="text-sm font-medium tabular-nums text-muted-foreground">
                  {countdownSeconds === 0 ? 'None' : `${countdownSeconds}s`}
                </span>
              </div>
              <Slider
                value={[countdownSeconds]}
                onValueChange={([value]) =>
                  setSettings({ countdownDurationMs: value * 1000 })
                }
                min={0}
                max={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                "Get ready" countdown before showing
              </p>
            </div>
          </div>
        </div>

        {/* Design Assignment Section - Only show with 2+ designs */}
        {hasMultipleDesigns && (
          <>
            <Separator />
            <div>
              <h3 className="font-semibold mb-4">Design Assignment</h3>
              <SettingRadioGroup
                label="Assignment mode"
                description="How participants are assigned to designs"
                options={designAssignmentOptions}
                value={settings.designAssignmentMode ?? 'random_single'}
                onValueChange={(value) =>
                  setSettings({ designAssignmentMode: value as FirstImpressionDesignAssignmentMode })
                }
              />
            </div>
          </>
        )}

        <Separator />

        {/* Display Options Section */}
        <div>
          <h3 className="font-semibold mb-4">Display Options</h3>
          <div className="space-y-4">
            <SettingToggle
              id="show-timer"
              label="Show timer to participant"
              description="Display remaining time during exposure"
              checked={settings.showTimerToParticipant ?? true}
              onCheckedChange={(checked) =>
                setSettings({ showTimerToParticipant: checked })
              }
            />

            {hasMultipleDesigns && (
              <SettingToggle
                id="show-progress"
                label="Show design progress"
                description='Display "Design 1 of 3" indicator'
                checked={settings.showProgressIndicator ?? true}
                onCheckedChange={(checked) =>
                  setSettings({ showProgressIndicator: checked })
                }
              />
            )}
          </div>
        </div>

        <Separator />

        {/* Questions Section */}
        <div>
          <h3 className="font-semibold mb-4">Questions</h3>
          <div className="space-y-4">
            <SettingRadioGroup
              label="Question scope"
              options={questionModeOptions}
              value={questionMode}
              onValueChange={handleQuestionModeChange}
            />

            <SettingRadioGroup
              label="Question display"
              options={questionDisplayOptions}
              value={settings.questionDisplayMode ?? 'one_per_page'}
              onValueChange={(value) =>
                setSettings({ questionDisplayMode: value as FirstImpressionQuestionDisplayMode })
              }
            />

            <SettingToggle
              id="randomize-questions"
              label="Randomize question order"
              description="Shuffle questions for each participant"
              checked={settings.randomizeQuestions ?? false}
              onCheckedChange={(checked) =>
                setSettings({ randomizeQuestions: checked })
              }
            />

            <SettingToggle
              id="auto-advance-questions"
              label="Auto-advance questions"
              description="Automatically move to next question after answering single-select questions"
              checked={settings.autoAdvanceQuestions ?? false}
              onCheckedChange={(checked) =>
                setSettings({ autoAdvanceQuestions: checked })
              }
            />
          </div>
        </div>

        <Separator />

        {/* Design Display Section */}
        <div>
          <h3 className="font-semibold mb-4">Design Display</h3>
          <div className="space-y-5">
            {/* Display Mode */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                Display Mode
              </Label>
              <Select
                value={settings.displayMode || 'fit'}
                onValueChange={(value) =>
                  setSettings({ displayMode: value as FirstImpressionDisplayMode })
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fit">Fit (contain)</SelectItem>
                  <SelectItem value="fill">Fill (cover)</SelectItem>
                  <SelectItem value="actual">Actual Size</SelectItem>
                  <SelectItem value="hidpi">HiDPI (2x)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How images scale to fit the screen
              </p>
            </div>

            {/* Background Color */}
            <div className="space-y-2">
              <Label className="text-sm">Background Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.backgroundColor || '#ffffff'}
                  onChange={(e) => setSettings({ backgroundColor: e.target.value })}
                  className="h-9 w-12 rounded border border-input cursor-pointer"
                />
                <Input
                  value={settings.backgroundColor || '#ffffff'}
                  onChange={(e) => setSettings({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="h-9 flex-1 font-mono text-xs"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Visible when image doesn't fill screen
              </p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}
