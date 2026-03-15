'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Grid3X3, Target, HelpCircle } from 'lucide-react'
import { CorrelationMatrix } from './correlation-matrix'
import { DriverAnalysis, DriverAnalysisEmptyState } from './driver-analysis'
import { useCorrelationData } from './hooks/use-correlation-data'
import { useDriverAnalysis, getSuggestedTargetQuestions } from './hooks/use-driver-analysis'
import { DEFAULT_DISPLAY_OPTIONS } from './types'
import type { CorrelationDisplayOptions, QuestionCorrelationInfo } from './types'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

interface CorrelationTabProps {
  studyId: string
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  participants: Participant[]
  filteredParticipantIds: Set<string> | null
}

function CorrelationHelpContent() {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <h4 className="font-medium mb-1">What is Correlation?</h4>
        <p className="text-muted-foreground">
          Measures how strongly two variables are related. Ranges from -1 to +1.
        </p>
      </div>
      <div>
        <h4 className="font-medium mb-1">Interpretation</h4>
        <ul className="text-muted-foreground space-y-1">
          <li><strong>|r| &ge; 0.5:</strong> Strong relationship</li>
          <li><strong>0.3 – 0.5:</strong> Moderate relationship</li>
          <li><strong>0.1 – 0.3:</strong> Weak relationship</li>
          <li><strong>&lt; 0.1:</strong> Negligible</li>
        </ul>
      </div>
      <div className="text-xs text-muted-foreground border-t pt-2">
        <strong>Note:</strong> Correlation ≠ Causation. Look for p &lt; 0.05 for significance.
      </div>
    </div>
  )
}

function MatrixOptionsBar({
  displayOptions,
  onToggle,
}: {
  displayOptions: CorrelationDisplayOptions
  onToggle: (key: keyof CorrelationDisplayOptions) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Switch
          id="show-coefficients"
          checked={displayOptions.showCoefficients}
          onCheckedChange={() => onToggle('showCoefficients')}
        />
        <Label htmlFor="show-coefficients">Show values</Label>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          id="show-significant-only"
          checked={displayOptions.showSignificanceOnly}
          onCheckedChange={() => onToggle('showSignificanceOnly')}
        />
        <Label htmlFor="show-significant-only">Significant only</Label>
      </div>
    </div>
  )
}

function DriverTargetSelector({
  targetQuestionId,
  onTargetChange,
  suggestedTargets,
  compatibleQuestions,
}: {
  targetQuestionId: string | null
  onTargetChange: (id: string) => void
  suggestedTargets: QuestionCorrelationInfo[]
  compatibleQuestions: QuestionCorrelationInfo[]
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="text-sm text-muted-foreground">Target question:</Label>
      <Select value={targetQuestionId || ''} onValueChange={onTargetChange}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select target question..." />
        </SelectTrigger>
        <SelectContent>
          {suggestedTargets.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                Suggested Targets
              </div>
              {suggestedTargets.map(q => (
                <SelectItem key={q.id} value={q.id}>{q.shortText}</SelectItem>
              ))}
              <div className="my-1 border-t" />
            </>
          )}
          <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
            All Questions
          </div>
          {compatibleQuestions.map(q => (
            <SelectItem key={q.id} value={q.id}>{q.shortText}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CorrelationTab({
  flowQuestions,
  flowResponses,
  filteredParticipantIds,
}: CorrelationTabProps) {
  const [activeView, setActiveView] = useState<'matrix' | 'drivers'>('matrix')
  const [targetQuestionId, setTargetQuestionId] = useState<string | null>(null)
  const [displayOptions, setDisplayOptions] = useState<CorrelationDisplayOptions>(
    DEFAULT_DISPLAY_OPTIONS
  )

  const { compatibleQuestions, matrixData } = useCorrelationData({
    flowQuestions,
    flowResponses,
    filteredParticipantIds,
    displayOptions,
  })

  const { analysisData: driverData } = useDriverAnalysis({
    flowQuestions,
    flowResponses,
    filteredParticipantIds,
    targetQuestionId,
    displayOptions,
  })

  const suggestedTargets = getSuggestedTargetQuestions(compatibleQuestions)

  const handleViewChange = (view: string) => {
    setActiveView(view as 'matrix' | 'drivers')
    if (view === 'drivers' && !targetQuestionId && suggestedTargets.length > 0) {
      setTargetQuestionId(suggestedTargets[0].id)
    }
  }

  const toggleOption = (key: keyof CorrelationDisplayOptions) => {
    setDisplayOptions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (compatibleQuestions.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Correlation Analysis
          </CardTitle>
          <CardDescription>
            Discover relationships between survey questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <HelpCircle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Not enough compatible questions</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Correlation analysis requires at least two numeric or categorical questions
              (NPS, scales, multiple choice, yes/no). Text and matrix questions are not supported.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <div>
              <CardTitle>Correlation Analysis</CardTitle>
              <CardDescription className="mt-1">
                Discover relationships between {compatibleQuestions.length} survey questions
              </CardDescription>
            </div>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="absolute z-50 mt-2 w-[400px] bg-popover border rounded-lg shadow-lg p-4">
                <CorrelationHelpContent />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Select value={activeView} onValueChange={handleViewChange}>
            <SelectTrigger className="w-auto min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matrix">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4" />
                  Correlation Matrix
                </div>
              </SelectItem>
              <SelectItem value="drivers">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Driver Analysis
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b">
          {activeView === 'matrix' ? (
            <MatrixOptionsBar displayOptions={displayOptions} onToggle={toggleOption} />
          ) : (
            <DriverTargetSelector
              targetQuestionId={targetQuestionId}
              onTargetChange={setTargetQuestionId}
              suggestedTargets={suggestedTargets}
              compatibleQuestions={compatibleQuestions}
            />
          )}
        </div>

        {activeView === 'matrix' && (
          matrixData ? (
            <CorrelationMatrix data={matrixData} displayOptions={displayOptions} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Grid3X3 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No correlations found</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Not enough paired responses to calculate correlations.
                Make sure participants answered multiple questions.
              </p>
            </div>
          )
        )}

        {activeView === 'drivers' && (
          targetQuestionId && driverData ? (
            <DriverAnalysis data={driverData} maxDriversToShow={10} />
          ) : (
            <DriverAnalysisEmptyState />
          )
        )}
      </CardContent>
    </Card>
  )
}
