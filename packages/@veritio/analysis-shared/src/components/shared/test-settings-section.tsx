'use client'

import { Clock, Timer, Shuffle, ListChecks, Layers, Navigation, SkipForward, BarChart3, MousePointerClick, Image, Zap, Layout } from 'lucide-react'
import type { TestDisplaySettings, FirstImpressionDisplaySettings } from './study-info-panel-types'
import {
  formatDuration,
  formatAssignmentMode,
  formatQuestionDisplay,
  formatSortMode,
  formatImageScaling,
  formatBoolean,
} from './study-info-panel-utils'

interface SettingRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function SettingRow({ icon, label, value }: SettingRowProps) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  )
}

function FirstImpressionSettings({ settings }: { settings: FirstImpressionDisplaySettings }) {
  return (
    <>
      <SettingRow
        icon={<Timer className="size-4 text-muted-foreground shrink-0" />}
        label="Exposure duration"
        value={formatDuration(settings.exposureDurationMs)}
      />
      {settings.countdownDurationMs > 0 && (
        <SettingRow
          icon={<Clock className="size-4 text-muted-foreground shrink-0" />}
          label="Countdown"
          value={formatDuration(settings.countdownDurationMs)}
        />
      )}
      <SettingRow
        icon={<Shuffle className="size-4 text-muted-foreground shrink-0" />}
        label="Design assignment"
        value={formatAssignmentMode(settings.designAssignmentMode)}
      />
      {settings.questionDisplayMode && (
        <SettingRow
          icon={<ListChecks className="size-4 text-muted-foreground shrink-0" />}
          label="Question display"
          value={formatQuestionDisplay(settings.questionDisplayMode)}
        />
      )}
    </>
  )
}

function CardSortSettings({ settings }: { settings: TestDisplaySettings & { type: 'card_sort' } }) {
  const s = settings.settings
  return (
    <>
      <SettingRow
        icon={<Layers className="size-4 text-muted-foreground shrink-0" />}
        label="Sort mode"
        value={formatSortMode(s.mode)}
      />
      {s.randomizeCards !== undefined && (
        <SettingRow
          icon={<Shuffle className="size-4 text-muted-foreground shrink-0" />}
          label="Randomize cards"
          value={formatBoolean(s.randomizeCards)}
        />
      )}
      {s.showProgress !== undefined && (
        <SettingRow
          icon={<BarChart3 className="size-4 text-muted-foreground shrink-0" />}
          label="Show progress"
          value={formatBoolean(s.showProgress)}
        />
      )}
      {s.allowSkip !== undefined && (
        <SettingRow
          icon={<SkipForward className="size-4 text-muted-foreground shrink-0" />}
          label="Allow skip"
          value={formatBoolean(s.allowSkip)}
        />
      )}
    </>
  )
}

function TreeTestSettings({ settings }: { settings: TestDisplaySettings & { type: 'tree_test' } }) {
  const s = settings.settings
  return (
    <>
      {s.randomizeTasks !== undefined && (
        <SettingRow
          icon={<Shuffle className="size-4 text-muted-foreground shrink-0" />}
          label="Randomize tasks"
          value={formatBoolean(s.randomizeTasks)}
        />
      )}
      {s.showBreadcrumbs !== undefined && (
        <SettingRow
          icon={<Navigation className="size-4 text-muted-foreground shrink-0" />}
          label="Show breadcrumbs"
          value={formatBoolean(s.showBreadcrumbs)}
        />
      )}
      {s.allowBack !== undefined && (
        <SettingRow
          icon={<SkipForward className="size-4 text-muted-foreground shrink-0 rotate-180" />}
          label="Allow back"
          value={formatBoolean(s.allowBack)}
        />
      )}
      {s.showTaskProgress !== undefined && (
        <SettingRow
          icon={<BarChart3 className="size-4 text-muted-foreground shrink-0" />}
          label="Show task progress"
          value={formatBoolean(s.showTaskProgress)}
        />
      )}
    </>
  )
}

