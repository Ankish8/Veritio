'use client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@veritio/ui'
import { QUESTION_TYPES, type QuestionType } from '../../../../lib/supabase/study-flow-types'
import {
  TextCursorInput,
  FileText,
  ListChecks,
  ThumbsUp,
  SlidersHorizontal,
  Sliders,
  Gauge,
  LayoutGrid,
  ListOrdered,
  Images,
  ArrowLeftRight,
  PieChart,
  Mic,
} from 'lucide-react'

interface QuestionTypePickerProps {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (type: QuestionType) => void
  excludeTypes?: QuestionType[]
}

const iconMap: Record<QuestionType, React.ReactNode> = {
  single_line_text: <TextCursorInput className="h-4 w-4" />,
  multi_line_text: <FileText className="h-4 w-4" />,
  multiple_choice: <ListChecks className="h-4 w-4" />,
  yes_no: <ThumbsUp className="h-4 w-4" />,
  opinion_scale: <SlidersHorizontal className="h-4 w-4" />,
  nps: <Gauge className="h-4 w-4" />,
  matrix: <LayoutGrid className="h-4 w-4" />,
  ranking: <ListOrdered className="h-4 w-4" />,
  slider: <Sliders className="h-4 w-4" />,
  image_choice: <Images className="h-4 w-4" />,
  semantic_differential: <ArrowLeftRight className="h-4 w-4" />,
  constant_sum: <PieChart className="h-4 w-4" />,
  audio_response: <Mic className="h-4 w-4" />,
}

export function QuestionTypePicker({
  children,
  open,
  onOpenChange,
  onSelect,
  excludeTypes,
}: QuestionTypePickerProps) {
  const visibleTypes = excludeTypes?.length
    ? QUESTION_TYPES.filter((qt) => !excludeTypes.includes(qt.type))
    : QUESTION_TYPES
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        sideOffset={4}
        side="bottom"
        avoidCollisions={true}
        collisionPadding={16}
      >
        <div className="p-2 pb-1">
          <p className="px-2 py-1 text-sm font-medium text-muted-foreground">
            Select Question Type
          </p>
        </div>
        <div
          className="h-[350px] overflow-y-auto overscroll-contain px-2 pb-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable',
          }}
          onWheel={(e) => {
            e.currentTarget.scrollTop += e.deltaY
            e.stopPropagation()
          }}
        >
          <div className="grid grid-cols-1 gap-1">
            {visibleTypes.map((qt) => (
              <button
                key={qt.type}
                onClick={() => onSelect(qt.type)}
                className="flex items-start gap-3 rounded-md p-2 text-left hover:bg-muted transition-colors"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  {iconMap[qt.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{qt.label}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {qt.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
