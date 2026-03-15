'use client'

import { useMemo, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { DetailsTab, SettingsTab, BrandingTab, type BuilderTab, type BuilderTabId } from '@/components/builders/shared'
import type { Study } from '@veritio/study-types'
import type { BuilderStores } from '../hooks'
import {
  PrototypeTabSkeleton,
  StudyFlowTabSkeleton,
  ContentTabSkeleton,
  TreeTabSkeleton,
  TasksTabSkeleton,
} from '@/components/builders/shared/tab-skeletons'

// Dynamic imports for heavy components - these are loaded on-demand
// SSR is enabled to allow Next.js to include module references in initial HTML
const UnifiedCardSortEditor = dynamic(
  () => import('@/components/builders/card-sort').then(mod => ({ default: mod.UnifiedCardSortEditor })),
  { loading: ContentTabSkeleton }
)

const TreeTab = dynamic(
  () => import('@/components/builders/tree-test').then(mod => ({ default: mod.TreeTab })),
  { loading: TreeTabSkeleton }
)

const TasksTab = dynamic(
  () => import('@/components/builders/tree-test').then(mod => ({ default: mod.TasksTab })),
  { loading: TasksTabSkeleton }
)

const PrototypeTab = dynamic(
  () => import('@veritio/prototype-test/builder').then(mod => ({ default: mod.PrototypeTab })),
  { loading: PrototypeTabSkeleton }
)

const PrototypeTasksTab = dynamic(
  () => import('@veritio/prototype-test/builder').then(mod => ({ default: mod.PrototypeTasksTab })),
  { loading: TasksTabSkeleton }
)

const FirstClickTasksTab = dynamic(
  () => import('@/components/builders/first-click').then(mod => ({ default: mod.TasksTab })),
  { loading: TasksTabSkeleton }
)

const FirstImpressionDesignsTab = dynamic(
  () => import('@/components/builders/first-impression').then(mod => ({ default: mod.DesignsTab })),
  { loading: ContentTabSkeleton }
)

const LiveWebsiteTasksTab = dynamic(
  () => import('@/components/builders/live-website').then(mod => ({ default: mod.TasksTab })),
  { loading: TasksTabSkeleton }
)

const LiveWebsiteSetupTab = dynamic(
  () => import('@/components/builders/live-website').then(mod => ({ default: mod.WebsiteTab })),
  { loading: TasksTabSkeleton }
)

const StudyFlowBuilder = dynamic(
  () => import('@veritio/prototype-test/components/study-flow/builder').then(mod => ({ default: mod.StudyFlowBuilder })),
  { loading: StudyFlowTabSkeleton }
)

/** Prefetch all tab component bundles in the background after the browser goes idle. */
export function usePrefetchTabBundles() {
  useEffect(() => {
    const prefetch = () => {
      Promise.all([
        import('@/components/builders/card-sort'),
        import('@/components/builders/tree-test'),
        import('@veritio/prototype-test/builder'),
        import('@/components/builders/first-click'),
        import('@/components/builders/first-impression'),
        import('@/components/builders/live-website'),
        import('@veritio/prototype-test/components/study-flow/builder'),
      ]).catch(() => {
        // Silently ignore prefetch failures - not critical
      })
    }

    // Use requestIdleCallback so prefetching only starts after the browser is idle
    // (i.e., after the initial page compilation finishes). Falls back to a long
    // timeout on browsers that don't support rIC (e.g. Safari < 16.4).
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(prefetch, { timeout: 5000 })
      return () => cancelIdleCallback(id)
    } else {
      const timer = setTimeout(prefetch, 3000)
      return () => clearTimeout(timer)
    }
  }, [])
}

function CardSortContentTab({ studyId }: { studyId: string }) {
  return <UnifiedCardSortEditor studyId={studyId} />
}

type TabBadges = Record<string, string | number | undefined>

interface UseBuilderTabsProps {
  studyId: string
  projectId: string
  study: Study | null
  stores: BuilderStores
  setActiveTab: (tab: BuilderTabId) => void
  isReadOnly?: boolean
}

function useTabBadges(_stores: BuilderStores): TabBadges {
  return useMemo(() => ({}), [])
}

