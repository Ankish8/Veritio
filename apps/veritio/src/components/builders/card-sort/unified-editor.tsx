'use client'

import { memo } from 'react'
import { useCardSortSettings } from '@/stores/study-builder'
import { BuildWithAIButton } from '@/components/builders/shared/build-with-ai-button'
import { CardsSection, CategoriesSection } from './sections'

function UnifiedCardSortEditorComponent({ studyId }: { studyId: string }) {
  const settings = useCardSortSettings()
  const showCategories = settings.mode !== 'open'

  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 pt-1 pb-6">
      <div className="flex justify-end mb-2">
        <BuildWithAIButton studyType="card_sort" />
      </div>
      {showCategories ? (
        <div className="flex-1 min-h-0 grid gap-8 lg:grid-cols-2">
          <CardsSection studyId={studyId} />
          <CategoriesSection studyId={studyId} />
        </div>
      ) : (
        <CardsSection studyId={studyId} />
      )}
    </div>
  )
}

export const UnifiedCardSortEditor = memo(UnifiedCardSortEditorComponent)
