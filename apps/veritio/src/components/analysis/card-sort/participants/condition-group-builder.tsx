'use client'

import { useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'
import { ConditionBuilder } from './condition-builder'
import type { SegmentCondition, SegmentConditionGroup } from '@veritio/study-types'
import type { StudyType, DesignOption, ResponseTagOption } from '@/lib/segment-conditions'
import type { QuestionOption, UrlTagOption } from './types'
import { cn } from '@/lib/utils'

interface ConditionGroupBuilderProps {
  groups: SegmentConditionGroup[]
  onChange: (groups: SegmentConditionGroup[]) => void
  /** Study type to determine available conditions */
  studyType?: StudyType
  questions?: QuestionOption[]
  urlTags?: UrlTagOption[]
  categoriesRange?: { min: number; max: number }
  timeRange?: { min: number; max: number }
  /** Available designs for First Impression design_assignment condition */
  designs?: DesignOption[]
  /** Available response tags for First Impression response_tag condition */
  responseTags?: ResponseTagOption[]
}

export function ConditionGroupBuilder({
  groups,
  onChange,
  studyType = 'card_sort',
  questions = [],
  urlTags = [],
  categoriesRange,
  timeRange,
  designs = [],
  responseTags = [],
}: ConditionGroupBuilderProps) {
  const handleAddGroup = useCallback(() => {
    const newGroup: SegmentConditionGroup = {
      id: crypto.randomUUID(),
      conditions: [],
    }
    onChange([...groups, newGroup])
  }, [groups, onChange])

  const handleAddFirstCondition = useCallback(() => {
    const newCondition: SegmentCondition = {
      id: crypto.randomUUID(),
      type: 'question_response',
      operator: 'equals',
      value: '',
    }
    const newGroup: SegmentConditionGroup = {
      id: crypto.randomUUID(),
      conditions: [newCondition],
    }
    onChange([newGroup])
  }, [onChange])

  const handleRemoveGroup = useCallback(
    (groupId: string) => {
      onChange(groups.filter((g) => g.id !== groupId))
    },
    [groups, onChange]
  )

  const handleAddCondition = useCallback(
    (groupId: string) => {
      const newCondition: SegmentCondition = {
        id: crypto.randomUUID(),
        type: 'question_response',
        operator: 'equals',
        value: '',
      }
      onChange(
        groups.map((g) =>
          g.id === groupId
            ? { ...g, conditions: [...g.conditions, newCondition] }
            : g
        )
      )
    },
    [groups, onChange]
  )

  const handleUpdateCondition = useCallback(
    (groupId: string, conditionId: string, updates: Partial<SegmentCondition>) => {
      onChange(
        groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                conditions: g.conditions.map((c) =>
                  c.id === conditionId ? { ...c, ...updates } : c
                ),
              }
            : g
        )
      )
    },
    [groups, onChange]
  )

  const handleRemoveCondition = useCallback(
    (groupId: string, conditionId: string) => {
      onChange(
        groups.map((g) =>
          g.id === groupId
            ? { ...g, conditions: g.conditions.filter((c) => c.id !== conditionId) }
            : g
        )
      )
    },
    [groups, onChange]
  )

  const hasAnyConditions = groups.some((g) => g.conditions.length > 0)

  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="mb-4">No conditions defined yet.</p>
          <Button variant="outline" size="sm" onClick={handleAddFirstCondition}>
            <Plus className="mr-2 h-4 w-4" />
            Add condition
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group, groupIndex) => (
        <div key={group.id}>
          {/* OR separator between groups */}
          {groupIndex > 0 && (
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                OR
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          {/* Condition Group Card */}
          <Card className={cn(
            "relative",
            groups.length > 1 && "bg-muted/30"
          )}>
            <CardContent className="pt-4 pb-3">
              {/* Group Header - only show label when multiple groups */}
              {groups.length > 1 && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    Group {groupIndex + 1}
                    {group.conditions.length > 1 && (
                      <span className="ml-2 text-muted-foreground/70">
                        (all must match)
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveGroup(group.id)}
                    className="h-7 px-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* AND hint for single group with multiple conditions */}
              {groups.length === 1 && group.conditions.length > 1 && (
                <p className="text-xs text-muted-foreground mb-3">
                  All conditions must match (AND logic)
                </p>
              )}

              {/* Conditions within group */}
              {group.conditions.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground border border-dashed rounded">
                  Add at least one condition to this group
                </div>
              ) : (
                <div className="space-y-2">
                  {group.conditions.map((condition, condIndex) => (
                    <div key={condition.id}>
                      {/* AND separator within group */}
                      {condIndex > 0 && (
                        <div className="flex items-center gap-2 my-2 ml-4">
                          <span className="text-xs text-muted-foreground">AND</span>
                          <div className="flex-1 h-px bg-border/50" />
                        </div>
                      )}
                      <ConditionBuilder
                        condition={condition}
                        onChange={(updates) =>
                          handleUpdateCondition(group.id, condition.id, updates)
                        }
                        onRemove={() => handleRemoveCondition(group.id, condition.id)}
                        studyType={studyType}
                        questions={questions}
                        urlTags={urlTags}
                        categoriesRange={categoriesRange}
                        timeRange={timeRange}
                        designs={designs}
                        responseTags={responseTags}
                        index={condIndex}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Add condition to group */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddCondition(group.id)}
                className="w-full mt-3 text-muted-foreground"
              >
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add condition
              </Button>
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Add another group (OR) - only show when there are actual conditions */}
      {hasAnyConditions && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddGroup}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add OR group
        </Button>
      )}

      {/* Help text */}
      {groups.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          Participants matching <strong>any</strong> group will be included (OR logic)
        </p>
      )}
    </div>
  )
}

export function getConditionGroupsSummary(
  groups: SegmentConditionGroup[]
): string {
  if (groups.length === 0) return ''

  const groupSummaries = groups
    .filter((g) => g.conditions.length > 0)
    .map((group) => {
      const conditionSummaries = group.conditions.map((c) => {
        const operatorLabel =
          c.operator === 'equals' ? 'is' :
          c.operator === 'not_equals' ? 'is not' :
          c.operator === 'contains' ? 'contains' :
          c.operator === 'greater_than' ? '>' :
          c.operator === 'less_than' ? '<' :
          c.operator === 'between' ? 'between' :
          c.operator

        if (c.type === 'question_response' && c.questionText) {
          return `"${c.questionText}" ${operatorLabel} "${c.value}"`
        }
        if (c.type === 'status') {
          return `Status ${operatorLabel} "${c.value}"`
        }
        if (c.type === 'url_tag' && c.tagKey) {
          return `Tag "${c.tagKey}" ${operatorLabel} "${c.value}"`
        }
        if (c.type === 'categories_created') {
          if (c.operator === 'between' && Array.isArray(c.value)) {
            return `Categories ${c.value[0]}-${c.value[1]}`
          }
          return `Categories ${operatorLabel} ${c.value}`
        }
        if (c.type === 'time_taken') {
          if (c.operator === 'between' && Array.isArray(c.value)) {
            return `Time ${c.value[0]}s-${c.value[1]}s`
          }
          return `Time ${operatorLabel} ${c.value}s`
        }
        if (c.type === 'participant_id') {
          return `ID ${operatorLabel} "${c.value}"`
        }
        // First Impression conditions
        if (c.type === 'device_type') {
          return `Device ${operatorLabel} "${c.value}"`
        }
        if (c.type === 'design_assignment') {
          return `Design ${operatorLabel} "${c.value}"`
        }
        if (c.type === 'response_tag') {
          const tagName = c.responseTagName || c.value
          return `Tag ${operatorLabel} "${tagName}"`
        }
        // Percentage conditions
        if (c.type === 'response_rate' || c.type === 'task_success_rate' ||
            c.type === 'direct_success_rate' || c.type === 'correct_clicks_rate') {
          const label = c.type === 'response_rate' ? 'Response rate' :
                       c.type === 'task_success_rate' ? 'Task success' :
                       c.type === 'direct_success_rate' ? 'Direct success' :
                       'Correct clicks'
          if (c.operator === 'between' && Array.isArray(c.value)) {
            return `${label} ${c.value[0]}%-${c.value[1]}%`
          }
          return `${label} ${operatorLabel} ${c.value}%`
        }
        // Numeric conditions
        if (c.type === 'tasks_completed' || c.type === 'misclick_count' || c.type === 'questions_answered') {
          const label = c.type === 'tasks_completed' ? 'Tasks' :
                       c.type === 'misclick_count' ? 'Misclicks' :
                       'Questions'
          if (c.operator === 'between' && Array.isArray(c.value)) {
            return `${label} ${c.value[0]}-${c.value[1]}`
          }
          return `${label} ${operatorLabel} ${c.value}`
        }
        return `${c.type} ${operatorLabel} ${c.value}`
      })

      if (conditionSummaries.length === 1) {
        return conditionSummaries[0]
      }
      return `(${conditionSummaries.join(' AND ')})`
    })

  return groupSummaries.join(' OR ')
}
