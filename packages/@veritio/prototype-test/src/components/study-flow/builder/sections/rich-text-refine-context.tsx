'use client'

import { createContext, useContext } from 'react'
import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'

export interface RefineSlots {
  trailingSlot: ReactNode
  overlaySlot: ReactNode
  onEditorCreated: (editor: Editor) => void
}

/**
 * A component that wraps an editor field and provides inline AI refine slots.
 * Each instance manages its own editor reference and streaming state.
 * Children receive slots via render prop.
 */
export type RefineFieldWrapper = React.ComponentType<{
  children: (slots: RefineSlots) => ReactNode
}>

const RichTextRefineContext = createContext<RefineFieldWrapper | null>(null)

export function RichTextRefineProvider({
  RefineWrapper,
  children,
}: {
  RefineWrapper: RefineFieldWrapper
  children: ReactNode
}) {
  return (
    <RichTextRefineContext.Provider value={RefineWrapper}>
      {children}
    </RichTextRefineContext.Provider>
  )
}

export function useRichTextRefine(): RefineFieldWrapper | null {
  return useContext(RichTextRefineContext)
}
