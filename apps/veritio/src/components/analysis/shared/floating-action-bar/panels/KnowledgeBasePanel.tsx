'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  BookOpen,
  FileText,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react'
import {
  useKnowledgeArticles,
  useKnowledgeBaseContext,
  type KnowledgeArticleWithRelevance,
} from '@/hooks/use-knowledge-base'
import { useKnowledgeQA } from '@/hooks/use-knowledge-qa'

import DOMPurify from 'dompurify'
import type { StudyType } from '../FloatingActionBarContext'

interface KnowledgeBasePanelProps {
  /** Optional study type override for better context detection */
  studyType?: StudyType
}

/** Simple markdown-to-HTML converter for basic formatting. */
function parseMarkdown(markdown: string): string {
  let html = markdown
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers (## Header -> <h2>)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold (**text** or __text__)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic (*text* or _text_)
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    // Inline code (`code`)
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-sm">$1</code>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>')

  // Process lists - find blocks of consecutive list items
  // Unordered lists (- item)
  html = html.replace(/^- (.+)$/gm, '{{LI}}$1{{/LI}}')
  // Ordered lists (1. item)
  html = html.replace(/^\d+\. (.+)$/gm, '{{LI}}$1{{/LI}}')
  // Wrap consecutive list items in <ul> and convert markers to <li>
  html = html.replace(/({{LI}}.*?{{\/LI}}\n?)+/g, (match) => {
    const items = match.replace(/{{LI}}(.*?){{\/LI}}\n?/g, '<li>$1</li>')
    return `<ul class="list-disc pl-5 my-1.5">${items}</ul>`
  })

  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p>')
  // Single newlines within paragraphs (but not inside tags)
  html = html.replace(/\n/g, '<br/>')

  // Wrap in paragraph tags
  html = `<p>${html}</p>`

  // Clean up: remove <br/> right after </ul> or </li> or before <ul>
  html = html
    .replace(/<\/ul><br\/>/g, '</ul>')
    .replace(/<br\/><ul/g, '<ul')
    .replace(/<\/li><br\/>/g, '</li>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-3]>)/g, '$1')
    .replace(/(<\/h[1-3]>)<\/p>/g, '$1')
    .replace(/<p>(<ul)/g, '$1')
    .replace(/(<\/ul>)<\/p>/g, '$1')

  return html
}

function ArticleListView({
  articles,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onSelectArticle,
  onAskQuestion,
  isLoading,
  error,
}: {
  articles: KnowledgeArticleWithRelevance[]
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  onSelectArticle: (article: KnowledgeArticleWithRelevance) => void
  onAskQuestion: (question: string) => void
  isLoading: boolean
  error: Error | null
}) {
  const [questionInput, setQuestionInput] = useState('')
  const questionInputRef = useRef<HTMLInputElement>(null)

  const handleAskQuestion = useCallback(() => {
    const q = questionInput.trim()
    if (!q) return
    onAskQuestion(q)
    setQuestionInput('')
  }, [questionInput, onAskQuestion])
  // Count total relevant articles
  const relevantCount = useMemo(() => {
    return articles.filter((a) => a.isRelevant).length
  }, [articles])

  // Filter articles: show relevant if available, otherwise show ALL
  const filteredArticles = useMemo(() => {
    // When searching, search ALL articles
    if (searchQuery) {
      return articles.filter((article) => {
        const matchesSearch =
          article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
          article.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesCategory =
          selectedCategory === 'All Articles' || article.category === selectedCategory

        return matchesSearch && matchesCategory
      })
    }

    // When not searching: show relevant articles if any exist, otherwise show ALL
    const hasRelevant = relevantCount > 0

    return articles.filter((article) => {
      // If we have relevant articles, only show those
      // If no relevant articles, show all
      if (hasRelevant && !article.isRelevant) return false

      const matchesCategory =
        selectedCategory === 'All Articles' || article.category === selectedCategory

      return matchesCategory
    })
  }, [articles, searchQuery, selectedCategory, relevantCount])

  // Get categories from displayed articles
  const availableCategories = useMemo(() => {
    const displayedArticles = relevantCount > 0 && !searchQuery
      ? articles.filter(a => a.isRelevant)
      : articles
    const cats = new Set<string>()
    displayedArticles.forEach(a => cats.add(a.category))
    return Array.from(cats).sort()
  }, [articles, searchQuery, relevantCount])

  const allCategories = useMemo(() => ['All Articles', ...availableCategories], [availableCategories])

  return (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-foreground">Knowledge Base</h2>
        </div>
        <p className="text-xs text-muted-foreground">Find helpful articles and guides</p>
      </div>

      {/* AI Question Input */}
      <div className="px-4 py-3 border-b bg-gradient-to-r from-violet-50/50 to-amber-50/50 dark:from-violet-950/20 dark:to-amber-950/20">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleAskQuestion()
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-500" />
            <Input
              ref={questionInputRef}
              type="text"
              placeholder="Ask about Veritio..."
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={!questionInput.trim()}
            className="h-9 px-3"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search all articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Categories - horizontal scrollable with fade hint */}
      <div className="relative px-4 py-2.5 border-b">
        <div className="flex gap-2 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allCategories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs h-7 px-3 flex-shrink-0"
            >
              {category}
            </Button>
          ))}
        </div>
        {/* Fade gradient to hint more content */}
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>

      {/* Context indicator */}
      {!searchQuery && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>
              {relevantCount > 0
                ? `${relevantCount} article${relevantCount !== 1 ? 's' : ''} for this page`
                : 'Showing all articles'}
            </span>
          </div>
        </div>
      )}
      {searchQuery && (
        <div className="px-4 py-2 border-b bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
            <Search className="h-3.5 w-3.5" />
            <span>Searching all articles</span>
          </div>
        </div>
      )}

      {/* Articles List */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-3 space-y-2.5">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-44" />
                </div>
                <Skeleton className="h-3.5 w-full mb-1" />
                <Skeleton className="h-3.5 w-3/4 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
            ))
          ) : error ? (
            // Error state
            <div className="text-center py-8">
              <AlertCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
              <p className="text-sm text-destructive">Failed to load articles</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please try again later
              </p>
            </div>
          ) : filteredArticles.length === 0 ? (
            // Empty state
            <div className="text-center py-8">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No articles match your search' : 'No articles available'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery ? 'Try different keywords' : 'Check back later for new content'}
              </p>
            </div>
          ) : (
            // Article cards
            filteredArticles.map((article) => (
              <button
                key={article.id}
                className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                onClick={() => onSelectArticle(article)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <h3 className="text-sm font-medium text-foreground line-clamp-1">
                        {article.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
                      {article.preview}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        {article.category}
                      </Badge>
                      {article.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {(article.tags?.length ?? 0) > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{(article.tags?.length ?? 0) - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform mt-0.5" />
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  )
}

function ArticleDetailView({
  article,
  onBack,
}: {
  article: KnowledgeArticleWithRelevance
  onBack: () => void
}) {
  const htmlContent = useMemo(() => parseMarkdown(article.content), [article.content])

  return (
    <>
      {/* Header with back button */}
      <div className="px-4 py-3 border-b">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to articles
        </button>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground line-clamp-2">
            {article.title}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-xs px-2 py-0.5">
            {article.category}
          </Badge>
          {article.tags?.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
              {tag}
            </Badge>
          ))}
          {(article.tags?.length ?? 0) > 3 && (
            <span className="text-xs text-muted-foreground">+{(article.tags?.length ?? 0) - 3}</span>
          )}
        </div>
      </div>

      {/* Article content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4">
          <article
            className="text-sm leading-normal text-muted-foreground
              [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-2 [&_h1]:mt-3 [&_h1:first-child]:mt-0
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2:first-child]:mt-0
              [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mb-1 [&_h3]:mt-2.5 [&_h3:first-child]:mt-0
              [&_p]:mb-2 [&_p]:leading-normal
              [&_strong]:text-foreground [&_strong]:font-medium
              [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc
              [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal
              [&_li]:my-0.5 [&_li]:leading-normal
              [&_a]:text-primary [&_a]:underline
              [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
          />
        </div>
      </ScrollArea>
    </>
  )
}

function AIAnswerView({
  question,
  answer,
  isStreaming,
  usedArticleSlugs,
  error: qaError,
  articles,
  onBack,
  onSelectArticle,
  onAskAnother,
}: {
  question: string
  answer: string
  isStreaming: boolean
  usedArticleSlugs: string[]
  error: string | null
  articles: KnowledgeArticleWithRelevance[]
  onBack: () => void
  onSelectArticle: (article: KnowledgeArticleWithRelevance) => void
  onAskAnother: (question: string) => void
}) {
  const [followUpInput, setFollowUpInput] = useState('')
  const answerHtml = useMemo(() => (answer ? parseMarkdown(answer) : ''), [answer])

  // Find source articles by slug
  const sourceArticles = useMemo(() => {
    return usedArticleSlugs
      .map((slug) => articles.find((a) => a.slug === slug))
      .filter(Boolean) as KnowledgeArticleWithRelevance[]
  }, [usedArticleSlugs, articles])

  const handleFollowUp = useCallback(() => {
    const q = followUpInput.trim()
    if (!q) return
    onAskAnother(q)
    setFollowUpInput('')
  }, [followUpInput, onAskAnother])

  return (
    <>
      {/* Header with back button */}
      <div className="px-4 py-3 border-b">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to articles
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
          <h2 className="text-base font-semibold text-foreground">AI Answer</h2>
        </div>
      </div>

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-4">
          {/* User question */}
          <div className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-sm text-foreground">{question}</p>
          </div>

          {/* AI answer */}
          {qaError ? (
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>{qaError}</p>
            </div>
          ) : (
            <div>
              {answer ? (
                <article
                  className="text-sm leading-normal text-muted-foreground
                    [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mb-2 [&_h1]:mt-3 [&_h1:first-child]:mt-0
                    [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mb-1.5 [&_h2]:mt-3 [&_h2:first-child]:mt-0
                    [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mb-1 [&_h3]:mt-2.5 [&_h3:first-child]:mt-0
                    [&_p]:mb-2 [&_p]:leading-normal
                    [&_strong]:text-foreground [&_strong]:font-medium
                    [&_ul]:my-1.5 [&_ul]:pl-5 [&_ul]:list-disc
                    [&_ol]:my-1.5 [&_ol]:pl-5 [&_ol]:list-decimal
                    [&_li]:my-0.5 [&_li]:leading-normal
                    [&_a]:text-primary [&_a]:underline
                    [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(answerHtml) }}
                />
              ) : null}
              {isStreaming && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Thinking...
                </span>
              )}
            </div>
          )}

          {/* Source articles */}
          {!isStreaming && sourceArticles.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
              <div className="space-y-1.5">
                {sourceArticles.map((article) => (
                  <button
                    key={article.id}
                    onClick={() => onSelectArticle(article)}
                    className="w-full text-left flex items-center gap-2 p-2 rounded-md border border-border hover:bg-muted/50 transition-colors group"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-xs text-foreground line-clamp-1 flex-1">{article.title}</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Follow-up question input */}
      {!isStreaming && (
        <div className="px-4 py-3 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleFollowUp()
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-500" />
              <Input
                type="text"
                placeholder="Ask another question..."
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={!followUpInput.trim()}
              className="h-9 px-3"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}

export function KnowledgeBasePanel({ studyType }: KnowledgeBasePanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All Articles')
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticleWithRelevance | null>(null)
  const [view, setView] = useState<'list' | 'answer' | 'article'>('list')
  const [currentQuestion, setCurrentQuestion] = useState('')

  // Get current context from URL/navigation
  const autoContext = useKnowledgeBaseContext()

  // Use studyType prop to override context if provided
  const context = useMemo(() => {
    if (studyType && autoContext.startsWith('builder')) {
      return autoContext.replace(/^builder/, studyType)
    }
    return autoContext
  }, [autoContext, studyType])

  // Fetch articles with context-aware sorting
  const { articles, isLoading, error } = useKnowledgeArticles({ context })

  // AI Q&A hook
  const qa = useKnowledgeQA(context)

  // Handle asking a question
  const handleAskQuestion = useCallback((question: string) => {
    setCurrentQuestion(question)
    setView('answer')
    qa.askQuestion(question)
  }, [qa])

  // Handle article selection
  const handleSelectArticle = useCallback((article: KnowledgeArticleWithRelevance) => {
    setSelectedArticle(article)
    setView('article')
  }, [])

  // Handle back to list
  const handleBack = useCallback(() => {
    setSelectedArticle(null)
    setView('list')
    qa.reset()
  }, [qa])

  // Show AI answer view
  if (view === 'answer') {
    return (
      <AIAnswerView
        question={currentQuestion}
        answer={qa.answer}
        isStreaming={qa.isStreaming}
        usedArticleSlugs={qa.usedArticleSlugs}
        error={qa.error}
        articles={articles}
        onBack={handleBack}
        onSelectArticle={handleSelectArticle}
        onAskAnother={handleAskQuestion}
      />
    )
  }

  // Show detail view if article is selected
  if (view === 'article' && selectedArticle) {
    return <ArticleDetailView article={selectedArticle} onBack={handleBack} />
  }

  // Show list view
  return (
    <ArticleListView
      articles={articles}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      selectedCategory={selectedCategory}
      setSelectedCategory={setSelectedCategory}
      onSelectArticle={handleSelectArticle}
      onAskQuestion={handleAskQuestion}
      isLoading={isLoading}
      error={error}
    />
  )
}
