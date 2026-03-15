'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Download, ArrowRightLeft, HelpCircle, ChevronDown, Lightbulb, Target, BarChart3 } from 'lucide-react'
import { QuestionSelector } from './question-selector'
import { CrossTabTable } from './cross-tab-table'
import { CrossTabStats } from './cross-tab-stats'
import { useCrossTabData } from './hooks/use-cross-tab-data'
import { DEFAULT_DISPLAY_OPTIONS } from './types'
import type { CrossTabDisplayOptions, CrossTabQuestion } from './types'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'
import { formatCrossTabForExport } from '@/lib/algorithms/cross-tabulation'
import { downloadCSV } from '@/lib/algorithms/export-csv'
import { cn } from '@/lib/utils'

interface CrossTabulationTabProps {
  studyId: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
}

function QuestionSelectorGrid({
  compatibleQuestions,
  rowQuestionId,
  colQuestionId,
  onRowSelect,
  onColSelect,
}: {
  compatibleQuestions: CrossTabQuestion[]
  rowQuestionId: string | null
  colQuestionId: string | null
  onRowSelect: (id: string | null) => void
  onColSelect: (id: string | null) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <QuestionSelector
        label="Row Question"
        placeholder="Select a question for rows..."
        questions={compatibleQuestions}
        selectedQuestionId={rowQuestionId}
        disabledQuestionId={colQuestionId}
        onSelect={onRowSelect}
      />
      <QuestionSelector
        label="Column Question (Banner)"
        placeholder="Select a question for columns..."
        questions={compatibleQuestions}
        selectedQuestionId={colQuestionId}
        disabledQuestionId={rowQuestionId}
        onSelect={onColSelect}
      />
    </div>
  )
}

const DISPLAY_TOGGLE_OPTIONS: { key: keyof CrossTabDisplayOptions; id: string; label: string; fullLabel?: string }[] = [
  { key: 'showRowPercent', id: 'show-row-percent', label: 'Row %' },
  { key: 'showColPercent', id: 'show-col-percent', label: 'Col %' },
  { key: 'highlightSignificant', id: 'highlight-significant', label: 'Significant', fullLabel: 'Highlight significant' },
]

function DisplayOptionsBar({
  displayOptions,
  onToggle,
}: {
  displayOptions: CrossTabDisplayOptions
  onToggle: (key: keyof CrossTabDisplayOptions) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm">
      {DISPLAY_TOGGLE_OPTIONS.map(({ key, id, label, fullLabel }) => (
        <div key={id} className="flex items-center gap-2">
          <Switch
            id={id}
            checked={displayOptions[key] as boolean}
            onCheckedChange={() => onToggle(key)}
          />
          <Label htmlFor={id} className="text-xs sm:text-sm">
            {fullLabel ? (
              <>
                <span className="hidden sm:inline">{fullLabel}</span>
                <span className="sm:hidden">{label}</span>
              </>
            ) : label}
          </Label>
        </div>
      ))}
    </div>
  )
}

