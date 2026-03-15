'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Label } from '@veritio/ui/components/label'
import { cn } from '@veritio/ui'

interface Task {
  taskId: string
  title: string
}

interface TaskSelectorProps {
  tasks: Task[]
  selectedTaskId: string | null
  onTaskSelect: (taskId: string) => void
  className?: string
  hideLabel?: boolean
}
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
    <div className={cn(!hideLabel && 'space-y-1.5', className)}>
      {!hideLabel && <Label className="text-sm font-medium">Select task</Label>}
      <Select
        value={selectedTaskId || undefined}
        onValueChange={onTaskSelect}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select a task...">
            {selectedTaskId && currentIndex >= 0 && (
              <span className="truncate">
                {currentIndex + 1}. {tasks[currentIndex].title}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tasks.map((task, index) => (
            <SelectItem key={task.taskId} value={task.taskId}>
              <span className="truncate">
                {index + 1}. {task.title}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
