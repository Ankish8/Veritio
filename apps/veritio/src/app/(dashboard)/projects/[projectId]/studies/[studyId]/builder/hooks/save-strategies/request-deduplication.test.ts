import { beforeEach, describe, expect, it, vi } from 'vitest'
import { firstClickSaveStrategy } from './first-click-save-strategy'
import { liveWebsiteSaveStrategy } from './live-website-save-strategy'
import { useFirstClickBuilderStore } from '@/stores/study-builder'
import { useLiveWebsiteBuilderStore } from '@/stores/study-builder'
import { selectFlowIsDirty, useStudyFlowBuilderStore } from '@/stores/study-flow-builder'

const studyId = '341e0b72-0278-4aa0-9939-3de1b56318fd'

function createStores() {
  return {
    setFirstClickSaveStatus: vi.fn(),
    setLiveWebsiteSaveStatus: vi.fn(),
    setFlowSaveStatus: vi.fn(),
  } as any
}

function loadCleanFlow() {
  const state = useStudyFlowBuilderStore.getState()
  state.loadFromApi({
    flowSettings: state.flowSettings,
    screeningQuestions: [],
    preStudyQuestions: [],
    postStudyQuestions: [],
    surveyQuestions: [],
    studyId,
  })
}

describe('settings request de-duplication', () => {
  beforeEach(() => {
    useFirstClickBuilderStore.getState().reset()
    useLiveWebsiteBuilderStore.getState().reset()
    useStudyFlowBuilderStore.getState().reset()
    loadCleanFlow()
  })

  it('uses the study PATCH as First Click’s only settings writer', async () => {
    useFirstClickBuilderStore.getState().loadFromApi({
      tasks: [],
      settings: {
        allowSkipTasks: true,
        startTasksImmediately: false,
        randomizeTasks: true,
        dontRandomizeFirstTask: true,
        showTaskProgress: true,
        showEachParticipantTasks: 'all',
        imageScaling: 'scale_on_small',
        taskInstructionPosition: 'top-left',
      },
      studyId,
    })
    useFirstClickBuilderStore.getState().setSettings({ allowSkipTasks: false })

    const authFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    ) as any
    const flowStore = useStudyFlowBuilderStore.getState()

    await firstClickSaveStrategy.save({
      studyId,
      study: { study_type: 'first_click' } as any,
      flowStore,
      isFlowDirty: selectFlowIsDirty(flowStore),
      authFetch,
      stores: createStores(),
    })

    const firstClickCall = authFetch.mock.calls.find(([url]: [string]) => url.endsWith('/first-click'))
    expect(JSON.parse(firstClickCall?.[1]?.body as string)).toEqual({
      tasks: [],
    })
    expect(authFetch.mock.calls.filter(([url]: [string]) => url === `/api/studies/${studyId}`)).toHaveLength(1)
  })

  it('omits Live Website settings from the content request when flow owns them', async () => {
    useLiveWebsiteBuilderStore.getState().loadFromApi({
      tasks: [],
      settings: {
        websiteUrl: 'https://example.com',
        mode: 'reverse_proxy',
      } as any,
      variants: [],
      taskVariants: [],
      selectedVariantId: null,
      studyId,
    })
    useLiveWebsiteBuilderStore.getState().setSettings({ widgetPosition: 'top-left' })
    useStudyFlowBuilderStore.getState().updateWelcomeSettings({
      message: 'Changed with content',
    })

    const authFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
    ) as any
    const flowStore = useStudyFlowBuilderStore.getState()

    await liveWebsiteSaveStrategy.save({
      studyId,
      study: { study_type: 'live_website_test' } as any,
      flowStore,
      isFlowDirty: selectFlowIsDirty(flowStore),
      authFetch,
      stores: createStores(),
    })

    const contentCall = authFetch.mock.calls.find(([url]: [string]) => url.endsWith('/live-website'))
    expect(JSON.parse(contentCall?.[1]?.body as string)).toEqual({ tasks: [] })
    expect(authFetch.mock.calls.filter(([url]: [string]) => url === `/api/studies/${studyId}`)).toHaveLength(1)
  })
})
