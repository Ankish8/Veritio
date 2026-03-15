'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBuilderNavigation } from '@/hooks/use-builder-navigation'
import { useStudyFlowBuilderStore } from '@/stores/study-flow-builder'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import { useKeyboardShortcutsStore } from '@/stores/keyboard-shortcuts-store'
import { getAuthFetchInstance } from '@/lib/swr'
import { ValidationModal } from '@/components/validation'
import { LaunchStudyDialog } from '@/components/ui/confirm-dialog'
import { BuilderShell, type BuilderTabId } from '@/components/builders/shared'
import type { KeyboardShortcut } from '@/lib/keyboard-shortcuts/types'
import {
  useBuilderStores,
  useBuilderSave,
  useBuilderValidation,
  useBuilderPanels,
} from './hooks'
import { useBuilderTabs, usePrefetchTabBundles } from './components'
import type { Study, StudyFlowQuestionRow, StudyFlowSettings } from '@veritio/study-types'
import { migrateToStudyFlowSettings } from '@/lib/study-flow/defaults'
import { useStudy } from '@/hooks/use-studies'
import { useOrganizations } from '@/hooks/use-organizations'
import { calculatePermissions } from '@/lib/supabase/collaboration-types'
import type { OrganizationRole } from '@/lib/supabase/collaboration-types'

type StudyType = 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'
const STUDY_TYPE_TAB_MAPPINGS: Record<StudyType, { id: BuilderTabId; label: string }[]> = {
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
  live_website_test: [
    { id: 'details', label: 'Details' },
    { id: 'live-website-setup', label: 'Website' },
    { id: 'live-website-tasks', label: 'Tasks' },
    { id: 'study-flow', label: 'Study Flow' },
    { id: 'settings', label: 'Settings' },
    { id: 'branding', label: 'Branding' },
  ],
}

interface BuilderContentClientProps {
  projectId: string
  studyId: string
  study: Study
  project: { id: string; name: string; organization_id: string | null }
  studyType: StudyType
  flowQuestions: {
    screening: StudyFlowQuestionRow[]
    preStudy: StudyFlowQuestionRow[]
    postStudy: StudyFlowQuestionRow[]
    survey: StudyFlowQuestionRow[]
  }
  flowSettings: StudyFlowSettings
  content: any // Type varies by study type
}

