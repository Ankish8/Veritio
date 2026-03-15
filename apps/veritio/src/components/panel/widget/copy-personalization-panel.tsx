import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Type } from 'lucide-react'
import type { CopyPersonalization, PersonalizationRule, PersonalizationTrigger } from '../types'
import { DEFAULT_COPY_PERSONALIZATION } from '../types'

interface CopyPersonalizationPanelProps {
  copyPersonalization?: CopyPersonalization
  onChange: (settings: CopyPersonalization) => void
  isReadOnly?: boolean
}

const PERSONALIZATION_TRIGGERS = [
  { value: 'url_contains' as const, label: 'URL Contains', placeholder: '/pricing' },
  { value: 'referrer_contains' as const, label: 'Referrer Contains', placeholder: 'google.com' },
  { value: 'scroll_depth_gt' as const, label: 'Scroll Depth >', placeholder: '50' },
  { value: 'time_on_site_gt' as const, label: 'Time on Site >', placeholder: '30' },
]

export function CopyPersonalizationPanel({
  copyPersonalization,
  onChange,
  isReadOnly = false,
}: CopyPersonalizationPanelProps) {
  const settings = copyPersonalization || DEFAULT_COPY_PERSONALIZATION

  const addRule = () => {
    const newRule: PersonalizationRule = {
      id: crypto.randomUUID(),
      trigger: 'url_contains',
      value: '',
      customTitle: '',
      customDescription: '',
      customButtonText: '',
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

  const updateRule = (id: string, updates: Partial<PersonalizationRule>) => {
    onChange({
      ...settings,
      rules: settings.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-2">
        <Type className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <h3 className="font-medium">Copy Personalization</h3>
          <p className="text-sm text-muted-foreground">
            Adapt widget messaging based on visitor context
          </p>
        </div>
      </div>

      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Enable Copy Personalization</Label>
          <p className="text-xs text-muted-foreground">
            Show different messages based on visitor behavior
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
        />
      </div>

      {settings.enabled && (
        <div className="space-y-6 pl-4 border-l-2 border-muted">
          {/* Variable Substitution */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Variable Substitution</Label>
                <p className="text-xs text-muted-foreground">
                  Use dynamic variables in your copy
                </p>
              </div>
              <Switch
                checked={settings.variables.enabled}
                onCheckedChange={(enabled) =>
                  onChange({
                    ...settings,
                    variables: {
                      ...settings.variables,
                      enabled,
                    },
                  })
                }
                disabled={isReadOnly}
              />
            </div>

            {settings.variables.enabled && (
              <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
                <p className="text-xs font-medium text-blue-900 mb-2">Available Variables:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>
                    <code className="bg-blue-100 px-1 rounded">{'{page_title}'}</code> - Current page title
                  </li>
                  <li>
                    <code className="bg-blue-100 px-1 rounded">{'{site_name}'}</code> - Domain name
                  </li>
                  <li>
                    <code className="bg-blue-100 px-1 rounded">{'{url}'}</code> - Current URL path
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Context-Aware Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Context-Aware Rules</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRule}
                disabled={isReadOnly || settings.rules.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>

            {settings.rules.length === 0 ? (
              <div className="rounded-md bg-muted/30 p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No rules yet. Add a rule to show custom copy based on visitor context.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {settings.rules.map((rule) => (
                  <PersonalizationRuleRow
                    key={rule.id}
                    rule={rule}
                    onUpdate={(updates) => updateRule(rule.id, updates)}
                    onRemove={() => removeRule(rule.id)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Example */}
          {settings.rules.length > 0 && (
            <div className="rounded-md bg-green-50 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-900 mb-1">Example:</p>
              <p className="text-xs text-green-800">
                If visitor is on <code className="bg-green-100 px-1 rounded">/pricing</code> page,
                show: <strong>"{settings.rules[0].customTitle || 'Custom title'}"</strong>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PersonalizationRuleRow({
  rule,
  onUpdate,
  onRemove,
  isReadOnly,
}: {
  rule: PersonalizationRule
  onUpdate: (updates: Partial<PersonalizationRule>) => void
  onRemove: () => void
  isReadOnly: boolean
}) {
  const triggerType = PERSONALIZATION_TRIGGERS.find((t) => t.value === rule.trigger)
  const isNumericTrigger = rule.trigger === 'scroll_depth_gt' || rule.trigger === 'time_on_site_gt'

  return (
    <div className="p-3 rounded-md border bg-card space-y-3">
      {/* Trigger Condition */}
      <div className="flex items-center gap-2">
        <Select
          value={rule.trigger}
          onValueChange={(value) =>
            onUpdate({
              trigger: value as PersonalizationTrigger,
              value: '',
            })
          }
          disabled={isReadOnly}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERSONALIZATION_TRIGGERS.map((trigger) => (
              <SelectItem key={trigger.value} value={trigger.value}>
                {trigger.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type={isNumericTrigger ? 'number' : 'text'}
          value={rule.value}
          onChange={(e) =>
            onUpdate({
              value: isNumericTrigger ? parseFloat(e.target.value) || 0 : e.target.value,
            })
          }
          disabled={isReadOnly}
          placeholder={triggerType?.placeholder || ''}
          className="flex-1"
        />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isReadOnly}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>

      {/* Custom Copy Fields */}
      <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-muted">
        <div className="space-y-1">
          <Label htmlFor={`title-${rule.id}`} className="text-xs">
            Custom Title (optional)
          </Label>
          <Input
            id={`title-${rule.id}`}
            value={rule.customTitle || ''}
            onChange={(e) => onUpdate({ customTitle: e.target.value })}
            disabled={isReadOnly}
            placeholder="Quick pricing feedback?"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`desc-${rule.id}`} className="text-xs">
            Custom Description (optional)
          </Label>
          <Input
            id={`desc-${rule.id}`}
            value={rule.customDescription || ''}
            onChange={(e) => onUpdate({ customDescription: e.target.value })}
            disabled={isReadOnly}
            placeholder="Help us improve our pricing page"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`btn-${rule.id}`} className="text-xs">
            Custom Button Text (optional)
          </Label>
          <Input
            id={`btn-${rule.id}`}
            value={rule.customButtonText || ''}
            onChange={(e) => onUpdate({ customButtonText: e.target.value })}
            disabled={isReadOnly}
            placeholder="Share Feedback"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )
}
