'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { Save, Loader2 } from 'lucide-react'
import { ConditionGroupBuilder, getConditionGroupsSummary } from './condition-group-builder'
import type {
  SegmentCondition,
  SegmentConditionsV2,
  SegmentConditionGroup,
  StudySegment,
} from '@veritio/study-types'
import {
  isSegmentConditionsV2,
  migrateToConditionsV2,
} from '@veritio/study-types'
import { castJson } from '@/lib/supabase/json-utils'
import type { StudyType, DesignOption, ResponseTagOption } from '@/lib/segment-conditions'
import type { QuestionOption, UrlTagOption } from './types'

export interface CreateSegmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string, description: string | null, conditions: SegmentConditionsV2) => Promise<void>
  studyType?: StudyType
  questions?: QuestionOption[]
  urlTags?: UrlTagOption[]
  categoriesRange?: { min: number; max: number }
  timeRange?: { min: number; max: number }
  designs?: DesignOption[]
  responseTags?: ResponseTagOption[]
  editingSegment?: StudySegment | null
}

export function CreateSegmentModal({
  open,
  onOpenChange,
  onSave,
  studyType = 'card_sort',
  questions = [],
  urlTags = [],
  categoriesRange,
  timeRange,
  designs = [],
  responseTags = [],
  editingSegment,
}: CreateSegmentModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [conditionsV2, setConditionsV2] = useState<SegmentConditionsV2>({
    version: 2,
    groups: [],
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editingSegment) {
      setName(editingSegment.name || '')
      setDescription(editingSegment.description || '')

      if (editingSegment.conditions) {
        const conditions = castJson<SegmentCondition[] | SegmentConditionsV2>(
          editingSegment.conditions,
          []
        )
        if (isSegmentConditionsV2(conditions)) {
          setConditionsV2(conditions)
        } else if (Array.isArray(conditions)) {
          setConditionsV2(migrateToConditionsV2(conditions))
        }
      } else {
        setConditionsV2({ version: 2, groups: [] })
      }

      setError(null)
    }
  }, [editingSegment])

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen && !editingSegment) {
          setName('')
        setDescription('')
        setConditionsV2({ version: 2, groups: [] })
        setError(null)
      }
      onOpenChange(newOpen)
    },
    [editingSegment, onOpenChange]
  )

  const handleConditionsChange = useCallback((groups: SegmentConditionGroup[]) => {
    setConditionsV2((prev) => ({ ...prev, groups }))
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter a segment name')
      return
    }

    if (conditionsV2.groups.length === 0) {
      setError('Please add at least one condition')
      return
    }

    const emptyGroups = conditionsV2.groups.filter((g) => g.conditions.length === 0)
    if (emptyGroups.length > 0) {
      setError('Each group must have at least one condition')
      return
    }

    for (const group of conditionsV2.groups) {
      for (const condition of group.conditions) {
        if (condition.type === 'question_response' && !condition.questionId) {
          setError('Please select a question for each question response condition')
          return
        }
        if (condition.type === 'url_tag' && !condition.tagKey) {
          setError('Please select a tag key for each URL tag condition')
          return
        }
        if (condition.value === '' || condition.value === undefined) {
          setError('Please fill in all condition values')
          return
        }
      }
    }

    setError(null)
    setIsSaving(true)

    try {
      await onSave(name.trim(), description.trim() || null, conditionsV2)
      handleOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save segment')
    } finally {
      setIsSaving(false)
    }
  }, [name, description, conditionsV2, onSave, handleOpenChange])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isSaving) {
        e.preventDefault()
        handleSave()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, isSaving, handleSave])

  const summaryText = useMemo(() => {
    return getConditionGroupsSummary(conditionsV2.groups)
  }, [conditionsV2.groups])

  const isEditing = !!editingSegment
  const hasConditions = conditionsV2.groups.some((g) => g.conditions.length > 0)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Fixed Header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            {isEditing ? 'Edit participant segment' : 'Create new participant segment'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modify the segment conditions to update the filter.'
              : 'Define conditions to filter participants into a segment.'}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Segment name */}
            <div className="space-y-2">
              <Label htmlFor="segment-name">Segment name</Label>
              <Input
                id="segment-name"
                placeholder="e.g., Completed from India"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Description (optional) */}
            <div className="space-y-2">
              <Label htmlFor="segment-description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="segment-description"
                placeholder="Brief description of this segment"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Condition Groups */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Conditions</Label>
                {conditionsV2.groups.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Groups are combined with OR logic
                  </span>
                )}
              </div>

              <ConditionGroupBuilder
                groups={conditionsV2.groups}
                onChange={handleConditionsChange}
                studyType={studyType}
                questions={questions}
                urlTags={urlTags}
                categoriesRange={categoriesRange}
                timeRange={timeRange}
                designs={designs}
                responseTags={responseTags}
              />
            </div>

            {/* Summary */}
            {hasConditions && summaryText && (
              <div className="space-y-2">
                <Label>Summary</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {summaryText}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && <div className="text-sm text-destructive">{error}</div>}
          </div>
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 px-6 pt-4 pb-6 border-t bg-background">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
            <EscapeHint variant="light" />
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasConditions}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update segment' : 'Save segment'}
                <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
