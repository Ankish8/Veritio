'use client'

import { useEffect } from 'react'
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import { MultiNodeSelector } from './multi-node-selector'
import { PostTaskQuestionsModal } from './post-task-questions-modal'
import { SortableTaskItem } from './sortable-task-item'
import { TaskForm } from './task-form'
import { useTaskEditor } from './use-task-editor'

interface TaskEditorProps {
  studyId: string
}

export function TaskEditor({ studyId }: TaskEditorProps) {
  const {
    tasks,
    nodes,
    enrichedTasks,
    showAddForm,
    setShowAddForm,
    editingTask,
    setEditingTask,
    selectingNodeForTaskId,
    postTaskQuestionsTaskId,
    setPostTaskQuestionsTaskId,
    pendingSelectedNodeIds,
    setPendingSelectedNodeIds,
    tasksWithoutCorrectAnswer: _tasksWithoutCorrectAnswer,
    postTaskQuestionsTaskNumber,
    sensors,
    handleDragEnd,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    openCorrectAnswersDialog,
    handleSaveCorrectNodes,
    handleCancelCorrectNodes,
  } = useTaskEditor({ studyId })

  // Listen for keyboard shortcut events
  useEffect(() => {
    const handleKeyboardAddTask = () => {
      setShowAddForm(true)
    }

    window.addEventListener('builder:add-tree-task', handleKeyboardAddTask)
    return () => {
      window.removeEventListener('builder:add-tree-task', handleKeyboardAddTask)
    }
  }, [setShowAddForm])

  return (
    <>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between pb-4">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Task
          </Button>
        </div>

        {/* Task List */}
        {tasks.length > 0 ? (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 p-[3px]">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {enrichedTasks.map((task, index) =>
                      editingTask?.id === task.id ? (
                        <TaskForm
                          key={task.id}
                          task={task}
                          taskNumber={index + 1}
                          onSave={handleUpdateTask}
                          onCancel={() => setEditingTask(null)}
                        />
                      ) : (
                        <SortableTaskItem
                          key={task.id}
                          task={task}
                          studyId={studyId}
                          taskNumber={index + 1}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onSelectCorrectNodes={openCorrectAnswersDialog}
                          onOpenPostTaskQuestions={setPostTaskQuestionsTaskId}
                        />
                      )
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            {/* Footer - only shows form when adding */}
            {showAddForm && (
              <div className="shrink-0 pt-4">
                <TaskForm
                  taskNumber={tasks.length + 1}
                  onSave={handleAddTask}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {showAddForm ? (
              <TaskForm taskNumber={1} onSave={handleAddTask} onCancel={() => setShowAddForm(false)} />
            ) : (
              <>
                <div className="rounded-md border border-dashed p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No tasks yet. Add tasks that participants will try to complete.
                  </p>
                </div>
                <Button variant="outline" className="w-full h-10" onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Correct Answers Dialog */}
      <Dialog
        open={selectingNodeForTaskId !== null}
        onOpenChange={(open) => !open && handleCancelCorrectNodes()}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Correct Answers</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Choose one or more leaf nodes that represent correct answers for this task.
          </p>
          {nodes.length > 0 ? (
            <MultiNodeSelector
              nodes={nodes}
              selectedNodeIds={pendingSelectedNodeIds}
              onSelectionChange={setPendingSelectedNodeIds}
            />
          ) : (
            <div className="rounded-md border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No nodes in the tree yet. Add nodes to the tree first.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCorrectNodes}>
              Cancel
              <EscapeHint />
            </Button>
            <Button onClick={handleSaveCorrectNodes}>
              Save
              <KeyboardShortcutHint shortcut="cmd-enter" variant="dark" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-task Questions Modal */}
      {postTaskQuestionsTaskId && (
        <PostTaskQuestionsModal
          open={true}
          onOpenChange={(open) => !open && setPostTaskQuestionsTaskId(null)}
          taskId={postTaskQuestionsTaskId}
          taskNumber={postTaskQuestionsTaskNumber}
        />
      )}
    </>
  )
}
