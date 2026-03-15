import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, KnowledgeArticle } from '@veritio/study-types'

type SupabaseClientType = SupabaseClient<Database>

// Using 'as const' because auto-generated Database types may not include this table yet
const KNOWLEDGE_ARTICLES_TABLE = 'knowledge_articles' as const

export async function listKnowledgeArticles(
  supabase: SupabaseClientType
): Promise<{ data: KnowledgeArticle[] | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(KNOWLEDGE_ARTICLES_TABLE)
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: new Error(error.message) }
  }

  return { data: (data as unknown as KnowledgeArticle[]) || [], error: null }
}

export async function getKnowledgeArticleBySlug(
  supabase: SupabaseClientType,
  slug: string
): Promise<{ data: KnowledgeArticle | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(KNOWLEDGE_ARTICLES_TABLE)
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Article not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as unknown as KnowledgeArticle, error: null }
}

export async function getKnowledgeArticleById(
  supabase: SupabaseClientType,
  id: string
): Promise<{ data: KnowledgeArticle | null; error: Error | null }> {
  const { data, error } = await supabase
    .from(KNOWLEDGE_ARTICLES_TABLE)
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return { data: null, error: new Error('Article not found') }
    }
    return { data: null, error: new Error(error.message) }
  }

  return { data: data as unknown as KnowledgeArticle, error: null }
}

/** Scoring: exact match=100, broader article=50+depth, narrower article=25+depth, no match=0 */
export function calculateContextRelevance(
  articleContexts: string[],
  currentContext: string
): number {
  let maxScore = 0

  for (const articleContext of articleContexts) {
    let score = 0

    if (articleContext === currentContext) {
      score = 100
    } else if (currentContext.startsWith(articleContext + '.') || currentContext.startsWith(articleContext)) {
      const depth = articleContext.split('.').length
      score = 50 + (depth * 10)
    } else if (articleContext.startsWith(currentContext + '.')) {
      const depth = currentContext.split('.').length
      score = 25 + (depth * 5)
    }

    maxScore = Math.max(maxScore, score)
  }

  return maxScore
}

export function sortArticlesByRelevance(
  articles: KnowledgeArticle[],
  currentContext: string
): Array<KnowledgeArticle & { relevanceScore: number; isRelevant: boolean }> {
  return articles
    .map(article => {
      const relevanceScore = calculateContextRelevance(article.contexts, currentContext)
      return {
        ...article,
        relevanceScore,
        isRelevant: relevanceScore > 0,
      }
    })
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore
      const aPriority = a.priority ?? 0
      const bPriority = b.priority ?? 0
      if (bPriority !== aPriority) return bPriority - aPriority
      return a.title.localeCompare(b.title)
    })
}

export function selectContextArticles(
  articles: KnowledgeArticle[],
  context: string,
  limit = 5
): KnowledgeArticle[] {
  if (!context) {
    return [...articles]
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, limit)
  }

  const sorted = sortArticlesByRelevance(articles, context)
  return sorted.slice(0, limit)
}

export function getUniqueCategories(articles: KnowledgeArticle[]): string[] {
  const categories = new Set<string>()
  articles.forEach(article => categories.add(article.category))
  return Array.from(categories).sort()
}
