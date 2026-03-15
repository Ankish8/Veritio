'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { usePathname, useSearchParams } from 'next/navigation'
import { SWR_KEYS } from '@/lib/swr'
import { sortArticlesByRelevance, getUniqueCategories } from '@/services/knowledge-service'
import type { KnowledgeArticle } from '@veritio/study-types'
import type { ActiveFlowSection } from '@/stores/study-flow-builder'

export interface KnowledgeArticleWithRelevance extends KnowledgeArticle {
  relevanceScore: number
  isRelevant: boolean
}

export interface UseKnowledgeArticlesOptions {
  /** Current context path for relevance sorting */
  context?: string
}

export interface UseKnowledgeArticlesReturn {
  /** All articles sorted by relevance to current context */
  articles: KnowledgeArticleWithRelevance[]
  /** Unique categories found in articles */
  categories: string[]
  /** Loading state */
  isLoading: boolean
  /** Error if fetch failed */
  error: Error | null
  /** Refetch articles */
  refetch: () => void
}

/** Detects the current knowledge base context from the URL and navigation state. */
export function useKnowledgeBaseContext(): string {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  return useMemo(() => {
    // Dashboard pages
    if (pathname === '/' || pathname === '') {
      return 'dashboard'
    }

    if (pathname === '/projects' || pathname.match(/^\/projects\/?$/)) {
      return 'dashboard.projects'
    }

    if (pathname === '/studies' || pathname.match(/^\/studies\/?$/)) {
      return 'dashboard.studies'
    }

    if (pathname === '/archive' || pathname.match(/^\/archive\/?$/)) {
      return 'dashboard.archive'
    }

    if (pathname === '/settings' || pathname.startsWith('/settings')) {
      return 'settings'
    }

    // Builder pages - detect study type from URL
    // URL pattern: /projects/{id}/studies/{id}/builder
    const builderMatch = pathname.match(/\/projects\/[^/]+\/studies\/[^/]+\/builder/)
    if (builderMatch) {
      const tab = searchParams.get('tab') || 'details'
      const section = searchParams.get('section') as ActiveFlowSection | null

      // Detect study type from URL - check for type indicators
      // The study type is determined by the page content, we'll use URL hints
      const studyType = searchParams.get('type') || detectStudyTypeFromPath(pathname, searchParams)

      // Handle study-flow with section
      if (tab === 'study-flow' && section) {
        return `${studyType}.study-flow.${section}`
      }

      // Map tab to context with study type prefix
      return `${studyType}.${tab}`
    }

    // Results pages
    if (pathname.includes('/results')) {
      return 'results'
    }

    // Project detail page (viewing studies list)
    if (pathname.match(/^\/projects\/[^/]+$/)) {
      return 'dashboard.projects'
    }

    // Default to dashboard
    return 'dashboard'
  }, [pathname, searchParams])
}

function detectStudyTypeFromPath(pathname: string, searchParams: URLSearchParams): string {
  // Check if there's a type hint in search params
  const typeHint = searchParams.get('studyType')
  if (typeHint) {
    const typeMap: Record<string, string> = {
      'card-sort': 'card-sort',
      'tree-test': 'tree-test',
      'survey': 'survey',
      'prototype': 'prototype',
    }
    return typeMap[typeHint] || 'builder'
  }

  // Check the tab param for hints - prototype tab means prototype study
  const tab = searchParams.get('tab')
  if (tab === 'prototype' || tab === 'prototype-tasks') {
    return 'prototype'
  }
  if (tab === 'tree' || tab === 'content') {
    // Could be tree-test or card-sort, default to builder
    return 'builder'
  }

  return 'builder'
}

/** Fetches knowledge base articles and sorts them by relevance to the current context. */
export function useKnowledgeArticles(
  options: UseKnowledgeArticlesOptions = {}
): UseKnowledgeArticlesReturn {
  const { context = '' } = options

  const { data, error, isLoading, mutate } = useSWR<KnowledgeArticle[]>(
    SWR_KEYS.knowledgeArticles,
    null, // Uses global fetcher
    {
      // Cache for longer since articles don't change often
      dedupingInterval: 60000, // 1 minute
      revalidateOnFocus: false,
    }
  )

  // Sort articles by relevance to current context
  const sortedArticles = useMemo(() => {
    if (!data) return []
    if (!context) {
      // No context - return all with relevance 0
      return data.map(article => ({
        ...article,
        relevanceScore: 0,
        isRelevant: false,
      }))
    }
    return sortArticlesByRelevance(data, context)
  }, [data, context])

  // Extract unique categories
  const categories = useMemo(() => {
    if (!data) return []
    return getUniqueCategories(data)
  }, [data])

  return {
    articles: sortedArticles,
    categories,
    isLoading,
    error: error || null,
    refetch: () => mutate(),
  }
}

/** Fetches a single knowledge article by slug. */
export function useKnowledgeArticle(slug: string | null) {
  const { data, error, isLoading, mutate } = useSWR<KnowledgeArticle>(
    slug ? SWR_KEYS.knowledgeArticle(slug) : null,
    null, // Uses global fetcher
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false,
    }
  )

  return {
    article: data || null,
    isLoading,
    error: error || null,
    refetch: () => mutate(),
  }
}
