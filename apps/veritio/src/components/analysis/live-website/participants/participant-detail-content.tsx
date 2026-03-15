'use client'

import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  MessageSquare,
  Monitor,
  Globe,
  MousePointerClick,
  Flame,
  Tag,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import type {
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsitePostTaskResponse,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
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

interface LiveWebsiteParticipantDetailContentProps {
  tasksCompleted: number
  totalTasks: number
  totalTimeMs: number // kept for API compatibility
  pagesVisited: number
  clicks: number
  rageClicks: number
  responses: LiveWebsiteResponse[]
  postTaskResponses: LiveWebsitePostTaskResponse[]
  tasks: LiveWebsiteTask[]
  flowResponses: StudyFlowResponseRow[]
  flowQuestions: StudyFlowQuestionRow[]
  browserData?: BrowserData | null
  location?: LocationData | null
  variantName?: string | null
}

function MetricCard({ icon: Icon, label, value, iconClassName, valueClassName }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  iconClassName?: string
  valueClassName?: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
      <Icon className={`h-4 w-4 shrink-0 ${iconClassName || 'text-muted-foreground'}`} />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-sm font-semibold tabular-nums ${valueClassName || ''}`}>{value}</div>
      </div>
    </div>
  )
}

function getOutcomeBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>
    case 'abandoned':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Abandoned</Badge>
    case 'timed_out':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Timed Out</Badge>
    case 'skipped':
      return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100">Skipped</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function formatLocation(location?: LocationData | null): string | null {
  if (!location) return null
  const parts = [location.city, location.region, location.country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export function LiveWebsiteParticipantDetailContent({
  tasksCompleted,
  totalTasks,
  totalTimeMs: _totalTimeMs,  
  pagesVisited,
  clicks,
  rageClicks,
  responses,
  postTaskResponses,
  tasks,
  flowResponses,
  flowQuestions,
  browserData,
  location,
  variantName,
}: LiveWebsiteParticipantDetailContentProps) {
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const locationString = formatLocation(location)
  const showDeviceSection = !!(browserData?.deviceType || browserData?.browser || browserData?.operatingSystem || browserData?.screenResolution || browserData?.timeZone || locationString)

  // Group post-task responses by response_id for lookup
  const ptqByResponseId = new Map<string, LiveWebsitePostTaskResponse[]>()
  for (const ptr of postTaskResponses) {
    const group = ptqByResponseId.get(ptr.response_id)
    if (group) group.push(ptr)
    else ptqByResponseId.set(ptr.response_id, [ptr])
  }

  return (
    <div className="w-full min-w-0 overflow-hidden">
      {/* Variant badge */}
      {variantName && (
        <div className="mb-3">
          <MetricCard icon={Tag} label="Variant" value={variantName} />
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard icon={Globe} label="Pages" value={pagesVisited} />
        <MetricCard icon={MousePointerClick} label="Clicks" value={clicks} />
        <MetricCard
          icon={Flame}
          label="Rage Clicks"
          value={rageClicks}
          iconClassName={rageClicks > 0 ? 'text-red-500' : 'text-muted-foreground'}
          valueClassName={rageClicks > 0 ? 'text-red-600' : ''}
        />
      </div>

      {/* Tasks */}
      <div className="space-y-3 w-full">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="h-3.5 w-3.5" />
          Tasks ({tasksCompleted}/{totalTasks} completed)
        </h3>
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            No tasks recorded.
          </p>
        ) : (
          <div className="space-y-3">
            {responses.map((response) => {
              const task = taskMap.get(response.task_id)
              return (
                <TaskCard
                  key={response.id}
                  taskTitle={task?.title || 'Unknown Task'}
                  status={response.status}
                  durationMs={response.duration_ms}
                  selfReportedSuccess={response.self_reported_success}
                  seqRating={response.seq_rating}
                  openEndedFeedback={response.open_ended_feedback}
                  postTaskQuestions={task?.post_task_questions as Array<{
                    id: string
                    text?: string
                    question_text?: string
                    question_type?: string
                    config?: Record<string, unknown> | null
                  }> | null}
                  postTaskResponses={ptqByResponseId.get(response.id) || []}
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
  status,
  durationMs,
  selfReportedSuccess,
  seqRating,
  openEndedFeedback,
  postTaskQuestions,
  postTaskResponses,
}: {
  taskTitle: string
  status: string
  durationMs: number | null
  selfReportedSuccess: boolean | null
  seqRating: number | null
  openEndedFeedback: string | null
  postTaskQuestions: Array<{ id: string; text?: string; question_text?: string; question_type?: string; config?: Record<string, unknown> | null }> | null
  postTaskResponses: LiveWebsitePostTaskResponse[]
}) {
  return (
    <div className="bg-muted/30 rounded-lg border border-border/50 p-3 overflow-hidden w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border/40 min-w-0 gap-2 w-full">
        <span className="text-sm font-medium truncate min-w-0 flex-1" title={taskTitle}>
          {taskTitle}
        </span>
        <div className="flex-shrink-0">
          {getOutcomeBadge(status)}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm overflow-hidden w-full">
        <LabelValue label="Time" value={formatTime(durationMs)} />
        {selfReportedSuccess != null && (
          <LabelValue label="Self-reported" value={selfReportedSuccess ? 'Success' : 'Failure'} highlight={!selfReportedSuccess} />
        )}
        {seqRating != null && (
          <LabelValue label="SEQ Rating" value={`${seqRating}/7`} />
        )}
      </div>

      {/* Open-ended feedback */}
      {openEndedFeedback && (
        <div className="mt-2 pt-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground mb-0.5">Feedback</p>
          <p className="text-sm break-words">{openEndedFeedback}</p>
        </div>
      )}

      {/* Post-task question responses */}
      {postTaskResponses.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
          {postTaskResponses.map((ptr, idx) => {
            const question = postTaskQuestions?.find(q => q.id === ptr.question_id)
            if (!question) return null
            return (
              <QuestionResponseCard
                key={ptr.id}
                question={toFlowQuestion(question)}
                response={toFlowResponse(ptr.question_id, ptr.value)}
                index={idx}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
