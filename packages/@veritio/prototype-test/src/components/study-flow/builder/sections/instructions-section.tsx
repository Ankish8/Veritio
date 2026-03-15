'use client'

import { Label } from '@veritio/ui/components/label'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { cardSortInstructions, treeTestInstructions, prototypeTestInstructions, firstClickInstructions, firstImpressionInstructions, liveWebsiteTestInstructions } from '@veritio/prototype-test/lib/study-flow/defaults'
import { Button } from '@veritio/ui/components/button'
import { RotateCcw, ExternalLink } from 'lucide-react'
import { CollaborativeField, CollaborativeRichText } from './collaborative-field'

interface InstructionsSectionProps {
  studyType: 'card_sort' | 'tree_test' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyId: string
  onNavigateToContent?: () => void
}

const STUDY_TYPE_LABELS = {
  card_sort: { name: 'Card Sorting', editLabel: 'Cards' },
  tree_test: { name: 'Tree Testing', editLabel: 'Tree' },
  prototype_test: { name: 'Prototype Testing', editLabel: 'Prototype' },
  first_click: { name: 'First-Click Testing', editLabel: 'Tasks' },
  first_impression: { name: 'First Impression Testing', editLabel: 'Designs' },
  live_website_test: { name: 'Live Website Testing', editLabel: 'Tasks' },
} as const

export function InstructionsSection({ studyType, studyId, onNavigateToContent }: InstructionsSectionProps) {
  const { flowSettings, updateInstructionsSettings } = useStudyFlowBuilderStore()
  const { activityInstructions } = flowSettings

  const resetToDefault = () => {
    if (studyType === 'card_sort') {
      updateInstructionsSettings({
        enabled: true,
        title: 'Instructions',
        part1: cardSortInstructions.open.part1,
        part2: cardSortInstructions.open.part2,
      })
    } else if (studyType === 'tree_test') {
      updateInstructionsSettings({
        enabled: true,
        title: 'Instructions',
        part1: treeTestInstructions.part1,
        part2: treeTestInstructions.part2,
      })
    } else if (studyType === 'prototype_test') {
      updateInstructionsSettings({
        enabled: true,
        title: 'Instructions',
        part1: prototypeTestInstructions.part1,
        part2: prototypeTestInstructions.part2,
      })
    } else if (studyType === 'first_click') {
      updateInstructionsSettings({
        enabled: true,
        title: 'Instructions',
        part1: firstClickInstructions.part1,
        part2: firstClickInstructions.part2,
      })
    } else if (studyType === 'first_impression') {
      updateInstructionsSettings({
        enabled: true,
        title: 'Instructions',
        part1: firstImpressionInstructions.part1,
        part2: firstImpressionInstructions.part2,
      })
    } else if (studyType === 'live_website_test') {
      updateInstructionsSettings({
        enabled: true,
        title: 'Instructions',
        part1: liveWebsiteTestInstructions.part1,
        part2: liveWebsiteTestInstructions.part2,
      })
    }
  }

  const labels = STUDY_TYPE_LABELS[studyType]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">
            {labels.name} Instructions
          </h4>
          <p className="text-sm text-muted-foreground">
            Explain to participants how to complete the activity.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onNavigateToContent && (
            <Button
              variant="default"
              size="sm"
              onClick={onNavigateToContent}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Edit {labels.editLabel}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Default
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions-title">Title</Label>
        <CollaborativeField
          id="instructions-title"
          fieldPath="flow.instructions.title"
          value={activityInstructions.title}
          onChange={(value) => updateInstructionsSettings({ title: value })}
          placeholder="Instructions"
        />
      </div>

      <div className="space-y-2">
        <Label>Initial Instructions</Label>
        <CollaborativeRichText
          fieldPath="flow.instructions.part1"
          content={activityInstructions.part1}
          onChange={(html) => updateInstructionsSettings({ part1: html })}
          placeholder="Enter instructions shown before the activity begins..."
          minHeight="150px"
          studyId={studyId}
        />
        <p className="text-xs text-muted-foreground">
          These instructions are shown before the participant starts.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Secondary Instructions (Optional)</Label>
        <CollaborativeRichText
          fieldPath="flow.instructions.part2"
          content={activityInstructions.part2 || ''}
          onChange={(html) => updateInstructionsSettings({ part2: html || undefined })}
          placeholder="Additional instructions shown after they begin..."
          minHeight="100px"
          studyId={studyId}
        />
        <p className="text-xs text-muted-foreground">
          Optional: Show additional guidance after the participant makes their first action.
        </p>
      </div>
    </div>
  )
}
