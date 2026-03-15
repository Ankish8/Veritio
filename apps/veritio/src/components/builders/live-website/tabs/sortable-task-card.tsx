'use client'

import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { GripVertical, ChevronDown, ChevronRight, Route } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/components/ui/card'
import {
  type LiveWebsiteTask,
  type LiveWebsiteVariant,
  type LiveWebsiteTaskVariant,
} from '@/stores/study-builder'
import { useValidationHighlight } from '@/hooks/use-validation-highlight'
import { castJsonArray } from '@/lib/supabase/json-utils'
import type { PostTaskQuestion } from '@veritio/study-types'
import type { UrlSuccessPath } from '@/stores/study-builder/live-website-builder'
import { TaskCardContent } from './task-card-content'

export interface SortableTaskCardProps {
  task: LiveWebsiteTask
  tasks: LiveWebsiteTask[]
  taskNumber: number
  isExpanded: boolean
  onToggleExpand: () => void
  onUpdate: (updates: Partial<LiveWebsiteTask>) => void
  onDelete: () => void
  websiteUrl: string
  supportsUrlPath: boolean
  trackingMode: 'snippet' | 'reverse_proxy' | 'url_only'
  studyId: string
  snippetId: string | null
  postTaskActions: {
    addPostTaskQuestion: (taskId: string, question: Omit<PostTaskQuestion, 'id' | 'position'>) => void
    updatePostTaskQuestion: (taskId: string, questionId: string, updates: Partial<PostTaskQuestion>) => void
    removePostTaskQuestion: (taskId: string, questionId: string) => void
    reorderPostTaskQuestions: (taskId: string, questions: PostTaskQuestion[]) => void
  }
  // AB testing
  abTestingEnabled?: boolean
  variants?: LiveWebsiteVariant[]
  taskVariants?: LiveWebsiteTaskVariant[]
  onSetTaskVariantCriteria?: (taskId: string, variantId: string, criteria: Partial<LiveWebsiteTaskVariant>) => void
}

export const SortableTaskCard = memo(function SortableTaskCard({
  task,
  tasks,
  taskNumber,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  websiteUrl,
  supportsUrlPath,
  trackingMode,
  studyId,
  snippetId,
  postTaskActions,
  abTestingEnabled,
  variants,
  taskVariants,
  onSetTaskVariantCriteria,
}: SortableTaskCardProps) {
  const [activeVariantTab, setActiveVariantTab] = useState<string | null>(
    variants && variants.length > 0 ? variants[0].id : null
  )

  // Sync activeVariantTab when variants change (e.g. variant deleted or first variant added)
  useEffect(() => {
    if (!variants || variants.length === 0) {
      setActiveVariantTab(null) // eslint-disable-line react-hooks/set-state-in-effect
    } else if (!variants.some(v => v.id === activeVariantTab)) {
      setActiveVariantTab(variants[0].id)
    }
  }, [variants, activeVariantTab])

  const [recorderOpen, setRecorderOpen] = useState(false)
  const [variantRecorderVariantId, setVariantRecorderVariantId] = useState<string | null>(null)
  const [postTaskQuestionsOpen, setPostTaskQuestionsOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const postTaskQuestions = castJsonArray<PostTaskQuestion>(task.post_task_questions)

  const baseUrl = useMemo(() => {
    if (!websiteUrl) return ''
    try {
      return new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).origin
    } catch {
      return ''
    }
  }, [websiteUrl])

  const getPathFromTargetUrl = useCallback((targetUrl: string) => {
    if (!targetUrl) return ''
    if (targetUrl.startsWith(baseUrl)) return targetUrl.slice(baseUrl.length)
    try {
      const url = new URL(targetUrl)
      return url.pathname + url.search + url.hash
    } catch {
      return targetUrl
    }
  }, [baseUrl])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const { ref: highlightRef, highlightClassName } = useValidationHighlight(task.id)

  const handleCriteriaChange = useCallback(
    (value: string) => {
      const type = value as LiveWebsiteTask['success_criteria_type']
      const updates: Partial<LiveWebsiteTask> = {
        success_criteria_type: type,
      }

      if (type === 'self_reported') {
        updates.success_url = null
        updates.success_path = null
      } else if (type === 'url_match') {
        updates.success_path = null
      } else if (type === 'exact_path') {
        updates.success_url = null
      }

      onUpdate(updates)
    },
    [onUpdate]
  )

  const handleSavePath = useCallback(
    (path: UrlSuccessPath) => {
      onUpdate({
        success_path: path,
        target_url: path.steps[0]?.fullUrl || task.target_url,
      })
    },
    [onUpdate, task.target_url]
  )

  return (
    <div ref={setNodeRef} style={style} role="listitem">
      <Card ref={highlightRef} className={`${isDragging ? 'opacity-50 shadow-lg' : ''} ${highlightClassName}`}>
        <div
          className="flex items-center gap-2 p-3 cursor-pointer select-none"
          onClick={onToggleExpand}
        >
          <button
            type="button"
            className="touch-none cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            aria-roledescription="sortable task"
            aria-label={`Task ${taskNumber}: ${task.title || 'Untitled'}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}

          <span className="text-sm font-medium text-muted-foreground">
            {taskNumber}.
          </span>
          <span className="text-sm font-medium flex-1 truncate">
            {task.title || 'Untitled task'}
          </span>
          {task.success_criteria_type === 'exact_path' && task.success_path && (
            <Route className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          {task.target_url && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px] hidden sm:inline">
              {getPathFromTargetUrl(task.target_url) || '/'}
            </span>
          )}
        </div>

        {isExpanded && (
          <TaskCardContent
            task={task}
            tasks={tasks}
            taskNumber={taskNumber}
            studyId={studyId}
            websiteUrl={websiteUrl}
            baseUrl={baseUrl}
            supportsUrlPath={supportsUrlPath}
            trackingMode={trackingMode}
            snippetId={snippetId}
            abTestingEnabled={abTestingEnabled ?? false}
            variants={variants ?? []}
            taskVariants={taskVariants ?? []}
            activeVariantTab={activeVariantTab}
            onTabChange={setActiveVariantTab}
            postTaskQuestions={postTaskQuestions}
            recorderOpen={recorderOpen}
            setRecorderOpen={setRecorderOpen}
            variantRecorderVariantId={variantRecorderVariantId}
            setVariantRecorderVariantId={setVariantRecorderVariantId}
            postTaskQuestionsOpen={postTaskQuestionsOpen}
            setPostTaskQuestionsOpen={setPostTaskQuestionsOpen}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onSetTaskVariantCriteria={onSetTaskVariantCriteria ?? (() => {})}
            handleCriteriaChange={handleCriteriaChange}
            handleSavePath={handleSavePath}
            getPathFromTargetUrl={getPathFromTargetUrl}
            postTaskActions={postTaskActions}
          />
        )}
      </Card>
    </div>
  )
})
