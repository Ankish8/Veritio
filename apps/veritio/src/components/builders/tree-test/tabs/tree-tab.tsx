'use client'

import { memo } from 'react'
import { TreeEditor } from '../tree-editor'
import { useTreeTestNodes } from '@/stores/study-builder'
import { useYjsOptional } from '@/components/yjs/yjs-provider'
import { useYjsTreeSync } from '@veritio/prototype-test/hooks'

interface TreeTabProps {
  studyId: string
}

function TreeTabComponent({ studyId }: TreeTabProps) {
  // Use granular selector - only re-renders when nodes change
  const nodes = useTreeTestNodes()

  // Enable Yjs collaboration if provider is available
  const yjs = useYjsOptional()
  useYjsTreeSync({
    doc: yjs?.doc ?? null,
    isSynced: yjs?.isSynced ?? false,
    enabled: !!yjs?.doc,
  })

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Main Tree Editor - Full Width, fills available space */}
      <div className="flex-1 min-h-0 flex flex-col p-6">
        <main className="flex-1 min-h-0 flex flex-col" role="main" aria-label="Navigation tree editor">
          <TreeEditor studyId={studyId} />
        </main>
      </div>

      {/* Summary footer - pinned to bottom */}
      <div className="shrink-0 rounded-lg bg-muted/50 p-4 mx-6 mb-6">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="font-medium">{nodes.length}</span>
            <span className="text-muted-foreground ml-1">
              node{nodes.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export const TreeTab = memo(
  TreeTabComponent,
  (prev, next) => prev.studyId === next.studyId
)
