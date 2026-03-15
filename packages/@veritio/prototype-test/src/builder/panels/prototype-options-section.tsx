'use client'
import { SettingToggle, SettingSelect } from './shared/settings'
import type { PrototypeTestSettings, PrototypeScaleMode } from '@veritio/prototype-test/lib/supabase/study-flow-types'

/**
 * Convert legacy boolean scalePrototype value to new string mode
 * Handles: null, undefined, boolean (legacy), and string (new format)
 */
function getScaleMode(value: PrototypeTestSettings['scalePrototype']): PrototypeScaleMode {
  if (value === null || value === undefined) return 'fit'
  if (typeof value === 'boolean') return value ? 'fit' : '100%'
  const validModes: PrototypeScaleMode[] = ['100%', 'fit', 'fill', 'width']
  return validModes.includes(value) ? value : 'fit'
}

const scaleOptions = [
  { value: '100%' as const, label: '100% - Display at full size' },
  { value: 'fit' as const, label: 'Fit - Scale down to fit' },
  { value: 'fill' as const, label: 'Fill - Scale down or up to fill' },
  { value: 'width' as const, label: 'Width - Scale down to fit width' },
]

interface PrototypeOptionsSectionProps {
  settings: PrototypeTestSettings
  onUpdate: (settings: Partial<PrototypeTestSettings>) => void
}

export function PrototypeOptionsSection({ settings, onUpdate }: PrototypeOptionsSectionProps) {
  return (
    <section className="p-4">
      <h3 className="text-xs font-semibold text-foreground mb-4">
        Prototype Options
      </h3>
      <div className="space-y-4">
        <SettingToggle
          id="clickable-flashing"
          label="Highlight clickable areas"
          description="Flash clickable hotspots when participants hesitate"
          checked={settings.clickableAreaFlashing ?? true}
          onCheckedChange={(checked) => onUpdate({ clickableAreaFlashing: checked })}
        />

        <SettingToggle
          id="auto-end"
          label="Auto-end on goal screen"
          description="Automatically complete tasks when participants reach the goal"
          tooltip="When enabled, tasks complete automatically when participants reach the target screen. When disabled, participants must click 'I found it' to complete the task."
          checked={settings.tasksEndAutomatically ?? true}
          onCheckedChange={(checked) => onUpdate({ tasksEndAutomatically: checked })}
        />

        <SettingSelect
          id="scale-prototype"
          label="Scale prototype"
          description="How the prototype is scaled on desktop and tablet"
          options={scaleOptions}
          value={getScaleMode(settings.scalePrototype)}
          onValueChange={(value) => onUpdate({ scalePrototype: value as PrototypeScaleMode })}
        />
      </div>
    </section>
  )
}
