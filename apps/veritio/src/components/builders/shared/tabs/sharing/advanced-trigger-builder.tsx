import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Zap, Plus, Trash2, GripVertical, Info } from 'lucide-react'
import type { AdvancedTriggers, TriggerRule, AdvancedTriggerType } from '../../types'
import { DEFAULT_ADVANCED_TRIGGERS } from '../../types'

interface AdvancedTriggerBuilderProps {
  advancedTriggers?: AdvancedTriggers
  onChange: (settings: AdvancedTriggers) => void
  isReadOnly?: boolean
  /** Hide the header when used inside a section that already has a label */
  hideHeader?: boolean
}

const TRIGGER_TYPES = [
  { value: 'time_delay' as const, label: 'Time Delay', unit: 'seconds', valueType: 'number' },
  { value: 'scroll_percentage' as const, label: 'Scroll Percentage', unit: '%', valueType: 'number' },
  { value: 'exit_intent' as const, label: 'Exit Intent', unit: null, valueType: 'none' },
  { value: 'page_visits' as const, label: 'Page Visits', unit: 'visits', valueType: 'number' },
  { value: 'time_on_page' as const, label: 'Time on Page', unit: 'seconds', valueType: 'number' },
  { value: 'url_pattern' as const, label: 'URL Pattern', unit: null, valueType: 'string' },
  { value: 'element_visible' as const, label: 'Element Visible', unit: 'CSS selector', valueType: 'string' },
]

export function AdvancedTriggerBuilder({
  advancedTriggers,
  onChange,
  isReadOnly = false,
  hideHeader = false,
}: AdvancedTriggerBuilderProps) {
  const settings = advancedTriggers || DEFAULT_ADVANCED_TRIGGERS

  const addRule = () => {
    const newRule: TriggerRule = {
      id: crypto.randomUUID(),
      type: 'time_delay',
      value: 5,
    }
    onChange({
      ...settings,
      rules: [...settings.rules, newRule],
    })
  }

  const removeRule = (id: string) => {
    onChange({
      ...settings,
      rules: settings.rules.filter((r) => r.id !== id),
    })
  }

  const updateRule = (id: string, updates: Partial<TriggerRule>) => {
    onChange({
      ...settings,
      rules: settings.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })
  }

  const getPlainEnglish = (): string => {
    if (settings.rules.length === 0) return 'No triggers configured'

    const descriptions = settings.rules.map((rule) => {
      switch (rule.type) {
        case 'time_delay':
          return `after ${rule.value} seconds`
        case 'scroll_percentage':
          return `scrolled ${rule.value}%`
        case 'exit_intent':
          return 'exit intent detected'
        case 'page_visits':
          return `after ${rule.value} page visits`
        case 'time_on_page':
          return `on page for ${rule.value} seconds`
        case 'url_pattern':
          return `URL contains "${rule.value}"`
        case 'element_visible':
          return `element "${rule.value}" is visible`
        default:
          return rule.type
      }
    })

    const logic = settings.logic === 'AND' ? ' AND ' : ' OR '
    return `Show widget when visitor ${descriptions.join(logic)}`
  }

  return (
    <div className="space-y-4">
      {/* Header - hidden when inside a parent section */}
      {!hideHeader && (
        <div className="flex items-start gap-2">
          <Zap className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium">Advanced Triggers</h4>
            <p className="text-xs text-muted-foreground">
              Combine multiple trigger conditions
            </p>
          </div>
        </div>
      )}

      {/* Enable Toggle */}
      <div className="flex items-start gap-3 justify-between">
        <div className="space-y-0.5 flex-1 min-w-0">
          <Label className="text-sm font-medium">Advanced Triggers</Label>
          <p className="text-sm text-muted-foreground">
            Combine multiple conditions
          </p>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) =>
            onChange({
              ...settings,
              enabled,
            })
          }
          disabled={isReadOnly}
          className="flex-shrink-0 mt-0.5"
        />
      </div>

      {settings.enabled && (
        <div className="space-y-4">
          {/* Logic Selector */}
          <div className="space-y-2">
            <Label className="text-xs">Combination Logic</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={settings.logic === 'AND' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange({ ...settings, logic: 'AND' })}
                disabled={isReadOnly || settings.rules.length < 2}
                className="text-xs h-8 px-2"
              >
                AND (All)
              </Button>
              <Button
                type="button"
                variant={settings.logic === 'OR' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChange({ ...settings, logic: 'OR' })}
                disabled={isReadOnly || settings.rules.length < 2}
                className="text-xs h-8 px-2"
              >
                OR (Any)
              </Button>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Trigger Rules</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                disabled={isReadOnly || settings.rules.length >= 10}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Rule
              </Button>
            </div>

            {settings.rules.length === 0 ? (
              <div className="rounded-md bg-muted/30 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  No rules yet. Click "Add Rule" to create your first trigger.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.rules.map((rule, index) => (
                  <div key={rule.id}>
                    {index > 0 && (
                      <div className="flex items-center justify-center my-1.5">
                        <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-medium">
                          {settings.logic}
                        </span>
                      </div>
                    )}
                    <TriggerRuleRow
                      rule={rule}
                      onUpdate={(updates) => updateRule(rule.id, updates)}
                      onRemove={() => removeRule(rule.id)}
                      isReadOnly={isReadOnly}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plain English Preview */}
          {settings.rules.length > 0 && (
            <div className="rounded-md bg-blue-50 border border-blue-200 p-2.5">
              <p className="text-xs font-medium text-blue-900 mb-1">Preview:</p>
              <p className="text-xs text-blue-800 italic leading-relaxed">{getPlainEnglish()}</p>
            </div>
          )}
        </div>
      )}

      {/* Help Info */}
      {settings.enabled && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Advanced triggers override the simple trigger setting.
          </p>
        </div>
      )}
    </div>
  )
}

