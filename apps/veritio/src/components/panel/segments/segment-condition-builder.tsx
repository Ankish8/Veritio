'use client'

/**
 * Segment Condition Builder
 *
 * Visual builder for segment filter conditions (AND logic only).
 */

import { memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X, GripVertical } from 'lucide-react'
import type { SegmentCondition, SegmentOperator } from '@/lib/supabase/panel-types'

interface SegmentConditionBuilderProps {
  conditions: SegmentCondition[]
  onChange: (conditions: SegmentCondition[]) => void
}

// Field groups for organized display
type FieldOption = {
  value: string
  label: string
  type: 'select' | 'text' | 'number'
  options?: string[]
  group: 'participant' | 'demographics' | 'browser' | 'location' | 'activity'
}

// Available fields for filtering
const FIELD_OPTIONS: FieldOption[] = [
  // Participant fields
  { value: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'blacklisted'], group: 'participant' },
  { value: 'source', label: 'Source', type: 'select', options: ['widget', 'import', 'manual', 'link', 'email'], group: 'participant' },

  // Demographics fields
  { value: 'demographics.country', label: 'Country', type: 'text', group: 'demographics' },
  { value: 'demographics.age_range', label: 'Age Range', type: 'select', options: ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'], group: 'demographics' },
  { value: 'demographics.gender', label: 'Gender', type: 'select', options: ['male', 'female', 'non_binary', 'prefer_not_to_say', 'other'], group: 'demographics' },
  { value: 'demographics.industry', label: 'Industry', type: 'text', group: 'demographics' },
  { value: 'demographics.job_role', label: 'Job Role', type: 'text', group: 'demographics' },
  { value: 'demographics.company_size', label: 'Company Size', type: 'select', options: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'], group: 'demographics' },
  { value: 'demographics.language', label: 'Language', type: 'text', group: 'demographics' },

  // Browser/Device fields (from widget auto-capture)
  { value: 'source_details.browser_data.browser', label: 'Browser', type: 'select', options: ['Chrome', 'Firefox', 'Safari', 'Edge', 'Opera', 'Other'], group: 'browser' },
  { value: 'source_details.browser_data.operatingSystem', label: 'Operating System', type: 'select', options: ['Windows', 'macOS', 'Linux', 'iOS', 'Android', 'Other'], group: 'browser' },
  { value: 'source_details.browser_data.deviceType', label: 'Device Type', type: 'select', options: ['desktop', 'mobile', 'tablet'], group: 'browser' },
  { value: 'source_details.browser_data.screenResolution', label: 'Screen Resolution', type: 'text', group: 'browser' },
  { value: 'source_details.browser_data.timeZone', label: 'Time Zone', type: 'text', group: 'browser' },

  // Location fields (from IP geolocation)
  { value: 'source_details.browser_data.geoLocation.country', label: 'Location (Country)', type: 'text', group: 'location' },
  { value: 'source_details.browser_data.geoLocation.region', label: 'Location (Region)', type: 'text', group: 'location' },
  { value: 'source_details.browser_data.geoLocation.city', label: 'Location (City)', type: 'text', group: 'location' },
  { value: 'source_details.browser_data.geoLocation.timezone', label: 'Location (Timezone)', type: 'text', group: 'location' },

  // Activity fields
  { value: 'study_count', label: 'Studies Completed', type: 'number', group: 'activity' },
  { value: 'tags', label: 'Has Tag', type: 'text', group: 'activity' },
]

// Group labels for display
const GROUP_LABELS: Record<string, string> = {
  participant: 'Participant',
  demographics: 'Demographics',
  browser: 'Browser & Device',
  location: 'Location (Auto-detected)',
  activity: 'Activity',
}

// Available operators based on field type
const OPERATOR_OPTIONS: Record<string, { value: SegmentOperator; label: string }[]> = {
  select: [
    { value: 'equals', label: 'is' },
    { value: 'not_equals', label: 'is not' },
  ],
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'not_equals', label: 'does not equal' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
  ],
}

export const SegmentConditionBuilder = memo(function SegmentConditionBuilder({
  conditions,
  onChange,
}: SegmentConditionBuilderProps) {
  const addCondition = useCallback(() => {
    onChange([
      ...conditions,
      { field: 'status', operator: 'equals', value: 'active' },
    ])
  }, [conditions, onChange])

  const removeCondition = useCallback((index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }, [conditions, onChange])

  const updateCondition = useCallback((index: number, updates: Partial<SegmentCondition>) => {
    onChange(
      conditions.map((c, i) =>
        i === index ? { ...c, ...updates } : c
      )
    )
  }, [conditions, onChange])

  const getFieldConfig = (field: string) => {
    return FIELD_OPTIONS.find((f) => f.value === field)
  }

  const getOperators = (field: string) => {
    const fieldConfig = getFieldConfig(field)
    return OPERATOR_OPTIONS[fieldConfig?.type || 'text'] || OPERATOR_OPTIONS.text
  }

  return (
    <div className="space-y-3">
      {conditions.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Add conditions to filter participants. All conditions must match (AND logic).
          </p>
        </div>
      )}

      {conditions.map((condition, index) => {
        const fieldConfig = getFieldConfig(condition.field)
        const operators = getOperators(condition.field)
        const showValueInput = !['is_empty', 'is_not_empty'].includes(condition.operator)

        return (
          <div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
            {/* Drag handle (visual only for now) */}
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move shrink-0" />

            {/* Field selector */}
            <Select
              value={condition.field}
              onValueChange={(value) => {
                const newFieldConfig = getFieldConfig(value)
                const newOperators = OPERATOR_OPTIONS[newFieldConfig?.type || 'text']
                updateCondition(index, {
                  field: value,
                  operator: newOperators[0].value,
                  value: newFieldConfig?.type === 'select' ? (newFieldConfig.options?.[0] || '') : '',
                })
              }}
            >
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {(['participant', 'demographics', 'browser', 'location', 'activity'] as const).map((group) => {
                  const groupFields = FIELD_OPTIONS.filter((f) => f.group === group)
                  if (groupFields.length === 0) return null
                  return (
                    <SelectGroup key={group}>
                      <SelectLabel className="text-xs text-muted-foreground">
                        {GROUP_LABELS[group]}
                      </SelectLabel>
                      {groupFields.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )
                })}
              </SelectContent>
            </Select>

            {/* Operator selector */}
            <Select
              value={condition.operator}
              onValueChange={(value) => updateCondition(index, { operator: value as SegmentOperator })}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operators.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Value input */}
            {showValueInput && (
              <>
                {fieldConfig?.type === 'select' && fieldConfig.options ? (
                  <Select
                    value={String(condition.value)}
                    onValueChange={(value) => updateCondition(index, { value })}
                  >
                    <SelectTrigger className="flex-1 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldConfig.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {formatOptionLabel(opt)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={fieldConfig?.type === 'number' ? 'number' : 'text'}
                    value={String(condition.value)}
                    onChange={(e) => updateCondition(index, {
                      value: fieldConfig?.type === 'number' ? Number(e.target.value) : e.target.value
                    })}
                    placeholder="Enter value..."
                    className="flex-1 h-9"
                  />
                )}
              </>
            )}

            {/* Remove button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => removeCondition(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      {/* AND indicator between conditions */}
      {conditions.length > 0 && (
        <div className="flex items-center justify-center">
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
            AND
          </span>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addCondition}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Condition
      </Button>
    </div>
  )
})

function formatOptionLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
