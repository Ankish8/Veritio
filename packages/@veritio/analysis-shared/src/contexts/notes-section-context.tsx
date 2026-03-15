'use client'

import { createContext, useContext, useState, type ReactNode, useMemo } from 'react'

type NoteSection = 'screening' | 'pre_study' | 'post_study' | 'survey' | 'cards' | 'categories'

interface NotesSectionContextValue {
  suggestedSection: NoteSection
  setSuggestedSection: (section: NoteSection) => void
}

const NotesSectionContext = createContext<NotesSectionContextValue | null>(null)

export function useNotesSection() {
  const context = useContext(NotesSectionContext)
  if (!context) {
    // Return a default if not in provider (graceful fallback)
    return {
      suggestedSection: 'pre_study' as NoteSection,
      setSuggestedSection: () => {},
    }
  }
  return context
}

interface NotesSectionProviderProps {
  children: ReactNode
  initialSection?: NoteSection
}

export function NotesSectionProvider({ children, initialSection = 'pre_study' }: NotesSectionProviderProps) {
  const [suggestedSection, setSuggestedSection] = useState<NoteSection>(initialSection)

  const value = useMemo(() => ({
    suggestedSection,
    setSuggestedSection,
  }), [suggestedSection])

  return (
    <NotesSectionContext.Provider value={value}>
      {children}
    </NotesSectionContext.Provider>
  )
}
