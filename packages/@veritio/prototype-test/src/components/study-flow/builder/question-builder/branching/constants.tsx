import { ArrowRight, Ban } from 'lucide-react'
import type { BranchTarget } from '../../../../../lib/supabase/study-flow-types'

export const targetOptions: {
  value: BranchTarget
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'next',
    label: 'Continue',
    description: 'Proceed to next question',
    icon: <ArrowRight className="h-4 w-4 text-green-600" />,
  },
  {
    value: 'reject',
    label: 'Reject',
    description: 'Reject participant',
    icon: <Ban className="h-4 w-4 text-red-600" />,
  },
  {
    value: 'go_to_study',
    label: 'Skip to Activity',
    description: 'Skip remaining screening',
    icon: <ArrowRight className="h-4 w-4 text-blue-600" />,
  },
]

export const comparisonOptions = [
  { value: 'equals', label: 'equals' },
  { value: 'less_than', label: 'is less than' },
  { value: 'greater_than', label: 'is greater than' },
]
