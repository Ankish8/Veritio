'use client'

import { useState, memo } from 'react'
import { Check, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { KeyboardShortcutHint, EscapeHint } from '@/components/ui/keyboard-shortcut-hint'
import type { Task } from '@veritio/study-types'

export interface TaskFormProps {
  task?: Task
  taskNumber: number
  onSave: (question: string) => void
  onCancel: () => void
}

export const TaskForm = memo(function TaskForm({ task, taskNumber, onSave, onCancel }: TaskFormProps) {
  const [question, setQuestion] = useState(task?.question ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim()) {
      onSave(question.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5" />
        <h3 className="text-lg font-semibold">Task {taskNumber}</h3>
      </div>
      <div className="pl-8 space-y-4">
        <Textarea
          placeholder="Enter the task question, e.g., 'Where would you find information about refund policies?'"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          autoFocus
          className="resize-none"
        />
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={!question.trim()}>
            <Check className="mr-1.5 h-4 w-4" />
            {task ? 'Update' : 'Add'}
            <KeyboardShortcutHint shortcut="enter" variant="dark" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <X className="mr-1.5 h-4 w-4" />
            Cancel
            <EscapeHint />
          </Button>
        </div>
      </div>
    </form>
  )
})
