'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface Task {
  taskId: string
  question: string
}

interface TaskSelectorProps {
  tasks: Task[]
  selectedTaskId: string | null
  onTaskSelect: (taskId: string) => void
  className?: string
  /** Hide the "Select task" label for compact layouts */
  hideLabel?: boolean
}

/**
 * Dropdown selector for choosing which task to view.
 * Shows task number and truncated question text.
 */
export function TaskSelector({
  tasks,
  selectedTaskId,
  onTaskSelect,
  className,
  hideLabel = false,
}: TaskSelectorProps) {
  if (tasks.length === 0) {
    return (
      <div className={className}>
        <Label className="text-sm text-muted-foreground">No tasks available</Label>
      </div>
    )
  }

  // Find current task index for display
  const currentIndex = tasks.findIndex(t => t.taskId === selectedTaskId)

  return (
    <div className={`${hideLabel ? '' : 'space-y-1.5'} ${className || ''}`}>
      {!hideLabel && <Label className="text-sm font-medium">Select task</Label>}
      <Select
        value={selectedTaskId || undefined}
        onValueChange={onTaskSelect}
      >
        <SelectTrigger className="w-full max-w-md">
          <SelectValue placeholder="Select a task...">
            {selectedTaskId && currentIndex >= 0 && (
              <span className="truncate">
                {currentIndex + 1}. {tasks[currentIndex].question}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tasks.map((task, index) => (
            <SelectItem key={task.taskId} value={task.taskId}>
              <span className="truncate">
                {index + 1}. {task.question}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
