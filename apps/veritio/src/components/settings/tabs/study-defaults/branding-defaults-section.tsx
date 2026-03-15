'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Palette, Check } from 'lucide-react'
import { BrandingPreviewStandalone } from '@/components/settings/branding-preview-standalone'
import type {
  StylePreset,
  ThemeMode,
  RadiusOption,
  StudyDefaultsBranding,
  DeepPartial,
  StudyDefaults,
} from '@/lib/supabase/user-preferences-types'

// Color presets matching the study builder
const COLOR_PRESETS = [
  '#18181b', // Black
  '#007A66', // Teal
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#dc2626', // Red
  '#ea580c', // Orange
  '#16a34a', // Green
  '#0891b2', // Cyan
]

const STYLE_PRESETS: { id: StylePreset; name: string; description: string }[] = [
  { id: 'default', name: 'Default', description: 'Clean, professional' },
  { id: 'vega', name: 'Vega', description: 'Bold, high-contrast' },
  { id: 'nova', name: 'Nova', description: 'Soft, rounded' },
  { id: 'maia', name: 'Maia', description: 'Minimal, flat' },
  { id: 'lyra', name: 'Lyra', description: 'Elegant, refined' },
  { id: 'mira', name: 'Mira', description: 'Playful, vibrant' },
]

interface BrandingDefaultsSectionProps {
  branding: StudyDefaultsBranding
  onUpdate: (updates: DeepPartial<StudyDefaults>) => void
}

export function BrandingDefaultsSection({ branding, onUpdate }: BrandingDefaultsSectionProps) {
  const currentBranding = {
    primaryColor: branding.primaryColor || '#007A66',
    stylePreset: branding.stylePreset || 'default',
    themeMode: branding.themeMode || 'light',
    radiusOption: branding.radiusOption || 'default',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Default Branding
        </CardTitle>
        <CardDescription>Visual styling applied to new studies</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          {/* Left Side - Controls */}
          <div className="flex-1 min-w-[280px] max-w-[320px] space-y-6">
            {/* Primary Color */}
            <div className="space-y-3">
              <Label>Brand Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => {
                  const isSelected = branding.primaryColor === color
                  return (
                    <button
                      key={color}
                      className={`relative h-8 w-8 rounded-md transition-all ${
                        isSelected ? 'ring-2 ring-stone-900 ring-offset-2' : 'ring-1 ring-stone-200'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => onUpdate({ branding: { primaryColor: color } })}
                    >
                      {isSelected && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Style Preset */}
            <div className="space-y-3">
              <Label>Style Preset</Label>
              <Select
                value={branding.stylePreset || 'default'}
                onValueChange={(value: StylePreset) =>
                  onUpdate({ branding: { stylePreset: value } })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      <span>{preset.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        – {preset.description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Theme Mode */}
            <div className="space-y-3">
              <Label>Theme Mode</Label>
              <Select
                value={branding.themeMode || 'light'}
                onValueChange={(value: ThemeMode) =>
                  onUpdate({ branding: { themeMode: value } })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Border Radius */}
            <div className="space-y-3">
              <Label>Border Radius</Label>
              <Select
                value={branding.radiusOption || 'default'}
                onValueChange={(value: RadiusOption) =>
                  onUpdate({ branding: { radiusOption: value } })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Sharp)</SelectItem>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="large">Large (Rounded)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right Side - Live Preview (tablet size) */}
          <div className="hidden md:block w-[380px] flex-shrink-0">
            <BrandingPreviewStandalone
              primaryColor={currentBranding.primaryColor}
              stylePreset={currentBranding.stylePreset as StylePreset}
              themeMode={currentBranding.themeMode as ThemeMode}
              radiusOption={currentBranding.radiusOption as RadiusOption}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
