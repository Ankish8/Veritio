'use client'
import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Badge } from '@veritio/ui/components/badge'
import { Button } from '@veritio/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@veritio/ui/components/dialog'
import { Eye, CheckCircle2, XCircle, AlertTriangle, SkipForward, Info } from 'lucide-react'
import type { PostTaskQuestion } from '@veritio/study-types'
import type { TaskMetricsContext } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { evaluateDisplayLogicWithTaskContext } from '../../lib/study-flow/display-logic-evaluator'

interface DisplayLogicPreviewProps {
  questions: PostTaskQuestion[]
}
interface TestScenario {
  id: string
  name: string
  description: string
  icon: typeof CheckCircle2
  iconColor: string
  context: TaskMetricsContext
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'direct-success-fast',
    name: 'Direct Success (Fast)',
    description: 'User completed quickly via optimal path',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    context: {
      outcome: 'success',
      isDirect: true,
      clickCount: 4,
      misclickCount: 0,
      backtrackCount: 0,
      totalTimeMs: 8000, // 8 seconds
      timeToFirstClickMs: 1500,
      pathTaken: ['frame1', 'frame2', 'frame3', 'frame4'],
      pathLength: 4,
    },
  },
  {
    id: 'direct-success-slow',
    name: 'Direct Success (Slow)',
    description: 'User found optimal path but took time',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
    context: {
      outcome: 'success',
      isDirect: true,
      clickCount: 4,
      misclickCount: 1,
      backtrackCount: 0,
      totalTimeMs: 45000, // 45 seconds
      timeToFirstClickMs: 8000, // 8 second hesitation
      pathTaken: ['frame1', 'frame2', 'frame3', 'frame4'],
      pathLength: 4,
    },
  },
  {
    id: 'indirect-success',
    name: 'Indirect Success',
    description: 'User completed via suboptimal path',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    context: {
      outcome: 'success',
      isDirect: false,
      clickCount: 8,
      misclickCount: 2,
      backtrackCount: 2,
      totalTimeMs: 35000, // 35 seconds
      timeToFirstClickMs: 3000,
      pathTaken: ['frame1', 'frame5', 'frame2', 'frame5', 'frame1', 'frame2', 'frame3', 'frame4'],
      pathLength: 8,
    },
  },
  {
    id: 'struggling-success',
    name: 'Success with Struggle',
    description: 'User completed but had many misclicks',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    context: {
      outcome: 'success',
      isDirect: false,
      clickCount: 15,
      misclickCount: 8,
      backtrackCount: 4,
      totalTimeMs: 60000, // 60 seconds
      timeToFirstClickMs: 2000,
      pathTaken: ['frame1', 'frame2', 'frame1', 'frame3', 'frame2', 'frame3', 'frame4'],
      pathLength: 7,
    },
  },
  {
    id: 'gave-up',
    name: 'Gave Up',
    description: 'User abandoned the task',
    icon: XCircle,
    iconColor: 'text-red-500',
    context: {
      outcome: 'failure',
      isDirect: undefined,
      clickCount: 12,
      misclickCount: 5,
      backtrackCount: 3,
      totalTimeMs: 50000, // 50 seconds
      timeToFirstClickMs: 4000,
      pathTaken: ['frame1', 'frame2', 'frame5', 'frame6', 'frame2', 'frame1'],
      pathLength: 6,
    },
  },
  {
    id: 'skipped',
    name: 'Skipped',
    description: 'User skipped the task entirely',
    icon: SkipForward,
    iconColor: 'text-muted-foreground',
    context: {
      outcome: 'skipped',
      isDirect: undefined,
      clickCount: 0,
      misclickCount: 0,
      backtrackCount: 0,
      totalTimeMs: 2000,
      timeToFirstClickMs: 0,
      pathTaken: [],
      pathLength: 0,
    },
  },
]

function ScenarioMetricsBadges({ context }: { context: TaskMetricsContext }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      <Badge variant="outline" className="font-mono">
        {(context.totalTimeMs / 1000).toFixed(0)}s total
      </Badge>
      <Badge variant="outline" className="font-mono">
        {context.clickCount} clicks
      </Badge>
      {context.misclickCount > 0 && (
        <Badge variant="outline" className="font-mono text-orange-600">
          {context.misclickCount} misclicks
        </Badge>
      )}
      {context.backtrackCount > 0 && (
        <Badge variant="outline" className="font-mono">
          {context.backtrackCount} backtracks
        </Badge>
      )}
      <Badge variant="outline" className="font-mono">
        {context.pathLength} screens
      </Badge>
    </div>
  )
}

export function DisplayLogicPreview({ questions }: DisplayLogicPreviewProps) {
  const [selectedScenario, setSelectedScenario] = useState<string>(TEST_SCENARIOS[0].id)
  const [isOpen, setIsOpen] = useState(false)

  const scenario = TEST_SCENARIOS.find((s) => s.id === selectedScenario) || TEST_SCENARIOS[0]

  // Evaluate which questions would be visible for the selected scenario
  const visibleQuestions = useMemo(() => {
    const responseMap = new Map()
    return questions.filter((q) =>
      evaluateDisplayLogicWithTaskContext(q.display_logic, responseMap, scenario.context)
    )
  }, [questions, scenario])

  // Questions that would be hidden
  const hiddenQuestions = useMemo(() => {
    return questions.filter((q) => !visibleQuestions.some((vq) => vq.id === q.id))
  }, [questions, visibleQuestions])

  const Icon = scenario.icon

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="h-4 w-4" />
          Preview Logic
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Display Logic Preview</DialogTitle>
          <DialogDescription>
            See which questions will appear for different user behaviors
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scenario selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Scenario</label>
            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEST_SCENARIOS.map((s) => {
                  const ScenarioIcon = s.icon
                  return (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <ScenarioIcon className={`h-4 w-4 ${s.iconColor}`} />
                        <span>{s.name}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Scenario details */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 mt-0.5 ${scenario.iconColor}`} />
              <div className="flex-1">
                <h4 className="font-medium">{scenario.name}</h4>
                <p className="text-sm text-muted-foreground">{scenario.description}</p>
              </div>
            </div>
            <ScenarioMetricsBadges context={scenario.context} />
          </div>

          {/* Results */}
          <div className="space-y-3">
            {/* Visible questions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {visibleQuestions.length} question{visibleQuestions.length !== 1 ? 's' : ''} will
                  show
                </span>
              </div>
              {visibleQuestions.length > 0 ? (
                <div className="space-y-1 pl-6">
                  {visibleQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-green-50 dark:bg-green-950/20"
                    >
                      <span className="text-muted-foreground w-4">{idx + 1}.</span>
                      <span className="truncate flex-1">
                        {q.question_text || 'Untitled question'}
                      </span>
                      {q.display_logic && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Has logic
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground pl-6">
                  No questions will be shown for this scenario
                </p>
              )}
            </div>

            {/* Hidden questions */}
            {hiddenQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {hiddenQuestions.length} question{hiddenQuestions.length !== 1 ? 's' : ''}{' '}
                    hidden
                  </span>
                </div>
                <div className="space-y-1 pl-6">
                  {hiddenQuestions.map((q) => (
                    <div
                      key={q.id}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-muted/50 text-muted-foreground"
                    >
                      <span className="truncate flex-1">
                        {q.question_text || 'Untitled question'}
                      </span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        Hidden
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-sm">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-muted-foreground">
              This preview simulates how display logic will filter questions based on task metrics.
              Actual results may vary based on real participant behavior.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export { TEST_SCENARIOS }
