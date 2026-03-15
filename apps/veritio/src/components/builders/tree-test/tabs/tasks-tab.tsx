'use client'

import { memo } from 'react'
import { TaskEditor } from '../task-editor'
import { useYjsOptional } from '@/components/yjs/yjs-provider'
import { useYjsTreeSync } from '@veritio/prototype-test/hooks'

interface TasksTabProps {
  studyId: string
}

function TasksTabComponent({ studyId }: TasksTabProps) {
  // Enable Yjs collaboration if provider is available
  const yjs = useYjsOptional()
  useYjsTreeSync({
    doc: yjs?.doc ?? null,
    isSynced: yjs?.isSynced ?? false,
    enabled: !!yjs?.doc,
  })

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 p-6">
        {/* Main Task Editor - Full Width */}
        <main className="min-h-0 flex flex-col h-full" role="main" aria-label="Tasks editor">
          <TaskEditor studyId={studyId} />
        </main>
      </div>
    </div>
  )
}

export const TasksTab = memo(
  TasksTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
