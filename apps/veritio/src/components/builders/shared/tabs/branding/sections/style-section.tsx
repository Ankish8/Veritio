'use client'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { STYLE_PRESETS, getAllPresetIds } from '@/lib/style-presets'
import { RADIUS_OPTIONS, THEME_OPTIONS } from '../constants'

interface NativeSelectFieldProps<T extends string> {
  id: string
  label: string
  value: T
  options: Array<{ value: T; label: string; description?: string }>
  widthClassName: string
  disabled?: boolean
  onChange: (value: T) => void
}

function NativeSelectField<T extends string>({
  id,
  label,
  value,
  options,
  widthClassName,
  disabled,
  onChange,
}: NativeSelectFieldProps<T>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className={cn(
          'h-8 rounded-md border px-3 text-sm text-foreground outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          widthClassName
        )}
        style={{
          backgroundColor: 'var(--style-input-bg, var(--muted))',
          borderColor: 'var(--style-input-border, var(--border))',
          borderRadius: 'var(--style-radius, var(--radius))',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.description ? `${option.label} - ${option.description}` : option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface StyleSectionProps {
  studyId: string
  isReadOnly?: boolean
}

export function StyleSection({ studyId: _studyId, isReadOnly }: StyleSectionProps) {
  const { meta, setStylePreset, setRadiusOption, setThemeMode } = useStudyMetaStore()

  const currentStylePreset = meta.branding.stylePreset || 'default'
  const currentRadius = meta.branding.radiusOption || 'default'
  const currentThemeMode = meta.branding.themeMode || 'light'
  const styleOptions = getAllPresetIds().map((presetId) => {
    const preset = STYLE_PRESETS[presetId]
    return {
      value: presetId,
      label: preset.name,
      description: preset.description,
    }
  })

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Style & Appearance</Label>
      <div className="flex flex-wrap gap-4">
        <NativeSelectField
          id="branding-style-preset"
          label="Style"
          value={currentStylePreset}
          options={styleOptions}
          widthClassName="w-[150px]"
          disabled={isReadOnly}
          onChange={(value) => {
            if (value !== currentStylePreset) setStylePreset(value)
          }}
        />

        <NativeSelectField
          id="branding-theme-mode"
          label="Theme"
          value={currentThemeMode}
          options={THEME_OPTIONS}
          widthClassName="w-[120px]"
          disabled={isReadOnly}
          onChange={(value) => {
            if (value !== currentThemeMode) setThemeMode(value)
          }}
        />

        <NativeSelectField
          id="branding-radius-option"
          label="Corners"
          value={currentRadius}
          options={RADIUS_OPTIONS}
          widthClassName="w-[120px]"
          disabled={isReadOnly}
          onChange={(value) => {
            if (value !== currentRadius) setRadiusOption(value)
          }}
        />
      </div>
    </div>
  )
}
