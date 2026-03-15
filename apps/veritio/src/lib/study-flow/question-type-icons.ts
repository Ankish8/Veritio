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
import type { QuestionType } from '../supabase/study-flow-types'

/**
 * Maps question types to their corresponding icons for the left panel.
 * This provides visual differentiation of question types in the navigation.
 *
 * Icon choices:
 * - TextCursorInput: Shows a text input field with cursor (short text)
 * - FileText: Shows a document with text lines (long text)
 * - ListChecks: Shows a checklist (multiple choice)
 * - ThumbsUp: Shows a thumb up (yes/no binary choice)
 * - SlidersHorizontal: Shows adjustment sliders (opinion scale)
 * - Gauge: Shows a gauge/meter (NPS 0-10 scale)
 * - LayoutGrid: Shows a grid layout (matrix)
 * - ListOrdered: Shows numbered list (ranking)
 * - ArrowLeftRight: Shows bidirectional arrows (semantic differential)
 */
export const questionTypeIcons: Record<QuestionType, React.ComponentType<{ className?: string }>> = {
  single_line_text: TextCursorInput,
  multi_line_text: FileText,
  multiple_choice: ListChecks,
  yes_no: ThumbsUp,
  opinion_scale: SlidersHorizontal,
  nps: Gauge,
  matrix: LayoutGrid,
  ranking: ListOrdered,
  slider: Sliders,
  image_choice: Images,
  semantic_differential: ArrowLeftRight,
  constant_sum: PieChart,
  audio_response: Mic,
}
