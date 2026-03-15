'use client'

import { useTreeTestTasks, useTreeTestActions, useTreeTestStudyId } from '@/stores/study-builder'
import { GenericPostTaskQuestionsModal } from '@/components/builders/shared/post-task-questions-modal'

interface PostTaskQuestionsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  taskNumber: number
}

export function PostTaskQuestionsModal({
  open,
  onOpenChange,
  taskId,
  taskNumber,
}: PostTaskQuestionsModalProps) {
  // Use granular selectors for performance
  const studyId = useTreeTestStudyId()
  const tasks = useTreeTestTasks()
  const {
    addPostTaskQuestion,
    updatePostTaskQuestion,
    removePostTaskQuestion,
    reorderPostTaskQuestions,
  } = useTreeTestActions()

  return (
    <GenericPostTaskQuestionsModal
      open={open}
      onOpenChange={onOpenChange}
      taskId={taskId}
      taskNumber={taskNumber}
      studyId={studyId ?? ''}
      tasks={tasks}
      actions={{
        addPostTaskQuestion,
        updatePostTaskQuestion,
        removePostTaskQuestion,
        reorderPostTaskQuestions,
      }}
    />
  )
}
