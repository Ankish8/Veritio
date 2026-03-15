'use client'
import { Button } from '@veritio/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@veritio/ui'
import { Sparkles, XCircle, AlertTriangle, Clock, GitBranch, CheckCircle2 } from 'lucide-react'
import type { DisplayLogic } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import {
  TASK_RESULT_QUESTION_ID,
  TASK_DIRECT_SUCCESS_QUESTION_ID,
  getTaskMetricQuestionId,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'

interface ConditionTemplatesProps {
  onSelectTemplate: (logic: DisplayLogic) => void
}

interface Template {
  id: string
  name: string
  description: string
  icon: typeof XCircle
  category: 'outcome' | 'performance' | 'time' | 'path'
  logic: DisplayLogic
}
const TEMPLATES: Template[] = [
  // === Outcome-based templates ===
  {
    id: 'ask-why-gave-up',
    name: 'Ask why they gave up',
    description: 'Show only when task failed/abandoned',
    icon: XCircle,
    category: 'outcome',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: TASK_RESULT_QUESTION_ID,
          operator: 'equals',
          values: ['failure'],
        },
      ],
      matchAll: true,
    },
  },
  {
    id: 'success-only',
    name: 'Show for successful users',
    description: 'Only show when task completed successfully',
    icon: CheckCircle2,
    category: 'outcome',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: TASK_RESULT_QUESTION_ID,
          operator: 'equals',
          values: ['success'],
        },
      ],
      matchAll: true,
    },
  },
  {
    id: 'indirect-path-feedback',
    name: 'Ask about indirect path',
    description: 'Show when user took a suboptimal route',
    icon: GitBranch,
    category: 'outcome',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: TASK_RESULT_QUESTION_ID,
          operator: 'equals',
          values: ['success'],
        },
        {
          questionId: TASK_DIRECT_SUCCESS_QUESTION_ID,
          operator: 'equals',
          values: ['indirect'],
        },
      ],
      matchAll: true,
    },
  },

  // === Performance-based templates ===
  {
    id: 'struggling-users',
    name: 'Struggling users (high misclicks)',
    description: 'Show when misclick count exceeds 3',
    icon: AlertTriangle,
    category: 'performance',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: getTaskMetricQuestionId('misclickCount'),
          operator: 'greater_than',
          values: ['3'],
        },
      ],
      matchAll: true,
    },
  },
  {
    id: 'high-backtracking',
    name: 'High backtracking',
    description: 'Show when user backtracked 2+ times',
    icon: GitBranch,
    category: 'performance',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: getTaskMetricQuestionId('backtrackCount'),
          operator: 'greater_than',
          values: ['1'],
        },
      ],
      matchAll: true,
    },
  },
  {
    id: 'many-screens-visited',
    name: 'Extended navigation',
    description: 'Show when user visited 5+ screens',
    icon: GitBranch,
    category: 'path',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: getTaskMetricQuestionId('pathLength'),
          operator: 'greater_than',
          values: ['4'],
        },
      ],
      matchAll: true,
    },
  },

  // === Time-based templates ===
  {
    id: 'slow-completion',
    name: 'Slow task completion',
    description: 'Show when task took over 30 seconds',
    icon: Clock,
    category: 'time',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: getTaskMetricQuestionId('totalTimeMs'),
          operator: 'greater_than',
          values: ['30000'],
        },
      ],
      matchAll: true,
    },
  },
  {
    id: 'hesitant-start',
    name: 'Hesitant start',
    description: 'Show when first click took over 5 seconds',
    icon: Clock,
    category: 'time',
    logic: {
      action: 'show',
      conditions: [
        {
          questionId: getTaskMetricQuestionId('timeToFirstClickMs'),
          operator: 'greater_than',
          values: ['5000'],
        },
      ],
      matchAll: true,
    },
  },
]

const categoryLabels: Record<Template['category'], string> = {
  outcome: 'Task Outcome',
  performance: 'User Behavior',
  time: 'Time-Based',
  path: 'Navigation Path',
}

const categoryOrder: Template['category'][] = ['outcome', 'performance', 'time', 'path']

export function ConditionTemplates({ onSelectTemplate }: ConditionTemplatesProps) {
  const groupedTemplates = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category],
      templates: TEMPLATES.filter((t) => t.category === category),
    }))
    .filter((group) => group.templates.length > 0)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Use Template
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Quick-start with a common pattern
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {groupedTemplates.map((group, groupIndex) => (
          <DropdownMenuGroup key={group.category}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs font-semibold">
              {group.label}
            </DropdownMenuLabel>
            {group.templates.map((template) => {
              const Icon = template.icon
              return (
                <DropdownMenuItem
                  key={template.id}
                  onClick={() => onSelectTemplate(template.logic)}
                  className="flex flex-col items-start gap-0.5 py-2"
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">{template.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-6">
                    {template.description}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { TEMPLATES as CONDITION_TEMPLATES }
export type { Template as ConditionTemplate }