function CrossTabHelpSection({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Learn how to use cross-tabulation</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <div className="bg-muted/30 rounded-lg p-5 space-y-5">
          <div>
            <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              What is Cross-Tabulation?
            </h4>
            <p className="text-sm text-muted-foreground">
              Cross-tabulation (or contingency table) shows how responses to one question
              relate to responses to another. It reveals patterns and relationships between
              different survey questions, helping you understand if certain groups of respondents
              tend to answer differently.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              When to Use It
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>Demographic analysis:</strong> Compare satisfaction scores across age groups, job roles, or experience levels</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>Feature preferences:</strong> See if users who prefer feature A also tend to prefer feature B</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>NPS breakdown:</strong> Understand which user segments are promoters vs detractors</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>Behavior patterns:</strong> Check if task completion relates to prior experience or confidence levels</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-sm flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              How to Interpret Results
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>Cell colors:</strong> Blue cells show higher-than-expected counts, red cells show lower-than-expected. Darker colors = stronger deviation.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>p-value:</strong> If p &lt; 0.05, the relationship is statistically significant (unlikely due to chance).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>Effect size (Cramer&apos;s V):</strong> Measures strength of relationship: negligible (&lt;0.1), small (0.1-0.2), medium (0.2-0.4), large (&gt;0.4).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary">•</span>
                <span><strong>Row %:</strong> Shows distribution within each row category (e.g., &quot;Of users who chose A, what % also chose X vs Y?&quot;)</span>
              </li>
            </ul>
          </div>

          <div className="bg-background/50 rounded p-4 border">
            <h4 className="font-medium text-sm mb-2">Example Scenario</h4>
            <p className="text-sm text-muted-foreground">
              You want to know if users&apos; job roles affect their satisfaction with your product.
              Set <strong>&quot;Job Role&quot;</strong> as the row question and <strong>&quot;Overall Satisfaction&quot;</strong> as the column question.
              If you see a significant result with developers showing 80% &quot;Very Satisfied&quot; while managers show only 40%,
              you&apos;ve discovered that developers are significantly more satisfied than managers.
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CrossTabulationTab({
  studyId,
  flowQuestions,
  flowResponses,
  filteredParticipantIds,
}: CrossTabulationTabProps) {
  const [rowQuestionId, setRowQuestionId] = useState<string | null>(null)
  const [colQuestionId, setColQuestionId] = useState<string | null>(null)
  const [displayOptions, setDisplayOptions] = useState<CrossTabDisplayOptions>(DEFAULT_DISPLAY_OPTIONS)

  const { compatibleQuestions, crossTabData, statisticalResult } = useCrossTabData({
    flowQuestions,
    flowResponses,
    filteredParticipantIds,
    rowQuestionId,
    colQuestionId,
  })

  const handleSwapQuestions = useCallback(() => {
    setRowQuestionId(colQuestionId)
    setColQuestionId(rowQuestionId)
  }, [rowQuestionId, colQuestionId])

  const handleExportCSV = useCallback(() => {
    if (!crossTabData) return

    const chiSquareResult = statisticalResult?.type === 'chi_square' ? statisticalResult.result : null
    const csvData = formatCrossTabForExport(crossTabData, chiSquareResult, displayOptions.showRowPercent)

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const filename = `cross-tab-${studyId}-${Date.now()}.csv`

    downloadCSV(csvContent, filename)
  }, [crossTabData, statisticalResult, displayOptions, studyId])

  const toggleOption = (key: keyof CrossTabDisplayOptions) => {
    setDisplayOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const hasSelection = rowQuestionId && colQuestionId

  // Empty state - no questions selected
  if (!hasSelection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Cross-Tabulation Analysis
          </CardTitle>
          <CardDescription>
            Compare how responses to one question relate to responses to another question.
            Select two questions below to generate a contingency table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <CrossTabHelpSection defaultOpen={false} />

          <QuestionSelectorGrid
            compatibleQuestions={compatibleQuestions}
            rowQuestionId={rowQuestionId}
            colQuestionId={colQuestionId}
            onRowSelect={setRowQuestionId}
            onColSelect={setColQuestionId}
          />

          {compatibleQuestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No compatible questions</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Cross-tabulation requires multiple choice, yes/no, opinion scale, or NPS questions.
                Text, matrix, and ranking questions are not supported.
              </p>
            </div>
          )}

          {compatibleQuestions.length > 0 && !rowQuestionId && !colQuestionId && (
            <div className="flex flex-col items-center justify-center py-4 text-center text-muted-foreground">
              <p className="text-sm">
                Select both a row and column question to generate the cross-tabulation table.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Cross-tab data loaded
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              Cross-Tabulation
            </CardTitle>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Analyzing relationship between questions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSwapQuestions} className="h-8 text-xs sm:text-sm">
              <ArrowRightLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              Swap
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!crossTabData} className="h-8 text-xs sm:text-sm">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
              <span className="hidden sm:inline">Export </span>CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <QuestionSelectorGrid
          compatibleQuestions={compatibleQuestions}
          rowQuestionId={rowQuestionId}
          colQuestionId={colQuestionId}
          onRowSelect={setRowQuestionId}
          onColSelect={setColQuestionId}
        />

        <DisplayOptionsBar displayOptions={displayOptions} onToggle={toggleOption} />

        {crossTabData && (
          <CrossTabTable data={crossTabData} displayOptions={displayOptions} />
        )}

        {statisticalResult && <CrossTabStats result={statisticalResult} />}

        {!crossTabData && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <p className="text-sm">
              No participants answered both questions. Try selecting different questions.
            </p>
          </div>
        )}

        <CrossTabHelpSection defaultOpen={false} />
      </CardContent>
    </Card>
  )
}
