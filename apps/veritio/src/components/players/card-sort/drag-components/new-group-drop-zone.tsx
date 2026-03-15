'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { CREATE_NEW_GROUP_DROP_ZONE } from '@/hooks/card-sort/use-card-sort-drag-state'

export function NewGroupDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: CREATE_NEW_GROUP_DROP_ZONE })

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[240px] p-4 transition-all border-2 border-dashed rounded-xl flex flex-col items-center justify-center min-h-[200px] ${
        isOver ? 'scale-[1.02]' : ''
      }`}
      style={{
        borderColor: isOver ? 'var(--brand)' : 'var(--style-card-border)',
        backgroundColor: isOver ? 'var(--brand-subtle)' : 'transparent',
      }}
    >
      <div
        className={`rounded-full p-3 mb-3 transition-colors ${
          isOver ? 'bg-opacity-100' : 'bg-opacity-50'
        }`}
        style={{
          backgroundColor: isOver ? 'var(--brand-muted)' : 'var(--style-bg-muted)',
        }}
      >
        <Plus
          className="h-6 w-6"
          style={{ color: isOver ? 'var(--brand)' : 'var(--style-text-muted)' }}
        />
      </div>
      <p
        className="font-medium text-sm text-center"
        style={{ color: isOver ? 'var(--brand)' : 'var(--style-text-secondary)' }}
      >
        {isOver ? 'Drop to create group' : 'Drop card here'}
      </p>
      <p
        className="text-xs text-center mt-1"
        style={{ color: 'var(--style-text-muted)' }}
      >
        to start a new group
      </p>
    </div>
  )
}
