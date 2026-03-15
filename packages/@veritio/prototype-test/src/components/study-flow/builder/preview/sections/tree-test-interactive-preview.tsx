'use client'

import { useState, useCallback } from 'react'
import { useTreeTestBuilderStore } from '@/stores/study-builder'
import { TreeTestPlayer } from '@/components/players/tree-test/tree-test-player'
import { PreviewLayout } from '../preview-layout'
import { Button } from '@veritio/ui/components/button'
import { Trees, RotateCcw } from 'lucide-react'
import type { StudyFlowSettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface TreeTestInteractivePreviewProps {
  studyId: string
  settings: StudyFlowSettings['activityInstructions']
}
export function TreeTestInteractivePreview({
  studyId,
  settings,
}: TreeTestInteractivePreviewProps) {
  // Track whether we're showing instructions or the tree test
  const [phase, setPhase] = useState<'instructions' | 'tree_test' | 'complete'>('instructions')

  // Tree Test data from builder store
  const treeNodes = useTreeTestBuilderStore((state) => state.nodes)
  const treeTasks = useTreeTestBuilderStore((state) => state.tasks)
  const treeSettings = useTreeTestBuilderStore((state) => state.settings)

  const { title, part1, part2 } = settings

  // Check if tree test has required data
  const hasNodes = treeNodes.length > 0
  const hasTasks = treeTasks.length > 0

  // Reset preview to instructions
  const handleReset = useCallback(() => {
    setPhase('instructions')
  }, [])

  // Start the tree test
  const handleStartTreeTest = useCallback(() => {
    setPhase('tree_test')
  }, [])

  // Handle tree test completion
  const handleComplete = useCallback(() => {
    setPhase('complete')
  }, [])

  // Show placeholder if no data
  if (!hasNodes || !hasTasks) {
    return (
      <PreviewLayout centered>
        <div className="py-8">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <Trees className="h-6 w-6 text-stone-500" />
          </div>
          <h2 className="text-lg font-semibold text-stone-900 mb-2">Tree Test Preview</h2>
          <p className="text-sm text-muted-foreground">
            {!hasNodes && !hasTasks
              ? 'Add tree nodes and tasks to preview the tree test'
              : !hasNodes
                ? 'Add tree nodes to preview the tree test'
                : 'Add tasks to preview the tree test'}
          </p>
        </div>
      </PreviewLayout>
    )
  }

  // Show completion screen with reset option
  if (phase === 'complete') {
    return (
      <div className="h-full flex flex-col">
        <PreviewLayout centered>
          <div className="py-6">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Trees className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-stone-900 mb-2">Preview Complete!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              You've completed the tree test preview. Click below to restart.
            </p>
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Restart Preview
            </Button>
          </div>
        </PreviewLayout>
      </div>
    )
  }

  // Show the tree test player
  if (phase === 'tree_test') {
    return (
      <div className="h-full flex flex-col relative">
        {/* Reset button overlay */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
            className="gap-1.5 bg-white/90 backdrop-blur-sm shadow-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>

        {/* Full tree test player */}
        <TreeTestPlayer
          studyId={studyId}
          shareCode=""
          tasks={treeTasks}
          nodes={treeNodes}
          settings={treeSettings as any}
          welcomeMessage=""
          thankYouMessage=""
          embeddedMode={true}
          previewMode={true}
          onComplete={handleComplete}
        />
      </div>
    )
  }

  // Show instructions phase with working button
  return (
    <div className="h-full flex flex-col">
      <PreviewLayout
        title={title || 'Tree Test Instructions'}
        actions={
          <div className="flex justify-end">
            <Button onClick={handleStartTreeTest}>
              Start Tree Test
            </Button>
          </div>
        }
      >
        {/* Part 1 - Main instructions */}
        {part1 ? (
          <div
            className="prose prose-stone prose-sm max-w-none text-stone-600
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
              [&_li]:my-1
              [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: part1 }}
          />
        ) : (
          <p className="text-sm text-muted-foreground italic mb-4">
            No instructions configured
          </p>
        )}

        {/* Part 2 - Additional instructions */}
        {part2 && (
          <div
            className="prose prose-stone prose-sm max-w-none text-stone-600 mt-4 pt-4 border-t
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
              [&_li]:my-1
              [&_p]:leading-relaxed"
            dangerouslySetInnerHTML={{ __html: part2 }}
          />
        )}
      </PreviewLayout>
    </div>
  )
}
