'use client'

export type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression'

export interface TabInfo {
  id: string
  label: string
}

export const STUDY_TYPE_TABS: Record<StudyType, TabInfo[]> = {
  card_sort: [
    { id: 'details', label: 'Details' },
    { id: 'content', label: 'Content' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  tree_test: [
    { id: 'details', label: 'Details' },
    { id: 'tree', label: 'Tree' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  survey: [
    { id: 'details', label: 'Details' },
    { id: 'study-flow', label: 'Survey' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  prototype_test: [
    { id: 'details', label: 'Details' },
    { id: 'prototype', label: 'Prototype' },
    { id: 'prototype-tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  first_click: [
    { id: 'details', label: 'Details' },
    { id: 'first-click-tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
  first_impression: [
    { id: 'details', label: 'Details' },
    { id: 'first-impression-designs', label: 'Designs' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
}
