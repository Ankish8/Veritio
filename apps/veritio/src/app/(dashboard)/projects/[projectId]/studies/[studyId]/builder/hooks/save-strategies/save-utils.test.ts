import { beforeEach, describe, expect, it } from 'vitest'
import { captureFlowDataSnapshot, collectValidQuestions, markContentSavedIfUnchanged, markFlowSavedIfUnchanged } from './save-utils'
import { selectFlowIsDirty, useStudyFlowBuilderStore } from '@/stores/study-flow-builder'

describe('builder save acknowledgements', () => {
  beforeEach(() => {
    useStudyFlowBuilderStore.getState().reset()
    useStudyFlowBuilderStore.getState().setHydrated(true)
  })

  it('never marks a newer content revision as saved', () => {
    const state = {
      _version: 3,
      _savedVersion: 1,
      saveStatus: 'saving',
      lastSavedAt: null as number | null,
      _snapshot: null as unknown,
    }
    const store = {
      getState: () => state,
      setState: (partial: Record<string, unknown>) => Object.assign(state, partial),
    }

    markContentSavedIfUnchanged(store, { tasks: [{ id: 'sent' }] }, 2, () => ({
      tasks: [{ id: 'newer' }],
    }))

    expect(state._savedVersion).toBe(2)
    expect(state._version).toBe(3)
    expect(state.saveStatus).toBe('idle')
  })

  it('keeps flow edits made during a request dirty', () => {
    const initial = useStudyFlowBuilderStore.getState()
    initial.loadFromApi({
      flowSettings: initial.flowSettings,
      screeningQuestions: [],
      preStudyQuestions: [],
      postStudyQuestions: [],
      surveyQuestions: [],
      studyId: '341e0b72-0278-4aa0-9939-3de1b56318fd',
    })

    const sentState = useStudyFlowBuilderStore.getState()
    const sentVersion = sentState._version
    const sentData = captureFlowDataSnapshot(sentState)

    sentState.updateWelcomeSettings({ message: 'A newer local edit' })
    markFlowSavedIfUnchanged(sentData, sentVersion, 'test')

    const current = useStudyFlowBuilderStore.getState()
    expect(current._savedVersion).toBe(sentVersion)
    expect(current._version).toBeGreaterThan(sentVersion)
    expect(current.saveStatus).toBe('idle')
    expect(selectFlowIsDirty(current)).toBe(true)
  })

  it('includes incomplete questions so the sent payload matches the acknowledged draft', () => {
    const state = useStudyFlowBuilderStore.getState()
    state.loadFromApi({
      flowSettings: state.flowSettings,
      screeningQuestions: [],
      preStudyQuestions: [],
      postStudyQuestions: [],
      surveyQuestions: [],
      studyId: '341e0b72-0278-4aa0-9939-3de1b56318fd',
    })
    const id = useStudyFlowBuilderStore.getState().addQuestion('screening', 'single_line_text')

    const questions = collectValidQuestions(useStudyFlowBuilderStore.getState())
    expect(questions).toContainEqual(
      expect.objectContaining({
        id,
        question_text: '',
      })
    )
  })
})