export function BuilderContentClient({
  projectId,
  studyId,
  study,
  project,
  studyType,
  flowQuestions,
  flowSettings,
  content,
}: BuilderContentClientProps) {
  const hasInitializedStores = useRef(false)
  const prevStoreValues = useRef<{ section: string; questionId: string | null } | null>(null)
  const hasInitializedFromURL = useRef(false)
  const router = useRouter()
  const { launchStudy } = useStudy(studyId)
  const { organizations, isLoading: isOrgsLoading } = useOrganizations()
  const studyOrg = useMemo(
    () => organizations.find((o) => o.id === project.organization_id),
    [organizations, project.organization_id]
  )
  const userRole = (studyOrg?.user_role || 'viewer') as OrganizationRole
  const permissions = useMemo(() => calculatePermissions(userRole), [userRole])
  const isReadOnly = isOrgsLoading ? false : !permissions.canEdit
  const canLaunch = isOrgsLoading ? true : permissions.canLaunch

  // Prefetch likely next pages
  useEffect(() => {
    router.prefetch(`/projects/${projectId}/studies/${studyId}/results`)
    router.prefetch(`/projects/${projectId}`)
  }, [projectId, studyId, router])

  usePrefetchTabBundles()

  const stores = useBuilderStores(study)

  // Initialize stores once with server data after localStorage hydration
  useEffect(() => {
    if (hasInitializedStores.current || !stores.isStoreHydrated) return
    hasInitializedStores.current = true

    stores.loadMetaFromStudy({
      id: study.id,
      title: study.title,
      description: study.description,
      status: study.status || 'draft',
      created_at: study.created_at || new Date().toISOString(),
      updated_at: study.updated_at || null,
      launched_at: study.launched_at,
      purpose: (study as any).purpose || null,
      participant_requirements: (study as any).participant_requirements || null,
      folder_id: (study as any).folder_id || null,
      file_attachments: ((study as any).file_attachments || []).map((f: any) => ({
        ...f,
        uploadedAt: f.uploadedAt || new Date().toISOString(),
      })),
      url_slug: (study as any).url_slug || null,
      language: (study as any).language || 'en-US',
      password: (study as any).password || null,
      session_recording_settings: (study as any).session_recording_settings ?? undefined,
      closing_rule: (study as any).closing_rule || { type: 'none' },
      response_prevention_settings: (study as any).response_prevention_settings ?? undefined,
      email_notification_settings: ((study as any).email_notification_settings ?? undefined) as any,
      branding: ((study as any).branding || {}) as any,
      participant_count: (study as any).participant_count ?? 0,
    })

    stores.loadFlowFromApi({
      flowSettings,
      screeningQuestions: flowQuestions.screening as any,
      preStudyQuestions: flowQuestions.preStudy as any,
      postStudyQuestions: flowQuestions.postStudy as any,
      surveyQuestions: flowQuestions.survey as any,
      studyId,
    })

    if (studyType === 'card_sort') {
      stores.loadCardSortFromApi({
        cards: (content as any).cards,
        categories: (content as any).categories,
        settings: (content as any).settings,
        studyId,
      })
    } else if (studyType === 'tree_test') {
      stores.loadTreeTestFromApi({
        nodes: (content as any).nodes,
        tasks: (content as any).tasks,
        settings: (content as any).settings,
        studyId,
      })
    } else if (studyType === 'prototype_test') {
      stores.loadPrototypeTestFromApi({
        prototype: (content as any).prototype,
        frames: (content as any).frames,
        tasks: (content as any).tasks,
        settings: (content as any).settings,
        studyId,
      })
    } else if (studyType === 'first_click') {
      stores.loadFirstClickFromApi({
        tasks: (content as any).tasks,
        settings: (content as any).settings,
        studyId,
      })
    } else if (studyType === 'first_impression') {
      stores.loadFirstImpressionFromApi({
        designs: (content as any).designs,
        settings: (content as any).settings,
        studyId,
      })
    } else if (studyType === 'live_website_test') {
      stores.loadLiveWebsiteFromApi({
        tasks: (content as any).tasks || [],
        settings: (content as any).settings || {},
        variants: (content as any).variants || [],
        taskVariants: (content as any).taskVariants || [],
        selectedVariantId: null,
        studyId,
      })
    }
  }, [studyId, stores, stores.isStoreHydrated, study, flowSettings, flowQuestions, content, studyType])

  const {
    tab: activeTab,
    section: urlSection,
    questionId: urlQuestionId,
    setTab: setActiveTab,
    setNavigation,
  } = useBuilderNavigation({
    defaultTab: 'details',
    defaultSection: 'welcome',
  })

  const setActiveFlowSection = useStudyFlowBuilderStore((state) => state.setActiveFlowSection)
  const setSelectedQuestionId = useStudyFlowBuilderStore((state) => state.setSelectedQuestionId)
  const activeFlowSection = useStudyFlowBuilderStore((state) => state.activeFlowSection)
  const selectedQuestionId = useStudyFlowBuilderStore((state) => state.selectedQuestionId)

  // Auto-save is handled by BuilderShell (3s debounce) to avoid duplicate save loops
  const { performContentSave } = useBuilderSave(studyId, study, stores)

  const validation = useBuilderValidation({
    studyId,
    study,
    projectId,
    performContentSave,
    launchStudy,
    setActiveTab,
  })

  useBuilderPanels(
    study,
    activeTab,
    stores.isTreeTest,
    stores.isPrototypeTest,
    stores.isFirstClick,
    stores.isFirstImpression,
    stores.isCardSort,
    stores.isLiveWebsiteTest
  )

  const tabs = useBuilderTabs({
    studyId,
    projectId,
    study,
    stores,
    setActiveTab,
    isReadOnly,
  })

  const registerShortcuts = useKeyboardShortcutsStore((s) => s.registerShortcuts)
  const unregisterShortcuts = useKeyboardShortcutsStore((s) => s.unregisterShortcuts)

  const tabShortcuts = useMemo(() => {
    const tabMappings = STUDY_TYPE_TAB_MAPPINGS[studyType]
    if (!tabMappings) return []

    return tabMappings.map((tab, index): KeyboardShortcut => ({
      id: `builder-tab-${index + 1}`,
      category: 'Navigation',
      description: `Go to ${tab.label} tab`,
      keys: [[String(index + 1)]],
      context: 'builder',
      handler: () => setActiveTab(tab.id),
    }))
  }, [studyType, setActiveTab])

  useEffect(() => {
    if (tabShortcuts.length === 0) return

    const ids = tabShortcuts.map((s) => s.id)
    registerShortcuts(tabShortcuts)

    return () => {
      unregisterShortcuts(ids)
    }
  }, [tabShortcuts, registerShortcuts, unregisterShortcuts])

  // AI content refresh loading state — shown as shimmer overlay on tab content
  const [isRefreshingContent, setIsRefreshingContent] = useState(false)

  // Listen for AI assistant data changes — fetch fresh data and update stores directly.
  // This avoids router.refresh() which resets panel state (e.g. side panel switches).
  //
  // IMPORTANT: refreshStoresFromApi is stored in a ref so the event listener useEffect
  // doesn't re-run on every render. Without this, the 300ms debounce timer gets cleared
  // whenever `stores` changes (every render), causing the refresh to never fire when
  // re-renders happen during AI streaming (e.g., message_complete → setIsStreaming(false)).
  //
  // NOTE: We use a plain function assigned to a ref instead of useCallback because `stores`
  // is a new object every render (from useBuilderStores), so useCallback provides no
  // memoization benefit. The React Compiler can mishandle this pattern — transforming the
  // useCallback deps inconsistently between renders, causing "useEffect changed size" errors.
  const refreshStoresFromApiRef = useRef<((sections?: string[], data?: Record<string, unknown>) => Promise<void>) | null>(null)

  refreshStoresFromApiRef.current = async (sections?: string[], data?: Record<string, unknown>) => {
    try {
      // Determine what to reload based on changed sections
      const CONTENT_SECTIONS = ['cards', 'categories', 'tree_nodes', 'tasks', 'prototype_tasks', 'first_click_tasks', 'first_impression_designs', 'live_website_tasks']
      const QUESTION_SECTIONS = ['flow_questions']
      const SETTINGS_SECTIONS = ['settings', 'study']
      const needsContentReload = !sections || sections.some((s) => CONTENT_SECTIONS.includes(s))
      const needsQuestionsReload = !sections || sections.some((s) => QUESTION_SECTIONS.includes(s))
      const needsSettingsReload = !sections || sections.some((s) => SETTINGS_SECTIONS.includes(s))

      // Fast path: settings-only change with data payload — no API calls needed, no shimmer
      if (!needsContentReload && !needsQuestionsReload && data?.settings && !data?.study) {
        const payloadSettings = data.settings as Record<string, any>
        const freshFlowSettings = payloadSettings.studyFlow || stores.flowSettings
        stores.loadSettingsFromExternal(freshFlowSettings)
        // Also update content store settings (e.g., card sort mode, tree test settings)
        const { studyFlow: _sf, ...contentSettings } = payloadSettings
        if (Object.keys(contentSettings).length > 0) {
          stores.loadContentSettingsFromPayload(contentSettings, studyId)
        }
        return
      }

      // Fast path: study-only metadata change with payload — no API calls needed, no shimmer
      if (!needsContentReload && !needsQuestionsReload && data?.study) {
        stores.loadMetaFromStudy(data.study as any)
        // If settings also changed via payload, update flow + content settings
        if (data.settings) {
          const payloadSettings = data.settings as Record<string, any>
          const freshFlowSettings = payloadSettings.studyFlow || stores.flowSettings
          stores.loadSettingsFromExternal(freshFlowSettings)
          const { studyFlow: _sf, ...contentSettings } = payloadSettings
          if (Object.keys(contentSettings).length > 0) {
            stores.loadContentSettingsFromPayload(contentSettings, studyId)
          }
        }
        return
      }

      // Slow path: need API calls — show shimmer
      setIsRefreshingContent(true)

      const authFetch = getAuthFetchInstance()

      // Build parallel fetch map — only fetch study when needed for content/questions
      const fetchMap: Record<string, Promise<Response>> = {}
      const needsStudyFetch = needsContentReload || needsQuestionsReload || !data?.settings
      if (needsStudyFetch) {
        fetchMap.study = authFetch(`/api/studies/${studyId}`)
      }

      // Only fetch flow-questions when QUESTIONS actually changed
      if (needsQuestionsReload) {
        fetchMap.flow = authFetch(`/api/studies/${studyId}/flow-questions`)
      }

      if (needsContentReload) {
        if (studyType === 'card_sort') {
          fetchMap.cards = authFetch(`/api/studies/${studyId}/cards`)
          fetchMap.categories = authFetch(`/api/studies/${studyId}/categories`)
        } else if (studyType === 'tree_test') {
          fetchMap.treeNodes = authFetch(`/api/studies/${studyId}/tree-nodes`)
          fetchMap.tasks = authFetch(`/api/studies/${studyId}/tasks`)
        } else if (studyType === 'prototype_test') {
          fetchMap.prototypeTasks = authFetch(`/api/studies/${studyId}/prototype-tasks`)
        } else if (studyType === 'first_click') {
          fetchMap.firstClick = authFetch(`/api/studies/${studyId}/first-click`)
        } else if (studyType === 'first_impression') {
          fetchMap.designs = authFetch(`/api/studies/${studyId}/first-impression/designs`)
        } else if (studyType === 'live_website_test') {
          fetchMap.liveWebsite = authFetch(`/api/studies/${studyId}/live-website`)
        }
      }

      // Resolve all fetches in parallel
      const keys = Object.keys(fetchMap)
      const responses = await Promise.all(Object.values(fetchMap))
      const res: Record<string, Response> = {}
      keys.forEach((key, i) => { res[key] = responses[i] })

      // Parse study response if fetched
      let freshStudy: any = null
      let rawSettings: Record<string, any> = {}
      if (res.study?.ok) {
        freshStudy = await res.study.json()
        rawSettings = (freshStudy.settings && typeof freshStudy.settings === 'object' && !Array.isArray(freshStudy.settings)
          ? freshStudy.settings
          : {}) as Record<string, any>
      }

      // Only reload meta store when study/settings actually changed
      if (freshStudy && needsSettingsReload) {
        stores.loadMetaFromStudy(freshStudy)
      }

      // Reload flow store — smart path based on what changed
      if (res.flow?.ok && freshStudy) {
        // Full reload: questions changed, fetch all questions + settings
        const allQuestions = await res.flow.json()
        const freshFlowSettings = rawSettings.studyFlow ||
          migrateToStudyFlowSettings(freshStudy.welcome_message, freshStudy.thank_you_message, undefined, freshStudy.study_type)

        stores.loadFlowFromApi({
          flowSettings: freshFlowSettings,
          screeningQuestions: allQuestions.filter((q: any) => q.section === 'screening'),
          preStudyQuestions: allQuestions.filter((q: any) => q.section === 'pre_study'),
          postStudyQuestions: allQuestions.filter((q: any) => q.section === 'post_study'),
          surveyQuestions: allQuestions.filter((q: any) => q.section === 'survey'),
          studyId,
        })
      } else if (needsSettingsReload && !needsQuestionsReload && freshStudy) {
        // Settings-only change: update flow settings + snapshot, keep existing questions
        const freshFlowSettings = rawSettings.studyFlow ||
          migrateToStudyFlowSettings(freshStudy.welcome_message, freshStudy.thank_you_message, undefined, freshStudy.study_type)
        stores.loadSettingsFromExternal(freshFlowSettings)
      } else if (needsSettingsReload && !needsQuestionsReload && data?.settings) {
        // Settings from payload (no study fetch)
        const payloadSettings = data.settings as Record<string, any>
        const freshFlowSettings = payloadSettings.studyFlow || stores.flowSettings
        stores.loadSettingsFromExternal(freshFlowSettings)
      }

      // Reload content store based on study type
      if (needsContentReload) {
        const { studyFlow: _sf, ...contentSettings } = rawSettings

        if (studyType === 'card_sort' && res.cards?.ok && res.categories?.ok) {
          const cards = await res.cards.json()
          const categories = await res.categories.json()
          stores.loadCardSortFromApi({ cards, categories, settings: contentSettings as any, studyId })
        } else if (studyType === 'tree_test' && res.treeNodes?.ok && res.tasks?.ok) {
          const nodes = await res.treeNodes.json()
          const tasks = await res.tasks.json()
          stores.loadTreeTestFromApi({ nodes, tasks, settings: contentSettings as any, studyId })
        } else if (studyType === 'prototype_test' && res.prototypeTasks?.ok) {
          const tasksData = await res.prototypeTasks.json()
          stores.loadPrototypeTestFromApi({
            prototype: stores.prototype,
            frames: stores.prototypeFrames,
            tasks: tasksData.data || [],
            settings: contentSettings as any,
            studyId,
          })
        } else if (studyType === 'first_click' && res.firstClick?.ok) {
          const fcData = await res.firstClick.json()
          stores.loadFirstClickFromApi({
            tasks: fcData.tasks || [],
            settings: fcData.settings || contentSettings,
            studyId,
          })
        } else if (studyType === 'first_impression' && res.designs?.ok) {
          const fiData = await res.designs.json()
          stores.loadFirstImpressionFromApi({
            designs: fiData.designs || [],
            settings: contentSettings as any,
            studyId,
          })
        } else if (studyType === 'live_website_test' && res.liveWebsite?.ok) {
          const lwData = await res.liveWebsite.json()
          stores.loadLiveWebsiteFromApi({
            tasks: lwData.tasks || [],
            settings: lwData.settings || contentSettings,
            variants: lwData.variants || [],
            taskVariants: lwData.taskVariants || [],
            selectedVariantId: null,
            studyId,
          })
        }
      }
    } catch {
      // Silently fail — user can still manually refresh
    } finally {
      setIsRefreshingContent(false)
    }
  }

  useEffect(() => {
    // Debounce AI data-changed events to avoid overlapping refreshes when multiple
    // write tools fire in rapid succession (e.g. validate + manage_flow_questions).
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let pendingSections = new Set<string>()
    let latestData: Record<string, unknown> | undefined

    const handleAiDataChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail
      const sections = detail?.sections as string[] | undefined
      const data = detail?.data as Record<string, unknown> | undefined
      if (sections) {
        for (const s of sections) pendingSections.add(s)
      } else {
        pendingSections.clear() // undefined means "reload everything"
      }
      // Accumulate data payloads (later events override earlier ones for same keys)
      if (data) {
        latestData = { ...(latestData || {}), ...data }
      }
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        const sectionsToRefresh = pendingSections.size > 0 ? Array.from(pendingSections) : undefined
        const dataToPass = latestData
        pendingSections = new Set()
        latestData = undefined
        // Use ref to always call the latest version — avoids the debounce timer
        // being cleared by effect re-runs when stores/callbacks change during streaming
        refreshStoresFromApiRef.current?.(sectionsToRefresh, dataToPass)
      }, 300)
    }

    window.addEventListener('builder:ai-data-changed', handleAiDataChanged)
    return () => {
      window.removeEventListener('builder:ai-data-changed', handleAiDataChanged)
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [])  

  useEffect(() => {
    const handleSave = () => performContentSave()
    const handlePreview = () => validation.handlePreviewClick()

    window.addEventListener('builder:save', handleSave)
    window.addEventListener('builder:preview', handlePreview)
    return () => {
      window.removeEventListener('builder:save', handleSave)
      window.removeEventListener('builder:preview', handlePreview)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- validation object reference changes on every render
  }, [performContentSave, validation.handlePreviewClick])

  // Sync URL -> Store on mount
  useEffect(() => {
    if (hasInitializedFromURL.current) return
    hasInitializedFromURL.current = true

    if (urlSection) {
      setActiveFlowSection(urlSection)
    }
    if (urlQuestionId) {
      setSelectedQuestionId(urlQuestionId)
    }

    prevStoreValues.current = { section: urlSection, questionId: urlQuestionId }
  }, [urlSection, urlQuestionId, setActiveFlowSection, setSelectedQuestionId])

  // Sync Store -> URL when user navigates via UI
  useEffect(() => {
    if (!hasInitializedFromURL.current || !prevStoreValues.current) return

    if (activeTab === 'study-flow') {
      const prev = prevStoreValues.current
      const storeChanged = activeFlowSection !== prev.section || selectedQuestionId !== prev.questionId

      if (storeChanged) {
        setNavigation({
          section: activeFlowSection,
          questionId: selectedQuestionId,
        })
        prevStoreValues.current = { section: activeFlowSection, questionId: selectedQuestionId }
      }
    }
  }, [activeTab, activeFlowSection, selectedQuestionId, setNavigation])

  // Use store status for real-time updates (e.g. after launch), falling back to server prop
  const storeStatus = useStudyMetaStore((s) => s.meta.status)
  const storeStudyId = useStudyMetaStore((s) => s.studyId)
  const propStatus = (study.status || 'draft') as 'draft' | 'active' | 'paused' | 'completed'
  const effectiveStatus = (storeStudyId === studyId && storeStatus && storeStatus !== 'draft')
    ? storeStatus as 'draft' | 'active' | 'paused' | 'completed'
    : propStatus

  return (
    <>
      {/* Preconnect to Figma CDN — only for prototype tests that embed Figma iframes */}
      {studyType === 'prototype_test' && (
        <>
          <link rel="preconnect" href="https://www.figma.com" />
          <link rel="dns-prefetch" href="https://www.figma.com" />
        </>
      )}
      <BuilderShell
        studyId={studyId}
        studyType={studyType}
        studyTitle={study.title}
        projectId={projectId}
        projectName={project.name}
        shareCode={(study as any).share_code || undefined}
        tabs={tabs}
        defaultTab="details"
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSave={isReadOnly ? async () => {} : performContentSave}
        isDirty={stores.combinedDirty}
        saveStatus={stores.combinedSaveStatus}
        lastSavedAt={stores.lastSavedAt}
        isStoreHydrated={stores.isStoreHydrated}
        onPreviewClick={validation.handlePreviewClick}
        onLaunchClick={canLaunch ? validation.handleLaunchClick : undefined}
        isLaunching={validation.isLaunching}
        studyStatus={effectiveStatus}
        isRefreshingContent={isRefreshingContent}
        isReadOnly={isReadOnly}
      />

      <ValidationModal
        open={validation.validationModalOpen}
        onOpenChange={validation.setValidationModalOpen}
        validationResult={validation.validationResult}
        onNavigateToIssue={validation.handleNavigateToIssue}
        context={validation.validationContext}
      />

      <LaunchStudyDialog
        open={validation.launchDialogOpen}
        onOpenChange={validation.setLaunchDialogOpen}
        onConfirm={validation.handleConfirmLaunch}
        loading={validation.isLaunching}
      />
    </>
  )
}
