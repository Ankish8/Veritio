'use client'

import { PreviewLayout, PreviewButton } from '../preview-layout'
import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface InstructionsPreviewProps {
  settings: StudyFlowSettings['activityInstructions']
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
}

export function InstructionsPreview({ settings, studyType }: InstructionsPreviewProps) {
  const { title, part1, part2 } = settings

  const getDefaultTitle = () => {
    switch (studyType) {
      case 'card_sort':
        return 'Card Sorting Instructions'
      case 'tree_test':
        return 'Tree Test Instructions'
      default:
        return 'Instructions'
    }
  }

  const getButtonText = () => {
    switch (studyType) {
      case 'card_sort':
        return 'Start Card Sorting'
      case 'tree_test':
        return 'Start Tree Test'
      default:
        return 'Start Activity'
    }
  }

  return (
    <PreviewLayout
      title={title || getDefaultTitle()}
      actions={
        <div className="flex justify-end">
          <PreviewButton>{getButtonText()}</PreviewButton>
        </div>
      }
    >
      {/* Part 1 - Main instructions */}
      {part1 ? (
        <div
          className="prose prose-stone prose-sm max-w-none text-stone-600
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
            [&_li]:my-1
            [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: part1 }}
        />
      ) : (
        <p className="text-sm text-muted-foreground italic mb-4">
          No instructions configured
        </p>
      )}

      {/* Part 2 - Additional instructions */}
      {part2 && (
        <div
          className="prose prose-stone prose-sm max-w-none text-stone-600 mt-4 pt-4 border-t
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
            [&_li]:my-1
            [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: part2 }}
        />
      )}
    </PreviewLayout>
  )
}
