'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle,
  XCircle,
  ArrowLeftRight,
  Clock,
  Target,
  Compass,
  RotateCcw,
  MessageSquare,
  ClipboardList,
} from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { QuestionResponseCard } from '@/components/analysis/shared'
import type { Task, TreeNode, StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'
import type { TreeTestResponse } from '@/lib/algorithms/tree-test-analysis'

interface TreeTestParticipantDetailContentProps {
  studyId: string
  successCount: number
  directCount: number
  totalTime: number
  totalTasks: number
  responses: TreeTestResponse[]
  tasks: Task[]
  taskMap: Map<string, Task>
  nodeMap: Map<string, TreeNode>
  flowResponses: StudyFlowResponseRow[]
  flowQuestions: StudyFlowQuestionRow[]
}

/**
 * Renders the tree test specific content for the participant detail panel.
 * Displays summary stats, task responses table, and flow question responses.
 */
/** Build path labels string from node IDs */
function buildPathLabels(pathTaken: string[], nodeMap: Map<string, TreeNode>): string {
  return pathTaken.map((id) => nodeMap.get(id)?.label || 'Unknown').join(' \u2192 ')
}

export function TreeTestParticipantDetailContent({
  studyId: _studyId,
  successCount,
  directCount,
  totalTime,
  totalTasks,
  responses,
  tasks: _tasks,
  taskMap,
  nodeMap,
  flowResponses,
  flowQuestions,
}: TreeTestParticipantDetailContentProps) {
  const totalBacktracks = responses.reduce(
    (sum, r) => sum + (r.backtrack_count || 0),
    0
  )

  return (
    <>
      {/* Tree Test Stats */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Task Performance
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-lg font-bold">{successCount}/{totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Correct</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-lg font-bold">{directCount}/{totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Direct</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-lg font-bold">{formatTime(totalTime)}</p>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <div>
                  <p className="text-lg font-bold">{totalBacktracks}</p>
                  <p className="text-xs text-muted-foreground">Backtracks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Responses Table */}
      <div className="space-y-3 mt-6">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Task Responses
        </h3>
        {responses.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
            No task responses recorded.
          </p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Task</TableHead>
                  <TableHead className="text-xs">Answer</TableHead>
                  <TableHead className="text-xs text-center">Result</TableHead>
                  <TableHead className="text-xs text-center">Direct</TableHead>
                  <TableHead className="text-xs text-right">Time</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => {
                  const task = taskMap.get(response.task_id)
                  const selectedNode = response.selected_node_id
                    ? nodeMap.get(response.selected_node_id)
                    : null

                  return (
                    <TableRow key={response.id}>
                      <TableCell className="text-sm py-2">
                        <p className="truncate max-w-[120px]" title={task?.question || 'Unknown'}>
                          {task?.question || 'Unknown'}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm font-medium py-2">
                        {selectedNode?.label || '—'}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {response.is_correct ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center py-2">
                        {response.is_direct ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="flex items-center gap-1 w-fit mx-auto text-xs">
                            <ArrowLeftRight className="h-3 w-3" />
                            {response.backtrack_count}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right py-2 text-muted-foreground">
                        {formatTime(response.total_time_ms)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Path Details (collapsible or on hover could be added later) */}
      {responses.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Navigation Paths
          </h3>
          <div className="space-y-2">
            {responses.map((response) => {
              const task = taskMap.get(response.task_id)
              const pathLabels = buildPathLabels(response.path_taken, nodeMap)

              if (!pathLabels) return null

              return (
                <Card key={response.id} className="border-0 bg-muted/30">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium truncate" title={task?.question}>
                      {task?.question || 'Unknown Task'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      {pathLabels || '(Direct from root)'}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Flow Question Responses */}
      {flowResponses.length > 0 && (
        <div className="space-y-3 mt-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Questionnaire Responses
          </h3>
          <div className="space-y-2">
            {flowResponses.map((response, index) => {
              const question = flowQuestions.find(q => q.id === response.question_id)
              if (!question) return null
              return (
                <QuestionResponseCard
                  key={response.id}
                  question={question}
                  response={response}
                  index={index}
                  sourceType="tree_test_response"
                />
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
