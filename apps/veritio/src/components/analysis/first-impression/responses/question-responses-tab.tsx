'use client'

/**
 * Question Responses Tab
 *
 * Displays ALL question types in a vertical card stack:
 * - single_choice / multiple_choice: Horizontal bar charts
 * - rating / scale: Stats row (avg/min/max)
 * - short_text / long_text: Card view or Word Cloud view
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MessageSquare, Filter, X } from 'lucide-react'
import { ResponseCard } from './response-card'
import { ResponseStatsCard } from './response-stats-card'
import { ViewToggle, type ResponseViewMode } from './view-toggle'
import { WordCloudVisualization, type WordData } from '../word-cloud/word-cloud-visualization'
import { TextStatsPanel } from '../word-cloud/text-stats-panel'
import { ResponseDrillContent, ResponseDrillEmptyState } from '../word-cloud/response-drill-panel'
import { useWordCloudPreferences } from '@/hooks/use-word-cloud-preferences'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar/FloatingActionBarContext'
import {
  DEFAULT_STOP_WORDS,
  formatQuestionType,
  isTextQuestion,
} from '@/lib/utils/question-helpers'
import type {
  FirstImpressionResultsResponse,
  FirstImpressionResponse,
  FirstImpressionSession,
  FirstImpressionExposure,
  DesignMetric,
  QuestionMetric,
} from '@/services/results/first-impression'
import type { ExtendedFirstImpressionSettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

/** Index an array of items by their `id` field into a Map for O(1) lookups. */
function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]))
}

/** Group responses by a composite key for O(1) lookups instead of repeated filtering. */
function groupResponsesByDesignQuestion(
  responses: FirstImpressionResponse[]
): Map<string, FirstImpressionResponse[]> {
  const map = new Map<string, FirstImpressionResponse[]>()
  for (const r of responses) {
    const key = `${r.design_id}:${r.question_id}`
    const group = map.get(key)
    if (group) {
      group.push(r)
    } else {
      map.set(key, [r])
    }
  }
  return map
}

/** Encapsulates all word cloud UI state: selected words, stop word filter visibility, and preferences. */
function useWordCloudState() {
  const [selectedWords, setSelectedWords] = useState<Record<string, string | null>>({})
  const [showStopWordFilter, setShowStopWordFilter] = useState(false)
  const [customStopWordInput, setCustomStopWordInput] = useState('')

  const {
    stopWordsEnabled,
    setStopWordsEnabled,
    customStopWords,
    addCustomStopWord,
    removeCustomStopWord,
  } = useWordCloudPreferences()

  return {
    selectedWords,
    setSelectedWords,
    showStopWordFilter,
    setShowStopWordFilter,
    customStopWordInput,
    setCustomStopWordInput,
    stopWordsEnabled,
    setStopWordsEnabled,
    customStopWords,
    addCustomStopWord,
    removeCustomStopWord,
  }
}

type WordCloudState = ReturnType<typeof useWordCloudState>

