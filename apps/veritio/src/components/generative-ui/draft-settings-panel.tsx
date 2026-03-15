'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'

type StudySettings = Record<string, unknown>

interface DraftSettingsPanelProps {
  settings?: StudySettings
  studyType?: string
  message?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { settings: StudySettings }) => void
}

const MODE_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: 'open', label: 'Open', description: 'Participants create their own categories' },
  { value: 'closed', label: 'Closed', description: 'Participants sort into predefined categories' },
  { value: 'hybrid', label: 'Hybrid', description: 'Predefined categories + participants can add new ones' },
]

interface ToggleOption {
  key: string
  label: string
  modes?: string[]
}

const CARD_SORT_TOGGLES: ToggleOption[] = [
  { key: 'randomizeCards', label: 'Shuffle card order' },
  { key: 'randomizeCategories', label: 'Shuffle category order', modes: ['closed', 'hybrid'] },
  { key: 'showProgress', label: 'Show cards remaining' },
  { key: 'allowSkip', label: 'Allow skipping cards' },
  { key: 'includeUnclearCategory', label: 'Include "Unclear" category', modes: ['closed', 'hybrid'] },
  { key: 'showCardDescriptions', label: 'Show card descriptions' },
  { key: 'showCategoryDescriptions', label: 'Show category descriptions', modes: ['closed', 'hybrid'] },
  { key: 'allowNewCategories', label: 'Allow creating new categories', modes: ['hybrid'] },
  { key: 'allowMultipleCategories', label: 'Allow multi-category sorting' },
]

const STUDY_TYPE_TOGGLES: Record<string, ToggleOption[]> = {
  tree_test: [
    { key: 'randomizeTasks', label: 'Randomize task order' },
    { key: 'showBreadcrumbs', label: 'Show breadcrumbs' },
    { key: 'allowBack', label: 'Allow going back' },
    { key: 'showTaskProgress', label: 'Show task progress' },
    { key: 'allowSkipTasks', label: 'Allow skipping tasks' },
  ],
  survey: [
    { key: 'showProgressBar', label: 'Show progress bar' },
    { key: 'randomizeQuestions', label: 'Randomize question order' },
  ],
  first_click: [
    { key: 'allowSkipTasks', label: 'Allow skipping tasks' },
    { key: 'randomizeTasks', label: 'Randomize task order' },
    { key: 'showTaskProgress', label: 'Show task progress' },
  ],
  first_impression: [],
  prototype_test: [
    { key: 'randomizeTasks', label: 'Randomize task order' },
    { key: 'allowSkipTasks', label: 'Allow skipping tasks' },
    { key: 'showTaskProgress', label: 'Show task progress' },
  ],
  live_website_test: [
    { key: 'allowSkipTasks', label: 'Allow skipping tasks' },
    { key: 'showTaskProgress', label: 'Show task progress' },
    { key: 'allowMobile', label: 'Allow mobile devices' },
    { key: 'recordScreen', label: 'Screen recording' },
    { key: 'recordWebcam', label: 'Webcam recording' },
    { key: 'recordMicrophone', label: 'Microphone recording' },
    { key: 'trackClickEvents', label: 'Click tracking' },
    { key: 'trackScrollDepth', label: 'Scroll depth tracking' },
  ],
}

const STUDY_TYPE_LABELS: Record<string, string> = {
  card_sort: 'Card Sort Settings',
  tree_test: 'Tree Test Settings',
  survey: 'Survey Settings',
  first_click: 'First Click Settings',
  first_impression: 'First Impression Settings',
  prototype_test: 'Prototype Test Settings',
  live_website_test: 'Live Website Settings',
}

export function DraftSettingsPanel({ settings: initialSettings, studyType, onStateChange }: DraftSettingsPanelProps) {
  const [settings, setSettings] = useState<StudySettings>(initialSettings ?? {})

  const prevSettingsRef = useRef(initialSettings)
  // eslint-disable-next-line react-hooks/refs
  if (initialSettings && initialSettings !== prevSettingsRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevSettingsRef.current = initialSettings
    setSettings(initialSettings)
  }

  const debouncedEmit = useDebouncedEmit<{ settings: StudySettings }>(onStateChange)

  const emitChange = useCallback(
    (updated: StudySettings) => {
      debouncedEmit({ settings: updated })
    },
    [debouncedEmit],
  )

  const handleModeChange = useCallback(
    (mode: string) => {
      setSettings((prev) => {
        const updated = { ...prev, mode }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleToggle = useCallback(
    (key: string) => {
      setSettings((prev) => {
        const updated = { ...prev, [key]: !prev[key] }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const effectiveType = studyType ?? 'card_sort'
  const isCardSort = effectiveType === 'card_sort'
  const currentMode = (settings.mode as string) ?? 'open'
  const toggles = isCardSort ? CARD_SORT_TOGGLES : (STUDY_TYPE_TOGGLES[effectiveType] ?? [])
  const title = STUDY_TYPE_LABELS[effectiveType] ?? 'Settings'

  return (
    <div className="p-3">
      <span className="text-xs font-medium text-muted-foreground">{title}</span>

      {/* Sort Mode Selector — card sort only */}
      {isCardSort && (
        <div className="mt-2.5 mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Sort Mode</label>
          <div className="flex rounded-md border border-border overflow-hidden bg-muted/50">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'flex-1 py-1.5 text-sm font-medium transition-colors',
                  currentMode === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => handleModeChange(option.value)}
                title={option.description}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {MODE_OPTIONS.find((o) => o.value === currentMode)?.description}
          </p>
        </div>
      )}

      {/* Toggle Switches */}
      {toggles.length > 0 ? (
        <div className={cn('space-y-1.5', !isCardSort && 'mt-2.5')}>
          {toggles
            .filter((opt) => !opt.modes || opt.modes.includes(currentMode))
            .map((opt) => {
              const isOn = !!settings[opt.key]
              return (
                <button
                  key={opt.key}
                  type="button"
                  className="flex items-center justify-between w-full py-1.5 group"
                  onClick={() => handleToggle(opt.key)}
                >
                  <span className="text-sm text-foreground">{opt.label}</span>
                  <div
                    className={cn(
                      'relative h-5 w-9 rounded-full transition-colors shrink-0 ml-3',
                      isOn ? 'bg-primary' : 'bg-muted',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                        isOn ? 'translate-x-4' : 'translate-x-0.5',
                      )}
                    />
                  </div>
                </button>
              )
            })}
        </div>
      ) : !isCardSort ? (
        <p className="mt-2.5 text-xs text-muted-foreground/60">
          No configurable settings for this study type during creation.
        </p>
      ) : null}
    </div>
  )
}
