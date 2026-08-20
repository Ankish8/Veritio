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
 *
 * MUST be a stable reference — defined at module scope or memoised. Consumers
 * render it directly as `<RefineWrapper>`, so a new identity on each render
 * would unmount and remount the whole editor subtree, losing focus, selection,
 * and in-flight refine state. `react-hooks/static-components` flags those call
 * sites because it cannot see this contract; the disables there point here.
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
