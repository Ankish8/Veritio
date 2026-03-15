'use client'

import { BarChart2, PieChart, BarChartHorizontal, Table2, Cloud, Gauge, Grid3X3, CalendarDays, AtSign, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ChartType } from './hooks'
import type { QuestionType, TextInputType } from '@veritio/study-types/study-flow-types'

interface ChartOption {
  type: ChartType
  icon: LucideIcon
  label: string
}

const CHART_OPTIONS: Record<string, ChartOption[]> = {
  choice: [
    { type: 'horizontal-bar', icon: BarChartHorizontal, label: 'Horizontal Bar' },
    { type: 'pie-chart', icon: PieChart, label: 'Pie Chart' },
    { type: 'vertical-bar', icon: BarChart2, label: 'Vertical Bar' },
  ],
  text: [
    { type: 'response-table', icon: Table2, label: 'Response Table' },
    { type: 'word-cloud', icon: Cloud, label: 'Word Cloud' },
  ],
  text_numerical: [
    { type: 'numerical-histogram', icon: BarChart2, label: 'Histogram' },
    { type: 'response-table', icon: Table2, label: 'Response Table' },
  ],
  text_date: [
    { type: 'date-timeline', icon: CalendarDays, label: 'Timeline' },
    { type: 'response-table', icon: Table2, label: 'Response Table' },
  ],
  text_email: [
    { type: 'email-domains', icon: AtSign, label: 'Domain Breakdown' },
    { type: 'response-table', icon: Table2, label: 'Response Table' },
  ],
  likert: [
    { type: 'distribution-table', icon: Table2, label: 'Distribution Table' },
    { type: 'stacked-bar', icon: BarChartHorizontal, label: 'Stacked Bar' },
    { type: 'diverging-bar', icon: BarChart2, label: 'Diverging Bar' },
  ],
  nps: [
    { type: 'nps-default', icon: Table2, label: 'Score Distribution' },
    { type: 'nps-gauge', icon: Gauge, label: 'Gauge Chart' },
    { type: 'nps-donut', icon: PieChart, label: 'Donut Chart' },
  ],
  matrix: [
    { type: 'heat-map', icon: Grid3X3, label: 'Heat Map' },
    { type: 'grouped-bar', icon: BarChart2, label: 'Grouped Bar' },
    { type: 'matrix-stacked-bar', icon: BarChartHorizontal, label: 'Stacked Bar' },
  ],
  ranking: [
    { type: 'rank-distribution', icon: BarChartHorizontal, label: 'Rank Distribution' },
    { type: 'rank-table', icon: Table2, label: 'Simple Table' },
  ],
  slider: [
    { type: 'slider-histogram', icon: BarChart2, label: 'Histogram' },
  ],
  audio_response: [],
  constant_sum: [
    { type: 'constant-sum-table', icon: Table2, label: 'Table View' },
    { type: 'constant-sum-bars', icon: BarChartHorizontal, label: 'Bar Chart' },
    { type: 'constant-sum-pie', icon: PieChart, label: 'Pie Chart' },
  ],
  semantic_differential: [
    { type: 'semantic-diff-profile', icon: BarChartHorizontal, label: 'Mean Profile' },
    { type: 'semantic-diff-heatmap', icon: Grid3X3, label: 'Heatmap' },
    { type: 'semantic-diff-distribution', icon: BarChart2, label: 'Distribution' },
  ],
}

function getChartCategory(questionType: QuestionType, inputType?: TextInputType): string {
  switch (questionType) {
    case 'multiple_choice':
    case 'yes_no':
      return 'choice'
    case 'single_line_text':
    case 'multi_line_text':
      switch (inputType) {
        case 'numerical':
          return 'text_numerical'
        case 'date':
          return 'text_date'
        case 'email':
          return 'text_email'
        default:
          return 'text'
      }
    case 'opinion_scale':
      return 'likert'
    case 'nps':
      return 'nps'
    case 'matrix':
      return 'matrix'
    case 'ranking':
      return 'ranking'
    case 'slider':
      return 'slider'
    case 'audio_response':
      return 'audio_response'
    case 'constant_sum':
      return 'constant_sum'
    case 'semantic_differential':
      return 'semantic_differential'
    default:
      return 'choice'
  }
}

export function getDefaultChartType(questionType: QuestionType, inputType?: TextInputType): ChartType {
  switch (questionType) {
    case 'multiple_choice':
    case 'yes_no':
      return 'horizontal-bar'
    case 'single_line_text':
    case 'multi_line_text':
      switch (inputType) {
        case 'numerical':
          return 'numerical-histogram'
        case 'date':
          return 'date-timeline'
        case 'email':
          return 'email-domains'
        default:
          return 'response-table'
      }
    case 'opinion_scale':
      return 'distribution-table'
    case 'nps':
      return 'nps-default'
    case 'matrix':
      return 'heat-map'
    case 'ranking':
      return 'rank-distribution'
    case 'slider':
      return 'slider-histogram'
    case 'audio_response':
      return 'audio-response-list'
    case 'constant_sum':
      return 'constant-sum-table'
    case 'semantic_differential':
      return 'semantic-diff-profile'
    default:
      return 'horizontal-bar'
  }
}

interface ChartTypeSwitcherProps {
  questionType: QuestionType
  currentChartType: ChartType
  onChartTypeChange: (type: ChartType) => void
  inputType?: TextInputType
}

export function ChartTypeSwitcher({
  questionType,
  currentChartType,
  onChartTypeChange,
  inputType,
}: ChartTypeSwitcherProps) {
  const category = getChartCategory(questionType, inputType)
  const options = CHART_OPTIONS[category] || []

  if (options.length <= 1) {
    return null
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 p-0.5 bg-muted rounded-md">
        {options.map((option) => {
          const Icon = option.icon
          const isActive = currentChartType === option.type

          return (
            <Tooltip key={option.type}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 w-7 p-0',
                    isActive && 'bg-background shadow-sm'
                  )}
                  onClick={() => onChartTypeChange(option.type)}
                >
                  <Icon className={cn('h-4 w-4', isActive ? 'text-foreground' : 'text-muted-foreground')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {option.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
