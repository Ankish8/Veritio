'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Plus, Trash2, ChevronDown, ChevronRight, Link, Clock, ArrowDownToLine, Globe } from 'lucide-react'
import type {
  WidgetCopyPersonalization,
  WidgetPersonalizationRule,
  WidgetPersonalizationTrigger,
} from '@/lib/supabase/panel-types'

interface CopyPersonalizationBuilderProps {
  config: WidgetCopyPersonalization | undefined
  onChange: (config: WidgetCopyPersonalization) => void
}

const TRIGGER_OPTIONS: {
  value: WidgetPersonalizationTrigger
  label: string
  description: string
  icon: typeof Link
  placeholder: string
  unit?: string
}[] = [
  {
    value: 'url_contains',
    label: 'URL Contains',
    description: 'Current page URL includes text',
    icon: Link,
    placeholder: '/pricing',
  },
  {
    value: 'referrer_contains',
    label: 'Referrer Contains',
    description: 'Visitor came from URL containing',
    icon: Globe,
    placeholder: 'google.com',
  },
  {
    value: 'scroll_depth_gt',
    label: 'Scroll Depth >',
    description: 'User scrolled past percentage',
    icon: ArrowDownToLine,
    placeholder: '50',
    unit: '%',
  },
  {
    value: 'time_on_site_gt',
    label: 'Time on Site >',
    description: 'User spent more than X seconds',
    icon: Clock,
    placeholder: '30',
    unit: 'seconds',
  },
]

