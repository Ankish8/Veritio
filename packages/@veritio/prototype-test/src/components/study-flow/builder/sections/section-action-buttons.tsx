'use client'

import { memo } from 'react'
import { Plus, FolderPlus } from 'lucide-react'

export interface SectionActionButtonsProps {
  onAddQuestion: () => void
  onAddSection?: () => void
}
export const SectionActionButtons = memo(function SectionActionButtons({
  onAddQuestion,
  onAddSection,
}: SectionActionButtonsProps) {
  return (
    <>
      <button
        className="w-full"
        onClick={(e) => {
          e.stopPropagation()
          onAddQuestion()
        }}
      >
        <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-sm text-primary hover:border-primary hover:bg-primary/10 transition-colors cursor-pointer">
          <Plus className="h-4 w-4" />
          <span>Add question</span>
        </div>
      </button>

      {onAddSection && (
        <button
          className="w-full"
          onClick={(e) => {
            e.stopPropagation()
            onAddSection()
          }}
        >
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.02] px-3 py-2.5 text-sm text-primary/70 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors cursor-pointer">
            <FolderPlus className="h-4 w-4" />
            <span>Add section</span>
          </div>
        </button>
      )}
    </>
  )
})
