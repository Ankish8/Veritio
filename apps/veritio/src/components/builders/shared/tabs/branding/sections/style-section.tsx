'use client'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { STYLE_PRESETS, getAllPresetIds } from '@/lib/style-presets'
import type { StylePresetId, RadiusOption, ThemeMode } from '@/components/builders/shared/types'
import { RADIUS_OPTIONS, THEME_OPTIONS } from '../constants'

interface StyleSectionProps {
  studyId: string
  isReadOnly?: boolean
}

export function StyleSection({ studyId: _studyId, isReadOnly }: StyleSectionProps) {
  const { meta, setStylePreset, setRadiusOption, setThemeMode } = useStudyMetaStore()

  const currentStylePreset = meta.branding.stylePreset || 'default'
  const currentRadius = meta.branding.radiusOption || 'default'
  const currentThemeMode = meta.branding.themeMode || 'light'

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Style & Appearance</Label>
      <div className="flex flex-wrap gap-4">
        {/* Style */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Style</span>
          <Select
            value={currentStylePreset}
            onValueChange={(value) => setStylePreset(value as StylePresetId)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent>
              {getAllPresetIds().map((presetId) => {
                const preset = STYLE_PRESETS[presetId]
                return (
                  <SelectItem key={presetId} value={presetId}>
                    <span>{preset.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">– {preset.description}</span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Theme */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Theme</span>
          <Select
            value={currentThemeMode}
            onValueChange={(value) => setThemeMode(value as ThemeMode)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              {THEME_OPTIONS.map(({ value, label, description }) => (
                <SelectItem key={value} value={value}>
                  <span>{label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">– {description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Corners */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Corners</span>
          <Select
            value={currentRadius}
            onValueChange={(value) => setRadiusOption(value as RadiusOption)}
            disabled={isReadOnly}
          >
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue placeholder="Corners" />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map(({ value, label, description }) => (
                <SelectItem key={value} value={value}>
                  <span>{label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">– {description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
