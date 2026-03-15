'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Target, Compass, Clock, MousePointer, ArrowLeftRight, Route } from 'lucide-react'
import type { TaskMetrics } from '@/lib/algorithms/tree-test-analysis'
import { cn, formatTime } from '@/lib/utils'

interface TaskDetailProps {
  task: TaskMetrics
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
}

export function TaskDetail({ task }: TaskDetailProps) {
  return (
    <div className="space-y-6">
      {/* Task question header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{task.question}</CardTitle>
          <CardDescription>
            Correct answer{task.correctNodeIds?.length > 1 ? 's' : ''}: <span className="font-medium text-foreground">{task.correctNodeLabel}</span>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getScoreColor(task.successRate))}>
              {task.successRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Compass className="h-3 w-3" />
              Directness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getScoreColor(task.directnessRate))}>
              {task.directnessRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              First Click
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-2xl font-bold', getScoreColor(task.firstClickSuccessRate))}>
              {task.firstClickSuccessRate.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Avg Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(task.averageTimeMs)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Route className="h-3 w-3" />
              Avg Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {task.averagePathLength.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <ArrowLeftRight className="h-3 w-3" />
              Avg Backtrack
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {task.averageBacktracks.toFixed(1)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common paths */}
      {task.commonPaths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common Navigation Paths</CardTitle>
            <CardDescription>
              Most frequent paths participants took to find their answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-center w-[100px]">Count</TableHead>
                  <TableHead className="text-center w-[100px]">%</TableHead>
                  <TableHead className="text-center w-[100px]">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.commonPaths.map((path, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="font-mono text-sm">
                        {path.pathLabels.length > 0
                          ? path.pathLabels.join(' → ')
                          : '(Started at root)'}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{path.count}</TableCell>
                    <TableCell className="text-center">
                      {path.percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {path.isSuccessPath ? (
                        <Badge className="bg-green-100 text-green-800">Success</Badge>
                      ) : (
                        <Badge variant="outline">Other</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Common wrong answers */}
      {task.commonWrongAnswers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Common Incorrect Answers</CardTitle>
            <CardDescription>
              Items participants most frequently selected instead of the correct answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Selected Node</TableHead>
                  <TableHead>Full Path</TableHead>
                  <TableHead className="text-center w-[100px]">Count</TableHead>
                  <TableHead className="text-center w-[100px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.commonWrongAnswers.map((answer, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{answer.nodeLabel}</TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground font-mono">
                        {answer.nodePath}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{answer.count}</TableCell>
                    <TableCell className="text-center">
                      {answer.percentage.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* First click analysis */}
      {task.firstClickData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">First Click Distribution</CardTitle>
            <CardDescription>
              Where participants clicked first when starting this task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>First Click Node</TableHead>
                  <TableHead className="text-center w-[100px]">Count</TableHead>
                  <TableHead className="text-center w-[100px]">%</TableHead>
                  <TableHead className="text-center w-[120px]">On Correct Path</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {task.firstClickData.slice(0, 10).map((click, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{click.nodeLabel}</TableCell>
                    <TableCell className="text-center">{click.count}</TableCell>
                    <TableCell className="text-center">
                      {click.percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center">
                      {click.isOnCorrectPath ? (
                        <Badge className="bg-green-100 text-green-800">Yes</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