/** Global stop word controls shown when any word cloud view is active. */
function StopWordControls({
  wordCloud,
  onAddStopWord,
}: {
  wordCloud: WordCloudState
  onAddStopWord: () => void
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="stop-words-global"
            checked={wordCloud.stopWordsEnabled}
            onCheckedChange={wordCloud.setStopWordsEnabled}
          />
          <Label htmlFor="stop-words-global" className="text-sm cursor-pointer">
            Filter common words
          </Label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => wordCloud.setShowStopWordFilter(!wordCloud.showStopWordFilter)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Custom filters
          {wordCloud.customStopWords.size > 0 && (
            <Badge variant="secondary" className="ml-1">
              {wordCloud.customStopWords.size}
            </Badge>
          )}
        </Button>
      </div>

      {wordCloud.showStopWordFilter && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Custom Word Filters</CardTitle>
            <CardDescription>
              Add words to exclude from word clouds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter word to exclude..."
                value={wordCloud.customStopWordInput}
                onChange={(e) => wordCloud.setCustomStopWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onAddStopWord()}
                className="flex-1"
              />
              <Button onClick={onAddStopWord} size="sm">
                Add
              </Button>
            </div>
            {wordCloud.customStopWords.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(wordCloud.customStopWords).map(word => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => wordCloud.removeCustomStopWord(word)}
                  >
                    {word}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  )
}

interface QuestionResponsesTabProps {
  data: FirstImpressionResultsResponse
  designs: DesignMetric[]
  selectedDesignId: string | null
  onSelectDesign: (id: string) => void
  studyId: string
  onViewParticipant?: (participantId: string) => void
}

export function QuestionResponsesTab({
  data,
  designs,
  selectedDesignId,
  onSelectDesign,
  studyId,
  onViewParticipant,
}: QuestionResponsesTabProps) {
  // Floating action bar for right panel
  const { addPageAction, removePageAction, openDynamicPanel } = useFloatingActionBar()

  // Derive participant display settings from study settings
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = data.study.settings as (ExtendedFirstImpressionSettings & { studyFlow?: StudyFlowSettings }) | null
    const identifier = settings?.studyFlow?.participantIdentifier
    if (!identifier?.type || identifier.type === 'anonymous') return null
    return identifier.displaySettings ?? { primaryField: 'fullName', secondaryField: 'email' }
  }, [data.study.settings])

  // Per-question view modes (keyed by questionId)
  const [viewModes, setViewModes] = useState<Record<string, ResponseViewMode>>({})

  // Word cloud state
  const wordCloud = useWordCloudState()

  // Get selected design
  const selectedDesign = useMemo(() => {
    if (selectedDesignId) {
      return designs.find(d => d.designId === selectedDesignId) || designs[0]
    }
    return designs[0]
  }, [selectedDesignId, designs])

  // All questions for the selected design
  const questions = useMemo(() => {
    if (!selectedDesign) return []
    return selectedDesign.questionMetrics
  }, [selectedDesign])

  // Lookup maps for session and exposure data
  const sessionMap = useMemo(() => indexById(data.sessions), [data.sessions])
  const exposureMap = useMemo(() => indexById(data.exposures), [data.exposures])

  // Pre-group responses by (design_id, question_id) for O(1) lookups
  const responsesByDesignQuestion = useMemo(
    () => groupResponsesByDesignQuestion(data.responses),
    [data.responses]
  )

  // Get design name helper
  const getDesignName = useCallback((designId: string) => {
    const design = data.designs.find(d => d.id === designId)
    return design?.name || `Design ${(design?.position ?? 0) + 1}`
  }, [data.designs])

  // Get exposure count for selected design
  const designExposureCount = useMemo(() => {
    if (!selectedDesign) return 0
    return data.exposures.filter(e => e.design_id === selectedDesign.designId).length
  }, [data.exposures, selectedDesign])

  // Combined stop words
  const activeStopWords = useMemo(() => {
    if (!wordCloud.stopWordsEnabled) return new Set<string>()
    return new Set([...DEFAULT_STOP_WORDS, ...wordCloud.customStopWords])
  }, [wordCloud.stopWordsEnabled, wordCloud.customStopWords])

  // Per-question view mode helpers
  const getViewMode = useCallback((questionId: string): ResponseViewMode => {
    return viewModes[questionId] || 'cards'
  }, [viewModes])

  const setViewMode = useCallback((questionId: string, mode: ResponseViewMode) => {
    setViewModes(prev => ({ ...prev, [questionId]: mode }))
  }, [])

  // Get responses for a specific question (O(1) lookup via pre-grouped map)
  const getQuestionResponses = useCallback((questionId: string): FirstImpressionResponse[] => {
    if (!selectedDesign) return []
    return responsesByDesignQuestion.get(`${selectedDesign.designId}:${questionId}`) ?? []
  }, [responsesByDesignQuestion, selectedDesign])

  // Build word data for a text question
  const buildWordData = useCallback((responses: FirstImpressionResponse[]): WordData[] => {
    const wordCounts = new Map<string, number>()

    for (const response of responses) {
      const text = response.response_value as string
      if (!text || typeof text !== 'string') continue

      const words = text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2 && !activeStopWords.has(word))

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    }

    const sortedWords = Array.from(wordCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)

    if (sortedWords.length === 0) return []

    const totalCount = sortedWords.reduce((sum, w) => sum + w.count, 0)
    const maxCount = sortedWords[0].count
    const minCount = sortedWords[sortedWords.length - 1].count

    return sortedWords.map(word => ({
      text: word.text,
      count: word.count,
      percentage: (word.count / totalCount) * 100,
      size: minCount === maxCount
        ? 28
        : 14 + ((word.count - minCount) / (maxCount - minCount)) * 42,
    }))
  }, [activeStopWords])

  // Handle adding custom stop word
  const handleAddStopWord = useCallback(() => {
    const word = wordCloud.customStopWordInput.trim().toLowerCase()
    if (word && word.length > 0) {
      wordCloud.addCustomStopWord(word)
      wordCloud.setCustomStopWordInput('')
    }
  }, [wordCloud])

  // Register word responses icon in the right sidebar
  useEffect(() => {
    addPageAction({
      id: 'word-responses',
      icon: MessageSquare,
      tooltip: 'Word Responses',
      panelContent: <ResponseDrillEmptyState />,
    })
    return () => removePageAction('word-responses')
  }, [addPageAction, removePageAction])

  // Handle word click from any question's word cloud — open in right panel
  const handleWordSelected = useCallback((questionId: string, word: string | null) => {
    wordCloud.setSelectedWords(prev => ({ ...prev, [questionId]: word }))
    if (word) {
      const qResponses = getQuestionResponses(questionId)
      const filtered = qResponses.filter(r => {
        const text = r.response_value as string
        if (!text || typeof text !== 'string') return false
        return text.toLowerCase().includes(word.toLowerCase())
      })
      openDynamicPanel('word-responses', {
        content: (
          <ResponseDrillContent
            word={word}
            responses={filtered}
            totalResponses={qResponses.length}
            participants={data.participants}
            displaySettings={participantDisplaySettings}
          />
        ),
        title: `Responses containing \u201c${word}\u201d`,
      })
    }
  }, [wordCloud, getQuestionResponses, data.participants, participantDisplaySettings, openDynamicPanel])

  // No designs
  if (!designs.length) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No designs have been configured for this study.
          </div>
        </CardContent>
      </Card>
    )
  }

  // No questions for selected design
  if (!questions.length) {
    return (
      <div className="space-y-6">
        <DesignSelector
          designs={designs}
          selectedDesign={selectedDesign}
          onSelectDesign={onSelectDesign}
        />
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No questions found</p>
              <p className="text-sm mt-1">
                This design doesn&apos;t have any questions configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if any text question is currently in word-cloud mode (to show stop word controls)
  const anyWordCloudActive = questions.some(
    q => isTextQuestion(q.type) && getViewMode(q.questionId) === 'word-cloud'
  )

  return (
    <div className="space-y-6">
      {/* Design Selector Dropdown */}
      <DesignSelector
        designs={designs}
        selectedDesign={selectedDesign}
        onSelectDesign={onSelectDesign}
      />

      {/* Global stop word controls (shown when any word cloud is active) */}
      {anyWordCloudActive && (
        <StopWordControls
          wordCloud={wordCloud}
          onAddStopWord={handleAddStopWord}
        />
      )}

      {/* Question Cards - vertical stack */}
      {questions.map((question, idx) => (
        <QuestionCard
          key={question.questionId}
          question={question}
          index={idx}
          studyId={studyId}
          responses={getQuestionResponses(question.questionId)}
          viewMode={getViewMode(question.questionId)}
          onViewModeChange={(mode) => setViewMode(question.questionId, mode)}
          sessionMap={sessionMap}
          exposureMap={exposureMap}
          getDesignName={getDesignName}
          designExposureCount={designExposureCount}
          onViewParticipant={onViewParticipant}
          buildWordData={buildWordData}
          selectedWord={wordCloud.selectedWords[question.questionId] || null}
          onSelectedWordChange={(word) => handleWordSelected(question.questionId, word)}
        />
      ))}
    </div>
  )
}

// --- Design Selector (using Select dropdown) ---

interface DesignSelectorProps {
  designs: DesignMetric[]
  selectedDesign: DesignMetric | undefined
  onSelectDesign: (id: string) => void
}

function DesignSelector({ designs, selectedDesign, onSelectDesign }: DesignSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">Design</span>
      <Select
        value={selectedDesign?.designId}
        onValueChange={onSelectDesign}
      >
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select design" />
        </SelectTrigger>
        <SelectContent>
          {designs.map((design) => (
            <SelectItem key={design.designId} value={design.designId}>
              {design.designName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

// --- Per-Question Card (memoized to avoid re-renders on selectedWords changes) ---

interface QuestionCardProps {
  question: QuestionMetric
  index: number
  studyId: string
  responses: FirstImpressionResponse[]
  viewMode: ResponseViewMode
  onViewModeChange: (mode: ResponseViewMode) => void
  sessionMap: Map<string, FirstImpressionSession>
  exposureMap: Map<string, FirstImpressionExposure>
  getDesignName: (designId: string) => string
  designExposureCount: number
  onViewParticipant?: (participantId: string) => void
  buildWordData: (responses: FirstImpressionResponse[]) => WordData[]
  selectedWord: string | null
  onSelectedWordChange: (word: string | null) => void
}

const QuestionCard = React.memo(function QuestionCard({
  question,
  index,
  studyId,
  responses,
  viewMode,
  onViewModeChange,
  sessionMap,
  exposureMap,
  getDesignName,
  designExposureCount,
  onViewParticipant,
  buildWordData,
  selectedWord,
  onSelectedWordChange,
}: QuestionCardProps) {
  const isText = isTextQuestion(question.type)
  const isChoice = ['single_choice', 'multiple_choice', 'yes_no', 'image_choice'].includes(question.type)
  const isRatingOrScale = ['rating', 'scale', 'opinion_scale', 'nps', 'slider'].includes(question.type)

  // Word data for text questions in word-cloud mode
  const wordData = useMemo(() => {
    if (!isText || viewMode !== 'word-cloud') return []
    return buildWordData(responses)
  }, [isText, viewMode, buildWordData, responses])

  // Handle word click in word cloud
  const handleWordClick = useCallback((word: string) => {
    onSelectedWordChange(word)
  }, [onSelectedWordChange])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-medium">
              Q{index + 1}: {question.prompt}
            </CardTitle>
            <CardDescription className="mt-1">
              <Badge variant="secondary" className="text-xs mr-2">
                {formatQuestionType(question.type)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {question.responseRate.toFixed(0)}% response rate
              </span>
            </CardDescription>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Response count badge */}
            <Badge variant="outline">
              {question.responseCount} response{question.responseCount !== 1 ? 's' : ''}
            </Badge>

            {/* View toggle for text questions */}
            {isText && (
              <ViewToggle
                value={viewMode}
                onChange={onViewModeChange}
                showWordCloud
              />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Rating / Scale Questions */}
        {isRatingOrScale && question.avgRating !== undefined && (
          <RatingScaleContent question={question} />
        )}

        {/* Choice Questions */}
        {isChoice && question.optionCounts && (
          <ChoiceContent question={question} />
        )}

        {/* Text Questions */}
        {isText && (
          <TextQuestionContent
            question={question}
            responses={responses}
            viewMode={viewMode}
            studyId={studyId}
            sessionMap={sessionMap}
            exposureMap={exposureMap}
            getDesignName={getDesignName}
            designExposureCount={designExposureCount}
            onViewParticipant={onViewParticipant}
            wordData={wordData}
            selectedWord={selectedWord}
            onWordClick={handleWordClick}
          />
        )}

        {/* Fallback for empty non-text questions */}
        {!isText && !isChoice && !isRatingOrScale && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No visualization available for this question type.
          </div>
        )}
      </CardContent>
    </Card>
  )
})

// --- Rating / Scale Content ---

function RatingScaleContent({ question }: { question: QuestionMetric }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center p-4 rounded-lg bg-muted">
        <div className="text-2xl font-bold">{question.avgRating?.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground mt-1">Average</div>
      </div>
      <div className="text-center p-4 rounded-lg bg-muted">
        <div className="text-2xl font-bold">{question.minRating}</div>
        <div className="text-sm text-muted-foreground mt-1">Min</div>
      </div>
      <div className="text-center p-4 rounded-lg bg-muted">
        <div className="text-2xl font-bold">{question.maxRating}</div>
        <div className="text-sm text-muted-foreground mt-1">Max</div>
      </div>
    </div>
  )
}

// --- Choice Content (Horizontal Bar Chart) ---

function ChoiceContent({ question }: { question: QuestionMetric }) {
  if (!question.optionCounts || question.optionCounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No responses yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {question.optionCounts.map((option) => (
        <div key={option.option} className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm truncate max-w-[300px]">{option.option}</span>
              <span className="text-sm text-muted-foreground shrink-0 ml-2">
                {option.count} ({option.percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${option.percentage}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Text Question Content ---

interface TextQuestionContentProps {
  question: QuestionMetric
  responses: FirstImpressionResponse[]
  viewMode: ResponseViewMode
  studyId: string
  sessionMap: Map<string, FirstImpressionSession>
  exposureMap: Map<string, FirstImpressionExposure>
  getDesignName: (designId: string) => string
  designExposureCount: number
  onViewParticipant?: (participantId: string) => void
  wordData: WordData[]
  selectedWord: string | null
  onWordClick: (word: string) => void
}

function TextQuestionContent({
  question,
  responses,
  viewMode,
  studyId,
  sessionMap,
  exposureMap,
  getDesignName,
  designExposureCount,
  onViewParticipant,
  wordData,
  selectedWord,
  onWordClick,
}: TextQuestionContentProps) {
  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="font-medium text-sm">No responses yet</p>
        <p className="text-xs mt-1">
          Responses will appear here as participants complete the study.
        </p>
      </div>
    )
  }

  // Word Cloud view
  if (viewMode === 'word-cloud') {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WordCloudVisualization
            wordData={wordData}
            onWordClick={onWordClick}
            selectedWord={selectedWord}
          />
        </div>
        <TextStatsPanel
          responses={responses}
          wordData={wordData}
          totalResponseCount={question.responseCount}
        />
      </div>
    )
  }

  // Cards / Timeline views
  return (
    <div className="space-y-4">
      {/* Response Statistics */}
      <ResponseStatsCard
        responses={responses}
        totalExposures={designExposureCount}
      />

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-3">
          {responses.map(response => {
            const session = sessionMap.get(response.session_id)
            const exposure = exposureMap.get(response.exposure_id)

            return (
              <ResponseCard
                key={response.id}
                studyId={studyId}
                response={response}
                session={session}
                exposure={exposure}
                designName={getDesignName(response.design_id)}
                onViewParticipant={onViewParticipant}
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
