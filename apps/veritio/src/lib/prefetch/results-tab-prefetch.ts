import { useEffect } from 'react'
import { prefetchIfFast } from '@/lib/swr/prefetch'

const resultTabBundlePrefetchers: Record<string, () => Promise<unknown>> = {
  report: () => import('@veritio/analysis-shared'),

  'card-sort-analysis': () => import('@/components/analysis/card-sort/analysis-tab'),
  'tree-test-analysis': () => import('@/components/analysis/tree-test/analysis-tab'),
  'survey-analysis': () => import('@/components/analysis/survey/analysis-tab'),
  'prototype-test-analysis': () => import('@/components/analysis/prototype-test/analysis-tab'),
  'first-click-analysis': () => import('@/components/analysis/first-click/analysis-tab'),
  'first-impression-analysis': () => import('@/components/analysis/first-impression/analysis-tab'),
  'similarity-matrix': () => import('@/components/analysis/card-sort/similarity-matrix'),
  pca: () => import('@/components/analysis/card-sort/pca-tab'),
  pietree: () => import('@/components/analysis/tree-test/pietree/pietree-tab'),

  'cards-tab': () => import('@/components/analysis/card-sort/cards-tab'),
  'categories-tab': () => import('@/components/analysis/card-sort/categories-tab'),
  'standardization-grid': () => import('@/components/analysis/card-sort/standardization-grid'),
  'results-matrix': () => import('@/components/analysis/card-sort/results-matrix'),

  'task-results': () => import('@/components/analysis/tree-test/task-results'),
  'first-click': () => import('@/components/analysis/tree-test/first-click'),
  'paths-tab': () => import('@/components/analysis/tree-test/paths'),
  'destinations-tab': () => import('@/components/analysis/tree-test/destinations'),

  'cross-tabulation': () => import('@/components/analysis/survey/cross-tabulation'),
  correlation: () => import('@/components/analysis/survey/correlation'),

  'prototype-task-results': () => import('@/components/analysis/prototype-test/task-results'),
  'prototype-paths': () => import('@/components/analysis/prototype-test/paths'),
  'prototype-click-maps': () => import('@/components/analysis/prototype-test/click-maps'),

  'first-click-task-results': () => import('@/components/analysis/first-click/task-results'),
  'first-click-click-maps': () => import('@/components/analysis/first-click/click-maps-tab'),

  'word-cloud': () => import('@/components/analysis/first-impression/word-cloud'),
  comparison: () => import('@/components/analysis/first-impression/comparison'),
  insights: () => import('@/components/analysis/first-impression/insights'),
  responses: () => import('@/components/analysis/first-impression/responses'),
}

const prefetchedResultsTabs = new Set<string>()

export function prefetchResultsTabBundle(tabId: string): void {
  if (prefetchedResultsTabs.has(tabId)) return

  const prefetcher = resultTabBundlePrefetchers[tabId]
  if (!prefetcher) return

  prefetchIfFast(() => {
    prefetchedResultsTabs.add(tabId)
    prefetcher().catch(() => {
      prefetchedResultsTabs.delete(tabId)
    })
  })
}

export function prefetchResultsTabBundles(tabIds: string[]): void {
  tabIds.forEach(prefetchResultsTabBundle)
}

const analysisTabMap: Record<string, string> = {
  card_sort: 'card-sort-analysis',
  tree_test: 'tree-test-analysis',
  survey: 'survey-analysis',
  prototype_test: 'prototype-test-analysis',
  first_click: 'first-click-analysis',
  first_impression: 'first-impression-analysis',
}

export function usePrefetchResultsBundles(studyType?: string): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      const tabIds: string[] = []

      if (studyType) {
        const analysisTab = analysisTabMap[studyType]
        if (analysisTab) {
          tabIds.push(analysisTab)
        }
      }

      if (tabIds.length > 0) {
        prefetchResultsTabBundles(tabIds)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [studyType])
}
