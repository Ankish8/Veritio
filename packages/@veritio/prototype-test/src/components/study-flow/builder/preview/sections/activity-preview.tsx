'use client'

import { useTreeTestBuilderStore, useCardSortBuilderStore } from '@/stores/study-builder'
import { TreeTestPlayer } from '@/components/players/tree-test/tree-test-player'
import { CardSortPlayer } from '@/components/players/card-sort/card-sort-player'
import { PreviewLayout } from '../preview-layout'
import { Trees, LayoutGrid } from 'lucide-react'

interface ActivityPreviewProps {
  studyType: 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
  studyId: string
}

export function ActivityPreview({ studyType, studyId }: ActivityPreviewProps) {
  // Tree Test data
  const treeNodes = useTreeTestBuilderStore((state) => state.nodes)
  const treeTasks = useTreeTestBuilderStore((state) => state.tasks)
  const treeSettings = useTreeTestBuilderStore((state) => state.settings)

  // Card Sort data
  const cardSortCards = useCardSortBuilderStore((state) => state.cards)
  const cardSortCategories = useCardSortBuilderStore((state) => state.categories)
  const cardSortSettings = useCardSortBuilderStore((state) => state.settings)

  if (studyType === 'tree_test') {
    // Check if tree test has data
    const hasNodes = treeNodes.length > 0
    const hasTasks = treeTasks.length > 0

    if (!hasNodes || !hasTasks) {
      return (
        <PreviewLayout centered>
          <div className="py-8">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
              <Trees className="h-6 w-6 text-stone-500" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 mb-2">Tree Test Preview</h2>
            <p className="text-sm text-muted-foreground">
              {!hasNodes && !hasTasks
                ? 'Add tree nodes and tasks to preview the tree test'
                : !hasNodes
                  ? 'Add tree nodes to preview the tree test'
                  : 'Add tasks to preview the tree test'}
            </p>
          </div>
        </PreviewLayout>
      )
    }

    return (
      <div className="h-full flex flex-col">
        <TreeTestPlayer
          studyId={studyId}
          shareCode=""
          tasks={treeTasks}
          nodes={treeNodes}
          settings={treeSettings as any}
          welcomeMessage=""
          thankYouMessage=""
          embeddedMode={true}
          previewMode={true}
          onComplete={() => {}}
        />
      </div>
    )
  }

  if (studyType === 'card_sort') {
    // Check if card sort has data
    const hasCards = cardSortCards.length > 0
    const hasCategories = cardSortCategories.length > 0 || cardSortSettings.mode === 'open'

    if (!hasCards) {
      return (
        <PreviewLayout centered>
          <div className="py-6">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3">
              <LayoutGrid className="h-5 w-5 text-stone-500" />
            </div>
            <h2 className="text-base font-semibold text-stone-900 mb-1">No Cards Yet</h2>
            <p className="text-xs text-muted-foreground px-4">
              Add cards in the Card Sort tab to see a live preview here
            </p>
          </div>
        </PreviewLayout>
      )
    }

    return (
      <div className="h-full flex flex-col">
        <CardSortPlayer
          studyId={studyId}
          shareCode=""
          cards={cardSortCards}
          categories={cardSortCategories}
          settings={cardSortSettings as any}
          welcomeMessage=""
          thankYouMessage=""
          embeddedMode={true}
          previewMode={true}
          onComplete={() => {}}
        />
      </div>
    )
  }

  // Survey type - no main activity preview (questions are shown in questions-preview)
  return (
    <PreviewLayout centered>
      <div className="py-8">
        <p className="text-sm text-muted-foreground">
          Survey questions are shown directly in the questions section
        </p>
      </div>
    </PreviewLayout>
  )
}