export function useBuilderTabs({
  studyId,
  projectId,
  study,
  stores,
  setActiveTab,
  isReadOnly,
}: UseBuilderTabsProps): BuilderTab[] {
  const { isTreeTest, isSurvey, isPrototypeTest, isFirstClick, isFirstImpression, isLiveWebsiteTest } = stores

  // Compute badges separately - this changes frequently but doesn't need to rebuild tabs
  const badges = useTabBadges(stores)

  // Determine study type for props - stable value
  const studyTypeForProps = useMemo(() => {
    if (isSurvey) return 'survey' as const
    if (isTreeTest) return 'tree_test' as const
    if (isPrototypeTest) return 'prototype_test' as const
    if (isFirstClick) return 'first_click' as const
    if (isFirstImpression) return 'first_impression' as const
    if (isLiveWebsiteTest) return 'live_website_test' as const
    return 'card_sort' as const
  }, [isSurvey, isTreeTest, isPrototypeTest, isFirstClick, isFirstImpression, isLiveWebsiteTest])

  // Content tab navigation callback - stable reference
  const getContentTab = useCallback((): BuilderTabId => {
    if (isTreeTest) return 'tree'
    if (isPrototypeTest) return 'prototype'
    return 'content'
  }, [isTreeTest, isPrototypeTest])

  const navigateToContent = useCallback(() => {
    setActiveTab(getContentTab())
  }, [setActiveTab, getContentTab])

  // Tasks tab navigation callback (prototype test only)
  const navigateToTasks = useCallback(() => {
    if (isPrototypeTest) {
      setActiveTab('prototype-tasks')
    } else if (isTreeTest) {
      setActiveTab('tasks')
    }
  }, [setActiveTab, isPrototypeTest, isTreeTest])

  // Build static tab structure - only depends on study type, not content counts
  const staticTabs = useMemo(() => {
    const baseTabs: Omit<BuilderTab, 'badge'>[] = [
      {
        id: 'details',
        label: 'Details',
        component: <DetailsTab studyId={studyId} studyType={studyTypeForProps} isReadOnly={isReadOnly} />,
        keepMounted: true,
      },
    ]

    // Survey type doesn't have content tabs
    if (!isSurvey) {
      if (isTreeTest) {
        baseTabs.push(
          {
            id: 'tree',
            label: 'Tree',
            component: <TreeTab studyId={studyId} />,
            keepMounted: true,
          },
          {
            id: 'tasks',
            label: 'Tasks',
            component: <TasksTab studyId={studyId} />,
            keepMounted: true,
          }
        )
      } else if (isPrototypeTest) {
        baseTabs.push(
          {
            id: 'prototype',
            label: 'Prototype',
            component: <PrototypeTab studyId={studyId} />,
            keepMounted: true,
          },
          {
            id: 'prototype-tasks',
            label: 'Tasks',
            component: <PrototypeTasksTab studyId={studyId} />,
            keepMounted: true,
          }
        )
      } else if (isFirstClick) {
        baseTabs.push({
          id: 'first-click-tasks',
          label: 'Tasks',
          component: <FirstClickTasksTab studyId={studyId} />,
          keepMounted: true,
        })
      } else if (isFirstImpression) {
        baseTabs.push({
          id: 'first-impression-designs',
          label: 'Designs',
          component: <FirstImpressionDesignsTab studyId={studyId} />,
          keepMounted: true,
        })
      } else if (isLiveWebsiteTest) {
        baseTabs.push(
          {
            id: 'live-website-setup',
            label: 'Website',
            component: <LiveWebsiteSetupTab studyId={studyId} />,
            keepMounted: true,
          },
          {
            id: 'live-website-tasks',
            label: 'Tasks',
            component: <LiveWebsiteTasksTab studyId={studyId} />,
            keepMounted: true,
          }
        )
      } else {
        // Card Sort
        baseTabs.push({
          id: 'content',
          label: 'Content',
          component: <CardSortContentTab studyId={studyId} />,
          keepMounted: true,
        })
      }
    }

    baseTabs.push(
      {
        id: 'study-flow',
        label: 'Study Flow',
        component: (
          <StudyFlowBuilder
            studyId={studyId}
            projectId={projectId}
            studyType={(study?.study_type || 'card_sort') as 'card_sort' | 'tree_test' | 'survey' | 'prototype_test' | 'first_click' | 'first_impression' | 'live_website_test'}
            onNavigateToContent={isSurvey ? undefined : navigateToContent}
            onNavigateToTasks={isPrototypeTest ? navigateToTasks : undefined}
          />
        ),
        keepMounted: true,
      },
      {
        id: 'settings',
        label: 'Settings',
        component: <SettingsTab studyId={studyId} studyType={studyTypeForProps} isReadOnly={isReadOnly} />,
        keepMounted: true,
      },
      {
        id: 'branding',
        label: 'Branding',
        component: <BrandingTab studyId={studyId} studyType={studyTypeForProps} isReadOnly={isReadOnly} />,
        keepMounted: true,
      }
    )

    return baseTabs
  }, [
    // Static config only depends on these - much smaller dependency list
    studyId, projectId, study?.study_type, studyTypeForProps, isReadOnly,
    isTreeTest, isSurvey, isPrototypeTest, isFirstClick, isFirstImpression, isLiveWebsiteTest, navigateToContent, navigateToTasks,
  ])

  // Merge badges into tabs - this is cheap since we're just adding a property
  return useMemo(() =>
    staticTabs.map(tab => ({
      ...tab,
      badge: badges[tab.id],
    })),
    [staticTabs, badges]
  )
}