function FirstClickSettings({ settings }: { settings: TestDisplaySettings & { type: 'first_click' } }) {
  const s = settings.settings
  return (
    <>
      {s.randomizeTasks !== undefined && (
        <SettingRow
          icon={<Shuffle className="size-4 text-muted-foreground shrink-0" />}
          label="Randomize tasks"
          value={formatBoolean(s.randomizeTasks)}
        />
      )}
      {s.startTasksImmediately !== undefined && (
        <SettingRow
          icon={<Zap className="size-4 text-muted-foreground shrink-0" />}
          label="Start immediately"
          value={formatBoolean(s.startTasksImmediately)}
        />
      )}
      {s.showTaskProgress !== undefined && (
        <SettingRow
          icon={<BarChart3 className="size-4 text-muted-foreground shrink-0" />}
          label="Show task progress"
          value={formatBoolean(s.showTaskProgress)}
        />
      )}
      {s.imageScaling && (
        <SettingRow
          icon={<Image className="size-4 text-muted-foreground shrink-0" />}
          label="Image scaling"
          value={formatImageScaling(s.imageScaling)}
        />
      )}
    </>
  )
}

function PrototypeTestSettings({ settings }: { settings: TestDisplaySettings & { type: 'prototype_test' } }) {
  const s = settings.settings
  return (
    <>
      {s.randomizeTasks !== undefined && (
        <SettingRow
          icon={<Shuffle className="size-4 text-muted-foreground shrink-0" />}
          label="Randomize tasks"
          value={formatBoolean(s.randomizeTasks)}
        />
      )}
      {s.showTaskProgress !== undefined && (
        <SettingRow
          icon={<BarChart3 className="size-4 text-muted-foreground shrink-0" />}
          label="Show task progress"
          value={formatBoolean(s.showTaskProgress)}
        />
      )}
      {s.clickableAreaFlashing !== undefined && (
        <SettingRow
          icon={<MousePointerClick className="size-4 text-muted-foreground shrink-0" />}
          label="Click area flashing"
          value={formatBoolean(s.clickableAreaFlashing)}
        />
      )}
      {s.tasksEndAutomatically !== undefined && (
        <SettingRow
          icon={<Zap className="size-4 text-muted-foreground shrink-0" />}
          label="Auto-advance"
          value={formatBoolean(s.tasksEndAutomatically)}
        />
      )}
    </>
  )
}

function SurveySettings({ settings }: { settings: TestDisplaySettings & { type: 'survey' } }) {
  const s = settings.settings
  return (
    <>
      {s.showOneQuestionPerPage !== undefined && (
        <SettingRow
          icon={<Layout className="size-4 text-muted-foreground shrink-0" />}
          label="Question display"
          value={s.showOneQuestionPerPage ? 'One per page' : 'All on page'}
        />
      )}
      {s.randomizeQuestions !== undefined && (
        <SettingRow
          icon={<Shuffle className="size-4 text-muted-foreground shrink-0" />}
          label="Randomize questions"
          value={formatBoolean(s.randomizeQuestions)}
        />
      )}
      {s.showProgressBar !== undefined && (
        <SettingRow
          icon={<BarChart3 className="size-4 text-muted-foreground shrink-0" />}
          label="Show progress"
          value={formatBoolean(s.showProgressBar)}
        />
      )}
      {s.allowSkipQuestions !== undefined && (
        <SettingRow
          icon={<SkipForward className="size-4 text-muted-foreground shrink-0" />}
          label="Allow skip"
          value={formatBoolean(s.allowSkipQuestions)}
        />
      )}
    </>
  )
}

interface TestSettingsSectionProps {
  testSettings?: TestDisplaySettings | null
  studyType: string
  firstImpressionSettings?: FirstImpressionDisplaySettings | null
}

export function TestSettingsSection({ testSettings, studyType, firstImpressionSettings }: TestSettingsSectionProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Test Settings
      </h4>
      <div className="space-y-2.5">
        {(testSettings?.type === 'first_impression' || (studyType === 'first_impression' && firstImpressionSettings)) && (
          <FirstImpressionSettings
            settings={testSettings?.type === 'first_impression' ? testSettings.settings : firstImpressionSettings!}
          />
        )}
        {testSettings?.type === 'card_sort' && <CardSortSettings settings={testSettings} />}
        {testSettings?.type === 'tree_test' && <TreeTestSettings settings={testSettings} />}
        {testSettings?.type === 'first_click' && <FirstClickSettings settings={testSettings} />}
        {testSettings?.type === 'prototype_test' && <PrototypeTestSettings settings={testSettings} />}
        {testSettings?.type === 'survey' && <SurveySettings settings={testSettings} />}
      </div>
    </div>
  )
}
