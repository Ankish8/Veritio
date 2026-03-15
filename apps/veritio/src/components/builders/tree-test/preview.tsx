'use client'

import { useState, useMemo } from 'react'
import { ChevronRight, ChevronLeft, Check, Home } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useTreeTestNodes, useTreeTestTasks, useTreeTestSettings } from '@/stores/study-builder'
import { cn } from '@/lib/utils'
import { useNodeMap, useChildrenMap } from '@/hooks'

interface TreeTestPreviewProps {
  studyId: string
}

export function TreeTestPreview({ studyId: _studyId }: TreeTestPreviewProps) {  
  // Use granular selectors for performance
  const nodes = useTreeTestNodes()
  const tasks = useTreeTestTasks()
  const settings = useTreeTestSettings()

  // Performance: O(1) lookups instead of O(n) filter/find/some
  const nodeMap = useNodeMap(nodes)
  const childrenMap = useChildrenMap(nodes)

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [currentPath, setCurrentPath] = useState<string[]>([])
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})

  const currentTask = tasks[currentTaskIndex]
  const progress = ((currentTaskIndex + 1) / tasks.length) * 100

  // Get nodes at current level - O(1) lookup with childrenMap
  const currentParentId = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null
  const currentLevelNodes = useMemo(
    () => childrenMap.get(currentParentId) || [],
    [childrenMap, currentParentId]
  )

  // Get node label by ID - O(1) lookup
  const getNodeLabel = (id: string) => nodeMap.get(id)?.label || ''

  // Check if node has children - O(1) lookup
  const hasChildren = (nodeId: string) =>
    (childrenMap.get(nodeId)?.length ?? 0) > 0

  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    if (hasChildren(nodeId)) {
      // Navigate into the node
      setCurrentPath([...currentPath, nodeId])
    }
  }

  // Handle selecting an answer
  const handleSelectAnswer = (nodeId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentTask.id]: nodeId,
    }))
    // Move to next task
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1)
      setCurrentPath([])
    }
  }

  // Handle back navigation
  const handleBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1))
    }
  }

  // Handle breadcrumb click
  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index))
  }

  // Reset preview
  const handleReset = () => {
    setCurrentTaskIndex(0)
    setCurrentPath([])
    setSelectedAnswers({})
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Add tasks to preview the participant experience.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">
            Add nodes to the tree to preview the participant experience.
          </p>
        </CardContent>
      </Card>
    )
  }

  // All tasks completed
  if (currentTaskIndex >= tasks.length || Object.keys(selectedAnswers).length === tasks.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold">Preview Complete</h3>
            <p className="text-sm text-muted-foreground mt-1">
              You&apos;ve completed all {tasks.length} tasks.
            </p>
          </div>
          <div className="pt-4">
            <h4 className="text-sm font-medium mb-2">Your Answers:</h4>
            <div className="space-y-1 text-sm text-left max-w-md mx-auto">
              {tasks.map((task, idx) => {
                const answerId = selectedAnswers[task.id]
                const answerLabel = answerId ? getNodeLabel(answerId) : 'Not answered'
                const isCorrect = answerId === task.correct_node_id
                return (
                  <div key={task.id} className="flex items-center gap-2">
                    <span className="text-muted-foreground">Task {idx + 1}:</span>
                    <span className={cn(
                      isCorrect ? 'text-green-600' : 'text-red-600'
                    )}>
                      {answerLabel}
                    </span>
                    {isCorrect && <Check className="h-3.5 w-3.5 text-green-600" />}
                  </div>
                )
              })}
            </div>
          </div>
          <Button onClick={handleReset} variant="outline">
            Start Over
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Preview</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress */}
        {settings.showTaskProgress && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Task {currentTaskIndex + 1} of {tasks.length}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        {/* Task question */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="font-medium">{currentTask.question}</p>
        </div>

        {/* Breadcrumbs */}
        {settings.showBreadcrumbs && currentPath.length > 0 && (
          <div className="flex items-center gap-1 text-sm flex-wrap">
            <button
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => handleBreadcrumbClick(0)}
            >
              <Home className="h-3.5 w-3.5" />
              Home
            </button>
            {currentPath.map((nodeId, index) => (
              <div key={nodeId} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <button
                  className={cn(
                    'hover:text-foreground',
                    index === currentPath.length - 1
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground'
                  )}
                  onClick={() => handleBreadcrumbClick(index + 1)}
                >
                  {getNodeLabel(nodeId)}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Navigation tree */}
        <div className="space-y-1">
          {/* Back button */}
          {settings.allowBack && currentPath.length > 0 && (
            <button
              className="flex items-center gap-2 w-full p-2 rounded-md text-sm text-muted-foreground hover:bg-accent"
              onClick={handleBack}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}

          {/* Current level nodes */}
          {currentLevelNodes.map((node) => {
            const nodeHasChildren = hasChildren(node.id)
            return (
              <div
                key={node.id}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                onClick={() => handleNodeClick(node.id)}
              >
                <span className="flex-1 text-sm">{node.label}</span>
                <div className="flex items-center gap-1">
                  {nodeHasChildren && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSelectAnswer(node.id)
                    }}
                  >
                    Select
                  </Button>
                </div>
              </div>
            )
          })}

          {currentLevelNodes.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No items at this level
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
