'use client'

/**
 * First Impression Word Cloud Tab
 *
 * Visualizes text responses as an interactive word cloud with:
 * - Design selector to filter by design
 * - Question selector for text questions
 * - Stop-word filtering with customization
 * - Text statistics panel
 * - Click-through drilling to see responses containing a word
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Image, MessageSquare, Filter, X, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { TextStatsPanel } from './text-stats-panel'
import { ResponseDrillContent, ResponseDrillEmptyState } from './response-drill-panel'
import { WordCloudVisualization } from './word-cloud-visualization'
import { useWordCloudPreferences } from '@/hooks/use-word-cloud-preferences'
import { useFloatingActionBar } from '@/components/analysis/shared/floating-action-bar/FloatingActionBarContext'
import { DEFAULT_STOP_WORDS, buildWordData as buildWordDataFromResponses } from '@/lib/utils/question-helpers'
import type {
  FirstImpressionResultsResponse,
  DesignMetric,
} from '@/services/results/first-impression'
import type { ExtendedFirstImpressionSettings, ParticipantDisplaySettings, StudyFlowSettings } from '@veritio/study-types/study-flow-types'

interface WordCloudTabProps {
  data: FirstImpressionResultsResponse
  designs: DesignMetric[]
  selectedDesignId: string | null
  onSelectDesign: (id: string) => void
  /** Callback when a word is clicked - navigates to Question Responses tab with filter */
  onWordClick?: (word: string, questionId: string) => void
}

