import { prefetchIfFast } from '@/lib/swr/prefetch'

const tabBundlePrefetchers: Record<string, () => Promise<unknown>> = {
  content: () => import('@/components/builders/card-sort'),
  tree: () => import('@/components/builders/tree-test'),
  tasks: () => import('@/components/builders/tree-test'),
  prototype: () => import('@veritio/prototype-test/builder'),
  'prototype-tasks': () => import('@veritio/prototype-test/builder'),
  'first-click-tasks': () => import('@/components/builders/first-click'),
  'first-impression-designs': () => import('@/components/builders/first-impression'),
  'study-flow': () => import('@veritio/prototype-test/components/study-flow/builder'),
}

const prefetchedTabs = new Set<string>()

export function prefetchTabBundle(tabId: string) {
  if (prefetchedTabs.has(tabId)) return

  const prefetcher = tabBundlePrefetchers[tabId]
  if (!prefetcher) return

  prefetchIfFast(() => {
    prefetchedTabs.add(tabId)
    prefetcher().catch(() => {
      prefetchedTabs.delete(tabId)
    })
  })
}

export function resetTabPrefetchState() {
  prefetchedTabs.clear()
}
