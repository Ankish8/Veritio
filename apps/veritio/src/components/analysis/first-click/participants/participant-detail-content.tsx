'use client'

import { Badge } from '@/components/ui/badge'
import { ClipboardList, Monitor, MessageSquare } from 'lucide-react'
import { formatTime } from '@/lib/utils'
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

interface FirstClickResponse {
  id: string
  task_id: string
  participant_id: string
  is_correct: boolean
  is_skipped: boolean
  time_to_click_ms: number | null
  click_x: number | null
  click_y: number | null
  matched_aoi_id: string | null
}

interface FirstClickTask {
  id: string
  instruction: string
  position: number
  post_task_questions?: Array<{
    id: string
    text?: string
    question_text?: string
    question_type?: string
    config?: Record<string, unknown> | null
  }> | null
}

interface PostTaskResponse {
  id: string
  task_id: string
  participant_id: string
  question_id: string
  response_value: unknown
}

interface FlowQuestion {
  id: string
  question_text: string
  question_type?: string
  config?: Record<string, unknown> | null
}

interface FlowResponse {
  id: string
  question_id: string
  participant_id: string
  response_value: unknown
}

interface ParticipantDetailContentProps {
  responses: FirstClickResponse[]
  tasks: FirstClickTask[]
  postTaskResponses: PostTaskResponse[]
  flowQuestions: FlowQuestion[]
  flowResponses: FlowResponse[]
  browserData?: BrowserData | null
  location?: LocationData | null
}

function getOutcomeBadge(isSkipped: boolean, isCorrect: boolean) {
  if (isSkipped) {
    return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Skipped</Badge>
  }
  if (isCorrect) {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Correct</Badge>
  }
  return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Incorrect</Badge>
}

function formatLocation(location?: LocationData | null): string | null {
  if (!location) return null
  const parts = [location.city, location.region, location.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export function ParticipantDetailContent({
  responses,
  tasks,
  postTaskResponses,
  flowQuestions,
  flowResponses,
  browserData,
  location,
}: ParticipantDetailContentProps) {
  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position)
  const correctCount = responses.filter(r => !r.is_skipped && r.is_correct).length
  const locationString = formatLocation(location)
  const showDeviceSection = !!(browserData?.deviceType || browserData?.browser || browserData?.operatingSystem || browserData?.screenResolution || browserData?.timeZone || locationString)

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Tasks */}
      <div className="space-y-3 w-full">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Tasks ({correctCount}/{tasks.length} correct)
        </h3>
        {sortedTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            No tasks recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const response = responses.find(r => r.task_id === task.id)
              return (
                <TaskCard
                  key={task.id}
                  taskTitle={task.instruction}
                  response={response ?? null}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Device & Browser Info */}
      {showDeviceSection && (
        <div className="space-y-3 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5" />
            Device Information
          </h3>
          <div className="bg-muted/30 rounded-lg p-3 overflow-hidden">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm overflow-hidden">
              {browserData?.deviceType && <LabelValue label="Device" value={browserData.deviceType} />}
              {browserData?.browser && <LabelValue label="Browser" value={browserData.browser} />}
              {browserData?.operatingSystem && <LabelValue label="OS" value={browserData.operatingSystem} />}
              {browserData?.screenResolution && <LabelValue label="Screen" value={browserData.screenResolution} />}
              {locationString && <LabelValue label="Location" value={locationString} />}
              {browserData?.timeZone && <LabelValue label="Timezone" value={browserData.timeZone} />}
            </div>
          </div>
        </div>
      )}

      {/* Post-Task Responses */}
      {postTaskResponses.length > 0 && (
        <div className="space-y-3 mt-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Post-Task Responses
          </h3>
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const taskPostResponses = postTaskResponses.filter(r => r.task_id === task.id)
              if (taskPostResponses.length === 0) return null

              return (
                <div key={task.id} className="space-y-2">
                  <p className="text-sm font-medium">{task.instruction}</p>
                  {taskPostResponses.map((ptr, idx) => {
                    const question = task.post_task_questions?.find(q => q.id === ptr.question_id)
                    if (!question) return null
                    return (
                      <QuestionResponseCard
                        key={ptr.id}
                        question={toFlowQuestion(question)}
                        response={toFlowResponse(ptr.question_id, ptr.response_value)}
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

      {/* Flow Questionnaire Responses */}
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
                  question={toFlowQuestion(question)}
                  response={toFlowResponse(response.question_id, response.response_value)}
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

function LabelValue({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-2 min-w-0 overflow-hidden">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className={`font-medium truncate ${highlight ? 'text-amber-600' : ''}`}>{value}</span>
    </div>
  )
}

function TaskCard({ taskTitle, response }: { taskTitle: string; response: FirstClickResponse | null }) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border/50 p-3 overflow-hidden w-full">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/40 min-w-0 gap-2 w-full">
        <span className="text-sm font-medium truncate min-w-0 flex-1" title={taskTitle}>
          {taskTitle}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {response ? getOutcomeBadge(response.is_skipped, response.is_correct) : (
            <Badge variant="outline">No response</Badge>
          )}
        </div>
      </div>
      {response && !response.is_skipped && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm overflow-hidden w-full">
          <LabelValue label="Time" value={formatTime(response.time_to_click_ms)} />
          <LabelValue label="Result" value={response.is_correct ? 'Correct' : 'Incorrect'} highlight={!response.is_correct} />
        </div>
      )}
      {response?.is_skipped && (
        <p className="text-sm text-muted-foreground">Task was skipped</p>
      )}
      {!response && (
        <p className="text-sm text-muted-foreground">No response recorded</p>
      )}
    </div>
  )
}
