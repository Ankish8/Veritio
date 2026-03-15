import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { MoveHorizontal, Info, Code2 } from 'lucide-react'
import type { PlacementSettings, PlacementMode } from '../types'
import { DEFAULT_PLACEMENT } from '../types'

interface PlacementZoneSelectorProps {
  placement?: PlacementSettings
  onChange: (settings: PlacementSettings) => void
  isReadOnly?: boolean
}

const PLACEMENT_MODES = [
  {
    value: 'fixed' as const,
    label: 'Fixed Corners',
    description: 'Popup in screen corners (default positioning)',
  },
  {
    value: 'inline' as const,
    label: 'Inline',
    description: 'Embed within page content at specific element',
  },
  {
    value: 'sticky' as const,
    label: 'Sticky',
    description: 'Sticky header or footer that follows scroll',
  },
  {
    value: 'after_element' as const,
    label: 'After Element',
    description: 'Insert after a specific page element',
  },
  {
    value: 'custom' as const,
    label: 'Custom CSS',
    description: 'Manual positioning with custom CSS',
  },
]

export function PlacementZoneSelector({
  placement,
  onChange,
  isReadOnly = false,
}: PlacementZoneSelectorProps) {
  const settings = placement || DEFAULT_PLACEMENT

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-2">
        <MoveHorizontal className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <h3 className="font-medium">Placement Zones</h3>
          <p className="text-sm text-muted-foreground">
            Advanced widget positioning options
          </p>
        </div>
      </div>

      {/* Placement Mode Selector */}
      <RadioGroup
        value={settings.mode}
        onValueChange={(value) =>
          onChange({
            ...settings,
            mode: value as PlacementMode,
          })
        }
        disabled={isReadOnly}
      >
        <div className="space-y-3">
          {PLACEMENT_MODES.map((mode) => (
            <div key={mode.value} className="flex items-start space-x-2">
              <RadioGroupItem
                value={mode.value}
                id={`placement-${mode.value}`}
                disabled={isReadOnly}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor={`placement-${mode.value}`}
                  className="font-medium cursor-pointer"
                >
                  {mode.label}
                </Label>
                <p className="text-xs text-muted-foreground">{mode.description}</p>
              </div>
            </div>
          ))}
        </div>
      </RadioGroup>

      {/* CSS Selector Input (for inline/after_element modes) */}
      {(settings.mode === 'inline' || settings.mode === 'after_element') && (
        <div className="space-y-2">
          <Label htmlFor="css-selector" className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            CSS Selector
          </Label>
          <Input
            id="css-selector"
            value={settings.cssSelector || ''}
            onChange={(e) =>
              onChange({
                ...settings,
                cssSelector: e.target.value,
              })
            }
            disabled={isReadOnly}
            placeholder=".article-content, #main-container, [data-widget-target]"
            className="font-mono text-xs"
          />
          <div className="rounded-md bg-blue-50 border border-blue-200 p-2 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Examples:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><code className="bg-blue-100 px-1 rounded">.article-content</code> - After article</li>
                <li><code className="bg-blue-100 px-1 rounded">#pricing-section</code> - In pricing section</li>
                <li><code className="bg-blue-100 px-1 rounded">[data-widget]</code> - Custom attribute</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS (for custom mode) */}
      {settings.mode === 'custom' && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Code2 className="h-4 w-4" />
            Custom CSS Positioning
          </Label>

          <div className="grid grid-cols-2 gap-3">
            {['top', 'right', 'bottom', 'left'].map((property) => (
              <div key={property} className="space-y-1.5">
                <Label htmlFor={`css-${property}`} className="text-xs capitalize">
                  {property}
                </Label>
                <Input
                  id={`css-${property}`}
                  value={(settings.customCSS?.[property as keyof typeof settings.customCSS]) || ''}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      customCSS: {
                        ...(settings.customCSS || {}),
                        [property]: e.target.value,
                      },
                    })
                  }
                  disabled={isReadOnly}
                  placeholder={property === 'top' || property === 'bottom' ? '16px' : 'auto'}
                  className="font-mono text-xs"
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="css-transform" className="text-xs">
              Transform (optional)
            </Label>
            <Input
              id="css-transform"
              value={settings.customCSS?.transform || ''}
              onChange={(e) =>
                onChange({
                  ...settings,
                  customCSS: {
                    ...(settings.customCSS || {}),
                    transform: e.target.value,
                  },
                })
              }
              disabled={isReadOnly}
              placeholder="translateX(-50%)"
              className="font-mono text-xs"
            />
          </div>

          <div className="rounded-md bg-amber-50 border border-amber-200 p-2 flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              Advanced users only. Invalid CSS may break widget positioning. Test thoroughly before
              deploying.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