const VARIABLE_HELP = [
  { variable: '{page_title}', description: 'Current page title' },
  { variable: '{site_name}', description: 'Website hostname' },
  { variable: '{url}', description: 'Current URL path' },
]

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function CopyPersonalizationBuilder({
  config,
  onChange,
}: CopyPersonalizationBuilderProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set())

  // Local state for rules - synced from config, saved on blur
  const [localRules, setLocalRules] = useState<WidgetPersonalizationRule[]>(config?.rules || [])
  const variablesEnabled = config?.variables?.enabled ?? false

  // Sync local rules when config changes externally (e.g., after add/delete)
  useEffect(() => {
    setLocalRules(config?.rules || []) // eslint-disable-line react-hooks/set-state-in-effect
  }, [config?.rules])

  const toggleRuleExpanded = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev)
      if (next.has(ruleId)) {
        next.delete(ruleId)
      } else {
        next.add(ruleId)
      }
      return next
    })
  }

  const addRule = () => {
    const newRule: WidgetPersonalizationRule = {
      id: generateId(),
      trigger: 'url_contains',
      value: '',
      customTitle: '',
      customDescription: '',
      customButtonText: '',
    }
    const newRules = [...localRules, newRule]
    // Update local state immediately
    setLocalRules(newRules)
    // Save to parent (this is an action, not typing)
    onChange({
      ...config,
      enabled: true,
      rules: newRules,
      variables: config?.variables || { enabled: false },
    })
    // Auto-expand the new rule
    setExpandedRules((prev) => new Set([...prev, newRule.id]))
  }

  // Update local state only (while typing)
  const updateLocalRule = (ruleId: string, updates: Partial<WidgetPersonalizationRule>) => {
    setLocalRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule))
    )
  }

  // Save to parent (on blur)
  const saveRules = useCallback(() => {
    onChange({
      ...config,
      enabled: config?.enabled ?? true,
      rules: localRules,
      variables: config?.variables || { enabled: false },
    })
  }, [config, localRules, onChange])

  // Update local + save immediately (for select dropdowns)
  const updateRuleAndSave = (ruleId: string, updates: Partial<WidgetPersonalizationRule>) => {
    const newRules = localRules.map((rule) =>
      rule.id === ruleId ? { ...rule, ...updates } : rule
    )
    setLocalRules(newRules)
    onChange({
      ...config,
      enabled: config?.enabled ?? true,
      rules: newRules,
      variables: config?.variables || { enabled: false },
    })
  }

  const deleteRule = (ruleId: string) => {
    const newRules = localRules.filter((rule) => rule.id !== ruleId)
    setLocalRules(newRules)
    onChange({
      ...config,
      enabled: config?.enabled ?? true,
      rules: newRules,
      variables: config?.variables || { enabled: false },
    })
    setExpandedRules((prev) => {
      const next = new Set(prev)
      next.delete(ruleId)
      return next
    })
  }

  const toggleVariables = (enabled: boolean) => {
    onChange({
      ...config,
      enabled: config?.enabled ?? true,
      rules: localRules,
      variables: { ...config?.variables, enabled },
    })
  }

  const getTriggerInfo = (trigger: WidgetPersonalizationTrigger) =>
    TRIGGER_OPTIONS.find((t) => t.value === trigger) || TRIGGER_OPTIONS[0]

  const getCustomFieldCount = (rule: WidgetPersonalizationRule) => {
    let count = 0
    if (rule.customTitle) count++
    if (rule.customDescription) count++
    if (rule.customButtonText) count++
    return count
  }

  return (
    <div className="space-y-4">
      {/* Rules List */}
      <div className="space-y-2">
        {localRules.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3 text-center border border-dashed rounded-md">
            No personalization rules yet. Add one to customize messaging based on context.
          </div>
        ) : (
          localRules.map((rule) => {
            const triggerInfo = getTriggerInfo(rule.trigger)
            const TriggerIcon = triggerInfo.icon
            const isExpanded = expandedRules.has(rule.id)
            const customCount = getCustomFieldCount(rule)

            return (
              <Collapsible
                key={rule.id}
                open={isExpanded}
                onOpenChange={() => toggleRuleExpanded(rule.id)}
              >
                <div className="border rounded-md overflow-hidden">
                  {/* Header row - trigger and delete button side by side */}
                  <div className="flex items-center">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <TriggerIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{triggerInfo.label}</span>
                            {rule.value && (
                              <span className="text-sm text-muted-foreground truncate">
                                "{rule.value}"
                                {triggerInfo.unit && ` ${triggerInfo.unit}`}
                              </span>
                            )}
                          </div>
                          {customCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {customCount} custom field{customCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    {/* Delete button - outside the trigger */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                      className="h-8 w-8 p-0 mr-2 text-muted-foreground hover:text-destructive flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 space-y-4 border-t bg-muted/30">
                      {/* Trigger Configuration - stacked vertically */}
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">When</Label>
                          <Select
                            value={rule.trigger}
                            onValueChange={(value: WidgetPersonalizationTrigger) =>
                              updateRuleAndSave(rule.id, { trigger: value, value: '' })
                            }
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRIGGER_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2">
                                    <opt.icon className="h-3.5 w-3.5" />
                                    {opt.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Value</Label>
                          <div className="relative">
                            <Input
                              value={String(rule.value)}
                              onChange={(e) => updateLocalRule(rule.id, { value: e.target.value })}
                              onBlur={saveRules}
                              placeholder={triggerInfo.placeholder}
                              className="h-9 pr-16"
                            />
                            {triggerInfo.unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {triggerInfo.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Custom Text Overrides */}
                      <div className="space-y-3">
                        <Label className="text-xs font-medium">Show Custom Text</Label>
                        <p className="text-xs text-muted-foreground -mt-1">
                          Leave blank to use default. Only filled fields will override.
                        </p>

                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Title</Label>
                            <Input
                              value={rule.customTitle || ''}
                              onChange={(e) => updateLocalRule(rule.id, { customTitle: e.target.value })}
                              onBlur={saveRules}
                              placeholder="Custom title for this context..."
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Description</Label>
                            <Input
                              value={rule.customDescription || ''}
                              onChange={(e) =>
                                updateLocalRule(rule.id, { customDescription: e.target.value })
                              }
                              onBlur={saveRules}
                              placeholder="Custom description..."
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">Button Text</Label>
                            <Input
                              value={rule.customButtonText || ''}
                              onChange={(e) =>
                                updateLocalRule(rule.id, { customButtonText: e.target.value })
                              }
                              onBlur={saveRules}
                              placeholder="Custom button text..."
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )
          })
        )}
      </div>

      {/* Add Rule Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={addRule}
        className="w-full h-9"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Personalization Rule
      </Button>

      {/* Variable Substitution */}
      <div className="border-t pt-4 mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Variable Substitution</Label>
            <p className="text-xs text-muted-foreground">
              Use placeholders in your text
            </p>
          </div>
          <Switch checked={variablesEnabled} onCheckedChange={toggleVariables} />
        </div>

        {variablesEnabled && (
          <div className="bg-muted/50 rounded-md p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground mb-2">Available variables:</p>
            {VARIABLE_HELP.map((v) => (
              <div key={v.variable} className="flex items-center gap-2 text-xs">
                <code className="bg-background px-1.5 py-0.5 rounded font-mono">
                  {v.variable}
                </code>
                <span className="text-muted-foreground">→ {v.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
