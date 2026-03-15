'use client'

/**
 * Public Tree Test Analysis
 *
 * Read-only version of the Tree Test analysis for public results sharing.
 * Displays task results, pie tree, and path analysis without segment filtering.
 */

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskResultsTab } from '@/components/analysis/tree-test/task-results'
import { FirstClickTab } from '@/components/analysis/tree-test/first-click'
import { PathsTab } from '@/components/analysis/tree-test/paths'
import { DestinationsTab } from '@/components/analysis/tree-test/destinations'
import { ChartSkeleton } from '@/components/dashboard/skeletons'
import type { Task, TreeNode } from '@veritio/study-types'
import type { TreeTestResponse, OverallMetrics, Participant } from '@/lib/algorithms/tree-test-analysis'

// Dynamic import for heavy D3 visualization
const PietreeTab = dynamic(
  () => import('@/components/analysis/tree-test/pietree/pietree-tab').then(mod => ({ default: mod.PietreeTab })),
  { loading: () => <ChartSkeleton />, ssr: false }
)

interface PublicTreeTestAnalysisProps {
  studyId: string
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  participants: Participant[]
  metrics: OverallMetrics
}

export function PublicTreeTestAnalysis({
  studyId,
  tasks,
  nodes,
  responses,
  participants,
  metrics,
}: PublicTreeTestAnalysisProps) {
  const [activeSubTab, setActiveSubTab] = useState('task-results')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  return (
    <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
      <TabsList variant="underline" className="mb-4">
        <TabsTrigger variant="underline" value="task-results">Task Results</TabsTrigger>
        <TabsTrigger variant="underline" value="pie-tree">Pie Tree</TabsTrigger>
        <TabsTrigger variant="underline" value="first-click">First Click</TabsTrigger>
        <TabsTrigger variant="underline" value="paths">Paths</TabsTrigger>
        <TabsTrigger variant="underline" value="destinations">Destinations</TabsTrigger>
      </TabsList>

      <TabsContent value="task-results" className="mt-0 space-y-4">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <TaskResultsTab
            taskMetrics={metrics.taskMetrics}
            initialSelectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
          />
        </div>
      </TabsContent>

      <TabsContent value="pie-tree" className="mt-0 space-y-4">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <PietreeTab
            tasks={tasks}
            nodes={nodes}
            responses={responses}
            initialSelectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
          />
        </div>
      </TabsContent>

      <TabsContent value="first-click" className="mt-0 space-y-4">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <FirstClickTab
            tasks={tasks}
            nodes={nodes}
            responses={responses}
            initialSelectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
          />
        </div>
      </TabsContent>

      <TabsContent value="paths" className="mt-0 space-y-4">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <PathsTab
            studyId={studyId}
            tasks={tasks}
            nodes={nodes}
            responses={responses}
            participants={participants}
            initialSelectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
          />
        </div>
      </TabsContent>

      <TabsContent value="destinations" className="mt-0 space-y-4">
        <div className="rounded-lg border bg-card shadow-sm p-4 sm:p-6">
          <DestinationsTab
            tasks={tasks}
            nodes={nodes}
            responses={responses}
            initialSelectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
