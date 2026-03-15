'use client'

import { QUESTION_TYPES, type QuestionType } from '../../../../lib/supabase/study-flow-types'
import {
  TextCursorInput,
  FileText,
  ListChecks,
  Images,
  SlidersHorizontal,
  Sliders,
  Gauge,
  LayoutGrid,
  ListOrdered,
  ThumbsUp,
  ArrowLeftRight,
  PieChart,
  Mic,
} from 'lucide-react'

interface QuestionTypeCardsProps {
  onSelect: (type: QuestionType) => void
  title?: string
  description?: string
  allowedTypes?: QuestionType[]
}

const iconMap: Partial<Record<QuestionType, React.ReactNode>> = {
  single_line_text: <TextCursorInput className="h-5 w-5" />,
  multi_line_text: <FileText className="h-5 w-5" />,
  nps: <Gauge className="h-5 w-5" />,
  matrix: <LayoutGrid className="h-5 w-5" />,
  ranking: <ListOrdered className="h-5 w-5" />,
  multiple_choice: <ListChecks className="h-5 w-5" />,
  image_choice: <Images className="h-5 w-5" />,
  opinion_scale: <SlidersHorizontal className="h-5 w-5" />,
  yes_no: <ThumbsUp className="h-5 w-5" />,
  slider: <Sliders className="h-5 w-5" />,
  semantic_differential: <ArrowLeftRight className="h-5 w-5" />,
  constant_sum: <PieChart className="h-5 w-5" />,
  audio_response: <Mic className="h-5 w-5" />,
}

const typeDescriptions: Partial<Record<QuestionType, string>> = {
  single_line_text: 'Short text response for names, emails, etc.',
  multi_line_text: 'Longer text response for detailed feedback.',
  nps: 'Ask how likely they are to recommend (0-10 scale).',
  matrix: 'Rate multiple items in a grid format.',
  ranking: 'Ask participants to rank items in order of preference.',
  multiple_choice: 'Single-select, multi-select, or dropdown from a list of options.',
  image_choice: 'Select from images arranged in a visual grid.',
  opinion_scale: 'Rate on a customizable scale (stars or emotions).',
  yes_no: 'Simple binary choice with icons or emotions.',
  slider: 'Drag to select a value on a continuous scale.',
  semantic_differential: 'Rate between bipolar adjectives (e.g., Difficult ↔ Easy).',
  constant_sum: 'Distribute points across items to show relative importance.',
  audio_response: 'Record verbal answers with automatic transcription.',
}

export function QuestionTypeCards({
  onSelect,
  title = 'Choose question type',
  description = 'Select the type of question you want to add.',
  allowedTypes,
}: QuestionTypeCardsProps) {
  // Filter question types if allowedTypes is specified
  const filteredTypes = allowedTypes
    ? QUESTION_TYPES.filter((qt) => allowedTypes.includes(qt.type))
    : QUESTION_TYPES

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {filteredTypes.map((questionType) => (
          <button
            key={questionType.type}
            onClick={() => onSelect(questionType.type)}
            className="flex items-start gap-3 rounded-lg border border-border/50 bg-background p-4 text-left transition-all hover:border-border hover:bg-muted/30 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {iconMap[questionType.type]}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">{questionType.label}</span>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {typeDescriptions[questionType.type]}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