function TriggerRuleRow({
  rule,
  onUpdate,
  onRemove,
  isReadOnly,
}: {
  rule: TriggerRule
  onUpdate: (updates: Partial<TriggerRule>) => void
  onRemove: () => void
  isReadOnly: boolean
}) {
  const triggerType = TRIGGER_TYPES.find((t) => t.value === rule.type)

  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border bg-card">
      {/* Drag Handle */}
      <GripVertical className="h-4 w-4 text-muted-foreground mt-1.5 flex-shrink-0 cursor-grab" />

      {/* Rule Configuration */}
      <div className="flex-1 space-y-2 min-w-0">
        {/* Trigger Type Selector */}
        <Select
          value={rule.type}
          onValueChange={(value) => {
            const newType = value as AdvancedTriggerType
            const defaultValue = TRIGGER_TYPES.find((t) => t.value === newType)
            onUpdate({
              type: newType,
              value: newType === 'exit_intent' ? '' : defaultValue?.valueType === 'number' ? 5 : '',
            })
          }}
          disabled={isReadOnly}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value Input (if needed) */}
        {triggerType?.valueType !== 'none' && (
          <div className="flex items-center gap-2">
            <Input
              type={triggerType?.valueType === 'number' ? 'number' : 'text'}
              value={rule.value}
              onChange={(e) =>
                onUpdate({
                  value: triggerType?.valueType === 'number' ? parseFloat(e.target.value) || 0 : e.target.value,
                })
              }
              disabled={isReadOnly}
              placeholder={
                rule.type === 'url_pattern'
                  ? '/pricing'
                  : rule.type === 'element_visible'
                  ? '.article-content'
                  : '5'
              }
              className="flex-1 h-8 text-xs"
            />
            {triggerType?.unit && (
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {triggerType.unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={isReadOnly}
        className="flex-shrink-0 h-7 w-7 p-0"
      >
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  )
}
