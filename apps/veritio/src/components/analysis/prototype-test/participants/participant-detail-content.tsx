'use client'

import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  MessageSquare,
  Monitor,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import type {
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
} from '@veritio/study-types'
import { QuestionResponseCard } from '@/components/analysis/shared'
import { toFlowQuestion, toFlowResponse } from '@/components/analysis/shared/format-question-response'

interface BrowserData {
  browser?: string
  operatingSystem?: string
  deviceType?: 'Desktop' | 'Mobile' | 'Tablet'
  language?: string
  timeZone?: string
  screenResolution?: string
}

interface LocationData {
  country?: string | null
  region?: string | null
  city?: string | null
}

interface ParticipantDetailContentProps {
  tasksSuccessful: number
  tasksSkipped: number
  totalTasks: number
  totalTimeMs: number
  avgClicks: number
  totalMisclicks: number
  totalBacktracks: number
  directPathCount: number
  avgTimeToFirstClick: number | null
  attempts: PrototypeTestTaskAttempt[]
  tasks: PrototypeTestTask[]
  flowResponses: StudyFlowResponseRow[]
  flowQuestions: StudyFlowQuestionRow[]
  browserData?: BrowserData | null
  location?: LocationData | null
}

function getOutcomeBadge(outcome: string) {
  switch (outcome) {
    case 'success':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Success</Badge>
    case 'failure':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>
    case 'abandoned':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Abandoned</Badge>
    case 'skipped':
      return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Skipped</Badge>
    default:
      return <Badge variant="outline">{outcome}</Badge>
  }
}

function formatLocation(location?: LocationData | null): string | null {
  if (!location) return null
  const parts = [location.city, location.region, location.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export function ParticipantDetailContent({
  tasksSuccessful,
  tasksSkipped: _tasksSkipped,
  totalTasks,
  totalTimeMs: _totalTimeMs,
  avgClicks: _avgClicks,
  totalMisclicks: _totalMisclicks,
  totalBacktracks: _totalBacktracks,
  directPathCount: _directPathCount,
  avgTimeToFirstClick: _avgTimeToFirstClick,
  attempts,
  tasks,
  flowResponses,
  flowQuestions,
  browserData,
  location,
}: ParticipantDetailContentProps) {
  const getTaskTitle = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    return task?.title || 'Unknown Task'
  }

  const locationString = formatLocation(location)
  const showDeviceSection = !!(browserData?.deviceType || browserData?.browser || browserData?.operatingSystem || browserData?.screenResolution || browserData?.timeZone || locationString)

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Tasks - Individual task details */}
      <div className="space-y-3 w-full">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Tasks ({tasksSuccessful}/{totalTasks} successful)
        </h3>
        {attempts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            No tasks recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {attempts.map((attempt) => (
              <TaskCard
                key={attempt.id}
                taskTitle={getTaskTitle(attempt.task_id)}
                outcome={attempt.outcome}
                totalTimeMs={attempt.total_time_ms}
                timeToFirstClick={attempt.time_to_first_click_ms}
                clickCount={attempt.click_count ?? 0}
                misclickCount={attempt.misclick_count ?? 0}
                backtrackCount={attempt.backtrack_count ?? 0}
                isDirect={attempt.is_direct ?? false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Device & Browser Info - Only show if data exists */}
      {showDeviceSection && (
        <div className="space-y-3 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5" />
            Device Information
          </h3>
          <div className="bg-muted/30 rounded-lg p-3 overflow-hidden">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm overflow-hidden">
              {browserData?.deviceType && (
                <LabelValue label="Device" value={browserData.deviceType} />
              )}
              {browserData?.browser && (
                <LabelValue label="Browser" value={browserData.browser} />
              )}
              {browserData?.operatingSystem && (
                <LabelValue label="OS" value={browserData.operatingSystem} />
              )}
              {browserData?.screenResolution && (
                <LabelValue label="Screen" value={browserData.screenResolution} />
              )}
              {locationString && (
                <LabelValue label="Location" value={locationString} />
              )}
              {browserData?.timeZone && (
                <LabelValue label="Timezone" value={browserData.timeZone} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post-Task Responses */}
      {attempts.some(a => {
        const responses = a.post_task_responses as unknown[] | null
        return responses && responses.length > 0
      }) && (
        <div className="space-y-3 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Post-Task Responses
          </h3>
          <div className="space-y-3">
            {attempts.map((attempt) => {
              const task = tasks.find(t => t.id === attempt.task_id)
              const postTaskQuestions = task?.post_task_questions as Array<{
                id: string
                text?: string
                question_text?: string
                question_type?: string
                config?: Record<string, unknown> | null
              }> | null
              // Response format: { questionId, value, responseTimeMs } (camelCase from player)
              const postTaskResponses = attempt.post_task_responses as Array<{
                questionId: string
                value: unknown
              }> | null

              if (!postTaskResponses || postTaskResponses.length === 0) return null

              return (
                <div key={attempt.id} className="space-y-2">
                  <p className="text-sm font-medium">{getTaskTitle(attempt.task_id)}</p>
                  {postTaskResponses.map((response, idx) => {
                    const question = postTaskQuestions?.find(q => q.id === response.questionId)
                    if (!question) return null
                    return (
                      <QuestionResponseCard
                        key={response.questionId || idx}
                        question={toFlowQuestion(question)}
                        response={toFlowResponse(response.questionId, response.value)}
                        index={idx}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Flow Question Responses */}
      {flowResponses.length > 0 && (
        <div className="space-y-3 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5" />
            Questionnaire Responses
          </h3>
          <div className="space-y-3">
            {flowResponses.map((response, idx) => {
              const question = flowQuestions.find(q => q.id === response.question_id)
              if (!question) return null
              return (
                <QuestionResponseCard
                  key={response.id}
                  question={question}
                  response={response}
                  index={idx}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function LabelValue({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex justify-between gap-2 min-w-0 overflow-hidden">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`font-medium truncate ${highlight ? 'text-amber-600' : ''}`}>{value}</span>
    </div>
  )
}

function TaskCard({
  taskTitle,
  outcome,
  totalTimeMs,
  timeToFirstClick,
  clickCount,
  misclickCount,
  backtrackCount,
  isDirect,
}: {
  taskTitle: string
  outcome: string
  totalTimeMs: number | null
  timeToFirstClick: number | null
  clickCount: number
  misclickCount: number
  backtrackCount: number
  isDirect: boolean
}) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border/50 p-3 overflow-hidden w-full">
      {/* Header: Task name and outcome */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/40 min-w-0 gap-2 w-full">
        <span className="text-sm font-medium truncate min-w-0 flex-1" title={taskTitle}>
          {taskTitle}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {getOutcomeBadge(outcome)}
        </div>
      </div>

      {/* Metrics - clear label:value grid */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm overflow-hidden w-full">
        <LabelValue label="Time" value={formatTime(totalTimeMs)} />
        <LabelValue label="1st Click" value={formatTime(timeToFirstClick)} />
        <LabelValue label="Clicks" value={String(clickCount)} />
        <LabelValue label="Direct" value={isDirect ? 'Yes' : 'No'} highlight={!isDirect} />
        <LabelValue label="Misclicks" value={String(misclickCount)} highlight={misclickCount > 0} />
        <LabelValue label="Backtracks" value={String(backtrackCount)} highlight={backtrackCount > 0} />
      </div>
    </div>
  )
}