export function WordCloudTab({
  data,
  designs,
  selectedDesignId,
  onSelectDesign,
  onWordClick,
}: WordCloudTabProps) {
  // Persisted preferences
  const {
    stopWordsEnabled,
    setStopWordsEnabled,
    customStopWords,
    addCustomStopWord,
    removeCustomStopWord,
  } = useWordCloudPreferences()

  // Floating action bar for right panel
  const { addPageAction, removePageAction, openDynamicPanel } = useFloatingActionBar()

  // Derive participant display settings from study settings
  const participantDisplaySettings = useMemo<ParticipantDisplaySettings | null>(() => {
    const settings = data.study.settings as (ExtendedFirstImpressionSettings & { studyFlow?: StudyFlowSettings }) | null
    const identifier = settings?.studyFlow?.participantIdentifier
    if (!identifier?.type || identifier.type === 'anonymous') return null
    return identifier.displaySettings ?? { primaryField: 'fullName', secondaryField: 'email' }
  }, [data.study.settings])

  // State
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [customStopWordInput, setCustomStopWordInput] = useState('')
  const [showStopWordFilter, setShowStopWordFilter] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)

  // Get selected design
  const selectedDesign = useMemo(() => {
    if (selectedDesignId) {
      return designs.find(d => d.designId === selectedDesignId) || designs[0]
    }
    return designs[0]
  }, [selectedDesignId, designs])

  // Get text questions for the selected design
  const textQuestions = useMemo(() => {
    if (!selectedDesign) return []
    return selectedDesign.questionMetrics.filter(
      q => q.type === 'short_text' || q.type === 'long_text'
    )
  }, [selectedDesign])

  // Auto-select first text question
  useEffect(() => {
    if (textQuestions.length > 0 && !selectedQuestionId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedQuestionId(textQuestions[0].questionId)
    } else if (textQuestions.length === 0) {
      setSelectedQuestionId(null)
    }
  }, [textQuestions, selectedQuestionId])

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

  // Get the selected question
  const selectedQuestion = useMemo(() => {
    if (!selectedQuestionId) return null
    return textQuestions.find(q => q.questionId === selectedQuestionId) || null
  }, [selectedQuestionId, textQuestions])

  // Get all text responses for the selected design and question
  const textResponses = useMemo(() => {
    if (!selectedDesign || !selectedQuestionId) return []
    return data.responses.filter(
      r => r.design_id === selectedDesign.designId && r.question_id === selectedQuestionId
    )
  }, [data.responses, selectedDesign, selectedQuestionId])

  // Combined stop words
  const activeStopWords = useMemo(() => {
    if (!stopWordsEnabled) return new Set<string>()
    return new Set([...DEFAULT_STOP_WORDS, ...customStopWords])
  }, [stopWordsEnabled, customStopWords])

  // Extract and count words from responses (delegates to shared utility)
  const wordData = useMemo(
    () => buildWordDataFromResponses(textResponses, activeStopWords),
    [textResponses, activeStopWords],
  )

  // Handle adding custom stop word
  const handleAddStopWord = useCallback(() => {
    const word = customStopWordInput.trim().toLowerCase()
    if (word && word.length > 0) {
      addCustomStopWord(word)
      setCustomStopWordInput('')
    }
  }, [customStopWordInput, addCustomStopWord])

  // Handle word click — open drill content in right panel
  const handleWordClick = useCallback((word: string) => {
    setSelectedWord(word)

    const filtered = textResponses.filter(r => {
      const text = r.response_value as string
      if (!text || typeof text !== 'string') return false
      return text.toLowerCase().includes(word.toLowerCase())
    })

    openDynamicPanel('word-responses', {
      content: (
        <ResponseDrillContent
          word={word}
          responses={filtered}
          totalResponses={textResponses.length}
          participants={data.participants}
          displaySettings={participantDisplaySettings}
        />
      ),
      title: `Responses containing \u201c${word}\u201d`,
    })

    if (onWordClick && selectedQuestionId) {
      onWordClick(word, selectedQuestionId)
    }
  }, [textResponses, data.participants, participantDisplaySettings, openDynamicPanel, onWordClick, selectedQuestionId])

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

  // No text questions for selected design
  if (!textQuestions.length) {
    return (
      <div className="space-y-6">
        {/* Design Selector */}
        <DesignSelector
          designs={designs}
          selectedDesign={selectedDesign}
          onSelectDesign={onSelectDesign}
        />

        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No text questions found</p>
              <p className="text-sm mt-1">
                This design doesn&apos;t have any short text or long text questions configured.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Design Selector */}
      <DesignSelector
        designs={designs}
        selectedDesign={selectedDesign}
        onSelectDesign={onSelectDesign}
      />

      {/* Question Selector and Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Question Selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Question:</Label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[200px] justify-between">
                <span className="truncate">
                  {selectedQuestion?.prompt || 'Select question'}
                </span>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[300px]">
              {textQuestions.map((q, idx) => (
                <DropdownMenuItem
                  key={q.questionId}
                  onClick={() => setSelectedQuestionId(q.questionId)}
                  className="flex flex-col items-start gap-1"
                >
                  <span className="font-medium">Q{idx + 1}: {q.prompt}</span>
                  <span className="text-xs text-muted-foreground">
                    {q.responseCount} responses
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stop-word Filter Toggle */}
        <div className="flex items-center gap-2">
          <Switch
            id="stop-words"
            checked={stopWordsEnabled}
            onCheckedChange={setStopWordsEnabled}
          />
          <Label htmlFor="stop-words" className="text-sm cursor-pointer">
            Filter common words
          </Label>
        </div>

        {/* Custom Stop Words Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowStopWordFilter(!showStopWordFilter)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Custom filters
          {customStopWords.size > 0 && (
            <Badge variant="secondary" className="ml-1">
              {customStopWords.size}
            </Badge>
          )}
        </Button>
      </div>

      {/* Custom Stop Words Panel */}
      {showStopWordFilter && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Custom Word Filters</CardTitle>
            <CardDescription>
              Add words to exclude from the word cloud
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter word to exclude..."
                value={customStopWordInput}
                onChange={(e) => setCustomStopWordInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStopWord()}
                className="flex-1"
              />
              <Button onClick={handleAddStopWord} size="sm">
                Add
              </Button>
            </div>
            {customStopWords.size > 0 && (
              <div className="flex flex-wrap gap-2">
                {Array.from(customStopWords).map(word => (
                  <Badge
                    key={word}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeCustomStopWord(word)}
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

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Word Cloud */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Word Cloud</CardTitle>
            <CardDescription>
              Click a word to see all responses containing it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WordCloudVisualization
              wordData={wordData}
              onWordClick={handleWordClick}
              selectedWord={selectedWord}
            />
          </CardContent>
        </Card>

        {/* Text Statistics Panel */}
        <TextStatsPanel
          responses={textResponses}
          wordData={wordData}
          totalResponseCount={selectedQuestion?.responseCount || 0}
        />
      </div>

    </div>
  )
}

// Design Selector Component
interface DesignSelectorProps {
  designs: DesignMetric[]
  selectedDesign: DesignMetric | undefined
  onSelectDesign: (id: string) => void
}

function DesignSelector({ designs, selectedDesign, onSelectDesign }: DesignSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium">Design:</span>
      <div className="flex flex-wrap gap-2">
        {designs.map((design) => (
          <Button
            key={design.designId}
            variant={selectedDesign?.designId === design.designId ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectDesign(design.designId)}
            className="gap-2"
          >
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="h-4 w-4" />
            {design.designName}
          </Button>
        ))}
      </div>
    </div>
  )
}

