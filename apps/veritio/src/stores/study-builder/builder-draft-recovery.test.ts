import { beforeEach, describe, expect, it } from 'vitest'
import { selectFlowIsDirty, useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import { selectCardSortIsDirty, useCardSortBuilderStore } from './index'

describe('builder draft recovery metadata', () => {
  beforeEach(() => {
    localStorage.removeItem('card-sort-builder')
    useCardSortBuilderStore.getState().reset()
    useCardSortBuilderStore.getState().setHydrated(true)
    useStudyFlowBuilderStore.getState().reset()
    useStudyFlowBuilderStore.getState().setHydrated(true)
  })

  it('persists dirty and saved revisions with the local draft', () => {
    const store = useCardSortBuilderStore.getState()
    store.loadFromApi({
      cards: [],
      categories: [],
      settings: {
        mode: 'open',
        randomizeCards: true,
        randomizeCategories: false,
        allowSkip: false,
        showProgress: true,
        showCardDescriptions: false,
        showCardImages: false,
      },
      studyId: '341e0b72-0278-4aa0-9939-3de1b56318fd',
    })
    useCardSortBuilderStore.getState().addCard({
      study_id: '341e0b72-0278-4aa0-9939-3de1b56318fd',
      label: 'Unsaved recovered card',
      description: null,
      position: 0,
      image: null,
    })

    const current = useCardSortBuilderStore.getState()
    expect(selectCardSortIsDirty(current)).toBe(true)

    const persisted = JSON.parse(localStorage.getItem('card-sort-builder') || '{}')
    expect(persisted.state.studyId).toBe('341e0b72-0278-4aa0-9939-3de1b56318fd')
    expect(persisted.state._version).toBe(current._version)
    expect(persisted.state._savedVersion).toBe(current._savedVersion)
    expect(persisted.state._version).toBeGreaterThan(persisted.state._savedVersion)
  })

  it('migrates a legacy unsaved flow snapshot into a recoverable dirty revision', async () => {
    const flow = useStudyFlowBuilderStore.getState()
    const savedFlowSettings = structuredClone(flow.flowSettings)
    const draftFlowSettings = {
      ...savedFlowSettings,
      welcome: {
        ...savedFlowSettings.welcome,
        message: 'Recovered legacy draft',
      },
    }

    localStorage.setItem(
      'study-flow-builder',
      JSON.stringify({
        state: {
          flowSettings: draftFlowSettings,
          screeningQuestions: [],
          preStudyQuestions: [],
          postStudyQuestions: [],
          surveyQuestions: [],
          _snapshot: {
            flowSettings: savedFlowSettings,
            screeningQuestions: [],
            preStudyQuestions: [],
            postStudyQuestions: [],
            surveyQuestions: [],
          },
          studyId: '341e0b72-0278-4aa0-9939-3de1b56318fd',
          lastSavedAt: null,
        },
        version: 0,
      })
    )

    await useStudyFlowBuilderStore.persist.rehydrate()
    const recovered = useStudyFlowBuilderStore.getState()

    expect(recovered._version).toBe(1)
    expect(recovered._savedVersion).toBe(0)
    expect(selectFlowIsDirty(recovered)).toBe(true)
  })
})
