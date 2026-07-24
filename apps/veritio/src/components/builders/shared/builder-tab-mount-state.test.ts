import { describe, expect, it } from 'vitest'
import {
  createMountedBuilderTabs,
  recordBuilderTabNavigation,
} from './builder-tab-mount-state'

describe('builder tab mount state', () => {
  it('mounts only the active tab on first render', () => {
    const state = createMountedBuilderTabs('study-1', 'details')

    expect([...state.ids]).toEqual(['details'])
  })

  it('keeps both the source and destination mounted after navigation', () => {
    const initial = createMountedBuilderTabs('study-1', 'details')
    const afterContent = recordBuilderTabNavigation(
      initial,
      'study-1',
      'details',
      'content',
    )
    const afterSettings = recordBuilderTabNavigation(
      afterContent,
      'study-1',
      'content',
      'settings',
    )

    expect([...afterSettings.ids]).toEqual(['details', 'content', 'settings'])
  })

  it('resets visited tabs when the shell changes to another study', () => {
    const initial = createMountedBuilderTabs('study-1', 'details')
    const nextStudy = recordBuilderTabNavigation(
      initial,
      'study-2',
      'content',
      'settings',
    )

    expect(nextStudy.studyId).toBe('study-2')
    expect([...nextStudy.ids]).toEqual(['content', 'settings'])
  })
})
