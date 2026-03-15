'use client'

import { Clock, RefreshCw, Languages } from 'lucide-react'
import { Label } from '@veritio/ui'
import { Input } from '@veritio/ui'
import { Slider } from '@veritio/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui'
import type {
  AudioResponseQuestionConfig,
  AudioTranscriptionLanguage,
} from '../../../../../lib/supabase/study-flow-types'
import { ToggleOptionRow } from '../toggle-option-row'

interface AudioResponseConfigProps {
  config: AudioResponseQuestionConfig
  onChange: (config: Partial<AudioResponseQuestionConfig>) => void
}

const LANGUAGE_OPTIONS: { value: AudioTranscriptionLanguage; label: string }[] = [
  { value: 'multi', label: 'Auto-detect (with code-switching)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'hi', label: 'Hindi' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ru', label: 'Russian' },
]

// Duration presets for the slider
const DURATION_PRESETS = [
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 120, label: '2m' },
  { value: 180, label: '3m' },
  { value: 300, label: '5m' },
]

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`
  return `${minutes}m ${remainingSeconds}s`
}

export function AudioResponseConfig({ config, onChange }: AudioResponseConfigProps) {
  const maxDuration = config.maxDurationSeconds ?? 120
  const minDuration = config.minDurationSeconds ?? 0
  const allowRerecord = config.allowRerecord ?? true
  const transcriptionLanguage = config.transcriptionLanguage ?? 'multi'
  const showTranscriptPreview = config.showTranscriptPreview ?? false

  return (
    <div className="space-y-6">
      {/* Recording Duration */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Recording Duration</Label>
        </div>

        {/* Max Duration Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="maxDuration" className="text-xs text-muted-foreground">
              Maximum Duration
            </Label>
            <span className="text-sm font-medium">{formatDuration(maxDuration)}</span>
          </div>
          <Slider
            id="maxDuration"
            value={[maxDuration]}
            min={30}
            max={300}
            step={30}
            onValueChange={([value]) => onChange({ maxDurationSeconds: value })}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChange({ maxDurationSeconds: preset.value })}
                className={`px-2 py-0.5 rounded transition-colors ${
                  maxDuration === preset.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Min Duration (optional) */}
        <div className="space-y-2">
          <Label htmlFor="minDuration" className="text-xs text-muted-foreground">
            Minimum Duration (optional)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="minDuration"
              type="number"
              min={0}
              max={60}
              value={minDuration || ''}
              placeholder="No minimum"
              onChange={(e) => {
                const value = e.target.value ? parseInt(e.target.value, 10) : undefined
                onChange({ minDurationSeconds: value })
              }}
              className="h-9 w-24"
            />
            <span className="text-xs text-muted-foreground">seconds</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Participants must record at least this long before they can stop
          </p>
        </div>
      </div>

      {/* Recording Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Recording Options</Label>
        </div>

        <ToggleOptionRow
          id="allowRerecord"
          label="Allow re-recording"
          description="Participants can record again if not satisfied"
          checked={allowRerecord}
          onCheckedChange={(checked) => onChange({ allowRerecord: checked })}
        />
      </div>

      {/* Transcription Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Transcription</Label>
        </div>

        <div className="space-y-2">
          <Label htmlFor="language" className="text-xs text-muted-foreground">
            Expected Language
          </Label>
          <Select
            value={transcriptionLanguage}
            onValueChange={(value) => onChange({ transcriptionLanguage: value as AudioTranscriptionLanguage })}
          >
            <SelectTrigger id="language" className="h-9">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            "Auto-detect" handles mixed languages (e.g., Hindi-English)
          </p>
        </div>

        <ToggleOptionRow
          id="showTranscript"
          label="Show transcript preview"
          description="Display transcript to participant after recording"
          checked={showTranscriptPreview}
          onCheckedChange={(checked) => onChange({ showTranscriptPreview: checked })}
        />
      </div>
    </div>
  )
}
